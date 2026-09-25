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
  function pickCoppaOpponent(oppStr, faced, ctx = S) {
    let all = [];
    POOLS.forEach((pool) => pool.forEach((c) => { if (c.n !== ctx.club) all.push(c); }));
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
  function genEuroClub(faced, oppStr, ctx = S) {
    const tier = (ctx.euroComp && EURO_CLUBS[ctx.euroComp]) || EURO_CLUBS.conf;
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
  function cupOpponentName(key, oppStr, faced, ctx = S) { return key === 'euro' ? genEuroClub(faced, oppStr, ctx) : pickCoppaOpponent(oppStr, faced, ctx); }

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
  function randPos(squad, ctx = S) {
    squad = squad || (ctx && ctx.squad) || [];
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
  function tickAbsences(ctx = S) {
    ctx.squad.forEach((p) => { if (p.outWeeks > 0) p.outWeeks--; if (p.suspMatches > 0) p.suspMatches--; });
  }

  // Dopo la partita, chi ha giocato rischia un infortunio (più probabile più si va avanti
  // con l'età, o se ha appena recuperato da un problema muscolare senza il tempo di
  // rifiatare davvero) o, se titolare, un cartellino che lo terrà fuori dalla prossima.
  // Due tipi di infortunio, non più uno solo: muscolare (breve, ma con un rischio di ricaduta
  // se rientra troppo presto — p._muscleRisk, settimane residue del rischio) e traumatico
  // (più lungo, nessuna ricaduta perché non è un affaticamento). Resta leggero di proposito:
  // l'obiettivo è dare peso alla gestione della rosa, non un vero bollettino medico — i casi
  // davvero gravi restano un evento narrativo a parte (data.js), non un tiro automatico qui.
  function rollAbsences(lineup, ctx = S) {
    const events = [];
    ctx.squad.forEach((p) => {
      if (!(lineup.starters.has(p.pid) || lineup.subs.has(p.pid))) return;
      if (p.outWeeks > 0 || p.suspMatches > 0) return;
      // Allenatore "preparatore di ferro": uno staff medico-atletico migliore tiene la rosa
      // più sana, sia sul fronte infortuni sia su quello cartellini.
      const mgrMedic = ctx.manager && ctx.manager.spec === 'medic' ? 0.7 : 1;
      const injMult = diffOf(null, ctx).injuryMult * mgrMedic;
      const recidivism = p._muscleRisk > 0 ? 0.02 * p._muscleRisk : 0;
      const injChance = ((p.age >= 32 ? 0.03 : p.age >= 28 ? 0.02 : 0.013) + recidivism) * injMult;
      let injuredNow = false;
      if (Math.random() < injChance) {
        injuredNow = true;
        const muscular = Math.random() < 0.65;
        const weeks = muscular ? 1 + rnd(3) : 4 + rnd(4);
        p.outWeeks = weeks;
        p._muscleRisk = muscular ? 3 : 0;
        events.push({ n: p.n, nat: p.nat, kind: 'inj', weeks, type: muscular ? 'muscular' : 'traumatic' });
      } else if (lineup.starters.has(p.pid) && Math.random() < 0.018 * injMult) {
        p.suspMatches = 1;
        events.push({ n: p.n, nat: p.nat, kind: 'susp' });
      }
      // La finestra di rischio ricaduta scende di una settimana ogni volta che gioca senza
      // farsi male di nuovo — non mentre è fermo ai box (lì non sta ancora rischiando nulla).
      if (!injuredNow && p._muscleRisk > 0) p._muscleRisk--;
    });
    return events;
  }

  function pickMatchLineup(squad, ctx = S) {
    tickAbsences(ctx);
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
    const manualPids = (ctx.previewXI && Array.isArray(ctx.previewXI.pids)) ? ctx.previewXI.pids.filter((pid) => pid != null) : [];
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
      // Il fabbisogno di ruoli segue il modulo scelto (FORMATION_TACTICS, data.js), non più
      // sempre un 4-3-3 fisso: un 4-2-4 prova davvero a schierare 4 attaccanti, non 3.
      const need = (FORMATION_TACTICS[ctx.formation] || FORMATION_TACTICS['433']).need;
      Object.keys(need).forEach((k) => byPos[k].slice(0, Math.max(0, need[k] - [...starters].filter((pid) => squad.find((p) => p.pid === pid)?.pos === k).length)).forEach((r) => starters.add(r.p.pid)));
      if (starters.size < target) rated.slice().sort((a, b) => b.eff - a.eff).forEach((r) => { if (starters.size < target) starters.add(r.p.pid); });
    }
    const bench = pool.filter((p) => !starters.has(p.pid));
    const subsCount = Math.min(bench.length, 1 + rnd(3));
    const subs = new Set(shuffle(bench.slice()).slice(0, subsCount).map((p) => p.pid));
    const lineup = { starters, subs };
    lineup.events = rollAbsences(lineup, ctx);
    return lineup;
  }

  // Chi ha giocato quella partita (titolare o subentrato) guadagna una presenza.
  function registerAppearances(lineup, ctx = S) {
    ctx.squad.forEach((p) => { if (lineup.starters.has(p.pid) || lineup.subs.has(p.pid)) p.seasonApps = (p.seasonApps || 0) + 1; });
  }

  // Un subentrato pesa una frazione di un titolare (meno minuti in campo), e chi non ha
  // giocato affatto quella partita non può segnare né assistere in essa.
  const SUB_FACTOR = 0.4;

  const lineupFactor = (p, lineup) => lineup.starters.has(p.pid) ? 1 : lineup.subs.has(p.pid) ? SUB_FACTOR : 0;

  // Peso di un giocatore come possibile marcatore: il ruolo pesa più di tutto, ma tra
  // giocatori dello stesso ruolo quelli più forti (e in forma migliore) segnano di più.
  const scorerWeight = (p, lineup) => (POS_SCORE_WEIGHT[p.pos] || 1) * Math.pow(Math.max(p.ovr, 30) / 50, 1.7) * lineupFactor(p, lineup) * (p.formSeason || 1);

  function pickScorer(lineup, ctx = S) {
    if (!ctx.squad.length) return null;
    const total = ctx.squad.reduce((a, p) => a + scorerWeight(p, lineup), 0);
    if (total <= 0) return null;
    let r = Math.random() * total;
    for (const p of ctx.squad) { const w = scorerWeight(p, lineup); r -= w; if (r <= 0 && w > 0) return p; }
    return null;
  }

  const assistWeight = (p, lineup) => (POS_ASSIST_WEIGHT[p.pos] || 1) * Math.pow(Math.max(p.ovr, 30) / 50, 1.4) * lineupFactor(p, lineup) * (p.formSeason || 1);

  function pickAssister(scorerPid, lineup, ctx = S) {
    const pool = ctx.squad.filter((p) => p.pid !== scorerPid);
    if (!pool.length) return null;
    const total = pool.reduce((a, p) => a + assistWeight(p, lineup), 0);
    if (total <= 0) return null;
    let r = Math.random() * total;
    for (const p of pool) { const w = assistWeight(p, lineup); r -= w; if (r <= 0 && w > 0) return p; }
    return null;
  }

  // Il portiere che ha giocato la partita: quello titolare nella formazione di giornata.
  function matchGK(lineup, ctx = S) {
    return ctx.squad.find((p) => p.pos === 'POR' && lineup.starters.has(p.pid)) || null;
  }

  function seasonPerformanceRatio(p, ctx = S) {
    const appsRatio = clamp((p.seasonApps || 0) / Math.max(1, gp(ctx)), 0.05, 1);
    if (p.pos === 'POR') {
      const expectedCS = gp(ctx) * 0.28 * appsRatio;
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

  // Oltre i 95 di overall la crescita rallenta (arrivare al vero tetto di 110 — più alto di
  // quello di qualunque spin, fermo a 99 — deve restare eccezionale, un traguardo che si
  // costruisce stagione dopo stagione, non la norma per chiunque abbia una buona annata):
  // frena solo la CRESCITA, non i cali, e si fa via via più ripida avvicinandosi al tetto.
  function growthDamp(ovr) {
    if (ovr < 95) return 1;
    const t = clamp((ovr - 95) / 15, 0, 1);
    return clamp(1 - t * t * 0.9, 0.12, 1);
  }
  function seasonOvrDelta(p, ctx = S) {
    const ratio = seasonPerformanceRatio(p, ctx);
    // sopra 1 = stagione da incorniciare, sotto 1 = deludente; pesa di più verso l'alto
    // (le esplosioni improvvise fanno più notizia dei cali) ma resta un contributo, non
    // può bastare da solo a spingere qualcuno al tetto di crescita: quello richiede anche
    // l'età giusta (vedi ageGrowthBase), altrimenti troppi giocatori ci finivano sempre.
    const perf = clamp((ratio - 1) * 2.2, -3, 4);
    const noise = (Math.random() - 0.5) * 1.5;
    let delta = ageGrowthBase(p.age) + perf + noise;
    if (delta > 0) delta *= growthDamp(p.ovr);
    // Allenatore "costruttore di giovani": un filo di crescita in più, ma solo quando
    // c'è già crescita da spingere (non tampona un calo).
    if (delta > 0 && p.age <= 23 && ctx.manager && ctx.manager.spec === 'builder') delta += 1;
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
  function rostersFor(oppClub, ctx = S) {
    if (ctx.market) return ctx.market.serieA[oppClub] || ctx.market.serieB[oppClub] || ctx.market.euro[oppClub] || null;
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
  function initMarket(ctx = S) {
    ctx.market = { serieA: cloneRosterPool(SERIE_A_ROSTERS), serieB: cloneRosterPool(SERIE_B_ROSTERS), euro: cloneRosterPool(EURO_ROSTERS) };
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
  function simulateTransferWindow(ctx = S) {
    if (ctx.div >= 4) ctx.marketSeenB = true;
    if (ctx.div >= 5) ctx.marketSeenA = true;
    if (!ctx.marketSeenB && !ctx.marketSeenA) return;
    if (!ctx.market) initMarket(ctx);
    const pools = [];
    if (ctx.marketSeenB) pools.push({ kind: 'q', clubs: ctx.market.serieB });
    if (ctx.marketSeenA) { pools.push({ kind: 'q', clubs: ctx.market.serieA }); pools.push({ kind: 'ovr', clubs: ctx.market.euro }); }
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
  function genGoals(count, isUs, oppClub, lineup, ctx = S) {
    const mins = []; for (let i = 0; i < count; i++) mins.push(1 + rnd(90));
    mins.sort((a, b) => a - b);
    const oppRoster = !isUs && oppClub ? rostersFor(oppClub, ctx) : null;
    return mins.map((min) => {
      if (!isUs) { const rp = oppRoster ? pickRealScorer(oppRoster) : null; return { min, name: rp ? rp.n : genName() }; }
      const p = pickScorer(lineup, ctx);
      if (p) {
        p.seasonGoals = (p.seasonGoals || 0) + 1;
        // Una prestazione da ricordare spinge la forma più su di quanto la regressione verso
        // la media (regressPlayerForm, chiamata prima di questa) l'abbia appena tirata giù:
        // un gol pesa più di un assist, entrambi più della semplice regressione.
        p.formSeason = clamp((p.formSeason || 1) + 0.05, 0.45, 1.9);
        if (Math.random() < 0.8) { const a = pickAssister(p.pid, lineup, ctx); if (a) { a.seasonAssists = (a.seasonAssists || 0) + 1; a.formSeason = clamp((a.formSeason || 1) + 0.03, 0.45, 1.9); } }
      }
      return { min, name: p ? p.n : 'Autorete' };
    });
  }

  // Un clean sheet va al portiere che ha giocato quella partita, ogni volta che la
  // squadra non subisce gol.
  function registerCleanSheet(ga, lineup, ctx = S) {
    if (ga !== 0) return;
    const p = matchGK(lineup, ctx);
    if (p) { p.seasonCleanSheets = (p.seasonCleanSheets || 0) + 1; p.formSeason = clamp((p.formSeason || 1) + 0.04, 0.45, 1.9); }
  }

  // La forma di un giocatore non è più un numero fissato a caso a inizio stagione e mai più
  // toccato: chi scende in campo regredisce un filo verso la media (8% della distanza da 1)
  // ad ogni partita, poi un gol/assist/clean sheet (genGoals/registerCleanSheet, chiamate
  // subito dopo questa) lo spinge di nuovo su — una vera striscia positiva/negativa nasce da
  // sé, partita dopo partita, invece di restare un unico numero per tutta la stagione.
  function regressPlayerForm(lineup, ctx = S) {
    ctx.squad.forEach((p) => {
      if (!(lineup.starters.has(p.pid) || lineup.subs.has(p.pid))) return;
      const cur = p.formSeason || 1;
      p.formSeason = clamp(cur + (1 - cur) * 0.08, 0.45, 1.9);
    });
  }

  // Raggruppa i gol per marcatore per una riga compatta tipo "Rossi 12', 55' · Bianchi 78'".
  function fmtScorers(goals) {
    if (!goals || !goals.length) return '';
    const byName = [];
    goals.forEach((g) => { let e = byName.find((x) => x.name === g.name); if (!e) { e = { name: g.name, mins: [] }; byName.push(e); } e.mins.push(g.min); });
    return byName.map((e) => e.name + ' ' + e.mins.map((m) => m + "'").join(', ')).join(' · ');
  }

  let S = null;

  // Guardia di sicurezza sui punti di contatto fra motore e UI (simMatch/simToEnd/
  // startSeason/endSeason/advance/computeTable/currentPos): un domani un bottone agganciato
  // per sbaglio "nudo" a una di queste (es. addEventListener('click', startSeason) invece di
  // () => startSeason()) passerebbe l'evento click al posto di ctx — è già successo una volta
  // (vedi cronologia). Invece di esplodere in silenzio su un oggetto che non è affatto un
  // club (o peggio, mutarlo), si ricade su S: stesso comportamento di quando ctx è omesso.
  const isClubCtx = (x) => !!(x && Array.isArray(x.squad));

  // Durante "Simula fino a fine stagione" le singole partite si susseguono in un unico ciclo
  // sincrono: il browser non ridisegna nulla finché il ciclo non finisce, quindi salvare su
  // localStorage (JSON.stringify dell'intero stato) ad ogni giornata è lavoro sprecato — lo
  // rimandiamo a un solo salvataggio quando il ciclo si ferma (fine stagione o sosta invernale).
  let BULK_SIM = false;

  const divOf = (ctx = S) => DIVS[ctx.div];

  const diffOf = (key, ctx = S) => DIFFICULTIES.find((x) => x.key === (key || (ctx && ctx.difficulty))) || DIFFICULTIES[1];

  const gp = (ctx = S) => (divOf(ctx).teams - 1) * 2;

  const capOf = (ctx = S) => STADIUM[ctx.stadiumTier].cap;

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
    if (S) w *= diffOf().wageMult;
    return roundWage(w);
  };

  const scoutTier = () => SCOUT_TIERS[S.scoutLevel || 0];

  const scoutUpgradeCost = (lvl) => Math.round(divOf().spin * [0, 2.0, 4.2, 8.0][lvl] * diffOf().scoutCostMult / 1000) * 1000;

  // Una piccola "cerimonia" del vivaio, generata al più una volta a stagione se il dado lo
  // concede: invece di un solo prospetto anonimo, il settore giovanile presenta più candidati
  // (3 al livello massimo di scouting, altrimenti 2) fra cui scegliere UNO solo da aggregare
  // gratis alla rosa — gli altri restano altrove. Nessuno dei due entra subito in squadra,
  // va comunque ingaggiato dal presidente come uno svincolato.
  function maybeScoutProspect() {
    if (!S.scoutLevel || S.scoutProspectSeason === S.season) return;
    S.scoutProspectSeason = S.season;
    if (Math.random() < scoutTier().prospectChance * diffOf().prospectMult) {
      const d = divOf();
      const count = S.scoutLevel >= 3 ? 3 : 2;
      S.scoutProspects = Array.from({ length: count }, () => {
        const nat = pickNationality(S.div);
        const ovr = clamp(gaussInt(d.avg - 2, 5), 40, 92);
        return { n: genName(nat), nat, ovr, age: 16 + rnd(5), wage: wageFor(ovr), yrs: 3 + rnd(2), pid: newPid(), pos: randPos(), seasonGoals: 0, seasonAssists: 0, seasonCleanSheets: 0, seasonApps: 0 };
      });
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

  function spinPlayer(premium, role, bonus) {
    const d = divOf(), scout = scoutTier();
    bonus = bonus || 0;
    // Il tetto (SPIN_CAPS) è lo stesso, sia che lo spin peschi un giocatore generato sia
    // che peschi uno vero: usarlo come hi della fascia di ricerca (invece di un hi più
    // basso derivato da d.avg) fa sì che un giocatore reale non sia più limitato più in
    // basso di uno generato allo stesso livello.
    const cap = SPIN_CAPS[S.div] || SPIN_CAPS[SPIN_CAPS.length - 1];
    const band = premium ? { lo: d.avg + 5, hi: cap.premium } : { lo: d.avg, hi: cap.base };
    if (S.div === 5 && Math.random() < 1 / 12) {
      const icon = iconPlayer(role);
      if (icon) return icon;
    }
    // In Serie B lo spin di lusso pesca quasi sempre un giocatore vero (rose di Serie A/B/
    // Europa): è il senso stesso di pagare per il lusso a quel livello. Lo spin normale
    // resta più incerto.
    const realChance = S.div === 5 ? (premium ? 0.8 : 0.68) : S.div === 4 ? (premium ? 0.97 : 0.55) : 0;
    if (realChance && Math.random() < realChance) {
      const real = realLeaguePlayer(band.lo, band.hi, role);
      if (real) return real;
    }
    let ovr;
    if (premium) {
      ovr = gaussInt(d.avg + 10 + scout.bonus, clamp(3.0 + scout.varDelta, 1.6, 3.0));
      if (Math.random() < 0.12 + scout.gem) ovr += 4 + rnd(4);   // lo scout scopre un gioiello
      ovr = clamp(ovr, band.lo, cap.premium);   // tetto massimo di categoria per il lusso
    } else {
      ovr = gaussInt(d.avg + 1 + scout.bonus + bonus, clamp(3.3 + scout.varDelta, 1.8, 3.3));
      if (Math.random() < scout.gem + (bonus > 0 ? 0.08 : 0)) ovr += 4 + rnd(4);
      ovr = clamp(ovr, band.lo, cap.base);   // tetto massimo di categoria per il base
    }
    const age = premium && Math.random() < 0.35 ? 16 + rnd(6) : genAge(24, 5, 17, 36);
    const nat = pickNationality(S.div);
    return { n: genName(nat), nat, ovr, age, wage: wageFor(ovr), yrs: 3 + rnd(2), pid: newPid(), pos: role || randPos(), seasonGoals: 0, seasonAssists: 0, seasonCleanSheets: 0, seasonApps: 0 };
  }

  // Svincolati: nessun costo di cartellino, rating scarso per il livello, stipendi modesti.
  // Servono a portare un club in difficoltà al minimo di 16 giocatori, non a vincere partite.
  const freeAgent = (role) => { const d = divOf(); const ovr = clamp(d.avg - 13 + rnd(6), 40, 99); const nat = pickNationality(S.div); return { n: genName(nat), nat, ovr, age: genAge(27, 5.5, 18, 37), wage: roundWage(wageFor(ovr) * 0.7), yrs: 1 + rnd(2), pid: newPid(), pos: role || randPos(), seasonGoals: 0, seasonAssists: 0, seasonCleanSheets: 0, seasonApps: 0 }; };

  const playerValue = (p) => p.wage * 52 * (p.ovr >= 85 ? 9 : p.ovr >= 78 ? 7 : p.ovr >= 68 ? 5 : 3.5) * (p.age <= 23 ? 1.4 : p.age >= 31 ? 0.6 : 1);

  // Prezzo per trattenere in rosa a titolo definitivo un giocatore preso in prestito a
  // gennaio: più caro del semplice prestito, in linea col cartellino del mercato di gennaio.
  const loanBuybackFee = (p) => Math.round(playerValue(p) * 0.75);

  const wageBill = (ctx = S) => ctx.squad.reduce((a, p) => a + p.wage, 0) * 52;

  /* ---------------- contratti + offerte di mercato ---------------- */
  // Ogni giocatore ha un `pid` (id stabile, sopravvive a riordini/ricariche in modo che le
  // offerte possano puntare a lui) e `yrs` = anni di contratto rimasti. Un contratto che
  // arriva a zero senza rinnovo in advance() lo lascia libero a parametro zero.
  function newPid(ctx = S) { const id = ctx.pidNext || 1; ctx.pidNext = id + 1; return id; }

  // Quando un giocatore lascia il club per sempre (ceduto, svincolato a fine contratto,
  // ritirato) ne salviamo un "cimelio" con i totali di carriera fissati per sempre: senza
  // questo, i migliori giocatori di sempre passati per il club spariscono dalla bacheca di
  // fine carriera non appena vengono venduti, lasciando solo chi è rimasto fino alla fine.
  // `retired`: true solo per chi smette di giocare per davvero (ritiro per età/partita
  // d'addio) — non per chi viene ceduto o si svincola, che continua altrove. Serve a
  // `legendManagerCandidate` per non offrire in panchina un giocatore ancora in attività.
  function pushAlumnus(p, ctx = S, retired) {
    if (!ctx.alumni) ctx.alumni = [];
    ctx.alumni.push({
      n: p.n, pos: p.pos, nat: p.nat, ovr: p.ovr,
      apps: (p.careerApps || 0) + (p.seasonApps || 0),
      goals: (p.careerGoals || 0) + (p.seasonGoals || 0),
      assists: (p.careerAssists || 0) + (p.seasonAssists || 0),
      cleanSheets: (p.careerCleanSheets || 0) + (p.seasonCleanSheets || 0),
      retired: !!retired, retiredSeason: ctx.season,
    });
  }

  // Una leggenda ritirata da un po' (COOLDOWN stagioni, il tempo di prendersi i patentini) può
  // ricomparire come candidato allenatore assumibile per il TUO club — mai per un rivale: sono
  // le sue leggende, non un pool casuale. `becameManager` evita che ricompaia una seconda volta
  // una volta scelta (o anche solo proposta e poi ignorata: una leggenda ha un'unica occasione).
  function legendManagerCandidate(ctx = S) {
    const COOLDOWN = 3;
    const pool = (ctx.alumni || []).filter((a) => a.retired && !a.becameManager && a.ovr >= 78 && (ctx.season - (a.retiredSeason || 0)) >= COOLDOWN);
    if (!pool.length) return null;
    const a = pick(pool);
    a.becameManager = true;
    const rating = clamp(a.ovr - 6 + rnd(6), 55, 95);
    const nat = a.nat || pickNationality(ctx.div);
    return { n: a.n, rating, salary: mgrSalaryFor(rating, ctx), nat, spec: pick(MANAGER_SPECS).key, exPlayer: true };
  }

  function normSquad() {
    if (!S || !S.squad) return;
    if (S.pidNext == null) S.pidNext = 1;
    if (!S.offers) S.offers = [];
    if (!S.alumni) S.alumni = [];
    if (!S.achievements) S.achievements = [];
    if (S.startDiv == null) S.startDiv = S.div;
    if (S.noRelegStreak == null) S.noRelegStreak = 0;
    if (S.sportingDirector === undefined) S.sportingDirector = null;
    if (S.opps) {
      const usedMgrNames = new Set(S.opps.filter((o) => o.mgr).map((o) => o.mgr.n).concat(S.manager && S.manager.n ? [S.manager.n] : []));
      const mgrRegistry = S._mgrByClub || (S._mgrByClub = {});
      S.opps.forEach((o) => { if (!o.mgr) o.mgr = managerForClub(o.name, 0, S, usedMgrNames, mgrRegistry); else mgrRegistry[o.name] = o.mgr; });
    }
    if (!S.crestColors) S.crestColors = randCrestColors();
    if (!S.crestShape) S.crestShape = CREST_DEFAULT.shape;
    if (S.scoutLevel == null) S.scoutLevel = 0;
    if (S.autoInvestor == null) S.autoInvestor = false;
    if (!S.derbyRecord) S.derbyRecord = {};
    ensureCaptain(S);
    if (S.scoutProspectSeason == null) S.scoutProspectSeason = 0;
    // Migrazione da un salvataggio pre-"cerimonia del vivaio": un prospetto singolo diventa
    // una lista con un solo candidato, così non sparisce per chi ce l'aveva già in sospeso.
    if (!S.scoutProspects) S.scoutProspects = S.scoutProspect ? [S.scoutProspect] : [];
    if (S.marketSeenB == null) S.marketSeenB = S.div >= 4;
    if (S.marketSeenA == null) S.marketSeenA = S.div >= 5;
    if (S.market === undefined) S.market = null;
    if (!S.formation || !FORMATION_TACTICS[S.formation]) S.formation = '433';
    S.squad.forEach((p) => { if (p.yrs == null) p.yrs = 2 + rnd(2); if (p.pid == null) p.pid = newPid(); if (!p.pos) p.pos = randPos(); if (p.seasonGoals == null) p.seasonGoals = 0; if (p.seasonAssists == null) p.seasonAssists = 0; if (p.seasonCleanSheets == null) p.seasonCleanSheets = 0; if (p.seasonApps == null) p.seasonApps = 0; if (p.careerGoals == null) p.careerGoals = 0; if (p.careerAssists == null) p.careerAssists = 0; if (p.careerCleanSheets == null) p.careerCleanSheets = 0; if (p.careerApps == null) p.careerApps = 0; if (p.joinedSeason == null) p.joinedSeason = S.season; if (!p.nat) p.nat = pickNationality(S.div); if (p.outWeeks == null) p.outWeeks = 0; if (p.suspMatches == null) p.suspMatches = 0; });
    if (S.manager && !S.manager.nat) S.manager.nat = S.manager.real ? natByCode(REAL_MANAGERS.find((m) => m.n === S.manager.n)?.nat) || pickNationality(S.div) : pickNationality(S.div);
    if (S.manager && !S.manager.spec) {
      const rm = S.manager.real ? REAL_MANAGERS.find((m) => m.n === S.manager.n) : null;
      S.manager.spec = (rm && rm.spec) || pick(MANAGER_SPECS).key;
    }
  }

  const finalYear = (p) => (p.yrs || 0) <= 1;   // ultimo anno di contratto -> rinnova o lo perdi a zero

  // Cosa chiede per rinnovare: il suo stipendio di mercato per il suo rating (spesso
  // migliorato) più un premio più alto per i giovani talenti. I giocatori più anziani
  // chiedono di meno, e un veterano il cui valore di mercato è ormai sceso sotto lo
  // stipendio attuale può accettare un taglio per restare — invece di bloccare per sempre
  // uno stipendio ormai sproporzionato al suo rendimento reale, con nessuna via d'uscita se
  // non svincolarlo.
  function renewWage(p) {
    const d = divOf();
    const star = p.ovr >= d.avg + 6 ? 0.16 : p.ovr >= d.avg + 2 ? 0.08 : 0;
    const youth = p.age <= 22 ? 0.14 : p.age <= 26 ? 0.05 : p.age >= 32 ? -0.02 : 0;
    // Allenatore "negoziatore": sa trattare, i rinnovi chiedono un po' meno.
    const mgrNegotiator = S.manager && S.manager.spec === 'negotiator' ? 0.95 : 1;
    const declining = p.age >= 30 && wageFor(p.ovr) < p.wage;
    const base = declining ? wageFor(p.ovr) : Math.max(p.wage, wageFor(p.ovr));
    return roundWage(base * (1.08 + star + youth) * mgrNegotiator);
  }

  const renewYears = (p) => (p.age >= 31 ? 1 + rnd(2) : 3 + rnd(2));

  // Un'offerta è un vero premio sul 30% del valore di svincolo, quindi incassare è
  // redditizio ma perdi il giocatore. Arrotondata a una cifra tonda.
  function offerFee(p, ctx = S) {
    const dsMult = ctx.sportingDirector && ctx.sportingDirector.spec === 'sales_expert' ? 1.12 : 1;
    const v = playerValue(p) * (0.95 + Math.random() * 0.55) * dsMult;
    return v >= 1e6 ? Math.round(v / 1e5) * 1e5 : Math.round(v / 1e4) * 1e4;
  }

  // Sceglie il club offerente in base alla cifra da pagare, non a caso: un tetto di spesa
  // plausibile per categoria (3 volte il costo di uno spin di lusso lì, una proxy ragionevole
  // di "cosa si può permettere un club di quel livello"), poi fra i club di quella fascia
  // pesca preferibilmente i più forti (quindi i più ricchi) quando la cifra è alta — niente
  // più squadre di provincia che offrono cifre da big.
  function buyerClub(fee, ctx = S) {
    const CAP = DIVS.map((dv) => dv.premium * 3);
    let tier = CAP.findIndex((cap) => fee <= cap);
    if (tier < 0) tier = 4;
    tier = clamp(Math.max(tier, ctx.div + 1), 0, DIVS.length - 1);
    const pool = (POOLS[tier] || POOLS[DIVS.length - 1]).filter((c) => c.n !== ctx.club);
    if (!pool.length) return 'un club più grande';
    const sorted = pool.slice().sort((a, b) => b.s - a.s);
    const topN = fee > CAP[tier] * 0.45 ? Math.max(1, Math.round(sorted.length * 0.3)) : sorted.length;
    return pick(sorted.slice(0, topN)).n;
  }

  // I rivali fanno offerte per i tuoi giocatori migliori: quelli chiaramente sopra il
  // livello, o i giovani precoci. Zero a due offerte all'estate, pesate perché i veri
  // gioielli attirino interesse e i giocatori normali no.
  function genOffers(ctx = S) {
    const d = divOf(ctx);
    // Il direttore sportivo "rete di osservatori" allarga il giro di squadre interessate: un
    // candidato extra in lista e più probabilità che ciascuno si faccia davvero avanti.
    const scoutNetwork = ctx.sportingDirector && ctx.sportingDirector.spec === 'scout_network';
    const targets = ctx.squad
      .filter((p) => p.ovr >= d.avg + 3 || (p.age <= 22 && p.ovr >= d.avg))
      .sort((a, b) => (b.ovr + (b.age <= 22 ? 4 : 0)) - (a.ovr + (a.age <= 22 ? 4 : 0)))
      .slice(0, scoutNetwork ? 4 : 3);
    const offers = [];
    targets.forEach((p, i) => { if (Math.random() < (i === 0 ? 0.95 : i === 1 ? 0.75 : 0.55) + (scoutNetwork ? 0.15 : 0)) { const fee = offerFee(p, ctx); offers.push({ pid: p.pid, club: buyerClub(fee, ctx), fee }); } });
    return offers;
  }

  // Affaticamento dello scout: ogni spin comprato nella stessa finestra pre-stagione
  // costa il 30% in più dell'ultimo (standard e marquee condividono il contatore). Uno o
  // due spin restano accessibili, ripetere l'intera rosa in una sola estate diventa
  // rovinosamente costoso.
  function spinCostNow(premium) {
    const base = premium ? divOf().premium : divOf().spin;
    const w = base * Math.pow(1.3, S.spinsBought || 0) * diffOf().scoutCostMult;
    if (w >= 1e6) return Math.round(w / 1e5) * 1e5;
    if (w >= 1e5) return Math.round(w / 5e3) * 5e3;
    return Math.round(w / 1e3) * 1e3;
  }

  // Ciò che resta davvero da spendere una volta coperti stipendi + allenatore (+ direttore
  // sportivo, se assunto: opzionale, 0 se non c'è) della stagione.
  const kickoffBill = (ctx = S) => wageBill(ctx) + ctx.manager.salary + (ctx.sportingDirector ? ctx.sportingDirector.salary : 0);

  const freeToSpend = () => S.budget - kickoffBill();

  const mgrSalaryFor = (rating, ctx = S) => Math.round(40e3 * Math.pow(1.14, rating - 50) * diffOf(null, ctx).mgrCostMult / 1e3) * 1e3;

  // Il direttore sportivo costa meno dell'allenatore (ruolo di supporto, non decide le
  // formazioni): stessa curva salariale scalata al 55%.
  const dsSalaryFor = (rating, ctx = S) => Math.round(mgrSalaryFor(rating, ctx) * 0.55 / 1e3) * 1e3;

  // Generato come un allenatore: un candidato su circa 3 è un vero direttore sportivo (vedi
  // REAL_DS in data.js), con la specializzazione coerente con la sua fama reale invece che
  // a caso — non sostituiscono i generati, si aggiungono come opzione possibile in più.
  function genSportingDirector(bonus, ctx = S) {
    const r = clamp(divOf(ctx).mgrBase - 6 + rnd(14) + (bonus || 0), 40, 90);
    if (Math.random() < 0.35) {
      const near = REAL_DS.filter((m) => Math.abs(m.rating - r) <= 8);
      if (near.length) {
        const m = pick(near);
        const salary = Math.round(dsSalaryFor(m.rating, ctx) * (m.spec === 'all_rounder' ? 0.85 : 1) / 1e3) * 1e3;
        return { n: m.n, rating: m.rating, salary, nat: natByCode(m.nat), real: true, spec: m.spec };
      }
    }
    const nat = pickNationality(ctx.div);
    const spec = pick(DS_SPECS).key;
    const salary = Math.round(dsSalaryFor(r, ctx) * (spec === 'all_rounder' ? 0.85 : 1) / 1e3) * 1e3;
    return { n: genName(nat), rating: r, salary, nat, spec };
  }

  // Un candidato su circa 2 è un allenatore vero, se ce n'è uno con un rating abbastanza
  // vicino a quello richiesto (altrimenti si genera normalmente): non sostituiscono i
  // generati, si aggiungono come opzione possibile fra i candidati.
  function genManager(bonus, ctx = S) {
    const r = clamp(divOf(ctx).mgrBase - 4 + rnd(12) + (bonus || 0), 45, 92);
    // Un allenatore VERO porta la sua specializzazione reale (vedi REAL_MANAGERS in
    // data.js), non una a caso: coerente con la sua fama, non solo col nome.
    if (Math.random() < 0.4) {
      const near = REAL_MANAGERS.filter((m) => Math.abs(m.rating - r) <= 8);
      if (near.length) { const m = pick(near); return { n: m.n, rating: m.rating, salary: mgrSalaryFor(m.rating, ctx), nat: natByCode(m.nat), real: true, spec: m.spec || pick(MANAGER_SPECS).key }; }
    }
    const nat = pickNationality(ctx.div);
    return { n: genName(nat), rating: r, salary: mgrSalaryFor(r, ctx), nat, spec: pick(MANAGER_SPECS).key };
  }

  // Come genManager, ma senza creare due allenatori omonimi nella stessa lega: `used` è il
  // set (mutato sul posto) dei nomi già assegnati alle altre squadre dello stesso campionato
  // (rivali generati per una singola carriera, o l'intero gruppo di una stanza multiplayer).
  // Capita spesso senza: il pool di REAL_MANAGERS vicini al rating richiesto è piccolo, e con
  // più squadre generate in fila `pick(near)` ripesca facilmente lo stesso nome.
  function genManagerUnique(bonus, ctx, used) {
    for (let tries = 0; tries < 8; tries++) {
      const m = genManager(bonus, ctx);
      if (!used.has(m.n)) { used.add(m.n); return m; }
    }
    // Il pool di nomi "veri" vicini a quel rating è esaurito: si forza un nome generato (mai
    // un allenatore reale), ripescando finché non è libero anche lì.
    const r = clamp(divOf(ctx).mgrBase - 4 + rnd(12) + (bonus || 0), 45, 92);
    const nat = pickNationality(ctx.div);
    let n = genName(nat), tries2 = 0;
    while (used.has(n) && tries2 < 15) { n = genName(nat); tries2++; }
    used.add(n);
    return { n, rating: r, salary: mgrSalaryFor(r, ctx), nat, spec: pick(MANAGER_SPECS).key };
  }

  // L'allenatore di un club rivale/bot non deve ricominciare da un nome a caso ogni stagione:
  // se il club è già nel registro (persiste stagione dopo stagione dentro ctx._mgrByClub, che
  // viaggia col resto dello stato salvato/inviato ad ogni round) tiene lo stesso, esattamente
  // come il PROPRIO allenatore resta lo stesso finché non lo si esonera. Cambia solo se il suo
  // nome è già stato preso da un'altra squadra in questa stessa stagione (mai due squadre con
  // lo stesso allenatore nello stesso anno) — un caso raro, possibile solo se due registri di
  // umani diversi della stessa stanza multiplayer avevano già assegnato quel nome altrove.
  function managerForClub(clubName, bonus, ctx, used, registry) {
    const existing = registry[clubName];
    if (existing && !used.has(existing.n)) { used.add(existing.n); return existing; }
    const m = genManagerUnique(bonus, ctx, used);
    registry[clubName] = m;
    return m;
  }

  const mgrBonus = (ctx = S) => clamp((ctx.manager.rating - divOf(ctx).mgrBase) / 3.5, -3, 4)
    + (ctx.manager && ctx.manager.spec === 'tactician' ? 1.2 : 0)
    + (ctx.manager && ctx.manager.spec === 'motivator' && ctx.sent < 40 ? 1.5 : 0);

  function sponsorOffers() {
    const d = divOf();
    const base = (d.prize * 0.3 + capOf() * 9) * 1.3 * diffOf().sponsorMult;   // +30% su tutti gli accordi sponsor (aumentato di un ulteriore 8% circa), poi scalato per difficoltà
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
  function squadStr(ctx = S) {
    const s = ctx.squad.slice().sort((a, b) => b.ovr - a.ovr);
    const eleven = s.slice(0, 11); while (eleven.length < 11) eleven.push({ ovr: 42 });
    const avg = eleven.reduce((a, p) => a + p.ovr, 0) / 11;
    return Math.round((avg + clamp((s.length - 11) * 0.25, 0, 2.5)) * 10) / 10;
  }

  // Chi viene promosso rincatenando una seconda promozione di fila (rosa e organizzazione
  // ancora tarate sulla categoria precedente) fatica un filo in più ad ambientarsi rispetto
  // a chi ha avuto una stagione intera per consolidarsi: un piccolo malus, non un muro.
  const promoStreakMalus = (ctx = S) => (ctx.promoStreak > 0 ? 2.2 * diffOf(null, ctx).promoStreakMalusMult * (ctx.manager && ctx.manager.spec === 'motivator' ? 0.5 : 1) : 0);

  // Una "personalità tattica" per un rivale bot, fissata a inizio stagione (mai un numero
  // di forza e basta): pescata dalla stessa scala di FORMATION_TACTICS, letta poi al
  // contrario in rollMatchScore (un avversario aggressivo segna di più contro di te, uno
  // con una difesa fragile ti regala qualche gol in più).
  const randomFmt = () => { const t = FORMATION_TACTICS[pick(Object.keys(FORMATION_TACTICS))]; return { atk: t.atk, def: t.def }; };

  // Quanto la rosa disponibile (non infortunati/squalificati) copre DAVVERO il modulo scelto:
  // ogni titolare che manca in un ruolo (es. un 4-2-4 con un solo vero attaccante) va coperto
  // da qualcuno fuori posto, un prezzo in campo — non solo l'inquadratura sbagliata a bordo
  // campo. Il 4-3-3 di riferimento, con una rosa equilibrata, non paga mai nulla qui.
  function formationFitMalus(ctx = S) {
    const need = (FORMATION_TACTICS[ctx.formation] || FORMATION_TACTICS['433']).need;
    const avail = ctx.squad.filter((p) => !(p.outWeeks > 0) && !(p.suspMatches > 0));
    let malus = 0;
    ['DIF', 'CEN', 'ATT'].forEach((pos) => {
      const have = avail.filter((p) => p.pos === pos).length;
      const short = need[pos] - have;
      if (short > 0) malus += short * 0.9;
    });
    return malus;
  }

  // Quante settimane cariche di fila (coppa+campionato nella stessa settimana, vedi
  // maybeCupRound) la squadra si porta dietro: 0.35 a settimana, fino a un tetto di 3
  // settimane (-1.05) — un preparatore di ferro (spec `medic`) la dimezza.
  const fatigueMalus = (ctx = S) => (ctx._congestion || 0) * 0.35 * (ctx.manager && ctx.manager.spec === 'medic' ? 0.5 : 1);

  const teamEff = (ctx = S) => squadStr(ctx) + mgrBonus(ctx) + (ctx.form || 0) - promoStreakMalus(ctx) - formationFitMalus(ctx) - fatigueMalus(ctx) + diffOf(null, ctx).teamEffDelta + captainBonus(ctx);

  // Un capitano disponibile (non infortunato, non squalificato) dà una piccola spinta in più
  // alla squadra — un modo semplice per rendere "chi porta la fascia" qualcosa di più di
  // un'etichetta sulla scheda giocatore.
  function captainBonus(ctx) {
    if (!ctx || !ctx.captainPid) return 0;
    const cap = ctx.squad && ctx.squad.find((p) => p.pid === ctx.captainPid);
    if (!cap || cap.outWeeks > 0 || cap.suspMatches > 0) return 0;
    return 1;
  }

  // Se il capitano non c'è più in rosa (venduto, svincolato, ritirato) o non è mai stato
  // assegnato, ne sceglie uno nuovo: il più forte della rosa, come farebbe lo spogliatoio in
  // assenza di un'indicazione diversa dal presidente (che può sempre cambiarlo lui, dalla
  // scheda del giocatore).
  function ensureCaptain(ctx = S) {
    if (!ctx || !ctx.squad || !ctx.squad.length) return;
    // Anche un capitano già assegnato, se non è (più) eleggibile — es. una rosa importata da
    // prima che la regola dell'età esistesse — va sostituito, non solo quando manca del tutto.
    const current = ctx.captainPid && ctx.squad.find((p) => p.pid === ctx.captainPid);
    if (current && current.age > CAPTAIN_MIN_AGE) return;
    const hadCaptain = ctx.captainPid != null;
    const eligible = ctx.squad.filter((p) => p.age > CAPTAIN_MIN_AGE);
    const pool = eligible.length ? eligible : ctx.squad;
    const best = pool.slice().sort((a, b) => b.ovr - a.ovr)[0];
    ctx.captainPid = best ? best.pid : null;
    if (hadCaptain && best && (!current || best.pid !== current.pid) && ctx === S && typeof toast === 'function') toast(best.n + ' è il nuovo capitano della squadra.', 'success');
  }

  // Il fattore campo non è più una costante fissa uguale per tutti: uno stadio grande e pieno,
  // con una tifoseria calorosa, pesa di più del "+2.4" fisso di prima — non ogni "casa" è
  // uguale. Scala solo il bonus di CHI gioca in casa (l'avversario bot non ha uno stadio
  // modellato con cui fare lo stesso calcolo).
  const homeAdvantage = (ctx = S) => {
    const capFactor = clamp(capOf(ctx) / 30000, 0.65, 1.35);
    const moodFactor = clamp(0.75 + (ctx.sent || 50) / 100 * 0.5, 0.75, 1.25);
    return capFactor * moodFactor;
  };

  function expectedPos(ctx = S) {
    const mine = squadStr(ctx) + mgrBonus(ctx);
    return 1 + ctx.opps.filter((o) => o.s > mine).length;
  }

  // Dove finiresti al ritmo di punti attuale (pre-stagione: proiettato sulla forza della rosa).
  function projectedPos(ctx = S) {
    if (!ctx.opps || !ctx.opps.length) return 0;
    const G = gp(ctx), d = divOf(ctx);
    const mine = ctx.played > 0
      ? ctx.pts / ctx.played * G
      : (squadStr(ctx) + mgrBonus(ctx) - (d.avg - 21)) * 2.6 * G / 38;
    return 1 + ctx.opps.filter((o) => (o.rrPts + o.vsPts) > mine).length;
  }

  /* ---------------- valore del club ---------------- */
  function computeWorth(ctx = S) {
    const squadVal = ctx.squad.reduce((a, p) => a + playerValue(p), 0);
    const brand = Math.round(Math.max(0, ctx.fanbase - 1) * WORTH_BASE[ctx.div] * 0.6);   // una tifoseria globale vale soldi veri
    // La cassa ferma vale un po' meno di un euro investito (stadio 1.25x, rosa e tifoseria
    // valgono per quello che rendono, non per il loro costo): tesaurizzare senza mai investire
    // non deve essere la strategia migliore per chi punta a vendere il club a fine carriera.
    return Math.round(WORTH_BASE[ctx.div] + squadVal + ctx.stadiumSpent * 1.25 + ctx.prestige + brand + Math.max(0, ctx.budget) * 0.8);
  }

  /* ---------------- salva / riprendi (multi-slot) ----------------
     Ogni carriera vive nel proprio slot (`dsa_save_<id>`, con a fianco
     `dsa_save_<id>_pools` per la piramide viva — vedi simulatePyramidMovement),
     elencato in un indice leggero (`dsa_saves_index`) così la sala d'attesa può
     mostrare/riprendere/cancellare più carriere senza che iniziarne una nuova
     cancelli le altre. `dsa_active_save` ricorda quale slot ha aperto la
     scheda in questo momento (per saveGame/loadSave "impliciti", legati a S). */
  const SAVES_INDEX_KEY = 'dsa_saves_index';
  const ACTIVE_SAVE_KEY = 'dsa_active_save';
  const LEGACY_KEY = 'dsa_legacy';
  const saveSlotKey = (id) => 'dsa_save_' + id;
  const savePoolsKey = (id) => 'dsa_save_' + id + '_pools';
  // Versione del FORMATO di salvataggio (non della build del gioco): finora ogni cambio di
  // forma di `S` è stato gestito "a fiuto" da normSquad (valori mancanti riempiti di default),
  // il che va bene per campi aggiunti ma si romperebbe silenziosamente su un campo RINOMINATO
  // o RISTRUTTURATO. Da qui in poi ogni salvataggio porta `_v`: un futuro cambio di forma può
  // controllarlo e migrare/avvisare invece di produrre uno stato parzialmente `undefined`.
  const SAVE_FORMAT_VERSION = 1;
  // Un solo avviso per sessione se il salvataggio fallisce (storage pieno/bloccato, es.
  // navigazione privata): senza, il giocatore crede che il progresso sia al sicuro e lo scopre
  // solo alla riapertura, quando ormai l'ha perso.
  let saveFailWarned = false;

  function readSavesIndex() { try { return JSON.parse(localStorage.getItem(SAVES_INDEX_KEY)) || []; } catch (e) { return []; } }
  function writeSavesIndex(list) { try { localStorage.setItem(SAVES_INDEX_KEY, JSON.stringify(list)); } catch (e) {} }

  function saveGame() {
    try {
      if (!S || S.over) return;
      if (!S._saveId) S._saveId = 'sv_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      S._v = SAVE_FORMAT_VERSION;
      localStorage.setItem(saveSlotKey(S._saveId), JSON.stringify(S));
      localStorage.setItem(savePoolsKey(S._saveId), JSON.stringify(POOLS));
      const idx = readSavesIndex();
      const i = idx.findIndex((x) => x.id === S._saveId);
      const meta = { id: S._saveId, owner: S.owner, club: S.club, div: S.div, season: S.season, updated: Date.now() };
      if (i >= 0) idx[i] = meta; else idx.push(meta);
      writeSavesIndex(idx);
      localStorage.setItem(ACTIVE_SAVE_KEY, S._saveId);
      saveFailWarned = false;
    } catch (e) {
      if (!saveFailWarned && typeof toast === 'function') {
        toast('⚠️ Impossibile salvare la partita (memoria del browser piena o bloccata, es. navigazione privata): il progresso di questa sessione rischia di andare perso.', 'error');
        saveFailWarned = true;
      }
    }
  }

  // Carica uno slot specifico (per id) SENZA attivarlo come corrente — usato dalla
  // schermata di setup per mostrare l'elenco/riprendere una carriera a scelta.
  function loadSaveSlot(id) {
    try { const raw = localStorage.getItem(saveSlotKey(id)); if (!raw) return null; const s = JSON.parse(raw); return (s && s.squad && !s.over) ? s : null; } catch (e) { return null; }
  }

  // Ripristina anche POOLS (la piramide con le sue promozioni/retrocessioni accumulate)
  // per lo slot indicato, mutando gli array esistenti in place così ogni riferimento a
  // POOLS nel resto del codice resta valido.
  function loadPoolsForSlot(id) {
    try {
      const raw = localStorage.getItem(savePoolsKey(id)); if (!raw) return;
      const saved = JSON.parse(raw);
      if (!Array.isArray(saved) || saved.length !== POOLS.length) return;
      POOLS.forEach((arr, i) => { if (Array.isArray(saved[i])) { arr.length = 0; arr.push(...saved[i]); } });
    } catch (e) {}
  }

  // "Continua" implicito: l'ultimo slot attivo, comportamento invariato per chi chiamava
  // loadSave() prima del multi-slot.
  function loadSave() {
    const id = localStorage.getItem(ACTIVE_SAVE_KEY);
    if (!id) return null;
    return loadSaveSlot(id);
  }

  // Rimuove SOLO lo slot della carriera corrente (fine dinastia), non le altre carriere salvate.
  function clearSave() {
    try {
      const id = S && S._saveId;
      if (id) {
        localStorage.removeItem(saveSlotKey(id));
        localStorage.removeItem(savePoolsKey(id));
        writeSavesIndex(readSavesIndex().filter((x) => x.id !== id));
      }
      localStorage.removeItem(ACTIVE_SAVE_KEY);
    } catch (e) {}
  }

  function deleteSaveSlot(id) {
    try {
      localStorage.removeItem(saveSlotKey(id));
      localStorage.removeItem(savePoolsKey(id));
      writeSavesIndex(readSavesIndex().filter((x) => x.id !== id));
      if (localStorage.getItem(ACTIVE_SAVE_KEY) === id) localStorage.removeItem(ACTIVE_SAVE_KEY);
    } catch (e) {}
  }

  const hasSave = () => readSavesIndex().length > 0;

  /* ---------------- hotseat locale (a turno, stesso dispositivo) ----------------
     Non è un vero multiplayer: solo un elenco ordinato di slot già esistenti
     (`dsa_hotseat` = { ids, turn }) più un puntatore a chi tocca ora. Nessuno stato di
     gioco nuovo: si appoggia agli stessi slot multi-carriera di sopra, ne orchestra solo
     il turno. Il puntatore avanza SUBITO quando un giocatore inizia il suo turno (non
     quando lo finisce), così qualunque via di uscita dalla carriera — Home, il link
     "Torna alla Dynasty" a fine dinastia, chiusura della scheda — lascia comunque il
     turno successivo pronto per il prossimo giocatore.
  */
  const HOTSEAT_KEY = 'dsa_hotseat';
  function readHotseat() { try { const h = JSON.parse(localStorage.getItem(HOTSEAT_KEY)); return (h && Array.isArray(h.ids)) ? h : null; } catch (e) { return null; } }
  function writeHotseat(h) { try { localStorage.setItem(HOTSEAT_KEY, JSON.stringify(h)); } catch (e) {} }
  function clearHotseat() { try { localStorage.removeItem(HOTSEAT_KEY); } catch (e) {} }

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

  function startDynasty(owner, t, customClub, div, difficulty) {
    div = div || 0;
    // Niente clearSave() qui: con gli slot multipli, iniziare una nuova carriera non deve
    // toccare quella (eventualmente) ancora in memoria — resta al suo posto nell'indice
    // finché non viene esplicitamente cancellata.
    const diffKey = DIFFICULTIES.some((x) => x.key === difficulty) ? difficulty : 'medio';
    const squad = [];
    const dAvg = DIVS[div].avg;
    for (let i = 0; i < 16; i++) { const ovr = clamp(gaussInt(t.str - 1, 3.5), dAvg - 9, dAvg + 9); const nat = pickNationality(div); squad.push({ n: genName(nat), nat, ovr, age: genAge(23, 4.5, 17, 34), wage: wageFor(ovr), yrs: 1 + rnd(3), pos: randPos(squad), seasonGoals: 0, seasonAssists: 0, seasonCleanSheets: 0, seasonApps: 0 }); }
    // "New Era": la MIGLIORE dynasty già completata (dsa_legacy) da' un piccolo bonus di
    // budget di partenza alla prossima, fino a un tetto del 25% — mai a chi sta ancora
    // giocando la sua prima carriera (legacyBonus è 0 finché non se ne chiude una).
    const legacyBonus = readLegacyBonus();
    S = {
      owner, club: (customClub || '').slice(0, 24) || pick(POOLS[div]).n, div: div, season: 1,
      difficulty: diffKey,
      budget: Math.round(t.budget * diffOf(diffKey).budgetMult * (1 + legacyBonus)), fanbase: Math.round(t.fanbase * 100) / 100,
      stadiumTier: t.stadiumTier, stadiumSpent: 0.6e6 + (t.stadiumTier ? STADIUM[1].cost : 0), ticket: 1,
      squad, manager: (function () { const r = clamp(DIVS[div].mgrBase - 2 + rnd(8), 45, 92); const nat = pickNationality(div); return { n: genName(nat), rating: r, salary: mgrSalaryFor(r), nat, spec: pick(MANAGER_SPECS).key }; })(),
      sponsor: null, sent: 55, ownerRating: 62, prestige: 0, debtSeasons: 0,
      euro: false, euroComp: null, form: 0, spinsBought: 0, promoStreak: 0, premiumRoleUsed: false, stdRoleUsed: false,
      trophies: { titles: [0, 0, 0, 0, 0, 0], nat: 0, ucl: 0, uel: 0, conf: 0, total: 0 },
      history: [], over: false, peakWorth: 0,
      achievements: [], startDiv: div, noRelegStreak: 0, sportingDirector: null,
      pidNext: 1, offers: [], alumni: [],
      crestShape: crestShape, crestColors: crestColors.slice(),
      scoutLevel: 0, scoutProspects: [], scoutProspectSeason: 0,
      market: null, marketSeenB: div >= 4, marketSeenA: div >= 5,
      formation: '433',
    };
    normSquad();
    S.peakWorth = computeWorth();
    renderBoard();
    if (legacyBonus > 0 && typeof toast === 'function') toast('👑 Eredità del tuo passato da presidente: budget di partenza +' + Math.round(legacyBonus * 100) + '%.', 'success');
  }

  // Stima mostrata in Dirigenza PRIMA che la stagione inizi: allineata alla stessa formula di
  // affluenza usata davvero a fine stagione (endSeason) — che include già l'umore dei tifosi
  // (S.sent) — invece di una versione semplificata che ignorava l'effetto reale dell'umore
  // sugli incassi e mostrava un numero che poi non trovava mai riscontro nel bilancio vero.
  // Il risultato in campo (winPct) non è ancora noto qui, quindi non è nella stima.
  function estSeasonRevenue() {
    const d = divOf(), t = TICKETS[S.ticket], ec = S.euro ? EURO_COMPS[S.euroComp] : null;
    const sentFactor = 1 + (S.sent - 50) / 220;
    const att = Math.min(capOf(), Math.max(600, d.demand * S.fanbase * sentFactor * t.demand * (ec ? ec.attBoost : 1)));
    const merch = d.demand * S.fanbase * d.ticket * 5 * 0.8;
    return Math.round(att * d.ticket * t.mult * (gp() / 2) + merch + d.prize + (S.sponsor ? S.sponsor.perYear : 0) + (ec ? ec.entry : 0) - (d.admin + S.stadiumSpent * 0.03));
  }

  /* ---------------- stagione ---------------- */
  function rivals(ctx = S) { return POOLS[ctx.div].filter((c) => c.n !== ctx.club).slice(0, divOf(ctx).teams - 1); }

  // Una partita fra due rivali (mai il presidente): stesso motore a gol delle sue partite
  // (poisson sulla differenza di forza), poi 3/1/0 SOLO in base al risultato reale — mai una
  // cifra assegnata da una formula. È quello che tiene le classifiche vicine a una vera
  // Serie A (un campione sugli 85-95pt, un'ultima sui 20-30, non tutti fra 55 e 70).
  // `drawBoost`: un Poisson indipendente pareggia meno spesso del vero calcio (partite
  // "chiuse", tattiche, un episodio che nega la vittoria proprio nel finale) — chi vince di
  // un solo gol ha una chance in più di ritrovarsi sul pareggio. Calibrato sulle classifiche
  // reali di Serie A/B (RIVAL_DRAW_BOOST, data.js): senza tocco per le categorie minori (nessun
  // dato reale per confrontarle), un boost base per la A, uno più alto per la B — che nella
  // realtà pareggia sensibilmente di più (più tattica, più equilibrio fra le squadre).
  function simRivalMatch(strHome, strAway, drawBoost) {
    const d = (strHome + 2.2) - strAway;
    const coeff = 0.045;
    let gf = poisson(clamp(1.32 + d * coeff, 0.15, 4.4));
    let ga = poisson(clamp(1.32 - d * coeff, 0.15, 4.4));
    if (drawBoost && Math.abs(gf - ga) === 1 && Math.random() < drawBoost) { if (gf > ga) gf = ga; else ga = gf; }
    return { gf, ga };
  }

  // Girone di andata/ritorno fra tutti i rivali fra loro (le loro partite contro il
  // presidente sono già simulate a parte via simMatch, vedi creditRivalResult): a fine
  // stagione ogni rivale ha giocato le stesse partite di chiunque altro, punti reali.
  function simRivalRoundRobin(opps, drawBoost) {
    for (let i = 0; i < opps.length; i++) {
      for (let j = i + 1; j < opps.length; j++) {
        const m1 = simRivalMatch(opps[i].effS, opps[j].effS, drawBoost);
        opps[i].rrPts += m1.gf > m1.ga ? 3 : m1.gf === m1.ga ? 1 : 0; opps[i].rrGF += m1.gf; opps[i].rrGA += m1.ga;
        opps[j].rrPts += m1.ga > m1.gf ? 3 : m1.ga === m1.gf ? 1 : 0; opps[j].rrGF += m1.ga; opps[j].rrGA += m1.gf;
        const m2 = simRivalMatch(opps[j].effS, opps[i].effS, drawBoost);
        opps[j].rrPts += m2.gf > m2.ga ? 3 : m2.gf === m2.ga ? 1 : 0; opps[j].rrGF += m2.gf; opps[j].rrGA += m2.ga;
        opps[i].rrPts += m2.ga > m2.gf ? 3 : m2.ga === m2.gf ? 1 : 0; opps[i].rrGF += m2.ga; opps[i].rrGA += m2.gf;
      }
    }
  }

  // Il risultato di una partita del presidente contro un rivale conta anche per il rivale
  // (se lo batti, lui prende 0 punti da quella gara, non un totale scollegato dal campo).
  function creditRivalResult(opp, myGf, myGa) {
    opp.vsPts += myGa > myGf ? 3 : myGa === myGf ? 1 : 0;
    opp.vsGF += myGa; opp.vsGA += myGf;
  }

  // `sharedOpps`/`sharedFixtures` (opzionali): quando l'host multiplayer li passa già pronti
  // (griglia condivisa umani+bot, calendario coordinato — vedi buildMultiplayerFixtures),
  // startSeason li usa al posto di generarseli da solo con rivals()/simRivalRoundRobin. Tutto
  // il resto (reset statistiche, budget, coppe, obiettivo di stagione) resta identico.
  function startSeason(ctx = S, sharedOpps = null, sharedFixtures = null) {
    if (!isClubCtx(ctx)) ctx = S;
    const local = ctx === S;
    // Se si arriva a inizio stagione già in rosso (budget negativo, prima ancora di pagare
    // stipendi/allenatore), la banca/gli investitori del club coprono il 40% del debito: una
    // boccata d'ossigeno automatica ogni stagione, che non elimina il debito ma lo erode nel
    // tempo, invece di lasciare la spirale del rosso intatta finché non vendi qualcuno a mano.
    ctx._finalTable = null;
    ctx._newAchievements = [];
    ctx._motmSnapshot = {};
    ctx._playoffState = null;
    ctx._congestion = 0;
    if (ctx.budget < 0) { ctx.budget = Math.round(ctx.budget * 0.6); if (local) toast('Il debito di inizio stagione si riduce del 40%: ora sei a ' + fmtMoney(ctx.budget) + '.'); }
    // Ultima chiamata per riscattare i prestiti dell'estate scorsa (bottone 💰 Riscatta
    // nella rosa, in sala del consiglio): chi non è stato riscattato torna al suo club ora.
    const loanedBack = ctx.squad.filter((p) => p.loan).map((p) => p.n);
    ctx.squad = ctx.squad.filter((p) => !p.loan);
    if (local && loanedBack.length) toast(loanedBack.join(', ') + ' torna' + (loanedBack.length === 1 ? '' : 'no') + ' al suo club, non riscattat' + (loanedBack.length === 1 ? 'o' : 'i') + '.');
    if (ctx.squad.length < MIN_SQUAD) { if (local) { toast('Ti servono almeno ' + MIN_SQUAD + ' giocatori per iniziare la stagione. Ingaggia svincolati gratis se sei a corto.'); renderBoard(); } return; }
    if (ctx.budget < kickoffBill(ctx)) { if (local) { toast('Ti mancano ' + fmtMoney(kickoffBill(ctx) - ctx.budget) + ' per il monte ingaggi. Vendi giocatori o trova soldi.'); renderBoard(); } return; }
    ctx.budget -= kickoffBill(ctx);
    ctx.sent = clamp(ctx.sent + TICKETS[ctx.ticket].sent, 0, 100);
    ctx.seasonActive = true; ctx.winterDone = false; ctx._janCands = null; ctx._janSwitchUsed = false; ctx._janMgrCands = null;
    ctx.played = 0; ctx.pts = 0; ctx.gf = 0; ctx.ga = 0; ctx.wins = 0; ctx.results = []; ctx.last5 = []; ctx.form = 0;
    // Chi è in panchina ORA, per il resoconto di fine stagione (endSeason) — se a gennaio ne
    // arriva un altro, il suo nome si aggiunge qui invece di sostituirlo: il resoconto deve
    // mostrare TUTTI gli allenatori avuti in quella stagione, non solo l'ultimo.
    ctx._seasonManagers = ctx.manager ? [ctx.manager.n] : [];
    // Azzera le statistiche (valgono per la stagione in corso) e tira una "forma stagionale":
    // la maggior parte dei giocatori resta vicina alla norma, ma ogni tanto qualcuno esplode
    // (fino quasi al doppio della sua resa attesa) o vive un'annata opaca (anche la metà).
    ctx.squad.forEach((p) => {
      p.careerGoals = (p.careerGoals || 0) + (p.seasonGoals || 0);
      p.careerAssists = (p.careerAssists || 0) + (p.seasonAssists || 0);
      p.careerCleanSheets = (p.careerCleanSheets || 0) + (p.seasonCleanSheets || 0);
      p.careerApps = (p.careerApps || 0) + (p.seasonApps || 0);
      p.seasonGoals = 0; p.seasonAssists = 0; p.seasonCleanSheets = 0; p.seasonApps = 0; p.formSeason = clamp(1 + gaussInt(0, 28) / 100, 0.45, 1.9); p.outWeeks = 0; p.suspMatches = 0;
    });
    ctx.cupMoney = 0; ctx.euroMoney = ctx.euro ? EURO_COMPS[ctx.euroComp].entry : 0;   // montepremi di partecipazione alla coppa europea
    // Forma stagionale di ogni rivale: la forza di base (o.s) resta quella "storica" del club,
    // ma ogni stagione la sua resa reale oscilla (annata di grazia o annata storta), così la
    // classifica non è sempre la stessa e anche club normalmente più deboli possono vincere.
    // I punti (rrPts/rrGF/rrGA) vengono da un vero girone di andata/ritorno fra i rivali,
    // gara per gara, 3/1/0 come nel calcio reale — non da una formula unica per tutti.
    // Un mister anche per ogni rivale (solo nome e rating, non un vero candidato assumibile):
    // serve a dare un volto alla classifica, non incide sulla simulazione del girone.
    if (sharedOpps && sharedFixtures) {
      ctx.opps = sharedOpps;
      ctx.fixtures = sharedFixtures;
    } else {
      const usedMgrNames = new Set(ctx.manager && ctx.manager.n ? [ctx.manager.n] : []);
      const mgrRegistry = ctx._mgrByClub || (ctx._mgrByClub = {});
      ctx.opps = rivals(ctx).map((o) => ({ name: o.n, s: o.s, effS: clamp(o.s + gaussInt(0, 8), 30, 99), rrPts: 0, rrGF: 0, rrGA: 0, vsPts: 0, vsGF: 0, vsGA: 0, mgr: managerForClub(o.n, 0, ctx, usedMgrNames, mgrRegistry), fmt: randomFmt() }));
      simRivalRoundRobin(ctx.opps, RIVAL_DRAW_BOOST[ctx.div]);
      const fx = [];
      ctx.opps.forEach((o, i) => { fx.push({ opp: i, home: true }); fx.push({ opp: i, home: false }); });
      shuffle(fx); ctx.fixtures = fx.map((f, i) => ({ ...f, mw: i + 1 }));
    }
    // La Coppa Italia è unica dalla Promozione alla Serie A: i turni cambiano numero con la
    // categoria (vedi CUP_ROUNDS_BY_DIV), non il trofeo in palio, sempre lo stesso.
    ctx.cups = { nat: { name: 'Coppa Italia', rounds: (CUP_ROUNDS_BY_DIV[ctx.div] || CUP_ROUNDS_BY_DIV[CUP_ROUNDS_BY_DIV.length - 1]).slice(), at: 0, legAt: 0, legIndex: 0, out: false, won: false } };
    // Formato UEFA reale dal 2024/25: fase campionato a classifica unica (8 partite in
    // Champions/Europa League, 6 in Conference League), poi 1°-8° diretti agli ottavi,
    // 9°-24° giocano uno spareggio andata/ritorno per l'ultimo posto, 25°+ eliminati. Da
    // qui in poi ottavi/quarti/semifinale sono andata/ritorno, la finale è gara secca.
    if (ctx.euro && ctx.div === 5) {
      const legLen = ctx.euroComp === 'conf' ? 6 : 8;
      ctx.cups.euro = {
        name: EURO_COMPS[ctx.euroComp].name, phase: 'league', legLen,
        leagueAt: 0, leaguePts: 0, leagueGF: 0, leagueGA: 0, faced: [],
        rounds: ['Ottavi', 'Quarti', 'Semifinale', 'Finale'], at: 0, out: false, won: false,
      };
    }
    // Obiettivo di stagione dichiarato SUBITO (dipende dalla forza della rosa vista ora, non
    // da com'è andata la stagione): resta fisso finché non ne inizi un'altra, così un buon
    // mercato estivo che alza le attese non "si ricorda" a fine anno del progetto più
    // modesto con cui era partito.
    ctx.seasonTargetInfo = seasonTarget(ctx);
    if (local) {
      show('owSeasonScreen'); $('owLog').innerHTML = ''; renderHud(); renderCups(); renderSeasonTarget(); saveGame();
      toast('🎯 Obiettivo di stagione: ' + ctx.seasonTargetInfo.label + '.');
    }
  }

  // L'obiettivo che la proprietà/i tifosi si aspettano per la stagione appena iniziata,
  // in base a dove la rosa dovrebbe piazzarsi (expectedPos) e alle regole della categoria.
  // `cushion` allarga la zona salvezza quanto più la difficoltà è clemente: su Facile un
  // progetto sulla carta a rischio ha comunque margine per sperare in qualcosa di più, su
  // Estremo le attese sono più letterali/dure.
  function seasonTarget(ctx = S) {
    const d = divOf(ctx), exp = expectedPos(ctx);
    const cushion = { facile: 3, medio: 2, difficile: 1, estremo: 0 }[ctx.difficulty] != null ? { facile: 3, medio: 2, difficile: 1, estremo: 0 }[ctx.difficulty] : 2;
    let key, label;
    if (d.promoted && exp <= d.promoted) { key = 'vertice'; label = d.playoff ? 'lottare per la vittoria del campionato' : 'vincere il campionato'; }
    else if (d.playoff && exp <= d.promoted + d.playoff) { key = 'playoff'; label = 'giocarsi la promozione nei playoff'; }
    // Vertice della piramide (Serie A, `d.promoted` è 0): niente promozione da inseguire, ma
    // una rosa da primi posti ha comunque un traguardo vero da centrare o mancare — altrimenti
    // la stagione perfetta di fine carriera degrada sempre a "un campionato tranquillo", lo
    // stesso obiettivo neutro di chiunque altro, e il tardo gioco perde ogni posta in palio.
    else if (!d.promoted && exp <= 4) { key = 'vertice'; label = exp <= 1 ? 'vincere lo scudetto' : 'lottare per un posto in Europa'; }
    else if (d.releg && exp > d.teams - d.releg - cushion) { key = 'salvezza'; label = 'salvarsi, evitando la retrocessione'; }
    else { key = 'meta'; label = 'un campionato tranquillo, a metà classifica'; }
    return { key, label, exp };
  }

  // Punteggio di una partita a partire dal solo divario di forza (+ vantaggio/svantaggio
  // casa già incluso in `d`): estratto da simMatch così l'host multiplayer può tirarlo UNA
  // volta sola per una partita umano-contro-umano e imporre lo stesso risultato a entrambi i
  // lati, invece di lasciare che ciascuno lo tiri per conto suo (e diverga). `oppFmt`
  // (opzionale, { atk, def }): la tendenza tattica dell'AVVERSARIO — prima solo il TUO modulo
  // pesava sul punteggio, un rivale era sempre e solo un numero di forza, mai una vera
  // personalità in campo. Un avversario aggressivo (atk alto) segna di più contro di te, uno
  // con una difesa fragile (def alto, "concede di più") ti regala qualche gol in più a tua
  // volta — stessa scala di FORMATION_TACTICS, letta dal punto di vista opposto.
  function rollMatchScore(d, ctx = S, oppFmt) {
    // Più alta è la varianza di difficoltà, meno pesa il gap di forza reale sul risultato:
    // partite più imprevedibili, upset più frequenti anche quando si è nettamente più forti.
    const coeff = 0.045 / diffOf(null, ctx).varianceMult;
    // Il modulo scelto in "Probabile formazione" pesa davvero: uno più offensivo segna un
    // filo di più e incassa un filo di più, uno più difensivo il contrario.
    const fb = FORMATION_TACTICS[ctx.formation] || FORMATION_TACTICS['433'];
    const opf = oppFmt || { atk: 0, def: 0 };
    // Un modulo molto sbilanciato in avanti (343/424) lascia scoperture che un avversario
    // attento sa sfruttare: oltre al calo difensivo già scontato nel modulo stesso (fb.def),
    // un piccolo extra quando l'aggressività è estrema — una reazione tattica minima ma
    // reale, non un'intelligenza artificiale vera che sceglie un contro-modulo.
    const counterPenalty = fb.atk >= 0.14 ? (fb.atk - 0.10) * 0.6 : 0;
    const gfMean = clamp(1.32 + fb.atk + opf.def + d * coeff, 0.15, 4.4);
    const gaMean = clamp(1.32 + fb.def + counterPenalty + opf.atk - d * coeff, 0.15, 4.4);
    return twoHalfScore(gfMean, gaMean);
  }

  // Due tempi invece di un tiro secco unico: chi va sotto all'intervallo si getta in avanti
  // (media più alta nella ripresa), chi è avanti gestisce un filo più guardingo — una vera
  // dinamica di partita (rimonte possibili) invece di un solo numero deciso in un colpo. Ogni
  // tempo parte dalla metà della media originale, così sulla lunga distanza la media gol
  // complessiva non si sposta. Estratta da rollMatchScore per essere riusata anche dalle
  // coppe (cupMatchScore, sotto): prima avevano un tiro Poisson secco, senza rimonte né
  // effetto del modulo scelto — più superficiali del campionato, ora stessa qualità.
  function twoHalfScore(gfMean, gaMean) {
    const gf1 = poisson(gfMean / 2), ga1 = poisson(gaMean / 2);
    const behind = clamp((ga1 - gf1) * 0.10, -0.25, 0.25);   // positivo = sei sotto all'intervallo
    const gf2 = poisson(clamp(gfMean / 2 + behind, 0.05, 4.4));
    const ga2 = poisson(clamp(gaMean / 2 - behind * 0.6, 0.05, 4.4));
    return { gf: gf1 + gf2, ga: ga1 + ga2 };
  }

  // Punteggio di una partita di coppa: stesso motore a due tempi del campionato, col modulo
  // scelto che pesa davvero anche qui (prima nessuna coppa lo considerava) — solo senza una
  // personalità tattica dell'avversario (cupOpponentName genera solo un nome, non una rosa),
  // e con la stessa media gol leggermente più bassa già usata in coppa (1.3 invece di 1.32).
  function cupMatchScore(diff, ctx = S) {
    const fb = FORMATION_TACTICS[ctx.formation] || FORMATION_TACTICS['433'];
    const counterPenalty = fb.atk >= 0.14 ? (fb.atk - 0.10) * 0.6 : 0;
    const gfMean = clamp(1.3 + fb.atk + diff * 0.05, 0.15, 4.4);
    const gaMean = clamp(1.3 + fb.def + counterPenalty - diff * 0.05, 0.15, 4.4);
    return twoHalfScore(gfMean, gaMean);
  }

  // `forcedScore` (opzionale, { gf, ga }): quando presente salta il tiro dei gol e usa questo
  // risultato — l'host multiplayer lo passa per le partite umano-contro-umano, calcolato una
  // volta sola con rollMatchScore e imposto a entrambi i lati (vedi runHostSeason).
  // Convocazioni in nazionale: ai checkpoint di stagione (simMatch) i giocatori chiaramente
  // sopra il livello della categoria possono essere chiamati — prestigio per il club, ma con
  // un piccolo rischio di tornare con un acciacco preso in amichevole (stesso campo, outWeeks,
  // dei normali infortuni di campionato). Mai un popup: si scopre dal log/dai toast, come una
  // notizia di giornata, non una decisione da prendere.
  function maybeNationalCallup(ctx = S) {
    if (!ctx.squad || !ctx.squad.length) return;
    const threshold = divOf(ctx).avg + 9;
    const eligible = ctx.squad.filter((p) => p.ovr >= threshold && !p.loan && !(p.outWeeks > 0) && !(p.suspMatches > 0));
    if (!eligible.length) return;
    const called = eligible.filter(() => Math.random() < 0.5).slice(0, 3);
    if (!called.length) return;
    called.forEach((p) => {
      ctx.prestige = (ctx.prestige || 0) + 1.2e6;
      if (Math.random() < 0.12) {
        const weeks = 1 + rnd(2);
        p.outWeeks = weeks;
        if (ctx === S) toast('🌍 ' + p.n + ' torna dalla nazionale con un affaticamento: fuori ' + weeks + ' settiman' + (weeks === 1 ? 'a' : 'e') + '.', 'error');
      } else if (ctx === S) {
        toast('🌍 ' + p.n + ' convocato in nazionale! Un po\' di prestigio in più per il club.', 'success');
      }
    });
  }

  // Giocatore del mese: confronta i gol+assist fatti dall'ultimo checkpoint (uno snapshot per
  // pid, azzerato a inizio stagione) invece del totale stagionale, altrimenti sarebbe sempre lo
  // stesso capocannoniere a vincerlo ogni volta. Solo un piccolo bump di umore: la vera notizia
  // è l'onorificenza in sé, non l'effetto in classifica.
  function maybePlayerOfMonth(ctx = S) {
    if (!ctx.squad || !ctx.squad.length) return;
    if (!ctx._motmSnapshot) ctx._motmSnapshot = {};
    let best = null, bestDelta = 0;
    ctx.squad.forEach((p) => {
      const now = (p.seasonGoals || 0) + (p.seasonAssists || 0);
      const before = ctx._motmSnapshot[p.pid] || 0;
      const delta = now - before;
      if (delta > bestDelta) { bestDelta = delta; best = p; }
      ctx._motmSnapshot[p.pid] = now;
    });
    if (!best || bestDelta < 2) return;
    ctx.sent = clamp(ctx.sent + 2, 0, 100);
    if (ctx === S) toast('⭐ ' + best.n + ' è il giocatore del mese: la tifoseria è entusiasta.', 'success');
  }

  function simMatch(ctx = S, forcedScore = null) {
    if (!isClubCtx(ctx)) ctx = S;
    if (!ctx.seasonActive || ctx.played >= gp(ctx)) return;
    const local = ctx === S;
    const fx = ctx.fixtures[ctx.played], opp = ctx.opps[fx.opp];
    let gf, ga;
    if (forcedScore) { gf = forcedScore.gf; ga = forcedScore.ga; }
    else {
      const d = teamEff(ctx) - opp.effS + (fx.home ? 2.4 * homeAdvantage(ctx) : -1.1);
      ({ gf, ga } = rollMatchScore(d, ctx, opp.fmt));
    }
    ctx.played++; ctx.gf += gf; ctx.ga += ga;
    const res = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
    ctx.pts += res === 'W' ? 3 : res === 'D' ? 1 : 0;
    creditRivalResult(opp, gf, ga);
    if (res === 'W') ctx.wins++;
    ctx.last5.push(res === 'W' ? 1 : res === 'L' ? -1 : 0); if (ctx.last5.length > 5) ctx.last5.shift();
    ctx.form = clamp(ctx.last5.reduce((a, b) => a + b, 0) * 0.5, -2.5, 2.5);
    const lineup = pickMatchLineup(ctx.squad, ctx);
    registerAppearances(lineup, ctx);
    regressPlayerForm(lineup, ctx);
    const goalsFor = genGoals(gf, true, null, lineup, ctx), goalsAgainst = genGoals(ga, false, opp.name, null, ctx);
    registerCleanSheet(ga, lineup, ctx);
    // Derby/rivalità storica: un filo di umore in più in palio, oltre ai 3 punti — e un
    // bilancio testa a testa che cresce stagione dopo stagione (ctx.derbyRecord), invece di
    // restare un semplice bollino "DERBY" identico ogni volta senza memoria di chi comanda
    // la rivalità nell'arco della carriera.
    const derby = isDerby(ctx.club, opp.name) || (ctx.rivalries && ctx.rivalries.indexOf(opp.name) !== -1);
    let derbyRecord = null;
    if (derby) {
      if (res === 'W') ctx.sent = clamp(ctx.sent + 3, 0, 100); else if (res === 'L') ctx.sent = clamp(ctx.sent - 3, 0, 100);
      if (!ctx.derbyRecord) ctx.derbyRecord = {};
      const rec = ctx.derbyRecord[opp.name] || (ctx.derbyRecord[opp.name] = { w: 0, d: 0, l: 0 });
      if (res === 'W') rec.w++; else if (res === 'D') rec.d++; else rec.l++;
      derbyRecord = Object.assign({}, rec);
    }
    const row = { mw: fx.mw, opp: opp.name, home: fx.home, gf, ga, res, goalsFor, goalsAgainst, events: lineup.events, derby, derbyRecord };
    ctx.results.push(row);
    // Durante "Simula fino a fine stagione" (BULK_SIM) saltiamo la scrittura DOM partita per
    // partita (fino a 46 volte in un colpo solo): computeTable() aggiorna comunque lo stato
    // (serve subito dopo per le coppe/il traguardo stagione), il log/HUD si ricostruiscono
    // in un colpo solo alla fine, in simToEnd(). Un club "remoto" (host multiplayer) non ha
    // mai un DOM proprio da aggiornare: stesso trattamento di BULK_SIM, sempre.
    if (local && !BULK_SIM) { logMatch(row); if (gf > 0 && DynSound) DynSound.goal(); }
    maybeCupRound(ctx);
    computeTable(ctx);
    // Soste per le nazionali: circa a un quarto, a metà e a tre quarti del campionato, come le
    // vere soste FIFA. Un evento automatico (mai un popup): chi c'è c'è, si scopre dopo.
    const cpA = Math.round(gp(ctx) * 0.25), cpB = Math.round(gp(ctx) * 0.5), cpC = Math.round(gp(ctx) * 0.75);
    if (ctx.played === cpA || ctx.played === cpB || ctx.played === cpC) maybeNationalCallup(ctx);
    // Giocatore del mese: sfalsato rispetto alle soste nazionali (un quinto, due quinti, ecc.),
    // così le due notizie non capitano mai lo stesso giorno.
    const motmSteps = [0.2, 0.4, 0.6, 0.8];
    if (motmSteps.some((f) => ctx.played === Math.round(gp(ctx) * f))) maybePlayerOfMonth(ctx);
    if (local && !BULK_SIM) { renderHud(); saveGame(); }
    // Un evento narrativo, quando scatta, apre un popup che il giocatore deve chiudere
    // esplicitamente (X o un bottone/una scelta): mette in pausa la stagione esattamente
    // come il mercato di gennaio, il resto (mercato invernale/fine stagione) riprende solo
    // alla chiusura del popup, in checkSeasonMilestones().
    if (local && !BULK_SIM && maybeNarrativeEvent(ctx)) return;
    checkSeasonMilestones(ctx);
  }

  // Cosa succede subito dopo una partita, una volta che non c'è più nessun popup ad
  // attendere una risposta: apertura del mercato di gennaio a metà stagione, o fine
  // stagione. Richiamata sia in coda a simMatch sia dalla chiusura di un evento narrativo.
  function checkSeasonMilestones(ctx = S) {
    if (ctx.played === (gp(ctx) >> 1) && !ctx.winterDone) { if (ctx === S) openWinter(); else ctx.winterDone = true; return; }
    if (ctx.played >= gp(ctx)) {
      // Per un club remoto (host multiplayer, dentro stepHostMatchday) la chiusura stagione
      // resta differita a finishHostSeason/resolveMultiplayerTrophies (ui.js, quando l'host
      // preme "Vedi resoconto"): chiuderla già qui, appena finisce l'ultima giornata, vorrebbe
      // dire chiamare endSeason -> currentPos -> computeTable PRIMA che i pts degli altri
      // umani del gruppo siano rifiniti (finishHostSeason) e prima di risolvere trofei in
      // comune (Coppa Italia/coppe europee) — ognuno si vedrebbe "primo" nella propria
      // classifica, il bug delle vittorie multiple in multiplayer.
      if (ctx !== S) return;
      if (DynSound) DynSound.whistle();
      endSeason(ctx);
    }
  }

  function simToEnd(ctx = S) {
    if (!isClubCtx(ctx)) ctx = S;
    BULK_SIM = true;
    while (ctx.seasonActive && ctx.played < gp(ctx) && !ctx._pause) { const b = ctx.played; simMatch(ctx); if (ctx._pause) break; if (ctx.played === b) break; }
    BULK_SIM = false;
    // Un solo render del log/HUD/coppe alla fine, invece di uno per ciascuna partita appena
    // simulata: stesso risultato visivo, molto più leggero. Solo se siamo ancora sullo
    // schermo di stagione (season non ancora terminata: endSeason ha già mostrato altro).
    if (ctx === S) {
      if (ctx.seasonActive) { $('owLog').innerHTML = ''; (ctx.results || []).forEach(logMatch); renderHud(); renderCups(); }
      saveGame();
    }
  }

  // Un evento narrativo casuale ogni tanto fra una partita e l'altra (mai durante la
  // simulazione rapida: lì il giocatore non lo vedrebbe comunque). Più probabile a
  // difficoltà più alte, dove "gli imprevisti sono la norma". Se scatta, apre un popup
  // (openNarrativeEventOverlay, in ui.js) e mette in pausa la stagione finché non viene
  // chiuso: ritorna true in quel caso, così simMatch sa di doversi fermare lì.
  function maybeNarrativeEvent(ctx = S) {
    const chance = 0.042 * (diffOf(null, ctx).eventMult || 1);
    if (Math.random() >= chance) return false;
    // Alcuni eventi hanno senso solo con certe condizioni (es. serve uno sponsor attivo, o
    // almeno un giocatore in rosa): `requires` li esclude dal pool finché non sono eleggibili.
    const eligible = NARRATIVE_EVENTS.filter((e) => !e.requires || e.requires(ctx));
    if (!eligible.length) return false;
    const ev = pick(eligible);
    // Niente popup per un club "remoto" simulato in blocco dall'host multiplayer — ma l'evento
    // non sparisce nel nulla: si auto-risolve con un esito semplice e resta nel resoconto di
    // fine stagione (vedi autoResolveNarrativeEvent), così la dynasty condivisa non perde del
    // tutto la "voce" degli imprevisti che la rende viva in singolo.
    if (ctx !== S) { autoResolveNarrativeEvent(ev, ctx); return false; }
    ctx._pause = true;
    openNarrativeEventOverlay(ev);
    return true;
  }

  // Risoluzione automatica di un evento narrativo per un ctx "remoto" (host multiplayer): le
  // scelte con un `apply` su misura scrivono sempre su `S` per costruzione (rinnovo sponsor,
  // rischio infortunio di un giocatore preciso) — mai sicure da eseguire su un ctx che non è
  // quello attivo, quindi si scartano a favore dell'altra opzione (o l'evento passa senza
  // effetto meccanico, restando comunque annotato). Gli eventi senza scelte usano sempre solo
  // campi numerici semplici, mai `apply` — sicuri da applicare così come sono.
  function autoResolveNarrativeEvent(ev, ctx) {
    const built = typeof ev.build === 'function' ? ev.build(ctx) : null;
    const text = typeof ev.text === 'function' ? ev.text(ctx, built) : ev.text;
    let eff = ev;
    if (Array.isArray(ev.choices) && ev.choices.length) {
      eff = ev.choices.find((c) => typeof c.apply !== 'function') || null;
    } else if (typeof ev.apply === 'function') {
      eff = null;
    }
    if (eff) {
      if (eff.sent) ctx.sent = clamp(ctx.sent + eff.sent, 0, 100);
      if (eff.budgetPct) ctx.budget += Math.round(ctx.budget * eff.budgetPct);
      if (eff.ownerRating) ctx.ownerRating = clamp(ctx.ownerRating + eff.ownerRating, 0, 100);
      if (eff.fanbaseDelta) ctx.fanbase = Math.round(clamp(ctx.fanbase + eff.fanbaseDelta, 0.7, 3.0) * 100) / 100;
      if (eff.prestige) ctx.prestige += eff.prestige;
    }
    if (!ctx._mpEvents) ctx._mpEvents = [];
    ctx._mpEvents.push({ icon: ev.icon, title: ev.title, text });
  }

  // Applica l'effetto di un evento senza scelte, o della scelta presa per uno che ne ha. La
  // maggior parte degli eventi usa numeri semplici (sent/budgetPct/...), ma alcuni hanno
  // bisogno di logica su misura (rinnovare lo sponsor, rischiare l'infortunio di un
  // giocatore preciso): per quelli basta passare `apply(S)` invece dei campi numerici.
  function applyNarrativeEffect(eff, ctx) {
    if (!eff) return;
    if (typeof eff.apply === 'function') { eff.apply(S, ctx); return; }
    if (eff.sent) S.sent = clamp(S.sent + eff.sent, 0, 100);
    if (eff.budgetPct) S.budget += Math.round(S.budget * eff.budgetPct);
    if (eff.ownerRating) S.ownerRating = clamp(S.ownerRating + eff.ownerRating, 0, 100);
    if (eff.fanbaseDelta) S.fanbase = Math.round(clamp(S.fanbase + eff.fanbaseDelta, 0.7, 3.0) * 100) / 100;
    if (eff.prestige) S.prestige += eff.prestige;
  }

  /* ---------------- coppe (checkpoint scalati sulla lunghezza di stagione) ---------------- */
  // La Coppa Italia è a eliminazione diretta gara secca, TRANNE quarti e semifinale
  // (sempre i due turni prima della finale, quali che siano nel tabellone di quella
  // categoria — vedi CUP_ROUNDS_BY_DIV) che sono andata/ritorno: le due gare di quei turni
  // cadono in due giornate diverse (due checkpoint distinti), non nello stesso istante.
  // La finale resta sempre gara secca in sede neutra. La coppa europea segue il formato
  // UEFA reale in vigore dal 2024/25: una fase campionato a classifica unica (8 partite in
  // Champions/Europa League, 6 in Conference League — checkpoint euroLeague), poi 1°-8°
  // virtuali vanno dritti agli ottavi, 9°-24° giocano uno spareggio andata/ritorno
  // (checkpoint euroPlayoff), 25°+ sono eliminati. Da qui in poi ottavi/quarti/semifinale
  // sono andata/ritorno (checkpoint euroKO), la finale è una gara secca in sede neutra.
  function maybeCupRound(ctx = S) {
    const G = gp(ctx);
    const f = (fr) => Math.max(1, Math.min(G - 1, Math.round(G * fr)));
    const euro = ctx.cups.euro;
    const legLen = euro ? euro.legLen : 8;
    const leagueFracs = Array.from({ length: legLen }, (_, idx) => 0.10 + idx * (0.44 / Math.max(1, legLen - 1)));
    // Un checkpoint per GAMBA, non per turno: N turni della categoria, dei quali solo gli
    // ultimi due prima della finale a doppia gamba => N+2 checkpoint in tutto.
    const natRoundCount = (ctx.cups.nat && ctx.cups.nat.rounds.length) || 6;
    const natTotal = natRoundCount + 2;
    const natFracs = Array.from({ length: natTotal }, (_, k) => 0.08 + k * (0.82 / Math.max(1, natTotal - 1)));
    // Come per la Coppa Italia: un checkpoint per GAMBA, non per turno. Ottavi/quarti/
    // semifinale della coppa europea sono tutti andata/ritorno (solo la finale è secca),
    // quindi servono (turni-1)*2 + 1 checkpoint in tutto, non uno per turno: altrimenti
    // andata e ritorno finivano risolte nella stessa giornata invece che in due diverse.
    const euroKORoundCount = (euro && euro.rounds && euro.rounds.length) || 4;
    const euroKOLegs = (euroKORoundCount - 1) * 2 + 1;
    const euroKOFracs = Array.from({ length: euroKOLegs }, (_, k) => 0.68 + k * (0.28 / Math.max(1, euroKOLegs - 1)));
    const checkpoints = {
      nat: natFracs.map(f),
      euroLeague: leagueFracs.map(f),
      euroPlayoff: [f(0.58), f(0.62)],   // andata e ritorno, due checkpoint distinti (non più nella stessa chiamata)
      euroKO: euroKOFracs.map(f),
    };
    const nat = ctx.cups.nat;
    let cupPlayedNow = false;
    if (nat && !nat.out && !nat.won && (nat.legIndex || 0) < checkpoints.nat.length && ctx.played >= checkpoints.nat[nat.legIndex || 0]) { resolveNatRound(ctx); cupPlayedNow = true; }
    if (euro && !euro.out && !euro.won) {
      if (euro.phase === 'league') { if (euro.leagueAt < euro.legLen && ctx.played >= checkpoints.euroLeague[euro.leagueAt]) { resolveEuroLeagueMatch(ctx); cupPlayedNow = true; } }
      else if (euro.phase === 'playoff') { if (!euro.playoffDone && (euro.playoffLegAt || 0) < checkpoints.euroPlayoff.length && ctx.played >= checkpoints.euroPlayoff[euro.playoffLegAt || 0]) { resolveEuroPlayoff(ctx); cupPlayedNow = true; } }
      else if (euro.at < euro.rounds.length && (euro.legIndex || 0) < checkpoints.euroKO.length && ctx.played >= checkpoints.euroKO[euro.legIndex || 0]) { resolveCupRound('euro', ctx); cupPlayedNow = true; }
    }
    // Stanchezza da calendario fitto: i checkpoint di coppa cadono sempre su una giornata di
    // campionato già in corso (stesso ctx.played), quindi coppa+campionato nella stessa
    // "settimana" è già rilevabile qui. Pesa sulla partita SUCCESSIVA (teamEff la legge a
    // inizio simMatch, prima che questa funzione giri di nuovo), non su quella appena
    // giocata — troppo tardi per cambiarla. Si accumula fino a un tetto (settimane cariche
    // consecutive) e scende appena torna un calendario respirabile.
    ctx._congestion = cupPlayedNow ? Math.min(3, (ctx._congestion || 0) + 1) : Math.max(0, (ctx._congestion || 0) - 1);
  }

  // Un turno di Coppa Italia: per quarti e semifinale (sempre i due turni prima della
  // finale) una chiamata risolve UNA gamba, la chiamata successiva — a un checkpoint
  // diverso, quindi partite diverse — risolve l'altra e decide il passaggio del turno
  // sull'aggregato. Tutti gli altri turni, finale compresa, restano gara secca risolta in
  // un'unica chiamata, come nel vero tabellone.
  function resolveNatRound(ctx = S) {
    const cup = ctx.cups.nat, d = divOf(ctx), i = cup.at;
    const isTwoLegged = i === cup.rounds.length - 3 || i === cup.rounds.length - 2;
    const legs = isTwoLegged ? 2 : 1;
    if (!cup.legAt) cup.legAt = 0;
    if (cup.legAt === 0) {
      cup.roundOppStr = Math.min(90, d.avg + 2 + i * 4 + rnd(6));
      const faced = cup.faced || (cup.faced = []);
      cup.roundOppName = cupOpponentName('nat', cup.roundOppStr, faced, ctx);
      faced.push(cup.roundOppName);
      cup.aggGF = 0; cup.aggGA = 0;
    }
    const oppStr = cup.roundOppStr, oppName = cup.roundOppName;
    const diff = teamEff(ctx) - oppStr;
    const winP = 1 / (1 + Math.exp(-diff / 6.5));
    const wonLeg = Math.random() < winP;
    let { gf, ga } = cupMatchScore(diff, ctx);
    if (legs === 1) {
      // gara secca: manteniamo il risultato coerente con l'esito (parità = rigori)
      if (wonLeg && gf < ga) { const t = gf; gf = ga; ga = t; }
      else if (!wonLeg && gf > ga) { const t = gf; gf = ga; ga = t; }
    }
    cup.aggGF += gf; cup.aggGA += ga;
    const cupLineup = pickMatchLineup(ctx.squad, ctx);
    registerAppearances(cupLineup, ctx);
    const golsF = genGoals(gf, true, null, cupLineup, ctx), golsA = genGoals(ga, false, oppName, null, ctx);
    registerCleanSheet(ga, cupLineup, ctx);
    if (ctx === S) {
      if (legs > 1) logCupLeg(cup.name, cup.rounds[i], cup.legAt === 0 ? 'Andata' : 'Ritorno', gf, ga, golsF, golsA, oppName, 'nat');
      else logCup(cup.name, cup.rounds[i], gf >= ga, gf, ga, golsF, golsA, oppName, 'nat');
    }
    cup.legAt++;
    cup.legIndex = (cup.legIndex || 0) + 1;
    if (cup.legAt < legs) { if (ctx === S) renderCups(); return; }   // manca ancora il ritorno, alla prossima giornata
    const won = legs > 1 ? (cup.aggGF > cup.aggGA || (cup.aggGF === cup.aggGA && Math.random() < 0.5)) : cup.aggGF >= cup.aggGA;
    if (ctx === S && legs > 1) logCup(cup.name, cup.rounds[i] + ' (aggregato)', won, cup.aggGF, cup.aggGA, [], [], oppName, 'nat');
    (cup.path || (cup.path = [])).push({ round: cup.rounds[i], opp: oppName, gf: cup.aggGF, ga: cup.aggGA, won });
    cup.at++; cup.legAt = 0;
    if (won) {
      ctx.cupMoney += d.cupBase * (i + 1);
      // Vincere la Coppa Italia paga tanto: un bonus una tantum in più della semplice
      // somma dei turni superati, oltre alla qualificazione europea gestita in endSeason.
      if (cup.at >= cup.rounds.length) { cup.won = true; ctx.cupMoney += d.cupBase * 15; }
    } else cup.out = true;
    if (ctx === S) renderCups();
  }

  // Una partita della fase campionato: punti pieni (3/1/0) su una classifica unica, non un
  // girone da 4. Gli avversari sono via via più abbordabili all'inizio e più forti verso la
  // fine (fasce di sorteggio, semplificate). A fine fase campionato la classifica decide
  // tutto: soglia alta = ottavi diretti, soglia media = spareggio, sotto = eliminati.
  function resolveEuroLeagueMatch(ctx = S) {
    const cup = ctx.cups.euro, i = cup.leagueAt, ec = EURO_COMPS[ctx.euroComp];
    const span = cup.legLen > 1 ? 12 / (cup.legLen - 1) : 0;
    const oppStr = ec.oppBase - 6 + i * span + rnd(6);
    const faced = cup.faced || (cup.faced = []);
    const oppName = cupOpponentName('euro', oppStr, faced, ctx);
    faced.push(oppName);
    const diff = teamEff(ctx) - oppStr;
    const winP = 1 / (1 + Math.exp(-diff / 6.5));
    const drawP = 0.24;
    const roll = Math.random();
    const won = roll < winP * (1 - drawP), draw = !won && roll < winP * (1 - drawP) + drawP;
    let { gf, ga } = cupMatchScore(diff, ctx);
    if (draw) { const avgg = Math.round((gf + ga) / 2); gf = avgg; ga = avgg; }
    else if (won && gf <= ga) gf = ga + 1;
    else if (!won && gf >= ga) ga = gf + 1;
    cup.leagueAt++;
    cup.leaguePts += won ? 3 : draw ? 1 : 0;
    cup.leagueGF += gf; cup.leagueGA += ga;
    (cup.leaguePath || (cup.leaguePath = [])).push({ mw: cup.leagueAt, opp: oppName, gf, ga, res: won ? 'W' : draw ? 'D' : 'L', ptsSoFar: cup.leaguePts });
    if (won) ctx.euroMoney += ec.roundWin * 0.3; else if (draw) ctx.euroMoney += ec.roundWin * 0.12;
    const lineup = pickMatchLineup(ctx.squad, ctx);
    registerAppearances(lineup, ctx);
    if (ctx === S) logEuroGroup(cup.name, 'Fase campionato ' + cup.leagueAt + '/' + cup.legLen, won ? 'W' : draw ? 'D' : 'L', gf, ga, genGoals(gf, true, null, lineup, ctx), genGoals(ga, false, oppName, null, ctx), oppName, cup.leaguePts, ctx.euroComp);
    else { genGoals(gf, true, null, lineup, ctx); genGoals(ga, false, oppName, null, ctx); }
    registerCleanSheet(ga, lineup, ctx);
    if (cup.leagueAt >= cup.legLen) {
      const top8 = cup.legLen === 6 ? 12 : 15, playoffLine = cup.legLen === 6 ? 6 : 9;
      if (cup.leaguePts >= top8) cup.phase = 'knockout';
      else if (cup.leaguePts >= playoffLine) cup.phase = 'playoff';
      else cup.out = true;
      (cup.path || (cup.path = [])).push({ round: 'Fase campionato', opp: null, gf: cup.leagueGF, ga: cup.leagueGA, note: cup.leaguePts + ' pt su ' + cup.legLen, won: !cup.out });
    }
    if (ctx === S) renderCups();
  }

  // Spareggio pre-ottavi (9°-24° virtuali della fase campionato): andata e ritorno contro
  // un avversario un gradino sotto quelli degli ottavi, come nel vero tabellone UEFA.
  function resolveEuroPlayoff(ctx = S) {
    const cup = ctx.cups.euro, ec = EURO_COMPS[ctx.euroComp];
    if (!cup.playoffLegAt) cup.playoffLegAt = 0;
    if (cup.playoffLegAt === 0) {
      cup.playoffOppStr = ec.oppBase - 3 + rnd(6);
      const faced = cup.faced || (cup.faced = []);
      cup.playoffOppName = cupOpponentName('euro', cup.playoffOppStr, faced, ctx);
      faced.push(cup.playoffOppName);
      cup.playoffAggGF = 0; cup.playoffAggGA = 0;
    }
    const oppStr = cup.playoffOppStr, oppName = cup.playoffOppName;
    const diff = teamEff(ctx) - oppStr;
    const { gf, ga } = cupMatchScore(diff, ctx);
    cup.playoffAggGF += gf; cup.playoffAggGA += ga;
    const lineup = pickMatchLineup(ctx.squad, ctx);
    registerAppearances(lineup, ctx);
    const golsF = genGoals(gf, true, null, lineup, ctx), golsA = genGoals(ga, false, oppName, null, ctx);
    if (ctx === S) logCupLeg(cup.name, 'Spareggio', cup.playoffLegAt === 0 ? 'Andata' : 'Ritorno', gf, ga, golsF, golsA, oppName, ctx.euroComp);
    registerCleanSheet(ga, lineup, ctx);
    cup.playoffLegAt++;
    if (cup.playoffLegAt < 2) { if (ctx === S) renderCups(); return; }   // manca ancora il ritorno, alla prossima giornata
    const aggGF = cup.playoffAggGF, aggGA = cup.playoffAggGA;
    const advanced = aggGF > aggGA || (aggGF === aggGA && Math.random() < 0.5);
    cup.playoffDone = true;
    if (advanced) { ctx.euroMoney += EURO_COMPS[ctx.euroComp].roundWin * 0.6; cup.phase = 'knockout'; } else cup.out = true;
    if (ctx === S) logCup(cup.name, 'Spareggio (aggregato)', advanced, aggGF, aggGA, [], [], oppName, ctx.euroComp);
    (cup.path || (cup.path = [])).push({ round: 'Spareggio', opp: oppName, gf: aggGF, ga: aggGA, won: advanced });
    if (ctx === S) renderCups();
  }

  // Una gamba per chiamata (come resolveNatRound): se il turno è andata/ritorno, la seconda
  // gamba viene risolta alla chiamata successiva — a un checkpoint diverso, quindi in una
  // giornata diversa — invece che subito insieme alla prima nella stessa chiamata.
  function resolveCupRound(key, ctx = S) {
    const cup = ctx.cups[key], d = divOf(ctx), i = cup.at;
    const compKey = key === 'euro' ? ctx.euroComp : 'nat';
    const isEuroFinal = key === 'euro' && i === cup.rounds.length - 1;
    const legs = key === 'euro' && !isEuroFinal ? 2 : 1;   // ottavi/quarti/semifinale: andata/ritorno. Coppa Italia e finale euro: gara secca.
    if (!cup.legAt) cup.legAt = 0;
    if (cup.legAt === 0) {
      cup.roundOppStr = key === 'euro' ? EURO_COMPS[ctx.euroComp].oppBase + i * 3 + rnd(5) : Math.min(90, d.avg + 2 + i * 4 + rnd(6));
      const faced = cup.faced || (cup.faced = []);
      cup.roundOppName = cupOpponentName(key, cup.roundOppStr, faced, ctx);
      faced.push(cup.roundOppName);
      cup.aggGF = 0; cup.aggGA = 0;
    }
    const oppStr = cup.roundOppStr, oppName = cup.roundOppName;
    const diff = teamEff(ctx) - oppStr;
    const winP = 1 / (1 + Math.exp(-diff / 6.5));
    const wonLeg = Math.random() < winP;
    let { gf, ga } = cupMatchScore(diff, ctx);
    if (legs === 1) {
      // gara secca: manteniamo il risultato coerente con l'esito (parità = rigori)
      if (wonLeg && gf < ga) { const t = gf; gf = ga; ga = t; }
      else if (!wonLeg && gf > ga) { const t = gf; gf = ga; ga = t; }
    }
    cup.aggGF += gf; cup.aggGA += ga;
    const cupLineup = pickMatchLineup(ctx.squad, ctx);
    registerAppearances(cupLineup, ctx);
    const golsF = genGoals(gf, true, null, cupLineup, ctx), golsA = genGoals(ga, false, oppName, null, ctx);
    registerCleanSheet(ga, cupLineup, ctx);
    if (ctx === S) {
      if (legs > 1) logCupLeg(cup.name, cup.rounds[i], cup.legAt === 0 ? 'Andata' : 'Ritorno', gf, ga, golsF, golsA, oppName, compKey);
      else logCup(cup.name, cup.rounds[i], gf >= ga, gf, ga, golsF, golsA, oppName, compKey);
    }
    cup.legAt++;
    cup.legIndex = (cup.legIndex || 0) + 1;
    if (cup.legAt < legs) { if (ctx === S) renderCups(); return; }   // manca ancora il ritorno, alla prossima giornata
    const won = legs > 1 ? (cup.aggGF > cup.aggGA || (cup.aggGF === cup.aggGA && Math.random() < 0.5)) : cup.aggGF >= cup.aggGA;
    if (ctx === S && legs > 1) logCup(cup.name, cup.rounds[i] + ' (aggregato)', won, cup.aggGF, cup.aggGA, [], [], oppName, compKey);
    cup.at++; cup.legAt = 0;
    if (won) {
      if (key === 'nat') ctx.cupMoney += d.cupBase * (i + 1);
      else ctx.euroMoney += EURO_COMPS[ctx.euroComp].roundWin;
    }
    (cup.path || (cup.path = [])).push({ round: cup.rounds[i], opp: oppName, gf: cup.aggGF, ga: cup.aggGA, won });
    if (!won) cup.out = true; else if (cup.at >= cup.rounds.length) cup.won = true;
    if (ctx === S) renderCups();
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

  // Un traguardo (ACHIEVEMENTS, data.js) si sblocca una volta sola e per sempre: niente da
  // rifare o poter perdere. In multiplayer vale per ciascun ctx separatamente (viaggia nel suo
  // state come captainPid/trofei), ma il toast si vede solo se è la carriera in locale — un
  // host non deve vedere sbottare traguardi altrui mentre simula per tutti.
  function unlockAchievement(ctx, key) {
    if (!ctx.achievements) ctx.achievements = [];
    if (ctx.achievements.indexOf(key) !== -1) return;
    ctx.achievements.push(key);
    // Tenuti da parte solo per la card di fine stagione (exportSeasonCard, ui.js): azzerati a
    // ogni startSeason, così la card mostra solo quelli guadagnati IN QUESTA stagione, non
    // l'intero storico (già nella scheda "Traguardi" della bacheca).
    if (!ctx._newAchievements) ctx._newAchievements = [];
    ctx._newAchievements.push(key);
    if (ctx === S && typeof toast === 'function') {
      const a = ACHIEVEMENTS.find((x) => x.key === key);
      if (a) toast('🏅 Traguardo sbloccato: ' + a.title, 'success');
    }
  }

  /* ---------------- fine stagione ---------------- */
  function currentPos(ctx = S) { if (!isClubCtx(ctx)) ctx = S; computeTable(ctx); return ctx.table.findIndex((t) => t.me) + 1; }

  // Playoff promozione: chi si incontra ad ogni turno dipende SOLO dall'altra metà del
  // tabellone (sorteggiata/decisa con hypoWinner, indipendente dai propri risultati) — si può
  // quindi decidere l'intero percorso "se continui a vincere" in un colpo solo, PRIMA di
  // giocare anche solo la prima gara. playNextPlayoffStep poi gioca un turno alla volta e si
  // ferma da solo alla prima sconfitta, senza dover ricalcolare nulla.
  function buildPlayoffPlan(ctx, pos, d, lo, hi) {
    const strAt = (position) => { const row = ctx.table[position - 1]; const o = ctx.opps.find((x) => x.name === row.name); return o ? o.effS : d.avg; };
    const hypoWinner = (a, b) => (Math.random() < (1 / (1 + Math.exp(-(strAt(a) - strAt(b)) / 5))) ? a : b);
    const plan = [];
    if (d.playoff >= 6) {
      const byeA = lo, byeB = lo + 1;   // 3° e 4°: già in semifinale
      const qfPairOf = (bye) => (bye === byeA ? [lo + 3, lo + 4] : [lo + 2, lo + 5]);   // 6°-7° per il 3°, 5°-8° per il 4°
      const partnerOf = {}; partnerOf[lo + 3] = lo + 4; partnerOf[lo + 4] = lo + 3; partnerOf[lo + 2] = lo + 5; partnerOf[lo + 5] = lo + 2;
      const byeOf = {}; byeOf[lo + 3] = byeA; byeOf[lo + 4] = byeA; byeOf[lo + 2] = byeB; byeOf[lo + 5] = byeB;
      const otherBye = (b) => (b === byeA ? byeB : byeA);
      const finalOpponent = (myBye) => { const ob = otherBye(myBye), [oa, obb] = qfPairOf(ob); return hypoWinner(ob, hypoWinner(oa, obb)); };
      if (pos === byeA || pos === byeB) {
        const [a, b] = qfPairOf(pos);
        const semiOpp = hypoWinner(a, b);
        plan.push({ kind: 'twoLeg', oppPos: semiOpp, stage: 'Semifinale', isFinal: false });
        plan.push({ kind: 'twoLeg', oppPos: finalOpponent(pos), stage: 'Finale', isFinal: true });
      } else {
        plan.push({ kind: 'prelim', oppPos: partnerOf[pos], stage: 'Quarti' });
        const myBye = byeOf[pos];
        plan.push({ kind: 'twoLeg', oppPos: myBye, stage: 'Semifinale', isFinal: false });
        plan.push({ kind: 'twoLeg', oppPos: finalOpponent(myBye), stage: 'Finale', isFinal: true });
      }
    } else {
      const mirror = lo + hi - pos;   // semifinali con teste di serie: 3° vs 6°, 4° vs 5° (e equivalenti 4°-7°)
      plan.push({ kind: 'single', oppPos: mirror, stage: 'Semifinale' });
      const rest = []; for (let i = lo; i <= hi; i++) if (i !== pos && i !== mirror) rest.push(i);
      const finalist = hypoWinner(rest[0], rest[1] != null ? rest[1] : rest[0]);
      plan.push({ kind: 'single', oppPos: finalist, stage: 'Finale' });
    }
    return plan;
  }

  // Un piano a "turni" (twoLeg = un turno, due gare) diventa una coda di gare ATOMICHE (una
  // gara = un click di "Gioca la prossima gara di playoff"): playNextPlayoffStep ne consuma una
  // alla volta.
  function flattenPlayoffQueue(plan) {
    const queue = [];
    plan.forEach((st) => {
      if (st.kind === 'twoLeg') {
        queue.push({ atomicType: 'leg', oppPos: st.oppPos, stage: st.stage, isFinal: st.isFinal, leg: 0 });
        queue.push({ atomicType: 'leg', oppPos: st.oppPos, stage: st.stage, isFinal: st.isFinal, leg: 1 });
      } else {
        queue.push({ atomicType: st.kind === 'prelim' ? 'prelim' : 'po', oppPos: st.oppPos, stage: st.stage });
      }
    });
    return queue;
  }

  // Gioca UNA gara/gamba dalla coda di ctx._playoffState (mai più di una per chiamata): stessa
  // matematica di sempre (gara secca, turno preliminare con supplementari, doppia gara con
  // punti/differenza reti/piazzamento/rigori), solo spezzata in passi invece che tutta in un
  // colpo solo. Usata sia dal flusso interattivo in singolo (un click alla volta) sia, in un
  // ciclo stretto senza pause, per il multiplayer (host che simula per un ctx remoto, senza
  // nessuno davanti allo schermo pronto a cliccare turno per turno).
  function playNextPlayoffStep(ctx = S) {
    const pf = ctx._playoffState;
    if (!pf || pf.done || !pf.queue.length) return null;
    const d = divOf(ctx), pos = pf.pos;
    const strAt = (position) => { const row = ctx.table[position - 1]; const o = ctx.opps.find((x) => x.name === row.name); return o ? o.effS : d.avg; };
    const nameAt = (position) => ctx.table[position - 1].name;
    const legSim = (oppStr) => { const diff = teamEff(ctx) - oppStr; return { gf: poisson(clamp(1.25 + diff * 0.05, 0.2, 4)), ga: poisson(clamp(1.25 - diff * 0.05, 0.2, 4)) }; };
    const step = pf.queue.shift();
    const oppName = nameAt(step.oppPos), oppStr = strAt(step.oppPos);
    let eliminated = false, entry = null;
    if (step.atomicType === 'po') {
      let { gf, ga } = legSim(oppStr);
      const diff = teamEff(ctx) - oppStr;
      const winP = 1 / (1 + Math.exp(-diff / 6.0));
      const won = Math.random() < winP;
      if (won && gf < ga) { const t = gf; gf = ga; ga = t; } else if (!won && gf > ga) { const t = gf; gf = ga; ga = t; }
      const lineup = pickMatchLineup(ctx.squad, ctx);
      registerAppearances(lineup, ctx);
      entry = { stage: step.stage, opp: oppName, gf, ga, won, pens: gf === ga, goalsFor: genGoals(gf, true, null, lineup, ctx), goalsAgainst: genGoals(ga, false, oppName, null, ctx) };
      registerCleanSheet(ga, lineup, ctx);
      pf.rounds.push(entry);
      if (!won) eliminated = true;
    } else if (step.atomicType === 'prelim') {
      let { gf, ga } = legSim(oppStr);
      let extra = false;
      if (gf === ga) { extra = true; const et = legSim(oppStr); gf += et.gf; ga += et.ga; }
      const won = gf !== ga ? gf > ga : pos < step.oppPos;
      const lineup = pickMatchLineup(ctx.squad, ctx);
      registerAppearances(lineup, ctx);
      entry = { stage: step.stage, opp: oppName, gf, ga, won, extra, seedWin: gf === ga, goalsFor: genGoals(gf, true, null, lineup, ctx), goalsAgainst: genGoals(ga, false, oppName, null, ctx) };
      registerCleanSheet(ga, lineup, ctx);
      pf.rounds.push(entry);
      if (!won) eliminated = true;
    } else if (step.atomicType === 'leg') {
      if (step.leg === 0) pf.legAcc = { aggGF: 0, aggGA: 0, myPts: 0, oppPts: 0 };
      const { gf, ga } = legSim(oppStr);
      pf.legAcc.aggGF += gf; pf.legAcc.aggGA += ga;
      pf.legAcc.myPts += gf > ga ? 3 : gf === ga ? 1 : 0;
      pf.legAcc.oppPts += ga > gf ? 3 : ga === gf ? 1 : 0;
      const lineup = pickMatchLineup(ctx.squad, ctx);
      registerAppearances(lineup, ctx);
      registerCleanSheet(ga, lineup, ctx);
      entry = { stage: step.stage, leg: step.leg === 0 ? 'Andata' : 'Ritorno', opp: oppName, gf, ga, goalsFor: genGoals(gf, true, null, lineup, ctx), goalsAgainst: genGoals(ga, false, oppName, null, ctx) };
      pf.rounds.push(entry);
      if (step.leg === 1) {
        const { aggGF, aggGA, myPts, oppPts } = pf.legAcc;
        let won, tiebreak = null;
        if (myPts !== oppPts) won = myPts > oppPts;
        else if (aggGF !== aggGA) { won = aggGF > aggGA; tiebreak = 'dr'; }
        else if (step.isFinal && ctx.table[pos - 1].pts === ctx.table[step.oppPos - 1].pts) {
          const diff = teamEff(ctx) - oppStr;
          won = Math.random() < 1 / (1 + Math.exp(-diff / 4));
          tiebreak = 'pens';
        } else { won = pos < step.oppPos; tiebreak = 'seed'; }
        pf.rounds.push({ stage: step.stage + ' (aggregato)', opp: oppName, gf: aggGF, ga: aggGA, won, tiebreak, aggregate: true });
        if (!won) eliminated = true;
      }
    }
    if (eliminated || pf.queue.length === 0) { pf.done = true; pf.won = !eliminated; }
    return { entry, done: pf.done, won: pf.won, eliminated };
  }

  function endSeason(ctx = S) {
    if (!isClubCtx(ctx)) ctx = S;
    const local = ctx === S;
    ctx.seasonActive = false;
    const d = divOf(ctx), G = gp(ctx);
    const pos = currentPos(ctx);
    const exp = expectedPos(ctx);
    // Rivalità "nate in campo": un club che ti sta appiccicato in classifica (un posto sopra o
    // sotto di te) per più stagioni diventa una rivalità sentita quanto un derby storico, anche
    // senza esserlo per tradizione (DERBIES, data.js) — la classifica stessa, col tempo, ne
    // scrive di nuove. Non serve che siano stagioni consecutive: un rapporto che si ripete nel
    // tempo conta comunque.
    if (!ctx.rivalryHeat) ctx.rivalryHeat = {};
    if (!ctx.rivalries) ctx.rivalries = [];
    const myTableIdx = ctx.table.findIndex((r) => r.me);
    if (myTableIdx !== -1) {
      [myTableIdx - 1, myTableIdx + 1].forEach((i) => {
        const row = ctx.table[i]; if (!row || row.me) return;
        ctx.rivalryHeat[row.name] = (ctx.rivalryHeat[row.name] || 0) + 1;
        if (ctx.rivalryHeat[row.name] >= 3 && ctx.rivalries.indexOf(row.name) === -1) {
          ctx.rivalries.push(row.name);
          if (ctx === S) toast('🔥 ' + row.name + ' è diventata una rivalità sentita: vi state sempre appiccicati in classifica.', 'success');
        }
      });
    }
    // La vera Serie B promuove la 3ª classificata SENZA playoff se ha almeno 15 punti di
    // vantaggio sulla 4ª: un distacco enorme che rende inutile lo spareggio.
    const gap3v4 = (d.playoff >= 6 && pos === 3) ? (ctx.table[2].pts - ctx.table[3].pts) : 0;
    const auto = (d.promoted > 0 && pos <= d.promoted) || (d.playoff >= 6 && pos === 3 && gap3v4 >= 15);
    // ---- playoff promozione (regole reali della piramide): finisci nei posti playoff e
    // giochi per UN posto extra di promozione a fine stagione. Tabellone da 4 (Eccellenza
    // esclusa, non ha playoff): semifinale + finale, teste di serie a specchio (3° vs 6°).
    // Tabellone da 6 (Serie B, come nella vera Lega, regolamento 2025/26): turno preliminare
    // (5°-8°, 6°-7°) gara secca con supplementari se pareggio — mai rigori, a parità passa
    // il meglio piazzato — poi semifinali e finale ANDATA/RITORNO, dove il turno lo decidono
    // i punti totali (3/1/0 a gara) sulle due gambe, poi la differenza reti, poi il
    // piazzamento in classifica; solo in finale, se le due finaliste hanno chiuso il
    // campionato a pari punti, decidono supplementari e rigori nel ritorno.
    // Le partite che non coinvolgono il nostro club (l'altra metà del tabellone) non vengono
    // simulate per esteso: si risolvono con un confronto di forza, come già per la finale
    // nel tabellone da 4.
    // Per il giocatore in locale i playoff si giocano UNA GARA ALLA VOLTA (come le coppe),
    // non tutti in un colpo solo scoperti solo nel resoconto finale: qui si prepara solo il
    // tabellone (buildPlayoffPlan/flattenPlayoffQueue) e si esce SUBITO da endSeason, che verrà
    // richiamata di nuovo — stavolta per finire davvero il resoconto — quando playNextPlayoffStep
    // (ui.js, un click alla volta) avrà esaurito la coda. Un ctx remoto (host multiplayer) non ha
    // nessuno davanti allo schermo pronto a cliccare: per lui si risolve tutto insieme, come prima. ----
    let playoff = null;
    if (!auto && d.playoff > 0 && pos > d.promoted && pos <= d.promoted + d.playoff) {
      const lo = d.promoted + 1, hi = d.promoted + d.playoff;
      if (local && ctx._playoffState && ctx._playoffState.done) {
        // Il giocatore ha appena finito di giocarsi il playoff passo-passo: il risultato è
        // già pronto in ctx._playoffState, si continua il resoconto di fine stagione da qui.
        playoff = { rounds: ctx._playoffState.rounds, won: ctx._playoffState.won };
        ctx._playoffState = null;
      } else if (local) {
        ctx._playoffState = { pos, rounds: [], queue: flattenPlayoffQueue(buildPlayoffPlan(ctx, pos, d, lo, hi)), done: false, won: false, legAcc: null };
        ctx._pause = true;
        toast('🏟️ Ti sei qualificato per i playoff! Gioca la tua prima gara quando vuoi.', 'success');
        // Si resta sulla schermata di stagione (mai passata a "non attiva" agli occhi
        // dell'utente): il bottone "Gioca prossima partita" diventa "Gioca la prossima gara di
        // playoff" (renderHud, ui.js), il log si ricostruisce per intero nel caso si sia
        // arrivati qui con "Simula fino a fine stagione" (che durante BULK_SIM non logga).
        $('owLog').innerHTML = ''; (ctx.results || []).forEach(logMatch); renderCups(); renderHud(); renderSeasonTarget();
        saveGame();
        return;
      } else {
        // Host multiplayer: nessuno è davanti allo schermo pronto a cliccare gara per gara,
        // si risolve tutto insieme come sempre — stessa identica logica, solo senza pause.
        const bulk = { pos, rounds: [], queue: flattenPlayoffQueue(buildPlayoffPlan(ctx, pos, d, lo, hi)), done: false, won: false, legAcc: null };
        ctx._playoffState = bulk;
        while (!bulk.done) playNextPlayoffStep(ctx);
        playoff = { rounds: bulk.rounds, won: bulk.won };
        ctx._playoffState = null;
      }
    }
    const promoted = auto || !!(playoff && playoff.won);
    const relegated = d.releg > 0 && pos > d.teams - d.releg;
    const title = pos === 1;
    const natWon = !!(ctx.cups.nat && ctx.cups.nat.won);
    const natSF = !!(ctx.cups.nat && ctx.cups.nat.at >= 5 && !natWon);
    const euroWon = !!(ctx.cups.euro && ctx.cups.euro.won);
    const ecPlaying = ctx.euro ? EURO_COMPS[ctx.euroComp] : null;
    // ----- soldi -----
    const t = TICKETS[ctx.ticket];
    const winPct = ctx.wins / G;
    // Le notti europee gonfiano anche il pubblico
    const demand = d.demand * ctx.fanbase * (1 + winPct * 0.35 + (ctx.sent - 50) / 220) * t.demand * (ecPlaying ? ecPlaying.attBoost : 1);
    const att = Math.round(Math.min(capOf(ctx), Math.max(600, demand)));
    const matchday = Math.round(att * d.ticket * t.mult * (G / 2));
    // Il merchandising scala con la TIFOSERIA, non con lo stadio: una tifoseria in
    // rapida crescita vende maglie che entrino o no nello stadio.
    const merch = Math.round(d.demand * ctx.fanbase * d.ticket * 5 * (0.8 + winPct * 0.5) / 1e3) * 1e3;
    const sponsorMoney = ctx.sponsor ? ctx.sponsor.perYear : 0;
    const prize = Math.round(d.prize + (d.teams - pos) * d.perPlace + (promoted ? d.promoBonus : 0) + (title ? d.titleBonus : 0));
    const euroTitleBonus = euroWon ? EURO_COMPS[ctx.euroComp].titleBonus : 0;
    const upkeep = Math.round(d.admin + ctx.stadiumSpent * 0.03);
    const net = matchday + merch + sponsorMoney + prize + ctx.cupMoney + ctx.euroMoney + euroTitleBonus - upkeep;
    ctx.budget += net;
    // ----- qualificazione europea di quest'anno (determina la coppa della prossima stagione) -----
    // Vincere la Champions o l'Europa League garantisce un posto in Champions l'anno dopo
    // anche senza chiudere fra le prime 4 in campionato (come nel calcio vero, la coppa
    // vinta vale come pass diretto). Vincere la Conference League vale un posto in Europa
    // League l'anno dopo (un gradino sopra, non un altro giro di Conference). Per scelta di
    // design, sia il 5° che il 6° posto vanno in Europa League, il 7° in Conference League.
    const wonUclOrUel = euroWon && (ctx.euroComp === 'ucl' || ctx.euroComp === 'uel');
    const wonConf = euroWon && ctx.euroComp === 'conf';
    let qualTier = null;
    if (ctx.div === 5) {
      if (wonUclOrUel) qualTier = 'ucl';
      else if (pos <= 4) qualTier = 'ucl';
      else if (pos === 5 || pos === 6) qualTier = 'uel';
      else if (wonConf) qualTier = 'uel';
      else if (natWon) qualTier = 'uel';
      else if (pos === 7) qualTier = 'conf';
    }
    // ----- trofei + prestigio -----
    const trophies = [];
    if (title) { trophies.push(d.name + ' - Titolo'); ctx.trophies.titles[ctx.div]++; ctx.trophies.total++; ctx.prestige += TROPHY_WORTH[ctx.div]; }
    if (natWon) { trophies.push('Coppa Italia'); ctx.trophies.nat++; ctx.trophies.total++; ctx.prestige += ctx.div >= 4 ? 45e6 : 2e6; }
    if (euroWon) { const ec = EURO_COMPS[ctx.euroComp]; trophies.push(ec.name); ctx.trophies[ctx.euroComp]++; ctx.trophies.total++; ctx.prestige += ec.prestige; }
    // Supercoppa dei Presidenti (multiplayer, resolveSupercoppa): un trofeo vero a tutti gli
    // effetti, solo mai possibile in singolo (_supercoppaWon esiste solo se impostato lì).
    if (ctx._supercoppaWon) { trophies.push('Supercoppa dei Presidenti'); ctx.trophies.total++; ctx.prestige += 5e6; }
    if (qualTier) ctx.prestige += EURO_COMPS[qualTier].qualPrestige;   // la qualificazione europea costruisce il brand
    // ----- umore -----
    const sentItems = [];
    const bump = (label, v) => { if (!v) return; sentItems.push([label, v]); ctx.sent = clamp(ctx.sent + v, 0, 100); };
    bump('Risultati vs aspettative', clamp(Math.round((exp - pos) * 0.9), -10, 10));
    // ----- obiettivo di stagione dichiarato: centrato o mancato, con un peso proporzionale
    // a quanto la difficoltà scelta rende i tifosi/la proprietà più o meno pazienti -----
    const target = ctx.seasonTargetInfo || seasonTarget(ctx);
    const patience = diffOf(null, ctx).patienceMult || 1;
    const targetMet = target.key === 'vertice' ? title
      : target.key === 'playoff' ? promoted
      : target.key === 'salvezza' ? !relegated
      : pos <= target.exp + 3;
    bump((targetMet ? 'Obiettivo di stagione centrato: ' : 'Obiettivo di stagione mancato: ') + target.label, Math.round((targetMet ? 6 : -8) * patience));
    if (promoted) bump('PROMOZIONE', 15);
    if (playoff && playoff.won) bump('Dramma playoff', 3);
    if (playoff && !playoff.won) bump('Delusione playoff', -3);
    if (title) bump('Campioni', 10);
    if (qualTier && !title) bump('Qualificati per la ' + EURO_COMPS[qualTier].name, EURO_COMPS[qualTier].qualBump);
    if (relegated) bump('Retrocessione', -18);
    if (natWon) bump('Vincitori di coppa', 8); else if (natSF) bump('Un bel percorso in coppa', 4);
    if (euroWon) bump('Gloria in ' + EURO_COMPS[ctx.euroComp].name, EURO_COMPS[ctx.euroComp].gloryBump);
    if (ctx.budget < 0) bump('Preoccupazioni economiche', -5);
    // ----- crescita tifoseria: successo e prezzi equi fanno crescere i tifosi, prezzi
    // premium e fallimenti frenano la portata del club. Una tifoseria più grande
    // significa pubblico più grande E più merchandising la stagione dopo, quindi
    // questo si autoalimenta. -----
    const overach = exp - pos;
    const fbBefore = ctx.fanbase;
    let grow = (promoted ? 0.03 : 0) + (title ? 0.02 : 0) + (relegated ? -0.035 : 0)
      + clamp(overach, -6, 6) * 0.003
      + (ctx.sent - 50) * 0.0006
      + t.fanGrow
      + (euroWon ? EURO_COMPS[ctx.euroComp].growWon : (ecPlaying ? ecPlaying.growPlaying : 0));
    grow = clamp(grow, -0.06, 0.08);
    ctx.fanbase = Math.round(clamp(ctx.fanbase + grow, 0.7, 3.0) * 1000) / 1000;
    const fbDelta = Math.round((ctx.fanbase - fbBefore) * 100) / 100;
    // ----- gradimento proprietario -----
    const ratingDelta = Math.round((ctx.sent - 50) / 6 + (exp - pos) * 0.7 + (promoted ? 10 : 0) + (relegated ? -12 : 0) + trophies.length * 4 + (ctx.budget < 0 ? -9 : 0) + (playoff ? (playoff.won ? 2 : -2) : 0));
    ctx.ownerRating = clamp(ctx.ownerRating + ratingDelta, 0, 100);
    // ----- destino -----
    let fate = null;
    if (ctx.ownerRating < 25) fate = 'forced';
    else if (ctx.budget < 0) { ctx.debtSeasons = (ctx.debtSeasons || 0) + 1; if (ctx.debtSeasons >= 2) fate = 'admin'; }
    else ctx.debtSeasons = 0;
    const worth = computeWorth(ctx); ctx.peakWorth = Math.max(ctx.peakWorth, worth);
    ctx.euroCompNext = qualTier;
    // ----- crescita/calo di ogni giocatore, in base a età e prestazione della stagione
    // appena chiusa: qui, PRIMA di mostrare le statistiche, così a fine stagione si vede
    // subito quanto ciascuno è cresciuto o sceso. Il ritiro (36+ dopo il compleanno di
    // fine stagione) viene solo marcato: la rimozione vera avviene entrando in quella
    // successiva, per non far sparire un giocatore dalle sue stesse statistiche finali. -----
    ctx.squad.forEach((p) => {
      p.age++;
      const before = p.ovr;
      // Il tetto di crescita in carriera (110) è più alto di quello di qualunque spin (99):
      // uno spin non regala mai un fuoriclasse assoluto, ma un giocatore che tieni e fai
      // crescere stagione dopo stagione sì, con il tempo.
      p.ovr = clamp(p.ovr + seasonOvrDelta(p, ctx), 40, 110);
      p._ovrDelta = p.ovr - before;
      p._retiring = p.age >= 36;
    });
    // ----- crescita/calo dell'allenatore: legata alle prestazioni della stagione (risultati
    // sopra o sotto le attese, promozione, titolo, retrocessione), non all'età. Un buon
    // allenatore che ottiene più di quanto la rosa "valesse sulla carta" cresce, uno che
    // delude scende. -----
    const mgrBefore = ctx.manager.rating;
    const mgrDelta = clamp(Math.round((exp - pos) * 0.35 + (promoted ? 2 : 0) + (title ? 3 : 0) + (relegated ? -3 : 0) + gaussInt(0, 1)), -4, 4);
    ctx.manager.rating = clamp(ctx.manager.rating + mgrDelta, 40, 97);
    ctx.manager._ovrDelta = ctx.manager.rating - mgrBefore;
    // Media punti e allenatore DI QUELLA stagione (non quello attuale, che può essere già
    // cambiato): la classifica in-stagione non mostra più questo dato riga per riga per tutte
    // le squadre (fuorviante per gli avversari), resta solo qui, per la propria squadra, stagione
    // per stagione, nel resoconto di fine carriera.
    // Se a gennaio è arrivato un nuovo allenatore, `_seasonManagers` li ha entrambi (in ordine
    // di arrivo): il resoconto di fine carriera deve mostrarli tutti, non solo l'ultimo in
    // panchina a fine anno.
    const seasonMgrs = (ctx._seasonManagers && ctx._seasonManagers.length) ? ctx._seasonManagers : (ctx.manager ? [ctx.manager.n] : []);
    ctx.history.push({ season: ctx.season, div: d.name, pos, promoted, relegated, trophies, net, worth, budget: ctx.budget, ppg: Math.round((ctx.pts / Math.max(1, ctx.played)) * 100) / 100, mgr: seasonMgrs.length ? seasonMgrs.join(' → ') : null });
    const statement = [
      ['Incasso stadio (' + att.toLocaleString('it-IT') + ' medi)', matchday],
      ['Merchandising (tifoseria ' + ctx.fanbase.toFixed(2) + ')', merch],
      ['Sponsorizzazione', sponsorMoney],
      ['Montepremi + diritti TV', prize],
      ['Percorso in Coppa Italia', ctx.cupMoney],
    ];
    if (ctx.euroMoney + euroTitleBonus > 0) statement.push([EURO_COMPS[ctx.euroComp].name + ' ' + EURO_COMPS[ctx.euroComp].flag, ctx.euroMoney + euroTitleBonus]);
    statement.push(['Costi di gestione', -upkeep], ['Stipendi + allenatore' + (ctx.sportingDirector ? ' + direttore sportivo' : '') + ' (pagati all\'avvio)', 0]);
    const treble = title && natWon && euroWon && ctx.euroComp === 'ucl';
    // ----- traguardi di carriera (ACHIEVEMENTS, data.js) -----
    if (title && ctx.div === 5) unlockAchievement(ctx, 'scudetto');
    if (natWon) unlockAchievement(ctx, 'coppa_italia');
    if (euroWon) unlockAchievement(ctx, 'coppa_europea');
    if (treble) unlockAchievement(ctx, 'treble');
    ctx.noRelegStreak = relegated ? 0 : (ctx.noRelegStreak || 0) + 1;
    if (ctx.noRelegStreak >= 10) unlockAchievement(ctx, 'no_releg_10');
    if (ctx.squad.filter((p) => p.real || p.icon).length >= 3) unlockAchievement(ctx, 'legend_squad');
    ctx._end = {
      pos, exp, promoted, relegated, title, natWon, euroWon, euroCompWon: ctx.euroComp, trophies, fate, playoff, fbDelta, euroQual: qualTier, treble,
      newAchievements: (ctx._newAchievements || []).slice(),
      att, statement,
      net, sentItems, ratingDelta, worth,
      cupPaths: { nat: (ctx.cups.nat && ctx.cups.nat.path) || [], euro: (ctx.cups.euro && ctx.cups.euro.path) || [] },
      // Eventi narrativi auto-risolti in multiplayer (autoResolveNarrativeEvent): non hanno
      // avuto un popup, ma restano qui per non sparire dal resoconto di fine stagione.
      mpEvents: ctx._mpEvents || [],
    };
    ctx._mpEvents = [];
    if (local) renderSeasonEnd();
  }

  // Piramide viva: a ogni cambio di stagione, in ogni categoria le ultime `releg` squadre
  // (i rivali più deboli, mai il club del giocatore) scendono in quella sotto e vengono
  // rimpiazzate dalle prime della categoria sotto, con la forza (s) riadattata alla nuova
  // media. Non è un intero campionato extra per le altre 5 categorie della piramide (troppo
  // pesante da calcolare/mantenere) ma un turnover leggero: negli anni le rose di ogni
  // categoria cambiano davvero, non restano fisse per tutta la carriera.
  // Sorteggio pesato (mai deterministico): usato per lo spareggio promozione dei rivali in
  // zona playoff, la stessa incertezza reale che vive il presidente nei SUOI playoff — il più
  // forte del gruppo è favorito, non garantito.
  function weightedPickIndex(items, weightFn) {
    const weights = items.map(weightFn);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return i; }
    return items.length - 1;
  }

  function simulatePyramidMovement(ctx = S) {
    for (let div = 1; div < DIVS.length; div++) {
      const upper = POOLS[div], lower = POOLS[div - 1];
      const releg = DIVS[div].releg || 0;
      const directPromo = DIVS[div - 1].promoted || 0;
      const hasPlayoff = !!DIVS[div - 1].playoff;
      const promo = directPromo + (hasPlayoff ? 1 : 0);
      if (!releg || !promo) continue;

      // Se il presidente ha giocato PROPRIO in questa categoria quest'anno, il piazzamento
      // reale (evolveRivalStrengths: club._seasonPos/_seasonAt) dice con certezza chi retrocede
      // o promuove davvero — prima si indovinava dalla sola forza `s`, così un rivale poteva
      // risultare promosso pur non avendo passato i playoff (o retrocesso pur salvo), un bug
      // visibile proprio perché è la categoria che il presidente segue da vicino.
      let relegated = ctx.div === div
        ? upper.filter((c) => c.n !== ctx.club && c._seasonAt === ctx.season && c._seasonPos > DIVS[div].teams - releg)
        : [];
      if (relegated.length !== releg) {
        const fallback = upper.filter((c) => !(ctx.div === div && c.n === ctx.club) && relegated.indexOf(c) === -1).sort((a, b) => a.s - b.s);
        relegated = relegated.concat(fallback.slice(0, releg - relegated.length));
      }

      let promotedUp = [];
      if (ctx.div === div - 1) {
        promotedUp = lower.filter((c) => c.n !== ctx.club && c._seasonAt === ctx.season && c._seasonPos <= directPromo);
        if (hasPlayoff) {
          const zone = lower.filter((c) => c.n !== ctx.club && c._seasonAt === ctx.season && c._seasonPos > directPromo && c._seasonPos <= directPromo + DIVS[div - 1].playoff);
          if (zone.length) promotedUp.push(zone[weightedPickIndex(zone, (c) => Math.pow(1.18, c.s))]);
        }
      }
      if (promotedUp.length !== promo) {
        const fallback = lower.filter((c) => !(ctx.div === div - 1 && c.n === ctx.club) && promotedUp.indexOf(c) === -1).sort((a, b) => b.s - a.s);
        promotedUp = promotedUp.concat(fallback.slice(0, promo - promotedUp.length));
      }

      const n = Math.min(releg, promo, relegated.length, promotedUp.length);
      if (!n) continue;
      relegated.slice(0, n).forEach((c) => {
        const i = upper.indexOf(c); if (i < 0) return;
        upper.splice(i, 1);
        c.s = clamp(Math.round(DIVS[div - 1].avg + (c.s - DIVS[div].avg) * 0.5), DIVS[div - 1].avg - 12, DIVS[div - 1].avg + 14);
        lower.push(c);
      });
      promotedUp.slice(0, n).forEach((c) => {
        const i = lower.indexOf(c); if (i < 0) return;
        lower.splice(i, 1);
        c.s = clamp(Math.round(DIVS[div].avg + (c.s - DIVS[div - 1].avg) * 0.5), DIVS[div].avg - 14, DIVS[div].avg + 10);
        upper.push(c);
      });
    }
  }

  // I rivali "investono" nel tempo: chi chiude la stagione ai vertici (o vince qualcosa)
  // guadagna un filo di forza di base per le prossime stagioni, chi retrocede/chiude in
  // fondo ne perde un po'. Piccoli passi persistenti su POOLS, non un reset annuale: una
  // provinciale che vince spesso diventa via via una big vera, non solo sulla carta di
  // quella stagione.
  function evolveRivalStrengths(ctx = S) {
    if (!ctx.table || !ctx.table.length) return;
    const d = divOf(ctx), pool = POOLS[ctx.div];
    ctx.table.forEach((row, i) => {
      if (row.me) return;
      const club = pool.find((c) => c.n === row.name); if (!club) return;
      const posN = i + 1;
      // Piazzamento VERO di questa stagione, per la categoria in cui il presidente ha
      // effettivamente giocato: simulatePyramidMovement lo usa per decidere promozioni/
      // retrocessioni dei rivali su dati reali invece che sulla sola forza `s` (approssimata
      // per le altre 5 categorie, dove un campionato vero non viene mai simulato). `_seasonAt`
      // marca la stagione: se il presidente non rimette piede in questa categoria per un po',
      // il dato non deve restare valido per sempre.
      club._seasonPos = posN;
      club._seasonAt = ctx.season;
      let drift = 0;
      if (posN === 1) drift = 0.8;
      else if (posN <= 3) drift = 0.4;
      else if (d.releg && posN > d.teams - d.releg) drift = -0.7;
      else if (posN > d.teams * 0.7) drift = -0.2;
      if (!drift) return;
      club.s = clamp(Math.round((club.s + drift) * 10) / 10, d.avg - 20, d.avg + 22);
    });
  }

  function advance(ctx = S) {
    if (!isClubCtx(ctx)) ctx = S;
    const local = ctx === S;
    const e = ctx._end;
    evolveRivalStrengths(ctx);
    simulatePyramidMovement(ctx);
    if (e.promoted) unlockAchievement(ctx, 'first_promo');
    if (e.promoted) ctx.div = Math.min(DIVS.length - 1, ctx.div + 1);
    if (e.relegated) ctx.div = Math.max(0, ctx.div - 1);
    if (ctx.div === 5) {
      unlockAchievement(ctx, 'serie_a');
      if (ctx.startDiv === 0) unlockAchievement(ctx, 'from_bottom');
    }
    ctx.promoStreak = e.promoted ? (ctx.promoStreak || 0) + 1 : 0;
    ctx.euro = !!ctx.euroCompNext && ctx.div === 5;
    ctx.euroComp = ctx.euro ? ctx.euroCompNext : null;
    // Mercato semi-realistico: si sblocca e si muove appena si mette piede in una categoria
    // con rose reali note (Serie B, poi Serie A + club europei), non prima.
    simulateTransferWindow(ctx);
    // Spirale degli stipendi: la promozione porta aumenti in tutta la rosa, restare in
    // alto significa inflazione annuale, la retrocessione permette tagli. È il freno che
    // impedisce ai soldi di accumularsi semplicemente una volta stabiliti.
    if (e.promoted) { ctx.squad.forEach((p) => p.wage = roundWage(p.wage * 1.25)); if (local) toast('Aumenti da promozione: il monte ingaggi della rosa sale del 25%.'); }
    else if (e.relegated) { ctx.squad.forEach((p) => p.wage = roundWage(p.wage * 0.85)); }
    else if (ctx.div === 5) { ctx.squad.forEach((p) => p.wage = roundWage(p.wage * 1.08)); }
    // il contratto sponsor scende
    if (ctx.sponsor) { ctx.sponsor.left--; ctx.sent = clamp(ctx.sent + (ctx.sponsor.sent || 0), 0, 100); if (ctx.sponsor.left <= 0) { if (local) toast('L\'accordo con ' + ctx.sponsor.name + ' scade.'); ctx.sponsor = null; } }
    // Età e overall sono già stati aggiornati a fine stagione (endSeason), per poterli
    // mostrare nelle statistiche. Chi ha superato i 35 non se ne va più in automatico: per un
    // ctx "remoto" (multiplayer, nessuna interazione possibile) si ritira comunque qui, ma per
    // il giocatore in locale la scelta ("un'altra stagione" o partita d'addio) è sua — vedi
    // openRetirementOverlay più sotto, aperta subito dopo questa funzione.
    if (!local) {
      const retired = ctx.squad.filter((p) => p._retiring).map((p) => p.n);
      ctx.squad.filter((p) => p._retiring).forEach((p) => pushAlumnus(p, ctx, true));
      ctx.squad = ctx.squad.filter((p) => !p._retiring);
    }
    ctx.squad.forEach((p) => { delete p._ovrDelta; if (!local) delete p._retiring; });
    // I prestiti restano in rosa (con l'etichetta "prestito" e il bottone 💰 Riscatta al
    // posto di quello di vendita, vedi renderBoard): il presidente decide con calma in
    // sala del consiglio. Chi non viene riscattato torna al suo club solo all'avvio della
    // stagione (startSeason), non qui.
    // I contratti scendono di un anno. Un accordo lasciato scadere senza rinnovo parte a parametro zero.
    const freed = [];
    ctx.squad.forEach((p) => { p.yrs = (p.yrs == null ? 1 : p.yrs) - 1; });
    ctx.squad = ctx.squad.filter((p) => { if ((p.yrs || 0) <= 0) { freed.push(p.n); pushAlumnus(p, ctx); return false; } return true; });
    if (local && freed.length) toast(freed.join(', ') + ' ' + (freed.length === 1 ? 'è andato' : 'sono andati') + ' in scadenza e ' + (freed.length === 1 ? 'parte' : 'partono') + ' a parametro zero.');
    ctx.season++;
    ctx.mgrOpts = null; ctx.sponsorOpts = null; ctx.investorUsed = false; ctx.spinsBought = 0; ctx.premiumRoleUsed = false; ctx.stdRoleUsed = false; ctx._end = null;
    ctx.offers = genOffers(ctx);   // i club rivali fanno offerte per i tuoi giocatori migliori quest'estate
    if (local) {
      const pendingRetirees = ctx.squad.filter((p) => p._retiring);
      if (pendingRetirees.length) openRetirementOverlay(pendingRetirees); else renderBoard();
    }
  }

  /* ---------------- multiplayer: motore multi-club (Fase 2b) ----------------
     Nessuna chiamata a room.php o alla UI qui dentro: pura orchestrazione dello stesso
     motore usato in singolo, applicata in sequenza a più `ctx` invece che al solo `S`
     globale. Precondizione: ogni ctx in `humanCtxs` ha già una rosa valida (>= MIN_SQUAD)
     pronta a iniziare la stagione — la validazione "posso premere Pronto?" è compito della
     Fase 2c (UI), non di queste funzioni. Niente mercato di gennaio qui: checkSeasonMilestones
     non viene mai chiamata, si gioca la stagione tutta d'un fiato (i club umani entrano già
     con le scelte di mercato fatte in anticipo, un'altra cosa di cui si occupa la Fase 2c).
  */

  // Calendario condiviso: chi gioca contro chi, quando. I bot non hanno un calendario proprio
  // (i loro risultati reciproci sono già decisi in blocco da simRivalRoundRobin, come in
  // singolo); serve solo coordinare le giornate umano-contro-umano, che devono cadere sulla
  // STESSA giornata nei calendari di entrambi. Ogni ctx.opps esclude sé stesso (non si gioca
  // mai contro sé stessi): la posizione di un umano nell'array `opps` di un altro umano è
  // quindi "compattata" (si toglie un posto per il buco lasciato da sé stesso).
  function buildMultiplayerFixtures(humanCtxs, bots) {
    const N = humanCtxs.length;
    const G = gp(humanCtxs[0]);
    const compactPos = (i, rawJ) => (rawJ < i ? rawJ : rawJ - 1);
    const days = humanCtxs.map(() => new Array(G).fill(null));
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const free = [];
        for (let d = 0; d < G; d++) if (!days[i][d] && !days[j][d]) free.push(d);
        shuffle(free);
        const [d1, d2] = free;
        days[i][d1] = { opp: compactPos(i, j), home: true, mw: d1 + 1, human: true, humanIdx: j };
        days[j][d1] = { opp: compactPos(j, i), home: false, mw: d1 + 1, human: true, humanIdx: i };
        days[i][d2] = { opp: compactPos(i, j), home: false, mw: d2 + 1, human: true, humanIdx: j };
        days[j][d2] = { opp: compactPos(j, i), home: true, mw: d2 + 1, human: true, humanIdx: i };
      }
    }
    // Le giornate rimaste si riempiono con i bot condivisi, andata e ritorno, mischiate —
    // stessa logica di rivals()+shuffle usata in singolo, ma solo sulle giornate libere.
    humanCtxs.forEach((h, i) => {
      const empty = []; for (let d = 0; d < G; d++) if (!days[i][d]) empty.push(d);
      const fx = [];
      bots.forEach((b, bi) => { fx.push({ botIdx: bi, home: true }); fx.push({ botIdx: bi, home: false }); });
      shuffle(fx);
      fx.forEach((f, k) => { const d = empty[k]; days[i][d] = { opp: (N - 1) + f.botIdx, home: f.home, mw: d + 1, human: false }; });
    });
    // opps di ciascun umano: [gli altri umani, punteggio a 0 — il vero totale vive nel loro
    // ctx.pts, vedi la rifinitura in runHostSeason] + [i bot condivisi, stesso oggetto per
    // tutti così il loro punteggio si somma su ogni partita giocata da chiunque contro di loro].
    const opps = humanCtxs.map((h, i) => humanCtxs
      .filter((_, j) => j !== i)
      .map((h2) => ({ name: h2.club, s: 0, effS: 0, rrPts: 0, rrGF: 0, rrGA: 0, vsPts: 0, vsGF: 0, vsGA: 0, mgr: h2.manager }))
      .concat(bots));
    return { opps, fixtures: days };
  }

  // L'host: prepara la stagione condivisa per tutti i club umani di una stanza (bot,
  // calendario incrociato) senza ancora simulare nulla — Fase 2c (UI) avanza poi una
  // giornata alla volta con stepHostMatchday, per poter mostrare all'host la classifica
  // generale che si aggiorna man mano invece di calcolare tutto in un colpo solo.
  function setupHostSeason(humanCtxs, div, difficulty) {
    humanCtxs.forEach((ctx) => { ctx.div = div; ctx.difficulty = difficulty; ensureCaptain(ctx); });
    const teams = DIVS[div].teams;
    const N = humanCtxs.length;
    const botCount = Math.max(0, teams - N);
    const humanNames = new Set(humanCtxs.map((h) => h.club));
    // Un solo allenatore per nome nell'intero gruppo: né due bot omonimi, né un bot col nome
    // dell'allenatore già in carica su una delle squadre umane della stanza.
    const usedMgrNames = new Set(humanCtxs.filter((h) => h.manager && h.manager.n).map((h) => h.manager.n));
    // Registro club->allenatore condiviso da tutto il gruppo, per farlo restare lo stesso
    // round dopo round invece di rigenerarlo da zero: ogni umano porta la propria "memoria"
    // (_mgrByClub, viaggia nel suo state come captainPid/prestigio) di chi ha già incontrato,
    // qui si fondono e si ridistribuiscono aggiornate a fine setup.
    const mgrRegistry = {};
    humanCtxs.forEach((h) => { if (h._mgrByClub) Object.assign(mgrRegistry, h._mgrByClub); });
    const bots = POOLS[div].filter((c) => !humanNames.has(c.n)).slice(0, botCount)
      .map((o) => ({ name: o.n, s: o.s, effS: clamp(o.s + gaussInt(0, 8), 30, 99), rrPts: 0, rrGF: 0, rrGA: 0, vsPts: 0, vsGF: 0, vsGA: 0, mgr: managerForClub(o.n, 0, humanCtxs[0], usedMgrNames, mgrRegistry), fmt: randomFmt() }));
    simRivalRoundRobin(bots, RIVAL_DRAW_BOOST[div]);
    humanCtxs.forEach((h) => { h._mgrByClub = mgrRegistry; });
    const { opps, fixtures } = buildMultiplayerFixtures(humanCtxs, bots);
    humanCtxs.forEach((ctx, i) => startSeason(ctx, opps[i], fixtures[i]));
    return { ctxs: humanCtxs, bots, fixtures, matchday: 0, total: gp(humanCtxs[0]) };
  }

  // Una singola giornata di calendario per tutti i club umani della `run` (una partita fra
  // due umani è calcolata UNA volta sola e applicata a entrambi, mai due tiri indipendenti
  // che potrebbero divergere). Muta `run.ctxs` sul posto e avanza `run.matchday`.
  function stepHostMatchday(run) {
    const d = run.matchday;
    if (d >= run.total) return run;
    const done = new Set();
    run.ctxs.forEach((ctx, i) => {
      const fx = run.fixtures[i][d];
      if (!fx) return;
      if (fx.human) {
        const key = i < fx.humanIdx ? i + '-' + fx.humanIdx : fx.humanIdx + '-' + i;
        if (done.has(key)) return;
        done.add(key);
        const ctxA = ctx, ctxB = run.ctxs[fx.humanIdx];
        const [homeCtx, awayCtx] = fx.home ? [ctxA, ctxB] : [ctxB, ctxA];
        const dVal = teamEff(homeCtx) - teamEff(awayCtx) + 2.4 * homeAdvantage(homeCtx);
        // Sfida diretta fra due presidenti: qui l'"avversario" non è un numero generato a
        // caso, è un altro umano col SUO modulo scelto davvero — usa quello, non un fmt finto.
        const awayFmt = FORMATION_TACTICS[awayCtx.formation] || FORMATION_TACTICS['433'];
        const { gf, ga } = rollMatchScore(dVal, homeCtx, awayFmt);
        simMatch(homeCtx, { gf, ga });
        simMatch(awayCtx, { gf: ga, ga: gf });
        // Sfida diretta fra due presidenti: si marca l'ultima riga appena aggiunta a ciascuno
        // (simMatch fa sempre ctx.results.push), così l'host può segnalarla nella cronaca
        // della giornata invece di lasciarla passare come una partita come le altre.
        const homeRow = homeCtx.results[homeCtx.results.length - 1];
        const awayRow = awayCtx.results[awayCtx.results.length - 1];
        if (homeRow) { homeRow.vsHuman = true; homeRow.vsHumanClub = awayCtx.club; }
        if (awayRow) { awayRow.vsHuman = true; awayRow.vsHumanClub = homeCtx.club; }
      } else {
        simMatch(ctx);
      }
    });
    run.matchday++;
    return run;
  }

  // Una volta esaurite tutte le giornate: rifinisce le classifiche individuali e chiude la
  // stagione (endSeason/advance) per ciascun club umano — lo stesso epilogo che runHostSeason
  // faceva tutto insieme, ora richiamato dall'host quando preme "Vedi resoconto".
  function finishHostSeason(run) {
    const humanCtxs = run.ctxs, bots = run.bots;
    // Rifinitura: ctx.table è uno scatto fatto all'ULTIMA chiamata a simMatch di QUEL club
    // (dentro computeTable) — per le righe umane sottostimerebbe chiunque abbia giocato
    // anche contro un terzo umano (il vero totale vive nel loro ctx.pts, sempre aggiornato).
    // Per le righe bot, anche se l'oggetto è condiviso, lo scatto può essere leggermente
    // vecchio se quel bot ha giocato la SUA ultima partita (contro un altro umano) DOPO lo
    // scatto di questo club nella stessa giornata: si rilegge quindi il totale vero da lì.
    // Va fatto per tutti (umani e bot) DOPO che l'intera stagione è finita per chiunque.
    humanCtxs.forEach((ctx) => {
      if (!ctx.table) return;
      ctx.table.forEach((row) => {
        if (row.me) return;
        const otherHuman = humanCtxs.find((h) => h.club === row.name);
        if (otherHuman) { row.pts = otherHuman.pts; row.gd = otherHuman.gf - otherHuman.ga; return; }
        const bot = bots.find((b) => b.name === row.name);
        if (bot) { row.pts = bot.rrPts + bot.vsPts; row.gd = (bot.rrGF + bot.vsGF) - (bot.rrGA + bot.vsGA); }
      });
      ctx.table.sort((a, b) => b.pts - a.pts || b.gd - a.gd);
      // Congelata: endSeason (currentPos -> computeTable) NON deve più ricalcolarla da
      // ctx.opps, altrimenti i pts degli altri umani tornerebbero quelli (quasi nulli) del
      // solo scontro diretto, facendo apparire "primo" chiunque guardi la propria — il bug
      // per cui più presidenti dello stesso gruppo potevano vincere lo stesso scudetto.
      ctx._finalTable = ctx.table;
    });
    return humanCtxs;
  }

  // Supercoppa dei Presidenti: un'amichevole di fine stagione fra i DUE UMANI meglio piazzati
  // di UN gruppo (stessa categoria/round) della stanza — serve almeno 2 umani nello stesso
  // gruppo, non ha senso fra categorie diverse. Va chiamata per ogni run/gruppo, DOPO
  // finishHostSeason (serve la ctx.table già congelata) e PRIMA di endSeason: imposta un flag
  // sul vincitore che endSeason legge come un trofeo vero (stesso trattamento di scudetto/
  // Coppa Italia), così finisce da solo nei trofei di carriera e nell'albo d'oro della stanza,
  // senza bisogno di un canale a parte.
  function resolveSupercoppa(run) {
    if (!run.ctxs || run.ctxs.length < 2) return null;
    const table = run.ctxs[0]._finalTable || run.ctxs[0].table;
    if (!table) return null;
    const humanClubs = new Set(run.ctxs.map((c) => c.club));
    const topHumans = table.filter((r) => humanClubs.has(r.name)).slice(0, 2);
    if (topHumans.length < 2) return null;
    const a = run.ctxs.find((c) => c.club === topHumans[0].name);
    const b = run.ctxs.find((c) => c.club === topHumans[1].name);
    if (!a || !b) return null;
    const dVal = teamEff(a) - teamEff(b) + gaussInt(0, 3);
    const { gf, ga } = rollMatchScore(dVal, a);
    let winner, loser, wGf, wGa, pens = false;
    if (gf === ga) { pens = true; winner = Math.random() < 0.5 ? a : b; loser = winner === a ? b : a; wGf = gf; wGa = ga; }
    else if (gf > ga) { winner = a; loser = b; wGf = gf; wGa = ga; }
    else { winner = b; loser = a; wGf = ga; wGa = gf; }
    winner._supercoppaWon = true;
    return { winnerClub: winner.club, loserClub: loser.club, gf: wGf, ga: wGa, pens };
  }

  // Coppa Italia e coppe europee, a differenza del campionato, sono simulate come un bracket
  // indipendente per ciascun umano (avversari bot generati per lui, mai un vero incrocio con
  // gli altri presidenti della stanza): due giocatori della stessa stanza possono quindi
  // finire entrambi con `cups.nat.won`/`cups.euro.won` a true nella stessa stagione. Non ha
  // senso che la STESSA Coppa Italia o la STESSA edizione di una coppa europea vengano
  // consegnate a più di un presidente della stessa dynasty: fra chi la stanza ha visto
  // "vincerla" in una data stagione, ne resta uno solo (il percorso più lungo, poi la rosa più
  // forte, poi a sorte) — gli altri restano comunque finalisti, solo non alzano il trofeo.
  // Va chiamata su TUTTI gli umani della stanza (tutti i gruppi/categorie insieme), DOPO
  // finishHostSeason e PRIMA di endSeason (che è il momento in cui questi flag diventano
  // trofei/prestigio/soldi permanenti in carriera).
  function resolveMultiplayerTrophies(allHumanCtxs) {
    const pickOne = (cands) => cands.slice().sort((a, b) => (b._mpScore - a._mpScore) || (Math.random() - 0.5))[0];
    const natWinners = allHumanCtxs.filter((c) => c.cups && c.cups.nat && c.cups.nat.won);
    if (natWinners.length > 1) {
      natWinners.forEach((c) => { c._mpScore = teamEff(c); });
      const winner = pickOne(natWinners);
      natWinners.forEach((c) => {
        if (c === winner) return;
        c.cups.nat.won = false;
        const lastLeg = c.cups.nat.path && c.cups.nat.path[c.cups.nat.path.length - 1];
        if (lastLeg) lastLeg.won = false;
      });
    }
    ['ucl', 'uel', 'conf'].forEach((comp) => {
      const winners = allHumanCtxs.filter((c) => c.euroComp === comp && c.cups && c.cups.euro && c.cups.euro.won);
      if (winners.length <= 1) return;
      winners.forEach((c) => { c._mpScore = teamEff(c); });
      const winner = pickOne(winners);
      winners.forEach((c) => { if (c !== winner) c.cups.euro.won = false; });
    });
  }

  // Compatibilità/uso non interattivo: prepara e gioca l'intera stagione in un colpo solo,
  // componendo le tre funzioni sopra.
  function runHostSeason(humanCtxs, div, difficulty) {
    const run = setupHostSeason(humanCtxs, div, difficulty);
    while (run.matchday < run.total) stepHostMatchday(run);
    finishHostSeason(run);
    resolveMultiplayerTrophies(run.ctxs);
    run.ctxs.forEach((ctx) => { if (ctx.seasonActive && ctx.played >= gp(ctx)) endSeason(ctx); });
    return run.ctxs;
  }

  /* ---------------- fine carriera ---------------- */
  function endDynasty(how, saleMoney) {
    if (how === 'retired' && S.season >= MAX_SEASONS) unlockAchievement(S, 'dynasty_complete');
    saveLegacy(S);
    S.over = true; clearSave();
    S._how = how; S._sale = saleMoney || 0;
    renderEnd();
  }

  // "New Era": un piccolo bonus di partenza per la PROSSIMA carriera, proporzionale a quanto
  // vale quella appena chiusa (trofei + massimo valore raggiunto) — solo la MIGLIORE fra tutte
  // le dynasty completate resta salvata (dsa_legacy), non si accumula riprovando più volte.
  function legacyScore(ctx) { return (ctx.trophies ? ctx.trophies.total : 0) * 8e6 + (ctx.peakWorth || 0) * 0.02; }
  function saveLegacy(ctx) {
    try {
      const score = legacyScore(ctx);
      const prev = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
      if (prev && prev.score >= score) return;
      localStorage.setItem(LEGACY_KEY, JSON.stringify({ score, owner: ctx.owner, club: ctx.club }));
    } catch (e) {}
  }
  function readLegacyBonus() {
    try {
      const l = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
      if (!l || !l.score) return 0;
      // Scala dolcemente e con un tetto: una leggenda pregressa enorme non deve rendere
      // banale la prossima carriera, solo darle una spinta in più all'inizio.
      return clamp(l.score / 40e6, 0, 0.25);
    } catch (e) { return 0; }
  }

  function computeTable(ctx = S) {
    if (!isClubCtx(ctx)) ctx = S;
    // Fine stagione multiplayer: finishHostSeason ha già rifinito la classifica leggendo i
    // pts VERI degli altri umani del gruppo (ctx.opps li tiene solo come punti dello scontro
    // diretto fra i due, non il loro totale in campionato — vedi buildMultiplayerFixtures).
    // Ricalcolare da ctx.opps qui sotto sottostimerebbe ogni co-giocatore umano, facendo
    // apparire "primo" chiunque riguardi la propria classifica (da qui il bug delle vittorie
    // simultanee): si usa invece lo scatto già corretto, congelato fino al prossimo startSeason.
    if (ctx._finalTable) { ctx.table = ctx._finalTable; return; }
    // Il girone fra rivali (rrPts/rrGF/rrGA) è deciso per intero all'avvio stagione, quindi
    // si mostra scalato sulla frazione di campionato giocata (per non far vedere la
    // classifica finale dal giorno 1); i punti contro il presidente (vsPts/vsGF/vsGA) sono
    // invece reali e già certi non appena quella partita è stata giocata, niente da scalare.
    const f = clamp(ctx.played / gp(ctx), 0, 1);
    const rows = ctx.opps.map((o) => ({ name: o.name, pts: Math.round(o.rrPts * f) + o.vsPts, gd: Math.round((o.rrGF - o.rrGA) * f) + (o.vsGF - o.vsGA), me: false, mgr: o.mgr }));
    rows.push({ name: ctx.club, pts: ctx.pts, gd: ctx.gf - ctx.ga, me: true, mgr: ctx.manager });
    rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd);
    ctx.table = rows;
  }
