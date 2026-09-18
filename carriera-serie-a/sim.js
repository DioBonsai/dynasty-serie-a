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
  // Età con una vera curva a campana invece di un intervallo piatto: più varietà, e senza
  // che i giocatori si accumulino tutti verso il bordo alto dell'intervallo come capitava
  // con `n + rnd(range)`.
  const genAge = (center, sd, lo, hi) => clamp(gaussInt(center, sd), lo, hi);

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

  // Risolve un codice nazione (es. 'BRA') nell'oggetto {code,name,flag} usato ovunque nel
  // gioco: cerca prima fra le nazioni note (ITA + NATIONS), altrimenti prova a decorarlo con
  // un'emoji bandiera generica calcolata dal codice ISO, così anche un codice non ancora in
  // NATIONS mostra comunque qualcosa invece di restare vuoto.
  function natByCode(code) {
    if (!code) return null;
    if (code === 'ITA') return ITA_NAT;
    const found = NATIONS.find((n) => n.code === code);
    if (found) return found;
    return { code, name: code, flag: '' };
  }

  // Disegna una bandiera in SVG (16x11) a partire da una ricetta di FLAG_SPECS: strisce
  // orizzontali/verticali, croce nordica (con eventuale bordo), saltire diagonale, cerchio
  // centrato o stella. Semplificate, ma nei colori veri — al contrario dell'emoji, si
  // vedono uguali su ogni sistema (niente più "IT"/"ES" testuali su Windows).
  function flagSVG(spec) {
    const w = 20, h = 14;
    let inner = '';
    if (spec.type === 'v') {
      const n = spec.colors.length, bw = w / n;
      inner = spec.colors.map((c, i) => `<rect x="${(i * bw).toFixed(2)}" y="0" width="${(bw + 0.5).toFixed(2)}" height="${h}" fill="${c}"/>`).join('');
    } else if (spec.type === 'cross') {
      const cx = 8;
      inner = `<rect width="${w}" height="${h}" fill="${spec.base}"/>`;
      if (spec.outline) inner += `<rect x="${cx - 3}" y="0" width="6" height="${h}" fill="${spec.outline}"/><rect x="0" y="${h / 2 - 3}" width="${w}" height="6" fill="${spec.outline}"/>`;
      inner += `<rect x="${cx - 2}" y="0" width="4" height="${h}" fill="${spec.cross}"/><rect x="0" y="${h / 2 - 2}" width="${w}" height="4" fill="${spec.cross}"/>`;
    } else if (spec.type === 'saltire') {
      inner = `<rect width="${w}" height="${h}" fill="${spec.base}"/><line x1="0" y1="0" x2="${w}" y2="${h}" stroke="${spec.cross}" stroke-width="3.2"/><line x1="${w}" y1="0" x2="0" y2="${h}" stroke="${spec.cross}" stroke-width="3.2"/>`;
    } else if (spec.type === 'circle') {
      inner = `<rect width="${w}" height="${h}" fill="${spec.base}"/><circle cx="${w / 2}" cy="${h / 2}" r="4" fill="${spec.circleColor}"/>`;
    } else if (spec.type === 'star') {
      inner = `<rect width="${w}" height="${h}" fill="${spec.base}"/><path d="M10 4 L11.1 7 L14.3 7 L11.7 8.9 L12.7 11.9 L10 10 L7.3 11.9 L8.3 8.9 L5.7 7 L8.9 7 Z" fill="${spec.starColor}"/>`;
    } else {
      const n = (spec.colors || []).length || 1, bh = h / n;
      inner = (spec.colors || [spec.base || '#888']).map((c, i) => `<rect x="0" y="${(i * bh).toFixed(2)}" width="${w}" height="${(bh + 0.5).toFixed(2)}" fill="${c}"/>`).join('');
    }
    return `<svg viewBox="0 0 ${w} ${h}" width="16" height="11" class="flag-ico">${inner}</svg>`;
  }
  const flagOf = (p) => {
    if (!p.nat) return '';
    const spec = FLAG_SPECS[p.nat.code];
    if (spec) return `<span class="flag-wrap" title="${p.nat.name}">${flagSVG(spec)}</span> `;
    return p.nat.flag ? p.nat.flag + ' ' : '';
  };

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
  function pickCoppaOpponent(oppStr, faced) {
    let all = [];
    POOLS.forEach((pool) => pool.forEach((c) => { if (c.n !== S.club) all.push(c); }));
    if (!all.length) return 'un club';
    if (faced && faced.length) { const filtered = all.filter((c) => !faced.includes(c.n)); if (filtered.length) all = filtered; }
    all.sort((a, b) => Math.abs(a.s - oppStr) - Math.abs(b.s - oppStr));
    return pick(all.slice(0, 6)).n;
  }

  // Pesca un club europeo VERO dalla fascia della coppa in corso (EURO_CLUBS[S.euroComp]),
  // il più vicino possibile alla forza richiesta dal turno, escludendo chi è già stato
  // affrontato in questa corsa. Se la fascia si esaurisce (non dovrebbe mai succedere, sono
  // 18-20 club a fascia contro un massimo di 8 turni fra girone ed eliminazione diretta),
  // usa il generatore prefisso+città come riserva.
  function genEuroClub(faced, oppStr) {
    const tier = (S.euroComp && EURO_CLUBS[S.euroComp]) || EURO_CLUBS.conf;
    let pool = faced && faced.length ? tier.filter((c) => !faced.includes(c.n)) : tier;
    if (!pool.length) {
      for (let i = 0; i < 10; i++) {
        const name = pick(EURO_CLUB_PREFIX) + ' ' + pick(EURO_CITIES);
        if (!faced || !faced.includes(name)) return name;
      }
      return pick(EURO_CLUB_PREFIX) + ' ' + pick(EURO_CITIES);
    }
    pool = pool.slice().sort((a, b) => Math.abs(a.s - oppStr) - Math.abs(b.s - oppStr));
    return pick(pool.slice(0, 5)).n;
  }

  // `faced` è la lista dei nomi già pescati in QUESTA corsa di coppa (stessa stagione):
  // evita di incontrare due volte lo stesso avversario nello stesso torneo.
  function cupOpponentName(key, oppStr, faced) { return key === 'euro' ? genEuroClub(faced, oppStr) : pickCoppaOpponent(oppStr, faced); }

  // Trasforma il RIEMPIMENTO di ogni ruolo (quanti ne ho rispetto al tetto POS_CAP) in
  // pesi di estrazione: pochi elementi in un ruolo = molto probabile che esca lì al
  // prossimo spin, tanti (vicino al tetto) = molto meno probabile. La curva è quadratica
  // apposta: il primo giocatore mancante pesa più degli ultimi, così con un solo portiere
  // il prossimo spin punta quasi certamente lì, con due è già molto meno probabile.
  function roleNeedWeights(squad) {
    const counts = { POR: 0, DIF: 0, CEN: 0, ATT: 0 };
    squad.forEach((p) => { if (counts[p.pos] != null) counts[p.pos]++; });
    const roles = ['POR', 'DIF', 'CEN', 'ATT'];
    const w = {};
    roles.forEach((r) => {
      const need = clamp(1 - counts[r] / POS_CAP[r], 0, 1);   // 1 = ruolo vuoto, 0 = al tetto
      w[r] = POS_BASE_WEIGHT[r] * (0.08 + need * need * 3.6);
    });
    return w;
  }

  // Come roleNeedWeights, ma esclude qualunque ruolo abbia già raggiunto il suo tetto
  // (POS_CAP): oltre quel numero il ruolo non viene più estratto. Se la rosa è già al
  // tetto ovunque (caso limite, oltre i 26 titolari possibili in totale), niente panico:
  // non sblocchiamo tutto, andiamo sul ruolo con meno eccesso, per non sforare tutto da
  // un lato solo.
  function randPos(squad) {
    squad = squad || (S && S.squad) || [];
    const w = roleNeedWeights(squad);
    const counts = { POR: 0, DIF: 0, CEN: 0, ATT: 0 };
    squad.forEach((p) => { if (counts[p.pos] != null) counts[p.pos]++; });
    const roles = ['POR', 'DIF', 'CEN', 'ATT'];
    const avail = roles.filter((k) => counts[k] < POS_CAP[k]);
    if (!avail.length) return roles.slice().sort((a, b) => (counts[a] - POS_CAP[a]) - (counts[b] - POS_CAP[b]))[0];
    const pool = avail;
    const total = pool.reduce((a, k) => a + w[k], 0);
    let r = Math.random() * total;
    for (const k of pool) { r -= w[k]; if (r <= 0) return k; }
    return pool[pool.length - 1];
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
        const weeks = 2 + rnd(4);
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
    const availPids = new Set(pool.map((p) => p.pid));
    const target = Math.min(11, pool.length);
    // Margine di casualità a partita stretto (±7%, non più ±18%): la forma stagionale
    // pesa già parecchio da sola, qui serve solo a rompere i pareggi, non a far scavalcare
    // un titolare più forte a un panchinaro mediocre su un colpo di fortuna.
    const rated = pool.map((p) => ({ p, eff: p.ovr * (p.formSeason || 1) * (0.93 + Math.random() * 0.14) }));
    const starters = new Set();
    // La formazione scelta a mano in "Probabile formazione" (S.previewXI) non è più solo
    // grafica: se valida (stesso numero di titolari, tutti ancora in rosa) è LEI a
    // decidere chi scende in campo davvero — presenze, gol, assist e rendimento seguono
    // chi hai messo titolare, non un undici scelto automaticamente per overall. Un
    // titolare indisponibile (infortunato/squalificato/ceduto) viene rimpiazzato dal
    // miglior disponibile rimasto, così si gioca comunque in undici.
    const manualPids = (S.previewXI && Array.isArray(S.previewXI.pids)) ? S.previewXI.pids.filter((pid) => pid != null) : [];
    if (manualPids.length) {
      const missing = [];
      manualPids.forEach((pid) => { if (availPids.has(pid)) starters.add(pid); else missing.push(pid); });
      if (missing.length) {
        const fillers = rated.filter((r) => !starters.has(r.p.pid)).sort((a, b) => b.eff - a.eff);
        missing.forEach(() => { const f = fillers.shift(); if (f) starters.add(f.p.pid); });
      }
    }
    if (starters.size < target) {
      const byPos = { POR: [], DIF: [], CEN: [], ATT: [] };
      rated.forEach((r) => { if (!starters.has(r.p.pid) && byPos[r.p.pos]) byPos[r.p.pos].push(r); });
      Object.keys(byPos).forEach((k) => byPos[k].sort((a, b) => b.eff - a.eff));
      const need = { POR: 1, DIF: 4, CEN: 3, ATT: 3 };
      Object.keys(need).forEach((k) => byPos[k].slice(0, Math.max(0, need[k] - [...starters].filter((pid) => squad.find((p) => p.pid === pid)?.pos === k).length)).forEach((r) => starters.add(r.p.pid)));
      if (starters.size < target) rated.slice().sort((a, b) => b.eff - a.eff).forEach((r) => { if (starters.size < target) starters.add(r.p.pid); });
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

  // Oltre i 90 di overall la crescita rallenta (arrivare a 99 deve restare eccezionale, non
  // la norma per chiunque abbia una buona stagione): frena solo la CRESCITA, non i cali, e
  // si fa via via più ripida avvicinandosi al tetto, soprattutto fra 93 e 99.
  function growthDamp(ovr) {
    if (ovr < 90) return 1;
    const t = clamp((ovr - 90) / 9, 0, 1);
    return clamp(1 - t * t * 0.9, 0.12, 1);
  }
  function seasonOvrDelta(p) {
    const ratio = seasonPerformanceRatio(p);
    // sopra 1 = stagione da incorniciare, sotto 1 = deludente; pesa di più verso l'alto
    // (le esplosioni improvvise fanno più notizia dei cali) ma resta un contributo, non
    // può bastare da solo a spingere qualcuno al tetto di crescita: quello richiede anche
    // l'età giusta (vedi ageGrowthBase), altrimenti troppi giocatori ci finivano sempre.
    const perf = clamp((ratio - 1) * 2.2, -3, 4);
    const noise = (Math.random() - 0.5) * 1.5;
    let delta = ageGrowthBase(p.age) + perf + noise;
    if (delta > 0) delta *= growthDamp(p.ovr);
    // Range -5/+7 in una singola stagione: +7 resta possibile solo per un giovane che ha
    // fatto una stagione da incorniciare, un rendimento buono ma non eccezionale (o un
    // giocatore più avanti con l'età) si ferma più in basso, sui +3/+5. Anche i cali sono
    // ora limitati a -5, non più liberi di affondare senza fondo.
    return Math.round(clamp(delta, -5, 7));
  }

  // Marcatore per un avversario con una rosa reale nota: stesso peso ruolo+forza usato per
  // la nostra squadra. Le rose italiane usano `q` (quotazione fantacalcio, scala 1-65), le
  // rose europee usano `ovr` (scala 40-99 come i nostri giocatori): si normalizza `ovr`
  // sulla stessa scala approssimativa di `q` prima di pesare.
  function pickRealScorer(roster) {
    if (!roster || !roster.length) return null;
    const strengthOf = (p) => (p.q != null ? p.q : Math.max(1, Math.round((p.ovr - 40) * 0.9)));
    const weight = (p) => (POS_SCORE_WEIGHT[p.pos] || 1) * Math.pow(Math.max(strengthOf(p), 1) / 10, 1.4);
    const total = roster.reduce((a, p) => a + weight(p), 0);
    let r = Math.random() * total;
    for (const p of roster) { r -= weight(p); if (r <= 0) return p; }
    return roster[roster.length - 1];
  }

  // Rosa reale nota per un club avversario: se il mercato dinamico è già stato inizializzato
  // (S.market, vedi simulateTransferWindow) legge da lì, che evolve stagione dopo stagione;
  // altrimenti dai database statici originali (Italia + Europa).
  function rostersFor(oppClub) {
    if (S.market) return S.market.serieA[oppClub] || S.market.serieB[oppClub] || S.market.euro[oppClub] || null;
    return SERIE_A_ROSTERS[oppClub] || SERIE_B_ROSTERS[oppClub] || EURO_ROSTERS[oppClub] || null;
  }

  /* ---------------- mercato "semi-realistico" (Serie A/B + club europei) ---------------- */
  // Le rose reali (italiane ed europee) non restano identiche per sempre: dalla prima volta
  // che il presidente mette piede in Serie B/Serie A, quella categoria (e per la Serie A
  // anche il pool europeo) comincia a "vivere" — qualche trasferimento fra club a ogni
  // cambio di stagione, più qualche ricambio generazionale (un giocatore si ritira, arriva
  // un giovane generato al suo posto). Tutto questo vive in S.market: una copia PRIVATA
  // della partita, clonata dai database statici la prima volta che serve, così i database
  // originali restano lo stato "di lancio" identico per ogni nuova carriera.
  const Q_TO_OVR = (q) => clamp(Math.round(55 + q * 0.85), 40, 99);
  const OVR_TO_Q = (ovr) => clamp(Math.round((ovr - 55) / 0.85), 1, 65);
  // I database statici non hanno un'età (sono solo nome/ruolo/forza): alla prima clonazione
  // in S.market gliene assegnamo una plausibile, un filo più giovane per i più forti (i
  // grandi nomi di oggi sono spesso già nel pieno o all'inizio carriera, non a fine corsa),
  // così da qui in poi possono invecchiare stagione dopo stagione con la stessa curva della
  // nostra rosa invece di restare congelati per sempre allo stesso livello.
  function cloneRosterPool(pool) {
    const out = {};
    Object.keys(pool).forEach((club) => {
      out[club] = pool[club].map((p) => {
        const ovr = p.ovr != null ? p.ovr : Q_TO_OVR(p.q);
        const center = ovr >= 85 ? 24 : ovr >= 75 ? 26 : 27;
        return { ...p, age: p.age != null ? p.age : genAge(center, 4.5, 17, 37) };
      });
    });
    return out;
  }
  function initMarket() {
    S.market = { serieA: cloneRosterPool(SERIE_A_ROSTERS), serieB: cloneRosterPool(SERIE_B_ROSTERS), euro: cloneRosterPool(EURO_ROSTERS) };
  }
  // Stessa curva età→crescita/calo usata per la NOSTRA rosa (ageGrowthBase + growthDamp +
  // tetto di +7/stagione), ma senza il fattore prestazione stagionale: per un giocatore
  // avversario non simuliamo gol/assist singoli, solo l'invecchiamento anagrafico.
  function agedOvr(ovr, age) {
    // Leggero bias positivo (+0.6) sul rumore, assente nella crescita della nostra rosa:
    // qui non c'è una stagione vera da giudicare (niente gol/assist da premiare o punire),
    // quindi senza questo filo di ottimismo i giovani talenti stagnerebbero troppo presto.
    let delta = ageGrowthBase(age) + gaussInt(0.6, 2.6);
    if (delta > 0) delta *= growthDamp(ovr);
    return clamp(ovr + Math.round(clamp(delta, -99, 7)), 40, 99);
  }
  // Un ruolo casuale con una distribuzione realistica di rosa (pochi portieri, il grosso fra
  // difesa e centrocampo, un po' meno attacco): indipendente dai tetti della TUA rosa, qui
  // servono solo per rimpiazzare un giocatore ritirato in una rosa avversaria.
  function randOppPos() {
    const r = Math.random();
    return r < 0.09 ? 'POR' : r < 0.42 ? 'DIF' : r < 0.74 ? 'CEN' : 'ATT';
  }
  // Chiamata a ogni cambio di stagione (in advance(), dopo l'aggiornamento di S.div): sblocca
  // le categorie appena raggiunte per la prima volta e fa "muovere" quelle già sbloccate.
  function simulateTransferWindow() {
    if (S.div >= 4) S.marketSeenB = true;
    if (S.div >= 5) S.marketSeenA = true;
    if (!S.marketSeenB && !S.marketSeenA) return;
    if (!S.market) initMarket();
    const pools = [];
    if (S.marketSeenB) pools.push({ kind: 'q', clubs: S.market.serieB });
    if (S.marketSeenA) { pools.push({ kind: 'q', clubs: S.market.serieA }); pools.push({ kind: 'ovr', clubs: S.market.euro }); }
    const allClubs = [];
    pools.forEach(({ kind, clubs }) => Object.keys(clubs).forEach((name) => allClubs.push({ kind, clubs, name })));
    if (allClubs.length < 2) return;
    // ---- trasferimenti: uno scambio vero fra due club (un giocatore per uno), anche fra
    // campionati diversi (un italiano può finire in un club europeo e viceversa) — così le
    // rose restano della stessa dimensione invece di gonfiarsi o svuotarsi stagione dopo
    // stagione.
    const convertTo = (player, kind) => {
      if (kind === (player.ovr != null ? 'ovr' : 'q')) return player;
      const ovr = player.q != null ? Q_TO_OVR(player.q) : player.ovr;
      return kind === 'ovr' ? { n: player.n, pos: player.pos, ovr, nat: player.nat, age: player.age } : { n: player.n, pos: player.pos, q: OVR_TO_Q(ovr), nat: player.nat, age: player.age };
    };
    const transferCount = clamp(Math.round(allClubs.length * 0.3), 4, 40);
    for (let i = 0; i < transferCount; i++) {
      const a = pick(allClubs), b = pick(allClubs);
      if (a === b) continue;
      const rosterA = a.clubs[a.name], rosterB = b.clubs[b.name];
      if (!rosterA || !rosterB || !rosterA.length || !rosterB.length) continue;
      const idxA = rnd(rosterA.length), idxB = rnd(rosterB.length);
      const playerA = rosterA[idxA], playerB = rosterB[idxB];
      rosterA[idxA] = convertTo(playerB, a.kind);
      rosterB[idxB] = convertTo(playerA, b.kind);
    }
    // ---- invecchiamento: ogni giocatore di ogni rosa sbloccata invecchia di un anno e
    // sale o scende di overall in base all'età, con la stessa curva (e lo stesso tetto di
    // crescita) della nostra rosa — succede anche a chi non è mai passato per il nostro
    // club, così un fenomeno giovane visto per la prima volta continua a crescere stagione
    // dopo stagione anche restando al suo club. ----
    allClubs.forEach(({ kind, clubs, name }) => {
      clubs[name].forEach((p) => {
        p.age = (p.age || genAge(26, 4.5, 17, 37)) + 1;
        const ovr = kind === 'ovr' ? p.ovr : Q_TO_OVR(p.q);
        const newOvr = agedOvr(ovr, p.age);
        if (kind === 'ovr') p.ovr = newOvr; else p.q = OVR_TO_Q(newOvr);
      });
    });
    // ---- ricambio generazionale: solo chi ha superato i 35 anni può ritirarsi (percentuale
    // di rischio crescente con l'età), rimpiazzato da un giovane generato nella stessa rosa
    // (mantiene il livello approssimativo del club) ----
    allClubs.forEach(({ kind, clubs, name }) => {
      const roster = clubs[name];
      if (!roster.length) return;
      const candidates = roster.map((p, idx) => ({ p, idx })).filter(({ p }) => p.age >= 35 && Math.random() < 0.12 + (p.age - 35) * 0.08);
      if (!candidates.length) return;
      const { idx } = pick(candidates);
      const old = roster[idx];
      const baseOvr = old.q != null ? Q_TO_OVR(old.q) : old.ovr;
      const newOvr = clamp(baseOvr - 4 + rnd(6), 40, 99);
      const nat = pickNationality(4);
      const fresh = { n: genName(nat), pos: randOppPos(), nat: nat.code, age: genAge(19, 2, 17, 22) };
      if (kind === 'ovr') fresh.ovr = newOvr; else fresh.q = OVR_TO_Q(newOvr);
      roster[idx] = fresh;
    });
  }

  // Genera `count` gol con minuto e marcatore. Per la nostra squadra pesca dalla rosa (e
  // aggiorna le statistiche stagionali di marcatore e assistman, l'80% dei gol con
  // assist); per l'avversario, se è un club con una rosa reale nota la usa, altrimenti
  // (categorie inferiori, club senza dati) genera un nome plausibile.
  function genGoals(count, isUs, oppClub, lineup) {
    const mins = []; for (let i = 0; i < count; i++) mins.push(1 + rnd(90));
    mins.sort((a, b) => a - b);
    const oppRoster = !isUs && oppClub ? rostersFor(oppClub) : null;
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

  // Durante "Simula fino a fine stagione" le singole partite si susseguono in un unico ciclo
  // sincrono: il browser non ridisegna nulla finché il ciclo non finisce, quindi salvare su
  // localStorage (JSON.stringify dell'intero stato) ad ogni giornata è lavoro sprecato — lo
  // rimandiamo a un solo salvataggio quando il ciclo si ferma (fine stagione o sosta invernale).
  let BULK_SIM = false;

  const divOf = () => DIVS[S.div];

  const gp = () => (divOf().teams - 1) * 2;

  const capOf = () => STADIUM[S.stadiumTier].cap;

  /* ---------------- stipendi, giocatori, allenatori, sponsor ---------------- */
  // Un'unica curva di stipendi globale: i giocatori migliori chiedono di più, ovunque
  // tu sia. Questo è il freno che impedisce di comprare una squadra da Serie B con un
  // budget da Serie D.
  function roundWage(w) { if (w >= 50e3) return Math.round(w / 1e3) * 1e3; if (w >= 5e3) return Math.round(w / 5e2) * 5e2; return Math.max(250, Math.round(w / 50) * 50); }

  // Base abbassata (-10% circa) per tenere gli stipendi un po' più contenuti ovunque, più
  // uno sconto extra solo in Serie A (dove le cifre salivano troppo per gli ovr più alti,
  // gli unici che in Serie A si vedono davvero).
  const wageFor = (ovr) => {
    let w = 540 * Math.pow(1.135, ovr - 45) * (0.88 + Math.random() * 0.28);
    if (S && S.div === 5) w *= 0.82;
    return roundWage(w);
  };

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
      S.scoutProspect = { n: genName(nat), nat, ovr, age: 16 + rnd(5), wage: wageFor(ovr), yrs: 3 + rnd(2), pid: newPid(), pos: randPos(), seasonGoals: 0, seasonAssists: 0, seasonCleanSheets: 0, seasonApps: 0 };
    }
  }

  // Range di quotazione (min-max) per ruolo, calcolato una sola volta dalle rose reali
  // statiche: serve a capire chi è il più forte/più debole di ogni ruolo in un campionato,
  // dato che la quotazione fantacalcio non è un overall e le due leghe usano scale diverse
  // fra loro (i numeri di Serie B, ad es. Palermo, arrivano più in alto di quelli di Serie A).
  let _qRanges = null;
  function qRangesFor(rosters) {
    const ranges = {};
    Object.values(rosters).forEach((roster) => roster.forEach((p) => {
      const r = ranges[p.pos] || (ranges[p.pos] = { min: p.q, max: p.q });
      if (p.q < r.min) r.min = p.q;
      if (p.q > r.max) r.max = p.q;
    }));
    return ranges;
  }
  function qRanges() {
    if (!_qRanges) _qRanges = { serieA: qRangesFor(SERIE_A_ROSTERS), serieB: qRangesFor(SERIE_B_ROSTERS) };
    return _qRanges;
  }
  // Overall di un giocatore reale (Serie A o B) a partire dalla sua quotazione fantacalcio:
  // non un calcolo preciso (la quotazione non è pensata per quello), ma la sua posizione
  // relativa fra i pari ruolo dello stesso campionato dice bene chi è più forte e chi meno.
  // Le due fasce di arrivo restano separate e quella di Serie B è tutta più bassa, coerente
  // con le rispettive medie di categoria (66 contro 77).
  const REAL_OVR_BAND = { serieA: { lo: 60, hi: 94 }, serieB: { lo: 48, hi: 78 } };
  function qToRealOvr(pos, q, league) {
    const range = (qRanges()[league] || {})[pos] || { min: 1, max: 40 };
    const band = REAL_OVR_BAND[league];
    const t = range.max > range.min ? (q - range.min) / (range.max - range.min) : 0.5;
    return clamp(Math.round(band.lo + t * (band.hi - band.lo)), 40, 99);
  }

  // In Serie B e Serie A, ogni tanto lo spin pesca un giocatore VERO (dalle rose di Serie A,
  // Serie B o dei club europei — S.market se già "vivo", altrimenti i database statici)
  // invece di generarne uno di fantasia. Le rose italiane usano la quotazione fantacalcio
  // (vedi qToRealOvr), quelle europee hanno già un `ovr` assegnato che va bene com'è.
  function realLeaguePlayer(minOvr, maxOvr, role) {
    const sources = [
      { league: 'serieB', rosters: S.market ? S.market.serieB : SERIE_B_ROSTERS },
      { league: 'serieA', rosters: S.market ? S.market.serieA : SERIE_A_ROSTERS },
      { league: 'euro', rosters: S.market ? S.market.euro : EURO_ROSTERS },
    ];
    for (let i = 0; i < 14; i++) {
      const src = pick(sources);
      const clubs = Object.keys(src.rosters);
      if (!clubs.length) continue;
      const club = pick(clubs);
      const roster = src.rosters[club];
      if (!roster || !roster.length) continue;
      const candidates = role ? roster.filter((x) => x.pos === role) : roster;
      if (!candidates.length) continue;
      const rp = pick(candidates);
      const count = S.squad.filter((p) => p.pos === rp.pos).length;
      if (count >= POS_CAP[rp.pos]) continue;
      const ovr = src.league === 'euro' ? rp.ovr : qToRealOvr(rp.pos, rp.q, src.league);
      if (minOvr != null && (ovr < minOvr || ovr > maxOvr)) continue;
      const nat = rp.nat ? natByCode(rp.nat) : (src.league === 'euro' ? pickNationality(4) : pickNationality(S.div));
      return { n: rp.n, nat, ovr, age: rp.age != null ? rp.age : genAge(26, 4.5, 19, 34), wage: wageFor(ovr), yrs: 3 + rnd(2), pid: newPid(), pos: rp.pos, seasonGoals: 0, seasonAssists: 0, seasonCleanSheets: 0, seasonApps: 0, real: true, fromClub: club };
    }
    return null;
  }
  // Le due fasce sono separate per costruzione, non solo per media statistica: un lusso
  // deve SEMPRE dare un giocatore chiaramente sopra la media di categoria (in Serie A,
  // avg 77, un minimo intorno a 80), un base resta in un intervallo più largo attorno alla
  // media (in Serie A circa 68-88). Questo vale sia per i giocatori generati sia per quelli
  // veri pescati dalle rose reali: prima si decide la fascia, poi si cerca un giocatore
  // (reale o generato) che ci stia dentro, così un lusso non può più regalare un nome vero
  // ma scarso preso a caso da una rosa di Serie B.
  // Squadra Icone: leggende ritirate (vedi ICON_PLAYERS in data.js), pescabili con gli spin
  // solo una volta arrivati in Serie A, con 1 probabilità su 12 a ogni spin (prima ancora del
  // tiro sul giocatore reale "contemporaneo"). Età fissa a centrocampo di carriera: sono
  // fenomeni ritirati che tornano in campo, non ex bandiere a fine carriera.
  function iconPlayer(role) {
    const candidates = role ? ICON_PLAYERS.filter((p) => p.pos === role) : ICON_PLAYERS;
    if (!candidates.length) return null;
    for (let i = 0; i < 10; i++) {
      const ic = pick(candidates);
      const count = S.squad.filter((p) => p.pos === ic.pos).length;
      if (count >= POS_CAP[ic.pos]) continue;
      const nat = natByCode(ic.nat) || pickNationality(4);
      return { n: ic.n, nat, ovr: ic.ovr, age: genAge(27, 3, 24, 32), wage: wageFor(ic.ovr), yrs: 3 + rnd(2), pid: newPid(), pos: ic.pos, seasonGoals: 0, seasonAssists: 0, seasonCleanSheets: 0, seasonApps: 0, real: true, icon: true, fromClub: 'Squadra Icone' };
    }
    return null;
  }

  function spinPlayer(premium, role) {
    const d = divOf(), scout = scoutTier();
    const band = premium ? { lo: d.avg + 3, hi: d.avg + 22 } : { lo: d.avg - 9, hi: d.avg + 11 };
    if (S.div === 5 && Math.random() < 1 / 12) {
      const icon = iconPlayer(role);
      if (icon) return icon;
    }
    const realChance = S.div === 5 ? 0.68 : S.div === 4 ? 0.55 : 0;
    if (realChance && Math.random() < realChance) {
      const real = realLeaguePlayer(band.lo, band.hi, role);
      if (real) return real;
    }
    let ovr;
    if (premium) {
      ovr = gaussInt(d.avg + 10 + scout.bonus, clamp(3.0 + scout.varDelta, 1.6, 3.0));
      if (Math.random() < 0.12 + scout.gem) ovr += 4 + rnd(4);   // lo scout scopre un gioiello
      ovr = clamp(ovr, band.lo, 99);
    } else {
      ovr = gaussInt(d.avg + 1 + scout.bonus, clamp(3.3 + scout.varDelta, 1.8, 3.3));
      if (Math.random() < scout.gem) ovr += 4 + rnd(4);
      ovr = clamp(ovr, band.lo, band.hi + 7);
    }
    const age = premium && Math.random() < 0.35 ? 16 + rnd(6) : genAge(24, 5, 17, 36);
    const nat = pickNationality(S.div);
    return { n: genName(nat), nat, ovr, age, wage: wageFor(ovr), yrs: 3 + rnd(2), pid: newPid(), pos: role || randPos(), seasonGoals: 0, seasonAssists: 0, seasonCleanSheets: 0, seasonApps: 0 };
  }

  // Svincolati: nessun costo di cartellino, rating scarso per il livello, stipendi modesti.
  // Servono a portare un club in difficoltà al minimo di 16 giocatori, non a vincere partite.
  const freeAgent = () => { const d = divOf(); const ovr = clamp(d.avg - 13 + rnd(6), 40, 99); const nat = pickNationality(S.div); return { n: genName(nat), nat, ovr, age: genAge(27, 5.5, 18, 37), wage: roundWage(wageFor(ovr) * 0.7), yrs: 1 + rnd(2), pid: newPid(), pos: randPos(), seasonGoals: 0, seasonAssists: 0, seasonCleanSheets: 0, seasonApps: 0 }; };

  const playerValue = (p) => p.wage * 52 * (p.ovr >= 85 ? 9 : p.ovr >= 78 ? 7 : p.ovr >= 68 ? 5 : 3.5) * (p.age <= 23 ? 1.4 : p.age >= 31 ? 0.6 : 1);

  // Prezzo per trattenere in rosa a titolo definitivo un giocatore preso in prestito a
  // gennaio: più caro del semplice prestito, in linea col cartellino del mercato di gennaio.
  const loanBuybackFee = (p) => Math.round(playerValue(p) * 0.75);

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
    if (S.marketSeenB == null) S.marketSeenB = S.div >= 4;
    if (S.marketSeenA == null) S.marketSeenA = S.div >= 5;
    if (S.market === undefined) S.market = null;
    S.squad.forEach((p) => { if (p.yrs == null) p.yrs = 2 + rnd(2); if (p.pid == null) p.pid = newPid(); if (!p.pos) p.pos = randPos(); if (p.seasonGoals == null) p.seasonGoals = 0; if (p.seasonAssists == null) p.seasonAssists = 0; if (p.seasonCleanSheets == null) p.seasonCleanSheets = 0; if (p.seasonApps == null) p.seasonApps = 0; if (!p.nat) p.nat = pickNationality(S.div); if (p.outWeeks == null) p.outWeeks = 0; if (p.suspMatches == null) p.suspMatches = 0; });
    if (S.manager && !S.manager.nat) S.manager.nat = S.manager.real ? natByCode(REAL_MANAGERS.find((m) => m.n === S.manager.n)?.nat) || pickNationality(S.div) : pickNationality(S.div);
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

  // Sceglie il club offerente in base alla cifra da pagare, non a caso: un tetto di spesa
  // plausibile per categoria (3 volte il costo di uno spin di lusso lì, una proxy ragionevole
  // di "cosa si può permettere un club di quel livello"), poi fra i club di quella fascia
  // pesca preferibilmente i più forti (quindi i più ricchi) quando la cifra è alta — niente
  // più squadre di provincia che offrono cifre da big.
  function buyerClub(fee) {
    const CAP = DIVS.map((dv) => dv.premium * 3);
    let tier = CAP.findIndex((cap) => fee <= cap);
    if (tier < 0) tier = 4;
    tier = clamp(Math.max(tier, S.div + 1), 0, DIVS.length - 1);
    const pool = (POOLS[tier] || POOLS[DIVS.length - 1]).filter((c) => c.n !== S.club);
    if (!pool.length) return 'un club più grande';
    const sorted = pool.slice().sort((a, b) => b.s - a.s);
    const topN = fee > CAP[tier] * 0.45 ? Math.max(1, Math.round(sorted.length * 0.3)) : sorted.length;
    return pick(sorted.slice(0, topN)).n;
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
    targets.forEach((p, i) => { if (Math.random() < (i === 0 ? 0.7 : 0.45)) { const fee = offerFee(p); offers.push({ pid: p.pid, club: buyerClub(fee), fee }); } });
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

  // Un candidato su circa 4 è un allenatore vero, se ce n'è uno con un rating abbastanza
  // vicino a quello richiesto (altrimenti si genera normalmente): non sostituiscono i
  // generati, si aggiungono come opzione possibile fra i candidati.
  function genManager(bonus) {
    const r = clamp(divOf().mgrBase - 4 + rnd(12) + (bonus || 0), 45, 92);
    if (Math.random() < 0.22) {
      const near = REAL_MANAGERS.filter((m) => Math.abs(m.rating - r) <= 8);
      if (near.length) { const m = pick(near); return { n: m.n, rating: m.rating, salary: mgrSalaryFor(m.rating), nat: natByCode(m.nat), real: true }; }
    }
    const nat = pickNationality(S.div);
    return { n: genName(nat), rating: r, salary: mgrSalaryFor(r), nat };
  }

  const mgrBonus = () => clamp((S.manager.rating - divOf().mgrBase) / 3.5, -3, 4);

  function sponsorOffers() {
    const d = divOf();
    const base = (d.prize * 0.3 + capOf() * 9) * 1.2;   // +20% su tutti gli accordi sponsor
    const mk = (tag, mult, yrs, sent) => ({ name: pick(SPONSOR_BRANDS[tag]), tag, perYear: Math.round(base * mult * (0.85 + Math.random() * 0.3) / 1e4) * 1e4, years: yrs, left: yrs, sent });
    // Sempre QUATTRO offerte, con un peso economico più alto di prima: più scelta e
    // più soldi in ballo. Dalla Serie B in su un mega-sponsor globale sostituisce lo
    // sponsor di comunità, con un accordo regionale a fare da via di mezzo in entrambi
    // i casi.
    return S.div >= 4
      ? [mk('standard', 1.5, 3, 0), mk('regional', 1.9, 3, 0), mk('betting', 2.3, 2, -2), mk('global', 3.0, 4, 0)]
      : [mk('community', 0.9, 3, 2), mk('regional', 1.2, 3, 0), mk('standard', 1.5, 2, 0), mk('betting', 2.0, 2, -2)];
  }

  /* ---------------- forza della rosa + aspettative ---------------- */
  function squadStr() {
    const s = S.squad.slice().sort((a, b) => b.ovr - a.ovr);
    const eleven = s.slice(0, 11); while (eleven.length < 11) eleven.push({ ovr: 42 });
    const avg = eleven.reduce((a, p) => a + p.ovr, 0) / 11;
    return Math.round((avg + clamp((s.length - 11) * 0.25, 0, 2.5)) * 10) / 10;
  }

  // Chi viene promosso rincatenando una seconda promozione di fila (rosa e organizzazione
  // ancora tarate sulla categoria precedente) fatica un filo in più ad ambientarsi rispetto
  // a chi ha avuto una stagione intera per consolidarsi: un piccolo malus, non un muro.
  const promoStreakMalus = () => (S.promoStreak > 0 ? 2.2 : 0);

  const teamEff = () => squadStr() + mgrBonus() + (S.form || 0) - promoStreakMalus();

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

  // Le SITUATIONS sono tarate sull'Eccellenza: per una categoria diversa si trasla la
  // forza di partenza sulla nuova media (dAvg - eccAvg) e si scala il budget con lo stesso
  // rapporto dei costi di spin, così "quanti spin ti puoi permettere" resta simile a
  // qualunque livello si parta.
  // low = Eccellenza/Serie D/Serie C, mid = Serie B, high = Serie A: ogni situazione ha un
  // racconto diverso a seconda di dove si parte (vedi SITUATIONS.variants in data.js).
  const situationTier = (div) => (div >= 5 ? 'high' : div === 4 ? 'mid' : 'low');
  function genTakeovers(div) {
    div = div || 0;
    const tier = situationTier(div);
    const shift = DIVS[div].avg - DIVS[0].avg;
    const budgetScale = DIVS[div].spin / DIVS[0].spin;
    return SITUATIONS.map((s) => {
      const v = s.variants[tier];
      return {
        key: s.key, title: v.title, blurb: v.blurb,
        str: s.strRange[0] + shift + rnd(s.strRange[1] - s.strRange[0] + 1),
        budget: (s.budgetRange[0] + Math.random() * (s.budgetRange[1] - s.budgetRange[0])) * budgetScale,
        stadiumTier: Math.random() < s.stadiumChance ? s.stadiumTier : 0,
        fanbase: s.fanbaseRange[0] + Math.random() * (s.fanbaseRange[1] - s.fanbaseRange[0]),
      };
    });
  }

  function startDynasty(owner, t, customClub, div) {
    div = div || 0;
    clearSave();
    const squad = [];
    const dAvg = DIVS[div].avg;
    for (let i = 0; i < 16; i++) { const ovr = clamp(gaussInt(t.str - 1, 3.5), dAvg - 9, dAvg + 9); const nat = pickNationality(div); squad.push({ n: genName(nat), nat, ovr, age: genAge(23, 4.5, 17, 34), wage: wageFor(ovr), yrs: 1 + rnd(3), pos: randPos(squad), seasonGoals: 0, seasonAssists: 0, seasonCleanSheets: 0, seasonApps: 0 }); }
    S = {
      owner, club: (customClub || '').slice(0, 24) || pick(POOLS[div]).n, div: div, season: 1,
      budget: Math.round(t.budget), fanbase: Math.round(t.fanbase * 100) / 100,
      stadiumTier: t.stadiumTier, stadiumSpent: 0.6e6 + (t.stadiumTier ? STADIUM[1].cost : 0), ticket: 1,
      squad, manager: (function () { const r = clamp(DIVS[div].mgrBase - 2 + rnd(8), 45, 92); const nat = pickNationality(div); return { n: genName(nat), rating: r, salary: mgrSalaryFor(r), nat }; })(),
      sponsor: null, sent: 55, ownerRating: 62, prestige: 0, debtSeasons: 0,
      euro: false, euroComp: null, form: 0, spinsBought: 0, promoStreak: 0, premiumRoleUsed: false,
      trophies: { titles: [0, 0, 0, 0, 0, 0], nat: 0, ucl: 0, uel: 0, conf: 0, total: 0 },
      history: [], over: false, peakWorth: 0,
      pidNext: 1, offers: [],
      crestShape: crestShape, crestColors: crestColors.slice(),
      scoutLevel: 0, scoutProspect: null, scoutProspectSeason: 0,
      market: null, marketSeenB: div >= 4, marketSeenA: div >= 5,
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
    // Ultima chiamata per riscattare i prestiti dell'estate scorsa (bottone 💰 Riscatta
    // nella rosa, in sala del consiglio): chi non è stato riscattato torna al suo club ora.
    const loanedBack = S.squad.filter((p) => p.loan).map((p) => p.n);
    S.squad = S.squad.filter((p) => !p.loan);
    if (loanedBack.length) toast(loanedBack.join(', ') + ' torna' + (loanedBack.length === 1 ? '' : 'no') + ' al suo club, non riscattat' + (loanedBack.length === 1 ? 'o' : 'i') + '.');
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
    // Formato UEFA reale dal 2024/25: fase campionato a classifica unica (8 partite in
    // Champions/Europa League, 6 in Conference League), poi 1°-8° diretti agli ottavi,
    // 9°-24° giocano uno spareggio andata/ritorno per l'ultimo posto, 25°+ eliminati. Da
    // qui in poi ottavi/quarti/semifinale sono andata/ritorno, la finale è gara secca.
    if (S.euro && S.div === 5) {
      const legLen = S.euroComp === 'conf' ? 6 : 8;
      S.cups.euro = {
        name: EURO_COMPS[S.euroComp].name, phase: 'league', legLen,
        leagueAt: 0, leaguePts: 0, leagueGF: 0, leagueGA: 0, faced: [],
        rounds: ['Ottavi', 'Quarti', 'Semifinale', 'Finale'], at: 0, out: false, won: false,
      };
    }
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
    computeTable(); renderHud();
    if (!BULK_SIM) saveGame();
    if (S.played === (gp() >> 1) && !S.winterDone) { openWinter(); return; }
    if (S.played >= gp()) endSeason();
  }

  function simToEnd() {
    BULK_SIM = true;
    while (S.seasonActive && S.played < gp() && !S._pause) { const b = S.played; simMatch(); if (S._pause) break; if (S.played === b) break; }
    BULK_SIM = false;
    saveGame();
  }

  /* ---------------- coppe (checkpoint scalati sulla lunghezza di stagione) ---------------- */
  // La Coppa Italia resta a eliminazione diretta pura, gara secca. La coppa europea segue
  // invece il formato UEFA reale in vigore dal 2024/25: una fase campionato a classifica
  // unica (8 partite in Champions/Europa League, 6 in Conference League — checkpoint
  // euroLeague), poi 1°-8° virtuali vanno dritti agli ottavi, 9°-24° giocano uno spareggio
  // andata/ritorno (checkpoint euroPlayoff), 25°+ sono eliminati (niente più "discesa"
  // automatica verso la coppa inferiore, il vecchio formato a gironi l'aveva ma è stato
  // abolito). Da qui in poi ottavi/quarti/semifinale sono andata/ritorno (checkpoint
  // euroKO), la finale è una gara secca in sede neutra.
  function maybeCupRound() {
    const G = gp();
    const f = (fr) => Math.max(1, Math.min(G - 1, Math.round(G * fr)));
    const euro = S.cups.euro;
    const legLen = euro ? euro.legLen : 8;
    const leagueFracs = Array.from({ length: legLen }, (_, idx) => 0.10 + idx * (0.44 / Math.max(1, legLen - 1)));
    const checkpoints = {
      nat: [f(0.10), f(0.24), f(0.40), f(0.57), f(0.74), f(0.92)],
      euroLeague: leagueFracs.map(f),
      euroPlayoff: f(0.60),
      euroKO: [f(0.68), f(0.78), f(0.88), f(0.96)],
    };
    const nat = S.cups.nat;
    if (nat && !nat.out && !nat.won && nat.at < nat.rounds.length && S.played >= checkpoints.nat[nat.at]) resolveCupRound('nat');
    if (euro && !euro.out && !euro.won) {
      if (euro.phase === 'league') { if (euro.leagueAt < euro.legLen && S.played >= checkpoints.euroLeague[euro.leagueAt]) resolveEuroLeagueMatch(); }
      else if (euro.phase === 'playoff') { if (!euro.playoffDone && S.played >= checkpoints.euroPlayoff) resolveEuroPlayoff(); }
      else if (euro.at < euro.rounds.length && S.played >= checkpoints.euroKO[euro.at]) resolveCupRound('euro');
    }
  }

  // Una partita della fase campionato: punti pieni (3/1/0) su una classifica unica, non un
  // girone da 4. Gli avversari sono via via più abbordabili all'inizio e più forti verso la
  // fine (fasce di sorteggio, semplificate). A fine fase campionato la classifica decide
  // tutto: soglia alta = ottavi diretti, soglia media = spareggio, sotto = eliminati.
  function resolveEuroLeagueMatch() {
    const cup = S.cups.euro, i = cup.leagueAt, ec = EURO_COMPS[S.euroComp];
    const span = cup.legLen > 1 ? 12 / (cup.legLen - 1) : 0;
    const oppStr = ec.oppBase - 6 + i * span + rnd(6);
    const faced = cup.faced || (cup.faced = []);
    const oppName = cupOpponentName('euro', oppStr, faced);
    faced.push(oppName);
    const diff = teamEff() - oppStr;
    const winP = 1 / (1 + Math.exp(-diff / 6.5));
    const drawP = 0.24;
    const roll = Math.random();
    const won = roll < winP * (1 - drawP), draw = !won && roll < winP * (1 - drawP) + drawP;
    let gf = poisson(clamp(1.3 + diff * 0.05, 0.2, 4)), ga = poisson(clamp(1.3 - diff * 0.05, 0.2, 4));
    if (draw) { const avgg = Math.round((gf + ga) / 2); gf = avgg; ga = avgg; }
    else if (won && gf <= ga) gf = ga + 1;
    else if (!won && gf >= ga) ga = gf + 1;
    cup.leagueAt++;
    cup.leaguePts += won ? 3 : draw ? 1 : 0;
    cup.leagueGF += gf; cup.leagueGA += ga;
    if (won) S.euroMoney += ec.roundWin * 0.3; else if (draw) S.euroMoney += ec.roundWin * 0.12;
    const lineup = pickMatchLineup(S.squad);
    registerAppearances(lineup);
    logEuroGroup(cup.name, 'Fase campionato ' + cup.leagueAt + '/' + cup.legLen, won ? 'W' : draw ? 'D' : 'L', gf, ga, genGoals(gf, true, null, lineup), genGoals(ga, false, oppName), oppName, cup.leaguePts, S.euroComp);
    registerCleanSheet(ga, lineup);
    if (cup.leagueAt >= cup.legLen) {
      const top8 = cup.legLen === 6 ? 12 : 15, playoffLine = cup.legLen === 6 ? 6 : 9;
      if (cup.leaguePts >= top8) cup.phase = 'knockout';
      else if (cup.leaguePts >= playoffLine) cup.phase = 'playoff';
      else cup.out = true;
    }
    renderCups();
  }

  // Spareggio pre-ottavi (9°-24° virtuali della fase campionato): andata e ritorno contro
  // un avversario un gradino sotto quelli degli ottavi, come nel vero tabellone UEFA.
  function resolveEuroPlayoff() {
    const cup = S.cups.euro, ec = EURO_COMPS[S.euroComp];
    const oppStr = ec.oppBase - 3 + rnd(6);
    const faced = cup.faced || (cup.faced = []);
    const oppName = cupOpponentName('euro', oppStr, faced);
    faced.push(oppName);
    let aggGF = 0, aggGA = 0;
    for (let leg = 0; leg < 2; leg++) {
      const diff = teamEff() - oppStr;
      let gf = poisson(clamp(1.3 + diff * 0.05, 0.2, 4)), ga = poisson(clamp(1.3 - diff * 0.05, 0.2, 4));
      aggGF += gf; aggGA += ga;
      const lineup = pickMatchLineup(S.squad);
      registerAppearances(lineup);
      logCupLeg(cup.name, 'Spareggio', leg === 0 ? 'Andata' : 'Ritorno', gf, ga, genGoals(gf, true, null, lineup), genGoals(ga, false, oppName), oppName, S.euroComp);
      registerCleanSheet(ga, lineup);
    }
    const advanced = aggGF > aggGA || (aggGF === aggGA && Math.random() < 0.5);
    cup.playoffDone = true;
    if (advanced) { S.euroMoney += EURO_COMPS[S.euroComp].roundWin * 0.6; cup.phase = 'knockout'; } else cup.out = true;
    logCup(cup.name, 'Spareggio (aggregato)', advanced, aggGF, aggGA, [], [], oppName, S.euroComp);
    renderCups();
  }

  function resolveCupRound(key) {
    const cup = S.cups[key], d = divOf(), i = cup.at;
    const compKey = key === 'euro' ? S.euroComp : 'nat';
    const isEuroFinal = key === 'euro' && i === cup.rounds.length - 1;
    const legs = key === 'euro' && !isEuroFinal ? 2 : 1;   // ottavi/quarti/semifinale: andata/ritorno. Coppa Italia e finale euro: gara secca.
    const oppStr = key === 'euro' ? EURO_COMPS[S.euroComp].oppBase + i * 3 + rnd(5) : Math.min(90, d.avg + 2 + i * 4 + rnd(6));
    const faced = cup.faced || (cup.faced = []);
    const oppName = cupOpponentName(key, oppStr, faced);
    faced.push(oppName);
    let aggGF = 0, aggGA = 0;
    for (let leg = 0; leg < legs; leg++) {
      const diff = teamEff() - oppStr;
      const winP = 1 / (1 + Math.exp(-diff / 6.5));
      const wonLeg = Math.random() < winP;
      let gf = poisson(clamp(1.3 + diff * 0.05, 0.2, 4)), ga = poisson(clamp(1.3 - diff * 0.05, 0.2, 4));
      if (legs === 1) {
        // gara secca: manteniamo il risultato coerente con l'esito (parità = rigori)
        if (wonLeg && gf < ga) { const t = gf; gf = ga; ga = t; }
        else if (!wonLeg && gf > ga) { const t = gf; gf = ga; ga = t; }
      }
      aggGF += gf; aggGA += ga;
      const cupLineup = pickMatchLineup(S.squad);
      registerAppearances(cupLineup);
      const golsF = genGoals(gf, true, null, cupLineup), golsA = genGoals(ga, false, oppName);
      registerCleanSheet(ga, cupLineup);
      if (legs > 1) logCupLeg(cup.name, cup.rounds[i], leg === 0 ? 'Andata' : 'Ritorno', gf, ga, golsF, golsA, oppName, compKey);
      else logCup(cup.name, cup.rounds[i], gf >= ga, gf, ga, golsF, golsA, oppName, compKey);
    }
    const won = legs > 1 ? (aggGF > aggGA || (aggGF === aggGA && Math.random() < 0.5)) : aggGF >= aggGA;
    if (legs > 1) logCup(cup.name, cup.rounds[i] + ' (aggregato)', won, aggGF, aggGA, [], [], oppName, compKey);
    cup.at++;
    if (won) {
      if (key === 'nat') S.cupMoney += d.cupBase * (i + 1);
      else S.euroMoney += EURO_COMPS[S.euroComp].roundWin;
    }
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
    // giochi per UN posto extra di promozione a fine stagione. Tabellone da 4 (Eccellenza
    // esclusa, non ha playoff): semifinale + finale, teste di serie a specchio (3° vs 6°).
    // Tabellone da 6 (Serie B, come nella vera Lega): i due semi più bassi si affrontano
    // ai quarti, i vincitori raggiungono le teste di serie 3°/4° in semifinale, poi finale.
    // Le partite che non coinvolgono il nostro club (l'altra metà del tabellone) non vengono
    // simulate per esteso: si risolvono con un confronto di forza, come già per la finale
    // nel tabellone da 4. ----
    let playoff = null;
    if (!auto && d.playoff > 0 && pos > d.promoted && pos <= d.promoted + d.playoff) {
      const lo = d.promoted + 1, hi = d.promoted + d.playoff;
      const strAt = (position) => { const row = S.table[position - 1]; const o = S.opps.find((x) => x.name === row.name); return o ? o.s : d.avg; };
      const nameAt = (position) => S.table[position - 1].name;
      const hypoWinner = (a, b) => (Math.random() < (1 / (1 + Math.exp(-(strAt(a) - strAt(b)) / 5))) ? a : b);
      const rounds = [];
      const playPO = (oppPos, stage) => {
        const oppName = nameAt(oppPos), oppStr = strAt(oppPos);
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
      if (d.playoff >= 6) {
        const byeA = lo, byeB = lo + 1;   // 3° e 4°: già in semifinale
        const qfPairOf = (bye) => (bye === byeA ? [lo + 3, lo + 4] : [lo + 2, lo + 5]);   // 6°-7° per il 3°, 5°-8° per il 4°
        const partnerOf = {}; partnerOf[lo + 3] = lo + 4; partnerOf[lo + 4] = lo + 3; partnerOf[lo + 2] = lo + 5; partnerOf[lo + 5] = lo + 2;
        const byeOf = {}; byeOf[lo + 3] = byeA; byeOf[lo + 4] = byeA; byeOf[lo + 2] = byeB; byeOf[lo + 5] = byeB;
        const otherBye = (b) => (b === byeA ? byeB : byeA);
        const finalOpponent = (myBye) => {
          const ob = otherBye(myBye), [oa, obb] = qfPairOf(ob);
          return hypoWinner(ob, hypoWinner(oa, obb));
        };
        if (pos === byeA || pos === byeB) {
          const [a, b] = qfPairOf(pos);
          won = playPO(hypoWinner(a, b), 'Semifinale');
          if (won) won = playPO(finalOpponent(pos), 'Finale');
        } else {
          won = playPO(partnerOf[pos], 'Quarti');
          if (won) {
            const myBye = byeOf[pos];
            won = playPO(myBye, 'Semifinale');
            if (won) won = playPO(finalOpponent(myBye), 'Finale');
          }
        }
      } else {
        const mirror = lo + hi - pos;   // semifinali con teste di serie: 3° vs 6°, 4° vs 5° (e equivalenti 4°-7°)
        won = playPO(mirror, 'Semifinale');
        if (won) {
          const rest = []; for (let i = lo; i <= hi; i++) if (i !== pos && i !== mirror) rest.push(i);
          const finalist = hypoWinner(rest[0], rest[1] != null ? rest[1] : rest[0]);
          won = playPO(finalist, 'Finale');
        }
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
    // Vincere la Champions o l'Europa League garantisce un posto in Champions l'anno dopo
    // anche senza chiudere fra le prime 4 in campionato (come nel calcio vero, la coppa
    // vinta vale come pass diretto). La Conference League non dà questo bonus.
    const wonUclOrUel = euroWon && (S.euroComp === 'ucl' || S.euroComp === 'uel');
    const qualTier = S.div === 5 ? (wonUclOrUel ? 'ucl' : euroTierFor(pos)) : null;
    // ----- trofei + prestigio -----
    const trophies = [];
    if (title) { trophies.push(d.name + ' - Titolo'); S.trophies.titles[S.div]++; S.trophies.total++; S.prestige += TROPHY_WORTH[S.div]; }
    if (natWon) { trophies.push('Coppa Italia'); S.trophies.nat++; S.trophies.total++; S.prestige += S.div >= 4 ? 45e6 : 2e6; }
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
      p.ovr = clamp(p.ovr + seasonOvrDelta(p), 40, 99);
      p._ovrDelta = p.ovr - before;
      p._retiring = p.age >= 36;
    });
    // ----- crescita/calo dell'allenatore: legata alle prestazioni della stagione (risultati
    // sopra o sotto le attese, promozione, titolo, retrocessione), non all'età. Un buon
    // allenatore che ottiene più di quanto la rosa "valesse sulla carta" cresce, uno che
    // delude scende. -----
    const mgrBefore = S.manager.rating;
    const mgrDelta = clamp(Math.round((exp - pos) * 0.35 + (promoted ? 2 : 0) + (title ? 3 : 0) + (relegated ? -3 : 0) + gaussInt(0, 1)), -4, 4);
    S.manager.rating = clamp(S.manager.rating + mgrDelta, 40, 97);
    S.manager._ovrDelta = S.manager.rating - mgrBefore;
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
    if (e.promoted) S.div = Math.min(DIVS.length - 1, S.div + 1);
    if (e.relegated) S.div = Math.max(0, S.div - 1);
    S.promoStreak = e.promoted ? (S.promoStreak || 0) + 1 : 0;
    S.euro = !!S.euroCompNext && S.div === 5;
    S.euroComp = S.euro ? S.euroCompNext : null;
    // Mercato semi-realistico: si sblocca e si muove appena si mette piede in una categoria
    // con rose reali note (Serie B, poi Serie A + club europei), non prima.
    simulateTransferWindow();
    // Spirale degli stipendi: la promozione porta aumenti in tutta la rosa, restare in
    // alto significa inflazione annuale, la retrocessione permette tagli. È il freno che
    // impedisce ai soldi di accumularsi semplicemente una volta stabiliti.
    if (e.promoted) { S.squad.forEach((p) => p.wage = roundWage(p.wage * 1.25)); toast('Aumenti da promozione: il monte ingaggi della rosa sale del 25%.'); }
    else if (e.relegated) { S.squad.forEach((p) => p.wage = roundWage(p.wage * 0.85)); }
    else if (S.div === 5) { S.squad.forEach((p) => p.wage = roundWage(p.wage * 1.08)); }
    // il contratto sponsor scende
    if (S.sponsor) { S.sponsor.left--; S.sent = clamp(S.sent + (S.sponsor.sent || 0), 0, 100); if (S.sponsor.left <= 0) { toast('L\'accordo con ' + S.sponsor.name + ' scade.'); S.sponsor = null; } }
    // Età e overall sono già stati aggiornati a fine stagione (endSeason), per poterli
    // mostrare nelle statistiche; qui si applica solo il ritiro di chi ha superato i 35.
    const retired = S.squad.filter((p) => p._retiring).map((p) => p.n);
    S.squad = S.squad.filter((p) => !p._retiring);
    if (retired.length) toast(retired.join(', ') + ' si ritira' + (retired.length === 1 ? '' : 'no') + '.');
    S.squad.forEach((p) => { delete p._ovrDelta; delete p._retiring; });
    // I prestiti restano in rosa (con l'etichetta "prestito" e il bottone 💰 Riscatta al
    // posto di quello di vendita, vedi renderBoard): il presidente decide con calma in
    // sala del consiglio. Chi non viene riscattato torna al suo club solo all'avvio della
    // stagione (startSeason), non qui.
    // I contratti scendono di un anno. Un accordo lasciato scadere senza rinnovo parte a parametro zero.
    const freed = [];
    S.squad.forEach((p) => { p.yrs = (p.yrs == null ? 1 : p.yrs) - 1; });
    S.squad = S.squad.filter((p) => { if ((p.yrs || 0) <= 0) { freed.push(p.n); return false; } return true; });
    if (freed.length) toast(freed.join(', ') + ' ' + (freed.length === 1 ? 'è andato' : 'sono andati') + ' in scadenza e ' + (freed.length === 1 ? 'parte' : 'partono') + ' a parametro zero.');
    S.season++;
    S.mgrOpts = null; S.sponsorOpts = null; S.investorUsed = false; S.spinsBought = 0; S.premiumRoleUsed = false; S._end = null;
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
