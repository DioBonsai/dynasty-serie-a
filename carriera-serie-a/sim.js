'use strict';
/* ============================================================
   Presidente · Serie A — sim.js
   Il motore di gioco: stato (S), economia (stipendi, spin, valore del
   club), generazione di giocatori/allenatori/sponsor, simulazione delle
   partite e della stagione (campionato, coppe, playoff, mercato di
   gennaio), salvataggio. Nessun accesso al DOM tranne pochi punti che
   aggiornano l'interfaccia a fine azione (renderBoard/renderHud/show/...),
   definiti in ui.js e già disponibili a runtime perché ui.js è caricato
   subito dopo (vedi index.html). Si appoggia alle costanti di data.js.
   ============================================================ */

  const $ = (id) => document.getElementById(id);

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const rnd = (n) => Math.floor(Math.random() * n);

  const pick = (arr) => arr[rnd(arr.length)];

  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = rnd(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

  function poisson(lambda) { const L = Math.exp(-lambda); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; }

  const ord = (n) => n + '°';

  function gaussInt(c, sd) { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.round(c + Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sd); }

  /* ---------------- soldi ---------------- */
  function fmtMoney(n) {
    n = Math.round(n || 0);
    const neg = n < 0 ? '-' : ''; n = Math.abs(n);
    if (n >= 1e9) return neg + '€' + (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'Mld';
    if (n >= 1e6) return neg + '€' + (n / 1e6).toFixed(n >= 1e8 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return neg + '€' + Math.round(n / 1e3) + 'k';
    return neg + '€' + n;
  }

  // p.wage è sempre lo stipendio SETTIMANALE (usato in tutte le formule economiche); qui
  // lo mostriamo però sempre in €/anno, come richiesto, per coerenza in tutta l'interfaccia.
  const fmtYr = (w) => fmtMoney(w * 52) + '/anno';

  const genName = (nat) => {
    if (nat && nat.code === 'ITA') return pick(ITA_FIRST) + ' ' + pick(ITA_LAST);
    if (nat) return pick(FOREIGN_FIRST) + ' ' + pick(FOREIGN_LAST);
    return pick(FIRST) + ' ' + pick(LAST);
  };

  function pickNationality(divIdx) {
    const itaChance = ITA_SHARE[clamp(divIdx, 0, ITA_SHARE.length - 1)];
    return Math.random() < itaChance ? ITA_NAT : pick(NATIONS);
  }

  const flagOf = (p) => (p.nat && p.nat.flag ? p.nat.flag + ' ' : '');

  /* ---------------- stemma procedurale ---------------- */
  // Non più un unico stemma riciclato ovunque: alla creazione del club si sceglie una
  // forma (scudo/tondo/esagono) + due colori, e da quel momento è la vera identità
  // grafica del club — nella barra home, in sala del consiglio e nella bacheca finale.
  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
    return '#' + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
  }

  function randCrestColors() {
    const h1 = rnd(360), h2 = (h1 + 24 + rnd(48)) % 360;
    return [hslToHex(h1, 55 + rnd(20), 36 + rnd(12)), hslToHex(h2, 45 + rnd(20), 16 + rnd(12))];
  }

  /* ---------------- avversari di coppa ---------------- */
  // Coppa Italia: pesca un club vero (da una qualunque delle categorie italiane note) con
  // una forza vicina a quella richiesta dal turno, così nei turni bassi capitano squadre
  // minori e più avanti si va nei grandi club. Non è mai il tuo club.
  function pickCoppaOpponent(oppStr) {
    const all = [];
    POOLS.forEach((pool) => pool.forEach((c) => { if (c.n !== S.club) all.push(c); }));
    if (!all.length) return 'un club';
    all.sort((a, b) => Math.abs(a.s - oppStr) - Math.abs(b.s - oppStr));
    return pick(all.slice(0, 6)).n;
  }

  const genEuroClub = () => pick(EURO_CLUB_PREFIX) + ' ' + pick(EURO_CITIES);

  function cupOpponentName(key, oppStr) { return key === 'euro' ? genEuroClub() : pickCoppaOpponent(oppStr); }

  // Quanto è forte oggi ogni ruolo in rosa: la media dei migliori (fino a 3) giocatori che
  // lo ricoprono. Un ruolo scoperto o con pochi elementi vale come debole, non "senza dati",
  // altrimenti la rosa non chiederebbe mai un rinforzo lì.
  function roleStrength(squad) {
    const teamAvg = squad.length ? squad.reduce((a, p) => a + p.ovr, 0) / squad.length : 50;
    const avg = {};
    ['POR', 'DIF', 'CEN', 'ATT'].forEach((r) => {
      const top = squad.filter((p) => p.pos === r).sort((a, b) => b.ovr - a.ovr).slice(0, 3);
      avg[r] = top.length ? top.reduce((a, p) => a + p.ovr, 0) / top.length : teamAvg - 18;
    });
    return avg;
  }

  // Trasforma la forza per ruolo in pesi di estrazione: un ruolo più debole della media
  // ha più probabilità di uscire allo spin successivo, per aiutarti a coprire il buco.
  function roleNeedWeights(squad) {
    const avg = roleStrength(squad);
    const roles = ['POR', 'DIF', 'CEN', 'ATT'];
    const overall = roles.reduce((a, r) => a + avg[r], 0) / roles.length;
    const w = {};
    roles.forEach((r) => { w[r] = POS_BASE_WEIGHT[r] * clamp(1 + (overall - avg[r]) / 10, 0.4, 2.8); });
    return w;
  }

  function randPos(squad) {
    const w = roleNeedWeights(squad || (S && S.squad) || []);
    const total = w.POR + w.DIF + w.CEN + w.ATT;
    let r = Math.random() * total;
    for (const k of ['POR', 'DIF', 'CEN', 'ATT']) { r -= w[k]; if (r <= 0) return k; }
    return 'ATT';
  }

  // La formazione della singola partita: un 4-3-3 (1 portiere, 4 difensori, 3
  // centrocampisti, 3 attaccanti) scelto sul rendimento del momento (overall × forma
  // stagionale) MA con un margine di casualità a ogni partita, così non sono sempre
  // esattamente gli stessi 11 — un panchinaro in un buon momento può scavalcare un
  // titolare "di carta" quel giorno. Sopra agli 11 titolari, 1-3 subentrano dalla
  // panchina: giocano meno (peso ridotto) ma incassano comunque una presenza e una
  // chance di incidere. Richiamata una volta a partita (non per gol), così titolari e
  // presenze restano coerenti nell'arco dei 90 minuti.
  // Infortuni e squalifiche: ogni chiamata a pickMatchLineup rappresenta UNA partita, quindi
  // è anche il punto giusto per far scorrere i contatori di chi è ai box (in settimane di
  // partite, non calendario) prima di scegliere chi è disponibile.
  function tickAbsences() {
    S.squad.forEach((p) => { if (p.outWeeks > 0) p.outWeeks--; if (p.suspMatches > 0) p.suspMatches--; });
  }

  // Dopo la partita, chi ha giocato rischia un infortunio (più probabile più si va avanti
  // con l'età) o, se titolare, un cartellino che lo terrà fuori dalla prossima. Leggero di
  // proposito: qui l'obiettivo è dare peso alla gestione della rosa, non simulare un vero
  // bollettino medico.
  function rollAbsences(lineup) {
    const events = [];
    S.squad.forEach((p) => {
      if (!(lineup.starters.has(p.pid) || lineup.subs.has(p.pid))) return;
      if (p.outWeeks > 0 || p.suspMatches > 0) return;
      const injChance = p.age >= 32 ? 0.03 : p.age >= 28 ? 0.02 : 0.013;
      if (Math.random() < injChance) {
        const weeks = 1 + rnd(3);
        p.outWeeks = weeks;
        events.push({ n: p.n, nat: p.nat, kind: 'inj', weeks });
      } else if (lineup.starters.has(p.pid) && Math.random() < 0.018) {
        p.suspMatches = 1;
        events.push({ n: p.n, nat: p.nat, kind: 'susp' });
      }
    });
    return events;
  }

  function pickMatchLineup(squad) {
    tickAbsences();
    const available = squad.filter((p) => !(p.outWeeks > 0) && !(p.suspMatches > 0));
    const pool = available.length >= Math.min(11, squad.length) ? available : squad;   // rosa decimata: si gioca comunque con chi c'è
    const rated = pool.map((p) => ({ p, eff: p.ovr * (p.formSeason || 1) * (0.82 + Math.random() * 0.36) }));
    const byPos = { POR: [], DIF: [], CEN: [], ATT: [] };
    rated.forEach((r) => { if (byPos[r.p.pos]) byPos[r.p.pos].push(r); });
    Object.keys(byPos).forEach((k) => byPos[k].sort((a, b) => b.eff - a.eff));
    const need = { POR: 1, DIF: 4, CEN: 3, ATT: 3 };
    const starters = new Set();
    Object.keys(need).forEach((k) => byPos[k].slice(0, need[k]).forEach((r) => starters.add(r.p.pid)));
    const target = Math.min(11, pool.length);
    if (starters.size < target) {
      rated.slice().sort((a, b) => b.eff - a.eff).forEach((r) => { if (starters.size < target) starters.add(r.p.pid); });
    }
    const bench = pool.filter((p) => !starters.has(p.pid));
    const subsCount = Math.min(bench.length, 1 + rnd(3));
    const subs = new Set(shuffle(bench.slice()).slice(0, subsCount).map((p) => p.pid));
    const lineup = { starters, subs };
    lineup.events = rollAbsences(lineup);
    return lineup;
  }

  // Chi ha giocato quella partita (titolare o subentrato) guadagna una presenza.
  function registerAppearances(lineup) {
    S.squad.forEach((p) => { if (lineup.starters.has(p.pid) || lineup.subs.has(p.pid)) p.seasonApps = (p.seasonApps || 0) + 1; });
  }

  // Un subentrato pesa una frazione di un titolare (meno minuti in campo), e chi non ha
  // giocato affatto quella partita non può segnare né assistere in essa.
  const SUB_FACTOR = 0.4;

  const lineupFactor = (p, lineup) => lineup.starters.has(p.pid) ? 1 : lineup.subs.has(p.pid) ? SUB_FACTOR : 0;

  // Peso di un giocatore come possibile marcatore: il ruolo pesa più di tutto, ma tra
  // giocatori dello stesso ruolo quelli più forti (e in forma migliore) segnano di più.
  const scorerWeight = (p, lineup) => (POS_SCORE_WEIGHT[p.pos] || 1) * Math.pow(Math.max(p.ovr, 30) / 50, 1.7) * lineupFactor(p, lineup) * (p.formSeason || 1);

  function pickScorer(lineup) {
    if (!S.squad.length) return null;
    const total = S.squad.reduce((a, p) => a + scorerWeight(p, lineup), 0);
    if (total <= 0) return null;
    let r = Math.random() * total;
    for (const p of S.squad) { const w = scorerWeight(p, lineup); r -= w; if (r <= 0 && w > 0) return p; }
    return null;
  }

  const assistWeight = (p, lineup) => (POS_ASSIST_WEIGHT[p.pos] || 1) * Math.pow(Math.max(p.ovr, 30) / 50, 1.4) * lineupFactor(p, lineup) * (p.formSeason || 1);

  function pickAssister(scorerPid, lineup) {
    const pool = S.squad.filter((p) => p.pid !== scorerPid);
    if (!pool.length) return null;
    const total = pool.reduce((a, p) => a + assistWeight(p, lineup), 0);
    if (total <= 0) return null;
    let r = Math.random() * total;
    for (const p of pool) { const w = assistWeight(p, lineup); r -= w; if (r <= 0 && w > 0) return p; }
    return null;
  }

  // Il portiere che ha giocato la partita: quello titolare nella formazione di giornata.
  function matchGK(lineup) {
    return S.squad.find((p) => p.pos === 'POR' && lineup.starters.has(p.pid)) || null;
  }

  function seasonPerformanceRatio(p) {
    const appsRatio = clamp((p.seasonApps || 0) / Math.max(1, gp()), 0.05, 1);
    if (p.pos === 'POR') {
      const expectedCS = gp() * 0.28 * appsRatio;
      return ((p.seasonCleanSheets || 0) + 0.5) / (expectedCS + 0.5);
    }
    const baseline = (POS_PROD_BASELINE[p.pos] || 4) * appsRatio;
    const production = (p.seasonGoals || 0) + (p.seasonAssists || 0) * 0.7;
    return (production + 0.5) / (baseline + 0.5);
  }

  // La crescita "di mestiere" legata all'età: i giovanissimi migliorano rapidamente, il
  // physico regge stabile in mezzo alla carriera, dopo i 32 anni il calo è certo e sempre
  // più marcato. Ci si somma sopra l'effetto della stagione appena giocata: un'esplosione
  // (tanti gol/assist sopra l'atteso) spinge l'overall più su, una stagione opaca lo tira
  // giù — a qualunque età, ma pesa meno su un ragazzino e di più su un veterano.
  function ageGrowthBase(age) {
    if (age <= 20) return 3.0;
    if (age <= 23) return 2.2;
    if (age <= 26) return 1.1;
    if (age <= 29) return 0.2;
    if (age <= 31) return -0.4;
    if (age <= 32) return -1.2;
    return -2.6 - (age - 32) * 0.5;
  }

  function seasonOvrDelta(p) {
    const ratio = seasonPerformanceRatio(p);
    // sopra 1 = stagione da incorniciare, sotto 1 = deludente; pesa di più verso l'alto
    // (le esplosioni improvvise fanno più notizia dei cali) ma può affondare parecchio.
    const perf = clamp((ratio - 1) * 3.5, -4.5, 7);
    const noise = (Math.random() - 0.5) * 2;
    return Math.round(ageGrowthBase(p.age) + perf + noise);
  }

  // Marcatore per un avversario di Serie A: pesca dalla sua rosa reale (Quotazioni
  // Fantacalcio 2026/27) con lo stesso peso ruolo+forza usato per la nostra squadra, solo
  // calibrato sulla scala di quotazione (1-37) invece che sull'overall (40-94).
  function pickRealScorer(roster) {
    if (!roster || !roster.length) return null;
    const weight = (p) => (POS_SCORE_WEIGHT[p.pos] || 1) * Math.pow(Math.max(p.q, 1) / 10, 1.4);
    const total = roster.reduce((a, p) => a + weight(p), 0);
    let r = Math.random() * total;
    for (const p of roster) { r -= weight(p); if (r <= 0) return p; }
    return roster[roster.length - 1];
  }

  // Genera `count` gol con minuto e marcatore. Per la nostra squadra pesca dalla rosa (e
  // aggiorna le statistiche stagionali di marcatore e assistman, l'80% dei gol con
  // assist); per l'avversario, se è un club di Serie A con una rosa reale nota la usa,
  // altrimenti (categorie inferiori, club senza dati) genera un nome plausibile.
  function genGoals(count, isUs, oppClub, lineup) {
    const mins = []; for (let i = 0; i < count; i++) mins.push(1 + rnd(90));
    mins.sort((a, b) => a - b);
    const oppRoster = !isUs && oppClub ? (SERIE_A_ROSTERS[oppClub] || SERIE_B_ROSTERS[oppClub]) : null;
    return mins.map((min) => {
      if (!isUs) { const rp = oppRoster ? pickRealScorer(oppRoster) : null; return { min, name: rp ? rp.n : genName() }; }
      const p = pickScorer(lineup);
      if (p) {
        p.seasonGoals = (p.seasonGoals || 0) + 1;
        if (Math.random() < 0.8) { const a = pickAssister(p.pid, lineup); if (a) a.seasonAssists = (a.seasonAssists || 0) + 1; }
      }
      return { min, name: p ? p.n : 'Autorete' };
    });
  }

  // Un clean sheet va al portiere che ha giocato quella partita, ogni volta che la
  // squadra non subisce gol.
  function registerCleanSheet(ga, lineup) {
    if (ga !== 0) return;
    const p = matchGK(lineup);
    if (p) p.seasonCleanSheets = (p.seasonCleanSheets || 0) + 1;
  }

  // Raggruppa i gol per marcatore per una riga compatta tipo "Rossi 12', 55' · Bianchi 78'".
  function fmtScorers(goals) {
    if (!goals || !goals.length) return '';
    const byName = [];
    goals.forEach((g) => { let e = byName.find((x) => x.name === g.name); if (!e) { e = { name: g.name, mins: [] }; byName.push(e); } e.mins.push(g.min); });
    return byName.map((e) => e.name + ' ' + e.mins.map((m) => m + "'").join(', ')).join(' · ');
  }

  let S = null;

  const divOf = () => DIVS[S.div];

  const gp = () => (divOf().teams - 1) * 2;

  const capOf = () => STADIUM[S.stadiumTier].cap;

  /* ---------------- stipendi, giocatori, allenatori, sponsor ---------------- */
  // Un'unica curva di stipendi globale: i giocatori migliori chiedono di più, ovunque
  // tu sia. Questo è il freno che impedisce di comprare una squadra da Serie B con un
  // budget da Serie D.
  function roundWage(w) { if (w >= 50e3) return Math.round(w / 1e3) * 1e3; if (w >= 5e3) return Math.round(w / 5e2) * 5e2; return Math.max(250, Math.round(w / 50) * 50); }

  const wageFor = (ovr) => roundWage(600 * Math.pow(1.135, ovr - 45) * (0.88 + Math.random() * 0.28));

  const scoutTier = () => SCOUT_TIERS[S.scoutLevel || 0];

  const scoutUpgradeCost = (lvl) => Math.round(divOf().spin * [0, 1.3, 2.8, 5.5][lvl] / 1000) * 1000;

  // Un prospetto giovane (16-19 anni) gratuito, generato al più una volta a stagione se il
  // dado lo concede: non entra subito in squadra, va ingaggiato dal presidente come uno
  // svincolato.
  function maybeScoutProspect() {
    if (!S.scoutLevel || S.scoutProspectSeason === S.season) return;
    S.scoutProspectSeason = S.season;
    if (Math.random() < scoutTier().prospectChance) {
      const d = divOf(), nat = pickNationality(S.div);
      const ovr = clamp(gaussInt(d.avg - 5, 5), 40, 90);
      S.scoutProspect = { n: genName(nat), nat, ovr, age: 16 + rnd(4), wage: wageFor(ovr), yrs: 3 + rnd(2), pid: newPid(), pos: randPos(), seasonGoals: 0, seasonAssists: 0, seasonCleanSheets: 0, seasonApps: 0 };
    }
  }

  function spinPlayer(premium) {
    const d = divOf(), scout = scoutTier();
    let ovr = gaussInt(d.avg + (premium ? 6 : 1) + scout.bonus, clamp(4 + scout.varDelta, 2, 4));
    if (Math.random() < (premium ? 0.09 : 0) + scout.gem) ovr += 5 + rnd(4);   // lo scout scopre un gioiello
    ovr = clamp(ovr, 40, 94);
    const age = premium && Math.random() < 0.35 ? 18 + rnd(5) : 19 + rnd(13);
    const nat = pickNationality(S.div);
    return { n: genName(nat), nat, ovr, age, wage: wageFor(ovr), yrs: 3 + rnd(2), pid: newPid(), pos: randPos(), seasonGoals: 0, seasonAssists: 0, seasonCleanSheets: 0, seasonApps: 0 };
  }

  // Svincolati: nessun costo di cartellino, rating scarso per il livello, stipendi modesti.
  // Servono a portare un club in difficoltà al minimo di 16 giocatori, non a vincere partite.
  const freeAgent = () => { const d = divOf(); const ovr = clamp(d.avg - 13 + rnd(6), 40, 94); const nat = pickNationality(S.div); return { n: genName(nat), nat, ovr, age: 24 + rnd(9), wage: roundWage(wageFor(ovr) * 0.7), yrs: 1 + rnd(2), pid: newPid(), pos: randPos(), seasonGoals: 0, seasonAssists: 0, seasonCleanSheets: 0, seasonApps: 0 }; };

  const playerValue = (p) => p.wage * 52 * (p.ovr >= 85 ? 9 : p.ovr >= 78 ? 7 : p.ovr >= 68 ? 5 : 3.5) * (p.age <= 23 ? 1.4 : p.age >= 31 ? 0.6 : 1);

  const wageBill = () => S.squad.reduce((a, p) => a + p.wage, 0) * 52;

  /* ---------------- contratti + offerte di mercato ---------------- */
  // Ogni giocatore ha un `pid` (id stabile, sopravvive a riordini/ricariche in modo che le
  // offerte possano puntare a lui) e `yrs` = anni di contratto rimasti. Un contratto che
  // arriva a zero senza rinnovo in advance() lo lascia libero a parametro zero.
  function newPid() { const id = S.pidNext || 1; S.pidNext = id + 1; return id; }

  function normSquad() {
    if (!S || !S.squad) return;
    if (S.pidNext == null) S.pidNext = 1;
    if (!S.offers) S.offers = [];
    if (!S.crestColors) S.crestColors = randCrestColors();
    if (!S.crestShape) S.crestShape = CREST_DEFAULT.shape;
    if (S.scoutLevel == null) S.scoutLevel = 0;
    if (S.scoutProspectSeason == null) S.scoutProspectSeason = 0;
    S.squad.forEach((p) => { if (p.yrs == null) p.yrs = 2 + rnd(2); if (p.pid == null) p.pid = newPid(); if (!p.pos) p.pos = randPos(); if (p.seasonGoals == null) p.seasonGoals = 0; if (p.seasonAssists == null) p.seasonAssists = 0; if (p.seasonCleanSheets == null) p.seasonCleanSheets = 0; if (p.seasonApps == null) p.seasonApps = 0; if (!p.nat) p.nat = pickNationality(S.div); if (p.outWeeks == null) p.outWeeks = 0; if (p.suspMatches == null) p.suspMatches = 0; });
  }

  const finalYear = (p) => (p.yrs || 0) <= 1;   // ultimo anno di contratto -> rinnova o lo perdi a zero

  // Cosa chiede per rinnovare: il suo stipendio di mercato per il suo rating (spesso
  // migliorato) più un premio più alto per i giovani talenti. Mai un taglio; i giocatori
  // più anziani chiedono di meno.
  function renewWage(p) {
    const d = divOf();
    const star = p.ovr >= d.avg + 6 ? 0.16 : p.ovr >= d.avg + 2 ? 0.08 : 0;
    const youth = p.age <= 22 ? 0.14 : p.age <= 26 ? 0.05 : p.age >= 32 ? -0.02 : 0;
    return roundWage(Math.max(p.wage, wageFor(p.ovr)) * (1.08 + star + youth));
  }

  const renewYears = (p) => (p.age >= 31 ? 1 + rnd(2) : 3 + rnd(2));

  // Un'offerta è un vero premio sul 30% del valore di svincolo, quindi incassare è
  // redditizio ma perdi il giocatore. Arrotondata a una cifra tonda.
  function offerFee(p) {
    const v = playerValue(p) * (0.95 + Math.random() * 0.55);
    return v >= 1e6 ? Math.round(v / 1e5) * 1e5 : Math.round(v / 1e4) * 1e4;
  }

  function buyerClub() {
    const up = Math.min(4, S.div + 1 + rnd(2));   // un club una o due categorie sopra si fa avanti
    const pool = (POOLS[up] || POOLS[4]).filter((c) => c.n !== S.club);
    return pool.length ? pick(pool).n : 'un club più grande';
  }

  // I rivali fanno offerte per i tuoi giocatori migliori: quelli chiaramente sopra il
  // livello, o i giovani precoci. Zero a due offerte all'estate, pesate perché i veri
  // gioielli attirino interesse e i giocatori normali no.
  function genOffers() {
    const d = divOf();
    const targets = S.squad
      .filter((p) => p.ovr >= d.avg + 4 || (p.age <= 21 && p.ovr >= d.avg + 1))
      .sort((a, b) => (b.ovr + (b.age <= 21 ? 4 : 0)) - (a.ovr + (a.age <= 21 ? 4 : 0)))
      .slice(0, 2);
    const offers = [];
    targets.forEach((p, i) => { if (Math.random() < (i === 0 ? 0.7 : 0.45)) offers.push({ pid: p.pid, club: buyerClub(), fee: offerFee(p) }); });
    return offers;
  }

  // Affaticamento dello scout: ogni spin comprato nella stessa finestra pre-stagione
  // costa il 30% in più dell'ultimo (standard e marquee condividono il contatore). Uno o
  // due spin restano accessibili, ripetere l'intera rosa in una sola estate diventa
  // rovinosamente costoso.
  function spinCostNow(premium) {
    const base = premium ? divOf().premium : divOf().spin;
    const w = base * Math.pow(1.3, S.spinsBought || 0);
    if (w >= 1e6) return Math.round(w / 1e5) * 1e5;
    if (w >= 1e5) return Math.round(w / 5e3) * 5e3;
    return Math.round(w / 1e3) * 1e3;
  }

  // Ciò che resta davvero da spendere una volta coperti gli stipendi + l'allenatore della stagione.
  const kickoffBill = () => wageBill() + S.manager.salary;

  const freeToSpend = () => S.budget - kickoffBill();

  const mgrSalaryFor = (rating) => Math.round(40e3 * Math.pow(1.14, rating - 50) / 1e3) * 1e3;

  function genManager(bonus) {
    const r = clamp(divOf().mgrBase - 4 + rnd(12) + (bonus || 0), 45, 92);
    return { n: genName(), rating: r, salary: mgrSalaryFor(r) };
  }

  const mgrBonus = () => clamp((S.manager.rating - divOf().mgrBase) / 3.5, -3, 4);

  function sponsorOffers() {
    const d = divOf();
    const base = d.prize * 0.3 + capOf() * 9;
    const mk = (tag, mult, yrs, sent) => ({ name: pick(SPONSOR_BRANDS[tag]), tag, perYear: Math.round(base * mult * (0.85 + Math.random() * 0.3) / 1e4) * 1e4, years: yrs, left: yrs, sent });
    // Sempre esattamente TRE offerte. Dalla Serie B in su, un mega-sponsor globale
    // sostituisce lo sponsor di comunità.
    return S.div >= 3
      ? [mk('standard', 1.0, 2, 0), mk('betting', 1.5, 2, -2), mk('global', 2.2, 4, 0)]
      : [mk('community', 0.7, 3, 2), mk('standard', 1.0, 2, 0), mk('betting', 1.5, 2, -2)];
  }

  /* ---------------- forza della rosa + aspettative ---------------- */
  function squadStr() {
    const s = S.squad.slice().sort((a, b) => b.ovr - a.ovr);
    const eleven = s.slice(0, 11); while (eleven.length < 11) eleven.push({ ovr: 42 });
    const avg = eleven.reduce((a, p) => a + p.ovr, 0) / 11;
    return Math.round((avg + clamp((s.length - 11) * 0.25, 0, 2.5)) * 10) / 10;
  }

  const teamEff = () => squadStr() + mgrBonus() + (S.form || 0);

  function expectedPos() {
    const mine = squadStr() + mgrBonus();
    return 1 + S.opps.filter((o) => o.s > mine).length;
  }

  // Dove finiresti al ritmo di punti attuale (pre-stagione: proiettato sulla forza della rosa).
  function projectedPos() {
    if (!S.opps || !S.opps.length) return 0;
    const G = gp(), d = divOf();
    const mine = S.played > 0
      ? S.pts / S.played * G
      : (squadStr() + mgrBonus() - (d.avg - 21)) * 2.6 * G / 38;
    return 1 + S.opps.filter((o) => o.pts > mine).length;
  }

  /* ---------------- valore del club ---------------- */
  function computeWorth() {
    const squadVal = S.squad.reduce((a, p) => a + playerValue(p), 0);
    const brand = Math.round(Math.max(0, S.fanbase - 1) * WORTH_BASE[S.div] * 0.6);   // una tifoseria globale vale soldi veri
    return Math.round(WORTH_BASE[S.div] + squadVal + S.stadiumSpent * 1.25 + S.prestige + brand + Math.max(0, S.budget));
  }

  /* ---------------- salva / riprendi ---------------- */
  const DKEY = 'dsa_dynasty_owner';

  function saveGame() { try { if (S && !S.over) localStorage.setItem(DKEY, JSON.stringify(S)); } catch (e) {} }

  function loadSave() { try { const raw = localStorage.getItem(DKEY); if (!raw) return null; const s = JSON.parse(raw); return (s && s.squad && !s.over) ? s : null; } catch (e) { return null; } }

  function clearSave() { try { localStorage.removeItem(DKEY); } catch (e) {} }

  const hasSave = () => !!loadSave();

  function genTakeovers() {
    return SITUATIONS.map((s) => ({
      key: s.key, title: s.title, blurb: s.blurb,
      str: s.strRange[0] + rnd(s.strRange[1] - s.strRange[0] + 1),
      budget: s.budgetRange[0] + Math.random() * (s.budgetRange[1] - s.budgetRange[0]),
      stadiumTier: Math.random() < s.stadiumChance ? s.stadiumTier : 0,
      fanbase: s.fanbaseRange[0] + Math.random() * (s.fanbaseRange[1] - s.fanbaseRange[0]),
    }));
  }

  function startDynasty(owner, t, customClub) {
    clearSave();
    const squad = [];
    for (let i = 0; i < 16; i++) { const ovr = clamp(gaussInt(t.str - 1, 3.5), 40, 55); const nat = pickNationality(0); squad.push({ n: genName(nat), nat, ovr, age: 19 + rnd(12), wage: wageFor(ovr), yrs: 1 + rnd(3), pos: randPos(squad), seasonGoals: 0, seasonAssists: 0, seasonCleanSheets: 0, seasonApps: 0 }); }
    S = {
      owner, club: (customClub || '').slice(0, 24) || pick(POOLS[0]).n, div: 0, season: 1,
      budget: Math.round(t.budget), fanbase: Math.round(t.fanbase * 100) / 100,
      stadiumTier: t.stadiumTier, stadiumSpent: 0.6e6 + (t.stadiumTier ? STADIUM[1].cost : 0), ticket: 1,
      squad, manager: (function () { const r = clamp(DIVS[0].mgrBase - 2 + rnd(8), 45, 92); return { n: genName(), rating: r, salary: mgrSalaryFor(r) }; })(),
      sponsor: null, sent: 55, ownerRating: 62, prestige: 0, debtSeasons: 0,
      euro: false, euroComp: null, form: 0, spinsBought: 0,
      trophies: { titles: [0, 0, 0, 0, 0], nat: 0, ucl: 0, uel: 0, conf: 0, total: 0 },
      history: [], over: false, peakWorth: 0,
      pidNext: 1, offers: [],
      crestShape: crestShape, crestColors: crestColors.slice(),
      scoutLevel: 0, scoutProspect: null, scoutProspectSeason: 0,
    };
    normSquad();
    S.peakWorth = computeWorth();
    renderBoard();
  }

  function estSeasonRevenue() {
    const d = divOf(), t = TICKETS[S.ticket], ec = S.euro ? EURO_COMPS[S.euroComp] : null;
    const att = Math.min(capOf(), d.demand * S.fanbase * t.demand * (ec ? ec.attBoost : 1));
    const merch = d.demand * S.fanbase * d.ticket * 5;
    return Math.round(att * d.ticket * t.mult * (gp() / 2) + merch + d.prize + (S.sponsor ? S.sponsor.perYear : 0) + (ec ? ec.entry : 0) - (d.admin + S.stadiumSpent * 0.03));
  }

  /* ---------------- stagione ---------------- */
  function rivals() { return POOLS[S.div].filter((c) => c.n !== S.club).slice(0, divOf().teams - 1); }

  function seasonPtsFor(str) {
    const G = gp(), d = divOf();
    return clamp(Math.round(((str - (d.avg - 21)) * 2.6 + (Math.random() * 12 - 6)) * G / 38), 8, Math.round(G * 2.6));
  }

  function startSeason() {
    if (S.squad.length < MIN_SQUAD) { toast('Ti servono almeno ' + MIN_SQUAD + ' giocatori per iniziare la stagione. Ingaggia svincolati gratis se sei a corto.'); renderBoard(); return; }
    if (S.budget < wageBill() + S.manager.salary) { toast('Ti mancano ' + fmtMoney(wageBill() + S.manager.salary - S.budget) + ' per il monte ingaggi. Vendi giocatori o trova soldi.'); renderBoard(); return; }
    S.budget -= wageBill() + S.manager.salary;
    S.sent = clamp(S.sent + TICKETS[S.ticket].sent, 0, 100);
    S.seasonActive = true; S.winterDone = false; S._janCands = null; S._janSwitchUsed = false; S._janMgrCands = null;
    S.played = 0; S.pts = 0; S.gf = 0; S.ga = 0; S.wins = 0; S.results = []; S.last5 = []; S.form = 0;
    // Azzera le statistiche (valgono per la stagione in corso) e tira una "forma stagionale":
    // la maggior parte dei giocatori resta vicina alla norma, ma ogni tanto qualcuno esplode
    // (fino quasi al doppio della sua resa attesa) o vive un'annata opaca (anche la metà).
    S.squad.forEach((p) => { p.seasonGoals = 0; p.seasonAssists = 0; p.seasonCleanSheets = 0; p.seasonApps = 0; p.formSeason = clamp(1 + gaussInt(0, 28) / 100, 0.45, 1.9); p.outWeeks = 0; p.suspMatches = 0; });
    S.cupMoney = 0; S.euroMoney = S.euro ? EURO_COMPS[S.euroComp].entry : 0;   // montepremi di partecipazione alla coppa europea
    S.opps = rivals().map((o) => ({ name: o.n, s: o.s, pts: seasonPtsFor(o.s), gf: 0, ga: 0 }));
    S.opps.forEach((o) => { o.gf = Math.round(gp() * (o.s - (divOf().avg - 12)) / 22); o.ga = Math.round(gp() * ((divOf().avg + 10) - o.s) / 22); });
    const fx = [];
    S.opps.forEach((o, i) => { fx.push({ opp: i, home: true }); fx.push({ opp: i, home: false }); });
    shuffle(fx); S.fixtures = fx.map((f, i) => ({ ...f, mw: i + 1 }));
    S.cups = { nat: { name: 'Coppa Italia', rounds: ['Turno 2', 'Turno 3', 'Turno 4', 'Quarti', 'Semifinale', 'Finale'], at: 0, out: false, won: false } };
    if (S.euro && S.div === 4) S.cups.euro = { name: EURO_COMPS[S.euroComp].name, rounds: ['Ottavi', 'Quarti', 'Semifinale', 'Finale'], at: 0, out: false, won: false };
    show('owSeasonScreen'); $('owLog').innerHTML = ''; renderHud(); renderCups(); saveGame();
  }

  function simMatch() {
    if (!S.seasonActive || S.played >= gp()) return;
    const fx = S.fixtures[S.played], opp = S.opps[fx.opp];
    const d = teamEff() - opp.s + (fx.home ? 2.4 : -1.1);
    const gf = poisson(clamp(1.32 + d * 0.045, 0.15, 4.4)), ga = poisson(clamp(1.32 - d * 0.045, 0.15, 4.4));
    S.played++; S.gf += gf; S.ga += ga;
    const res = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
    S.pts += res === 'W' ? 3 : res === 'D' ? 1 : 0;
    if (res === 'W') S.wins++;
    S.last5.push(res === 'W' ? 1 : res === 'L' ? -1 : 0); if (S.last5.length > 5) S.last5.shift();
    S.form = clamp(S.last5.reduce((a, b) => a + b, 0) * 0.5, -2.5, 2.5);
    const lineup = pickMatchLineup(S.squad);
    registerAppearances(lineup);
    const goalsFor = genGoals(gf, true, null, lineup), goalsAgainst = genGoals(ga, false, opp.name);
    registerCleanSheet(ga, lineup);
    const row = { mw: fx.mw, opp: opp.name, home: fx.home, gf, ga, res, goalsFor, goalsAgainst, events: lineup.events };
    S.results.push(row); logMatch(row);
    maybeCupRound();
    computeTable(); renderHud(); saveGame();
    if (S.played === (gp() >> 1) && !S.winterDone) { openWinter(); return; }
    if (S.played >= gp()) endSeason();
  }

  function simToEnd() { while (S.seasonActive && S.played < gp() && !S._pause) { const b = S.played; simMatch(); if (S._pause) break; if (S.played === b) break; } }

  /* ---------------- coppe (checkpoint scalati sulla lunghezza di stagione) ---------------- */
  function maybeCupRound() {
    const G = gp();
    const f = (fr) => Math.max(1, Math.min(G - 1, Math.round(G * fr)));
    const checkpoints = { nat: [f(0.10), f(0.24), f(0.40), f(0.57), f(0.74), f(0.92)], euro: [f(0.21), f(0.47), f(0.68), f(0.92)] };
    for (const key of ['nat', 'euro']) {
      const cup = S.cups[key]; if (!cup || cup.out || cup.won) continue;
      if (cup.at < cup.rounds.length && S.played >= checkpoints[key][cup.at]) resolveCupRound(key);
    }
  }

  function resolveCupRound(key) {
    const cup = S.cups[key], d = divOf(), i = cup.at;
    const oppStr = key === 'euro' ? EURO_COMPS[S.euroComp].oppBase + i * 3 + rnd(5) : Math.min(90, d.avg + 2 + i * 4 + rnd(6));
    const oppName = cupOpponentName(key, oppStr);
    const diff = teamEff() - oppStr;
    const winP = 1 / (1 + Math.exp(-diff / 6.5));
    const won = Math.random() < winP;
    let gf = poisson(clamp(1.3 + diff * 0.05, 0.2, 4)), ga = poisson(clamp(1.3 - diff * 0.05, 0.2, 4));
    // manteniamo il risultato coerente con l'esito (parità = passaggio/eliminazione ai rigori)
    if (won && gf < ga) { const t = gf; gf = ga; ga = t; }
    else if (!won && gf > ga) { const t = gf; gf = ga; ga = t; }
    cup.at++;
    if (won) {
      if (key === 'nat') S.cupMoney += d.cupBase * (i + 1);
      else S.euroMoney += EURO_COMPS[S.euroComp].roundWin;
    }
    const cupLineup = pickMatchLineup(S.squad);
    registerAppearances(cupLineup);
    logCup(cup.name, cup.rounds[i], won, gf, ga, genGoals(gf, true, null, cupLineup), genGoals(ga, false, oppName), oppName);
    registerCleanSheet(ga, cupLineup);
    if (!won) cup.out = true; else if (cup.at >= cup.rounds.length) cup.won = true;
    renderCups();
  }

  /* ---------------- mercato di gennaio (ricostruito da zero) ---------------- */
  // A metà stagione si aprono due candidati (niente scout da pagare a parte: eccoli
  // subito). Per ciascuno due strade, indipendenti l'una dall'altra:
  //  - Prestito fino a giugno: niente cartellino, solo il 60% del suo stipendio annuo
  //    con un ulteriore 15% di sconto. Gioca per te, entra nelle statistiche finali, ma
  //    a fine stagione torna al suo club — non resta in rosa.
  //  - Acquisto a titolo definitivo: stesso costo del prestito PIÙ un cartellino, tanto
  //    più caro quanto più il giocatore è forte (overall) e giovane (età). Resta in
  //    rosa per sempre, come un acquisto normale.
  // Si può decidere per entrambi i candidati (o per nessuno): non è un "uno o l'altro".
  const janLoanCost = (p) => Math.round(p.wage * 52 * 0.6 * 0.85);   // 60% dello stipendio, scontato del 15%
  const janTransferFee = (p) => Math.round(playerValue(p) * 0.6);

  /* ---------------- fine stagione ---------------- */
  function currentPos() { computeTable(); return S.table.findIndex((t) => t.me) + 1; }

  function endSeason() {
    S.seasonActive = false;
    const d = divOf(), G = gp();
    const pos = currentPos();
    const exp = expectedPos();
    const auto = d.promoted > 0 && pos <= d.promoted;
    // ---- playoff promozione (regole reali della piramide): finisci nei posti playoff e
    // giochi una semifinale + finale per UN posto extra di promozione ----
    let playoff = null;
    if (!auto && d.playoff > 0 && pos > d.promoted && pos <= d.promoted + d.playoff) {
      const lo = d.promoted + 1, hi = d.promoted + d.playoff;
      const strAt = (position) => { const row = S.table[position - 1]; const o = S.opps.find((x) => x.name === row.name); return o ? o.s : d.avg; };
      const nameAt = (position) => S.table[position - 1].name;
      const rounds = [];
      const playPO = (oppName, oppStr, stage) => {
        const diff = teamEff() - oppStr;
        const winP = 1 / (1 + Math.exp(-diff / 6.0));
        const won = Math.random() < winP;
        let gf = poisson(clamp(1.25 + diff * 0.05, 0.2, 4)), ga = poisson(clamp(1.25 - diff * 0.05, 0.2, 4));
        // manteniamo il risultato coerente con l'esito (parità significa rigori)
        if (won && gf < ga) { const t = gf; gf = ga; ga = t; }
        else if (!won && gf > ga) { const t = gf; gf = ga; ga = t; }
        const poLineup = pickMatchLineup(S.squad);
        registerAppearances(poLineup);
        rounds.push({ stage, opp: oppName, gf, ga, won, pens: gf === ga, goalsFor: genGoals(gf, true, null, poLineup), goalsAgainst: genGoals(ga, false, oppName) });
        registerCleanSheet(ga, poLineup);
        return won;
      };
      let won = false;
      const mirror = lo + hi - pos;   // semifinali con teste di serie: 3° vs 6°, 4° vs 5° (e equivalenti 4°-7°)
      if (playPO(nameAt(mirror), strAt(mirror), 'Semifinale')) {
        const rest = []; for (let i = lo; i <= hi; i++) if (i !== pos && i !== mirror) rest.push(i);
        const a = rest[0], b = rest[1] != null ? rest[1] : rest[0];
        const finalist = Math.random() < (1 / (1 + Math.exp(-(strAt(a) - strAt(b)) / 5))) ? a : b;
        won = playPO(nameAt(finalist), strAt(finalist), 'Finale');
      }
      playoff = { rounds, won };
    }
    const promoted = auto || !!(playoff && playoff.won);
    const relegated = d.releg > 0 && pos > d.teams - d.releg;
    const title = pos === 1;
    const natWon = !!(S.cups.nat && S.cups.nat.won);
    const natSF = !!(S.cups.nat && S.cups.nat.at >= 5 && !natWon);
    const euroWon = !!(S.cups.euro && S.cups.euro.won);
    const ecPlaying = S.euro ? EURO_COMPS[S.euroComp] : null;
    // ----- soldi -----
    const t = TICKETS[S.ticket];
    const winPct = S.wins / G;
    // Le notti europee gonfiano anche il pubblico
    const demand = d.demand * S.fanbase * (1 + winPct * 0.35 + (S.sent - 50) / 220) * t.demand * (ecPlaying ? ecPlaying.attBoost : 1);
    const att = Math.round(Math.min(capOf(), Math.max(600, demand)));
    const matchday = Math.round(att * d.ticket * t.mult * (G / 2));
    // Il merchandising scala con la TIFOSERIA, non con lo stadio: una tifoseria in
    // rapida crescita vende maglie che entrino o no nello stadio.
    const merch = Math.round(d.demand * S.fanbase * d.ticket * 5 * (0.8 + winPct * 0.5) / 1e3) * 1e3;
    const sponsorMoney = S.sponsor ? S.sponsor.perYear : 0;
    const prize = Math.round(d.prize + (d.teams - pos) * d.perPlace + (promoted ? d.promoBonus : 0) + (title ? d.titleBonus : 0));
    const euroTitleBonus = euroWon ? EURO_COMPS[S.euroComp].titleBonus : 0;
    const upkeep = Math.round(d.admin + S.stadiumSpent * 0.03);
    const net = matchday + merch + sponsorMoney + prize + S.cupMoney + S.euroMoney + euroTitleBonus - upkeep;
    S.budget += net;
    // ----- qualificazione europea di quest'anno (determina la coppa della prossima stagione) -----
    const qualTier = S.div === 4 ? euroTierFor(pos) : null;
    // ----- trofei + prestigio -----
    const trophies = [];
    if (title) { trophies.push(d.name + ' - Titolo'); S.trophies.titles[S.div]++; S.trophies.total++; S.prestige += TROPHY_WORTH[S.div]; }
    if (natWon) { trophies.push('Coppa Italia'); S.trophies.nat++; S.trophies.total++; S.prestige += S.div >= 3 ? 45e6 : 2e6; }
    if (euroWon) { const ec = EURO_COMPS[S.euroComp]; trophies.push(ec.name); S.trophies[S.euroComp]++; S.trophies.total++; S.prestige += ec.prestige; }
    if (qualTier) S.prestige += EURO_COMPS[qualTier].qualPrestige;   // la qualificazione europea costruisce il brand
    // ----- umore -----
    const sentItems = [];
    const bump = (label, v) => { if (!v) return; sentItems.push([label, v]); S.sent = clamp(S.sent + v, 0, 100); };
    bump('Risultati vs aspettative', clamp(Math.round((exp - pos) * 0.9), -10, 10));
    if (promoted) bump('PROMOZIONE', 15);
    if (playoff && playoff.won) bump('Dramma playoff', 3);
    if (playoff && !playoff.won) bump('Delusione playoff', -3);
    if (title) bump('Campioni', 10);
    if (qualTier && !title) bump('Qualificati per la ' + EURO_COMPS[qualTier].name, EURO_COMPS[qualTier].qualBump);
    if (relegated) bump('Retrocessione', -18);
    if (natWon) bump('Vincitori di coppa', 8); else if (natSF) bump('Un bel percorso in coppa', 4);
    if (euroWon) bump('Gloria in ' + EURO_COMPS[S.euroComp].name, EURO_COMPS[S.euroComp].gloryBump);
    if (S.budget < 0) bump('Preoccupazioni economiche', -5);
    // ----- crescita tifoseria: successo e prezzi equi fanno crescere i tifosi, prezzi
    // premium e fallimenti frenano la portata del club. Una tifoseria più grande
    // significa pubblico più grande E più merchandising la stagione dopo, quindi
    // questo si autoalimenta. -----
    const overach = exp - pos;
    const fbBefore = S.fanbase;
    let grow = (promoted ? 0.03 : 0) + (title ? 0.02 : 0) + (relegated ? -0.035 : 0)
      + clamp(overach, -6, 6) * 0.003
      + (S.sent - 50) * 0.0006
      + t.fanGrow
      + (euroWon ? EURO_COMPS[S.euroComp].growWon : (ecPlaying ? ecPlaying.growPlaying : 0));
    grow = clamp(grow, -0.06, 0.08);
    S.fanbase = Math.round(clamp(S.fanbase + grow, 0.7, 3.0) * 1000) / 1000;
    const fbDelta = Math.round((S.fanbase - fbBefore) * 100) / 100;
    // ----- gradimento proprietario -----
    const ratingDelta = Math.round((S.sent - 50) / 6 + (exp - pos) * 0.7 + (promoted ? 10 : 0) + (relegated ? -12 : 0) + trophies.length * 4 + (S.budget < 0 ? -9 : 0) + (playoff ? (playoff.won ? 2 : -2) : 0));
    S.ownerRating = clamp(S.ownerRating + ratingDelta, 0, 100);
    // ----- destino -----
    let fate = null;
    if (S.ownerRating < 25) fate = 'forced';
    else if (S.budget < 0) { S.debtSeasons = (S.debtSeasons || 0) + 1; if (S.debtSeasons >= 2) fate = 'admin'; }
    else S.debtSeasons = 0;
    const worth = computeWorth(); S.peakWorth = Math.max(S.peakWorth, worth);
    S.euroCompNext = qualTier;
    // ----- crescita/calo di ogni giocatore, in base a età e prestazione della stagione
    // appena chiusa: qui, PRIMA di mostrare le statistiche, così a fine stagione si vede
    // subito quanto ciascuno è cresciuto o sceso. Il ritiro (36+ dopo il compleanno di
    // fine stagione) viene solo marcato: la rimozione vera avviene entrando in quella
    // successiva, per non far sparire un giocatore dalle sue stesse statistiche finali. -----
    S.squad.forEach((p) => {
      p.age++;
      const before = p.ovr;
      p.ovr = clamp(p.ovr + seasonOvrDelta(p), 40, 94);
      p._ovrDelta = p.ovr - before;
      p._retiring = p.age >= 36;
    });
    S.history.push({ season: S.season, div: d.name, pos, promoted, relegated, trophies, net, worth, budget: S.budget });
    const statement = [
      ['Incasso stadio (' + att.toLocaleString('it-IT') + ' medi)', matchday],
      ['Merchandising (tifoseria ' + S.fanbase.toFixed(2) + ')', merch],
      ['Sponsorizzazione', sponsorMoney],
      ['Montepremi + diritti TV', prize],
      ['Percorso in Coppa Italia', S.cupMoney],
    ];
    if (S.euroMoney + euroTitleBonus > 0) statement.push([EURO_COMPS[S.euroComp].name + ' ' + EURO_COMPS[S.euroComp].flag, S.euroMoney + euroTitleBonus]);
    statement.push(['Costi di gestione', -upkeep], ['Stipendi + allenatore (pagati all\'avvio)', 0]);
    S._end = {
      pos, exp, promoted, relegated, title, natWon, euroWon, euroCompWon: S.euroComp, trophies, fate, playoff, fbDelta, euroQual: qualTier,
      att, statement,
      net, sentItems, ratingDelta, worth,
    };
    renderSeasonEnd();
  }

  function advance() {
    const e = S._end;
    if (e.promoted) S.div = Math.min(4, S.div + 1);
    if (e.relegated) S.div = Math.max(0, S.div - 1);
    S.euro = !!S.euroCompNext && S.div === 4;
    S.euroComp = S.euro ? S.euroCompNext : null;
    // Spirale degli stipendi: la promozione porta aumenti in tutta la rosa, restare in
    // alto significa inflazione annuale, la retrocessione permette tagli. È il freno che
    // impedisce ai soldi di accumularsi semplicemente una volta stabiliti.
    if (e.promoted) { S.squad.forEach((p) => p.wage = roundWage(p.wage * 1.25)); toast('Aumenti da promozione: il monte ingaggi della rosa sale del 25%.'); }
    else if (e.relegated) { S.squad.forEach((p) => p.wage = roundWage(p.wage * 0.85)); }
    else if (S.div === 4) { S.squad.forEach((p) => p.wage = roundWage(p.wage * 1.08)); }
    // il contratto sponsor scende
    if (S.sponsor) { S.sponsor.left--; S.sent = clamp(S.sent + (S.sponsor.sent || 0), 0, 100); if (S.sponsor.left <= 0) { toast('L\'accordo con ' + S.sponsor.name + ' scade.'); S.sponsor = null; } }
    // Età e overall sono già stati aggiornati a fine stagione (endSeason), per poterli
    // mostrare nelle statistiche; qui si applica solo il ritiro di chi ha superato i 35.
    const retired = S.squad.filter((p) => p._retiring).map((p) => p.n);
    S.squad = S.squad.filter((p) => !p._retiring);
    if (retired.length) toast(retired.join(', ') + ' si ritira' + (retired.length === 1 ? '' : 'no') + '.');
    S.squad.forEach((p) => { delete p._ovrDelta; delete p._retiring; });
    // I prestiti finiscono qui: il giocatore torna al suo club, qualunque sia il suo "yrs".
    const loanedBack = S.squad.filter((p) => p.loan).map((p) => p.n);
    S.squad = S.squad.filter((p) => !p.loan);
    if (loanedBack.length) toast(loanedBack.join(', ') + ' torna' + (loanedBack.length === 1 ? '' : 'no') + ' al suo club a fine prestito.');
    // I contratti scendono di un anno. Un accordo lasciato scadere senza rinnovo parte a parametro zero.
    const freed = [];
    S.squad.forEach((p) => { p.yrs = (p.yrs == null ? 1 : p.yrs) - 1; });
    S.squad = S.squad.filter((p) => { if ((p.yrs || 0) <= 0) { freed.push(p.n); return false; } return true; });
    if (freed.length) toast(freed.join(', ') + ' ' + (freed.length === 1 ? 'è andato' : 'sono andati') + ' in scadenza e ' + (freed.length === 1 ? 'parte' : 'partono') + ' a parametro zero.');
    S.season++;
    S.mgrOpts = null; S.sponsorOpts = null; S.investorUsed = false; S.spinsBought = 0; S._end = null;
    S.offers = genOffers();   // i club rivali fanno offerte per i tuoi giocatori migliori quest'estate
    renderBoard();
  }

  /* ---------------- fine carriera ---------------- */
  function endDynasty(how, saleMoney) {
    S.over = true; clearSave();
    S._how = how; S._sale = saleMoney || 0;
    renderEnd();
  }

  function computeTable() {
    const f = clamp(S.played / gp(), 0, 1);
    const rows = S.opps.map((o) => ({ name: o.name, pts: Math.round(o.pts * f), gd: Math.round((o.gf - o.ga) * f), me: false }));
    rows.push({ name: S.club, pts: S.pts, gd: S.gf - S.ga, me: true });
    rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd);
    S.table = rows;
  }
