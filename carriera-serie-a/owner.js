'use strict';
/* ============================================================
   Dynasty · Modalità Proprietario — versione Serie A.
   Compra un club di Eccellenza e gestisci TUTTO ciò che non è il campo:
   ingaggia giocatori con gli spin (ogni spin costa budget vero e rivela un
   giocatore che chiede uno stipendio), assumi/licenzia l'allenatore, scegli
   uno sponsor, fai crescere lo stadio, imposta i prezzi dei biglietti e
   tieni i conti in ordine. Ogni stagione il tuo club gioca un campionato
   completo con promozioni e retrocessioni attraverso cinque categorie
   (Eccellenza, Serie D, Serie C, Serie B, Serie A) più la Coppa Italia e,
   per chi arriva nei primi quattro posti di Serie A, la Champions League.

   La tensione: spin, stipendi, allenatore e stadio attingono tutti da UN
   solo budget. Gli stipendi si pagano in anticipo, i ricavi arrivano solo a
   fine stagione. I tifosi reagiscono ai prezzi e ai risultati (umore), e il
   tuo indice di gradimento come proprietario tiene traccia di tutto. Un
   indice troppo basso = esonero. Due stagioni in rosso = amministrazione
   controllata. Puoi vendere il club al suo valore attuale in ogni momento
   e andartene, oppure arrivare in fondo alle 20 stagioni e ritirarti.
   ============================================================ */
(function () {
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
  const fmtWk = (w) => fmtMoney(w) + '/sett';

  /* ---------------- la piramide ---------------- */
  // Cinque categorie, dal basso in alto. teams determina il numero di giornate ((teams-1)*2).
  // avg = il rating medio tipico della squadra in quella categoria (gli spin sono centrati lì).
  // demand = quanti tifosi verrebbero a vedere un club ben gestito a prezzi standard.
  // prize = base premio TV/montepremi di stagione, perPlace = extra per posizione scalata,
  // promoBonus arriva quando sali FUORI dalla categoria (quello della Serie B è
  // il "salto più ricco del calcio"), spin/premium = costo spin a quel livello.
  // Promozione secondo il sistema italiano reale (adattato): `promoted` salgono
  // direttamente e i successivi `playoff` posti si giocano UN posto extra
  // (semifinale + finale a fine stagione). Eccellenza: prime 2 dirette.
  // Serie D: prime 3 + playoff (4°-7°), ultime 2 retrocedono. Serie C: prime 2 +
  // playoff (3°-6°), ultime 4 giù. Serie B: prime 2 + playoff (3°-6°), ultime 3
  // giù. Serie A: ultime 3 giù.
  const DIVS = [
    { name: 'Eccellenza', teams: 24, avg: 47, demand: 4200, ticket: 14, prize: 0.15e6, perPlace: 6e3, promoted: 2, playoff: 0, releg: 0, promoBonus: 0.6e6, titleBonus: 0.25e6, spin: 75e3, premium: 225e3, cupBase: 35e3, admin: 120e3, mgrBase: 52, investor: 300e3 },
    { name: 'Serie D', teams: 24, avg: 54, demand: 7500, ticket: 17, prize: 1.0e6, perPlace: 15e3, promoted: 3, playoff: 4, releg: 2, promoBonus: 1.2e6, titleBonus: 0.5e6, spin: 200e3, premium: 600e3, cupBase: 70e3, admin: 250e3, mgrBase: 58, investor: 600e3 },
    { name: 'Serie C', teams: 24, avg: 60, demand: 13000, ticket: 21, prize: 1.6e6, perPlace: 25e3, promoted: 2, playoff: 4, releg: 4, promoBonus: 3e6, titleBonus: 1e6, spin: 500e3, premium: 2.5e6, cupBase: 140e3, admin: 450e3, mgrBase: 63, investor: 1.2e6 },
    { name: 'Serie B', teams: 24, avg: 66, demand: 24000, ticket: 28, prize: 9e6, perPlace: 120e3, promoted: 2, playoff: 4, releg: 3, promoBonus: 130e6, titleBonus: 3e6, spin: 1.5e6, premium: 8e6, cupBase: 500e3, admin: 1.5e6, mgrBase: 69, investor: 5e6 },
    { name: 'Serie A', teams: 20, avg: 77, demand: 52000, ticket: 42, prize: 105e6, perPlace: 3.1e6, promoted: 0, playoff: 0, releg: 3, euroSpots: 4, uelPos: 5, confPos: 6, promoBonus: 0, titleBonus: 30e6, spin: 6e6, premium: 30e6, cupBase: 2e6, admin: 6e6, mgrBase: 76, investor: 15e6 },
  ];
  const WORTH_BASE = [4e6, 10e6, 25e6, 90e6, 450e6];
  const TROPHY_WORTH = [0.6e6, 1.5e6, 4e6, 20e6, 280e6];   // il valore di brand duraturo di uno scudetto/titolo, per categoria

  // Le tre coppe europee raggiungibili solo dalla Serie A: 1°-4° Champions League,
  // 5° Europa League, 6° Conference League. Ogni livello ha un montepremi, un premio
  // per turno superato, un bonus per la vittoria finale e una forza degli avversari
  // proporzionalmente più bassa scendendo di coppa.
  const EURO_COMPS = {
    ucl: { name: 'Champions League', flag: '🌍', entry: 40e6, roundWin: 15e6, titleBonus: 60e6, prestige: 320e6, oppBase: 78, attBoost: 1.08, qualPrestige: 25e6, qualBump: 5, gloryBump: 12, growWon: 0.03, growPlaying: 0.01, color: 'var(--dyn)' },
    uel: { name: 'Europa League', flag: '🟠', entry: 12e6, roundWin: 5e6, titleBonus: 20e6, prestige: 90e6, oppBase: 70, attBoost: 1.04, qualPrestige: 10e6, qualBump: 3, gloryBump: 8, growWon: 0.02, growPlaying: 0.007, color: 'var(--gold)' },
    conf: { name: 'Conference League', flag: '🟢', entry: 4e6, roundWin: 1.8e6, titleBonus: 8e6, prestige: 30e6, oppBase: 63, attBoost: 1.02, qualPrestige: 5e6, qualBump: 2, gloryBump: 5, growWon: 0.012, growPlaying: 0.004, color: 'var(--good)' },
  };
  // In che coppa entra una Serie A che chiude in questa posizione, o null se nessuna.
  function euroTierFor(pos) { return pos <= 4 ? 'ucl' : pos === 5 ? 'uel' : pos === 6 ? 'conf' : null; }

  const POOLS = [
    [ // Eccellenza
      { n: 'Nuova Florida', s: 54 }, { n: 'Vis Artena', s: 53 }, { n: 'Aurelia Antica', s: 52 }, { n: 'Boreale', s: 51 },
      { n: 'Grifone Gialloverde', s: 50 }, { n: 'Real Monterotondo', s: 50 }, { n: 'Palocco', s: 49 }, { n: 'Almas Roma', s: 49 },
      { n: 'Atletico Morena', s: 48 }, { n: 'San Basilio', s: 48 }, { n: 'Vicovaro', s: 47 }, { n: 'Guidonia Montecelio', s: 47 },
      { n: 'Colleferro', s: 46 }, { n: 'Anzio', s: 46 }, { n: 'Aprilia', s: 46 }, { n: 'Pomezia', s: 45 },
      { n: 'Cynthialbalonga', s: 45 }, { n: 'Ladispoli', s: 44 }, { n: 'Boca Fiumicino', s: 44 }, { n: 'Tor Sapienza', s: 43 },
      { n: 'Santa Marinella', s: 43 }, { n: 'Formia', s: 42 }, { n: 'Fondi', s: 42 }, { n: 'Gaeta', s: 42 },
    ],
    [ // Serie D
      { n: 'Fiorenzuola', s: 60 }, { n: 'San Giuliano City', s: 59 }, { n: 'Chieri', s: 58 }, { n: 'Bra', s: 58 },
      { n: 'Derthona', s: 57 }, { n: 'Lavagnese', s: 57 }, { n: 'Legnago Salus', s: 57 }, { n: 'Ostiamare', s: 56 },
      { n: 'Sarnese', s: 55 }, { n: 'Nardò', s: 55 }, { n: 'Gravina', s: 55 }, { n: 'Fasano', s: 54 },
      { n: 'Nocerina', s: 54 }, { n: 'Gelbison', s: 53 }, { n: 'Manfredonia', s: 53 }, { n: 'Sancataldese', s: 52 },
      { n: 'Vigor Senigallia', s: 52 }, { n: 'Castelfidardo', s: 52 }, { n: 'Recanatese', s: 51 }, { n: 'Termoli', s: 51 },
      { n: 'Notaresco', s: 50 }, { n: 'Montevarchi', s: 50 }, { n: 'Poggibonsi', s: 50 }, { n: 'Trastevere', s: 49 },
    ],
    [ // Serie C
      { n: 'Padova', s: 68 }, { n: 'Vicenza', s: 67 }, { n: 'Triestina', s: 66 }, { n: 'Pescara', s: 65 },
      { n: 'Ternana', s: 65 }, { n: 'Perugia', s: 64 }, { n: 'Foggia', s: 64 }, { n: 'Avellino', s: 63 },
      { n: 'Catania', s: 63 }, { n: 'Benevento', s: 62 }, { n: 'Casertana', s: 62 }, { n: 'Turris', s: 61 },
      { n: 'Monopoli', s: 61 }, { n: 'Picerno', s: 60 }, { n: 'Crotone', s: 60 }, { n: 'Taranto', s: 59 },
      { n: 'Latina', s: 59 }, { n: 'Giugliano', s: 58 }, { n: 'Sorrento', s: 58 }, { n: 'Potenza', s: 57 },
      { n: 'Cerignola', s: 57 }, { n: 'Messina', s: 56 }, { n: 'Trapani', s: 56 }, { n: 'Rimini', s: 55 },
    ],
    [ // Serie B (20 club reali stagione 2026/27 + 4 di riempimento per arrivare a 24)
      { n: 'Verona', s: 74 }, { n: 'Empoli', s: 73 }, { n: 'Sampdoria', s: 71 }, { n: 'Palermo', s: 70 },
      { n: 'Bari', s: 70 }, { n: 'Cremonese', s: 69 }, { n: 'Spezia', s: 69 }, { n: 'Catanzaro', s: 68 },
      { n: 'Modena', s: 68 }, { n: 'Pisa', s: 67 }, { n: 'Cesena', s: 67 }, { n: 'Juve Stabia', s: 66 },
      { n: 'Sudtirol', s: 66 }, { n: 'Salernitana', s: 65 }, { n: 'Reggiana', s: 65 }, { n: 'Carrarese', s: 64 },
      { n: 'Mantova', s: 64 }, { n: 'Padova', s: 63 }, { n: 'Ascoli', s: 63 }, { n: 'Avellino', s: 62 },
      { n: 'Benevento', s: 62 }, { n: 'Vicenza', s: 61 }, { n: 'Arezzo', s: 61 }, { n: 'Entella', s: 60 },
    ],
    [ // Serie A (massima serie)
      { n: 'Napoli', s: 89 }, { n: 'Inter', s: 86 }, { n: 'Juventus', s: 86 }, { n: 'Milan', s: 83 },
      { n: 'Atalanta', s: 83 }, { n: 'Roma', s: 82 }, { n: 'Fiorentina', s: 81 }, { n: 'Bologna', s: 79 },
      { n: 'Lazio', s: 78 }, { n: 'Torino', s: 77 }, { n: 'Udinese', s: 76 }, { n: 'Genoa', s: 75 },
      { n: 'Sassuolo', s: 75 }, { n: 'Frosinone', s: 74 }, { n: 'Cagliari', s: 73 }, { n: 'Monza', s: 73 },
      { n: 'Parma', s: 72 }, { n: 'Lecce', s: 71 }, { n: 'Venezia', s: 70 }, { n: 'Como', s: 69 },
    ],
  ];

  // Rose reali di Serie A stagione 2026/27 (da Quotazioni Fantacalcio), usate come
  // marcatori quando un club di Serie A gioca da avversario: n=nome, pos=ruolo,
  // q=quotazione fantacalcio (proxy della sua importanza offensiva/difensiva).
  const SERIE_A_ROSTERS = {
    'Napoli': [{n:'Hojlund',pos:'ATT',q:28},{n:'McTominay',pos:'CEN',q:26},{n:'De Bruyne',pos:'CEN',q:17},{n:'Rrahmani',pos:'DIF',q:14},{n:'Santos A.',pos:'ATT',q:14},{n:'Di Lorenzo',pos:'DIF',q:12},{n:'Meret',pos:'POR',q:10},{n:'Lobotka',pos:'CEN',q:10},{n:'Zambo Anguissa',pos:'CEN',q:10},{n:'Politano',pos:'CEN',q:10},{n:'Vergara',pos:'CEN',q:9},{n:'Spinazzola',pos:'DIF',q:8},{n:'Buongiorno',pos:'DIF',q:6},{n:'Badiashile',pos:'DIF',q:6},{n:'Milinkovic-Savic V.',pos:'POR',q:5},{n:'Beukema',pos:'DIF',q:5},{n:'Favasuli',pos:'DIF',q:5},{n:'Neres',pos:'ATT',q:5},{n:'Olivera',pos:'DIF',q:4},{n:'Lang',pos:'ATT',q:4},{n:'Gilmour',pos:'CEN',q:3},{n:'Giovane',pos:'ATT',q:3},{n:'Lucca',pos:'ATT',q:3},{n:'Marin R.',pos:'DIF',q:2},{n:'Contini',pos:'POR',q:1},{n:'Marianucci',pos:'DIF',q:1}],
    'Inter': [{n:'Martinez L.',pos:'ATT',q:34},{n:'Dimarco',pos:'DIF',q:30},{n:'Thuram',pos:'ATT',q:30},{n:'Calhanoglu',pos:'CEN',q:27},{n:'Barella',pos:'CEN',q:18},{n:'Esposito F.P.',pos:'ATT',q:18},{n:'Martinez Jo.',pos:'POR',q:16},{n:'Akanji',pos:'DIF',q:15},{n:'Bastoni',pos:'DIF',q:14},{n:'Zielinski',pos:'CEN',q:13},{n:'Bisseck',pos:'DIF',q:12},{n:'Stones',pos:'DIF',q:12},{n:'Jones C.',pos:'CEN',q:12},{n:'Spence',pos:'DIF',q:11},{n:'Diouf',pos:'CEN',q:10},{n:'Carlos Augusto',pos:'DIF',q:9},{n:'Sucic P.',pos:'CEN',q:8},{n:'Bonny',pos:'ATT',q:8},{n:'Pavard',pos:'DIF',q:6},{n:'Luis Henrique',pos:'CEN',q:4},{n:'Mkhitaryan',pos:'CEN',q:4},{n:'Stankovic A.',pos:'CEN',q:2},{n:'Di Gennaro',pos:'POR',q:1},{n:'Provedel',pos:'POR',q:1}],
    'Juventus': [{n:'Kolo Muani',pos:'ATT',q:24},{n:'Woltemade',pos:'ATT',q:22},{n:'Yildiz',pos:'ATT',q:21},{n:'Vicario',pos:'POR',q:16},{n:'Bremer',pos:'DIF',q:16},{n:'McKennie',pos:'CEN',q:16},{n:'Kalulu',pos:'DIF',q:13},{n:'Conceicao',pos:'CEN',q:13},{n:'Gonzalez N.',pos:'CEN',q:13},{n:'Alajbegovic',pos:'CEN',q:11},{n:'Thuram K.',pos:'CEN',q:9},{n:'Lucumì',pos:'DIF',q:8},{n:'Cambiaso',pos:'DIF',q:8},{n:'Locatelli',pos:'CEN',q:8},{n:'Zhegrova',pos:'CEN',q:8},{n:'Celik',pos:'DIF',q:7},{n:'Koopmeiners',pos:'CEN',q:7},{n:'Sarr P.',pos:'CEN',q:7},{n:'Boga',pos:'ATT',q:6},{n:'Gatti',pos:'DIF',q:5},{n:'Kelly L.',pos:'DIF',q:5},{n:'Douglas Luiz',pos:'CEN',q:4},{n:'Milik',pos:'ATT',q:4},{n:'Ekhator',pos:'ATT',q:2},{n:'Pinsoglio',pos:'POR',q:1},{n:'Grabara',pos:'POR',q:1},{n:'Rugani',pos:'DIF',q:1},{n:'Cabal',pos:'DIF',q:1}],
    'Milan': [{n:'Ramos G.',pos:'ATT',q:26},{n:'Pulisic',pos:'CEN',q:24},{n:'Rabiot',pos:'CEN',q:23},{n:'Maignan',pos:'POR',q:14},{n:'Pavlovic',pos:'DIF',q:13},{n:'Moreira',pos:'CEN',q:13},{n:'Gila',pos:'DIF',q:12},{n:'Modric',pos:'CEN',q:12},{n:'Saelemaekers',pos:'CEN',q:10},{n:'Bartesaghi',pos:'DIF',q:8},{n:'Chukwueze',pos:'CEN',q:8},{n:'Hutchinson',pos:'CEN',q:7},{n:'Gabbia',pos:'DIF',q:6},{n:'Tomori',pos:'DIF',q:6},{n:'Cissè A.',pos:'CEN',q:6},{n:'De Winter',pos:'DIF',q:5},{n:'Jashari',pos:'CEN',q:5},{n:'Musah',pos:'CEN',q:5},{n:'Loftus-Cheek',pos:'CEN',q:4},{n:'Camarda',pos:'ATT',q:4},{n:'Estupinan',pos:'DIF',q:3},{n:'Terracciano',pos:'POR',q:1},{n:'Torriani',pos:'POR',q:1},{n:'Diawara S.',pos:'DIF',q:1},{n:'Terracciano F.',pos:'DIF',q:1},{n:'Comotto',pos:'CEN',q:1}],
    'Atalanta': [{n:'Scamacca',pos:'ATT',q:20},{n:'Krstovic',pos:'ATT',q:17},{n:'Carnesecchi',pos:'POR',q:16},{n:'De Ketelaere',pos:'ATT',q:16},{n:'Samardzic',pos:'CEN',q:13},{n:'Raspadori',pos:'ATT',q:13},{n:'Ederson D.S.',pos:'CEN',q:12},{n:'Kessiè',pos:'CEN',q:11},{n:'Scalvini',pos:'DIF',q:10},{n:'Rowe',pos:'CEN',q:10},{n:'Zappacosta',pos:'DIF',q:8},{n:'Pasalic',pos:'CEN',q:8},{n:'Hien',pos:'DIF',q:7},{n:'Gaetano',pos:'CEN',q:7},{n:'Zalewski',pos:'CEN',q:7},{n:'Kolasinac',pos:'DIF',q:6},{n:'Bernasconi',pos:'DIF',q:6},{n:'Kristensen T.',pos:'DIF',q:6},{n:'Elmas',pos:'CEN',q:6},{n:'Bellanova',pos:'DIF',q:5},{n:'Sulemana K.',pos:'ATT',q:5},{n:'Kossounou',pos:'DIF',q:3},{n:'Sportiello',pos:'POR',q:1},{n:'Pompei',pos:'POR',q:1}],
    'Roma': [{n:'Malen',pos:'ATT',q:37},{n:'Mora',pos:'CEN',q:20},{n:'Svilar',pos:'POR',q:19},{n:'Wesley',pos:'DIF',q:18},{n:'Molina N.',pos:'DIF',q:18},{n:'Dybala',pos:'ATT',q:16},{n:'Mancini',pos:'DIF',q:15},{n:'Soulè',pos:'ATT',q:15},{n:'Castro S.',pos:'ATT',q:14},{n:'N\'Dicka',pos:'DIF',q:12},{n:'Hermoso',pos:'DIF',q:11},{n:'Konè M.',pos:'CEN',q:10},{n:'Cristante',pos:'CEN',q:9},{n:'Pellegrini Lo.',pos:'CEN',q:9},{n:'Pisilli',pos:'CEN',q:8},{n:'Koulierakis',pos:'DIF',q:7},{n:'Balerdi',pos:'DIF',q:7},{n:'Ghilardi',pos:'DIF',q:5},{n:'Rensch',pos:'DIF',q:4},{n:'De Roon',pos:'CEN',q:4},{n:'Lulli',pos:'DIF',q:3},{n:'De Marzi',pos:'POR',q:1},{n:'Gollini',pos:'POR',q:1}],
    'Fiorentina': [{n:'Atta',pos:'CEN',q:16},{n:'Pellegrino M.',pos:'ATT',q:16},{n:'Mastantuono',pos:'CEN',q:14},{n:'Beto',pos:'ATT',q:14},{n:'Goncalves P.',pos:'CEN',q:11},{n:'De Gea',pos:'POR',q:10},{n:'Dodò',pos:'DIF',q:9},{n:'Dragusin',pos:'DIF',q:8},{n:'Jimenez A.',pos:'DIF',q:8},{n:'Fagioli',pos:'CEN',q:8},{n:'Ndour',pos:'CEN',q:8},{n:'Gnonto',pos:'ATT',q:7},{n:'Viery',pos:'DIF',q:6},{n:'Oulai',pos:'CEN',q:6},{n:'Valdepenas',pos:'DIF',q:5},{n:'Njie',pos:'CEN',q:5},{n:'Parisi',pos:'DIF',q:4},{n:'Pongracic',pos:'DIF',q:3},{n:'Ranieri L.',pos:'DIF',q:3},{n:'Brescianini',pos:'CEN',q:3},{n:'Joao Mario',pos:'DIF',q:2},{n:'Christensen O.',pos:'POR',q:1},{n:'Lezzerini',pos:'POR',q:1}],
    'Bologna': [{n:'Orsolini',pos:'CEN',q:24},{n:'Dovbyk',pos:'ATT',q:16},{n:'Skorupski',pos:'POR',q:10},{n:'Bernardeschi',pos:'CEN',q:10},{n:'Piccoli',pos:'ATT',q:9},{n:'Miranda J.',pos:'DIF',q:8},{n:'Theate',pos:'DIF',q:8},{n:'Ferguson',pos:'CEN',q:8},{n:'Cambiaghi',pos:'CEN',q:8},{n:'Pobega',pos:'CEN',q:7},{n:'Odgaard',pos:'CEN',q:7},{n:'Mbangula',pos:'CEN',q:7},{n:'Heggem',pos:'DIF',q:6},{n:'Holm',pos:'DIF',q:6},{n:'Zortea',pos:'DIF',q:6},{n:'Vitik',pos:'DIF',q:4},{n:'Amondarain',pos:'CEN',q:4},{n:'Moro N.',pos:'CEN',q:4},{n:'Helland',pos:'DIF',q:3},{n:'Pessina Mas.',pos:'POR',q:2},{n:'Casale',pos:'DIF',q:2},{n:'Alhassane',pos:'DIF',q:2},{n:'El Azzouzi O.',pos:'CEN',q:2},{n:'Enem',pos:'ATT',q:2},{n:'Happonen',pos:'POR',q:1},{n:'De Silvestri',pos:'DIF',q:1},{n:'Libra',pos:'CEN',q:1}],
    'Lazio': [{n:'Zaccagni',pos:'CEN',q:16},{n:'Gudmundsson A.',pos:'CEN',q:13},{n:'Taylor K.',pos:'CEN',q:13},{n:'Mandas',pos:'POR',q:11},{n:'Frattesi',pos:'CEN',q:11},{n:'Pinamonti',pos:'ATT',q:11},{n:'Cancellieri',pos:'CEN',q:10},{n:'Isaksen',pos:'CEN',q:9},{n:'Doekhi',pos:'DIF',q:8},{n:'Noslin',pos:'ATT',q:8},{n:'Tavares N.',pos:'DIF',q:7},{n:'Marusic',pos:'DIF',q:6},{n:'Sutalo J.',pos:'DIF',q:6},{n:'Leite',pos:'DIF',q:6},{n:'Rovella',pos:'CEN',q:6},{n:'Pedraza',pos:'DIF',q:5},{n:'Provstgaard',pos:'DIF',q:4},{n:'Floriani Mussolini',pos:'DIF',q:4},{n:'Dele-Bashiru',pos:'CEN',q:4},{n:'Belahyane',pos:'CEN',q:3},{n:'Cataldi',pos:'CEN',q:3},{n:'Motta',pos:'POR',q:1},{n:'Renzetti',pos:'POR',q:1},{n:'Patric',pos:'DIF',q:1},{n:'Lazzari',pos:'DIF',q:1},{n:'Pellegrini Lu.',pos:'DIF',q:1},{n:'Przyborek',pos:'CEN',q:1}],
    'Torino': [{n:'Simeone',pos:'ATT',q:14},{n:'Vlasic',pos:'CEN',q:12},{n:'Adams C.',pos:'ATT',q:11},{n:'Mandragora',pos:'CEN',q:10},{n:'Perri',pos:'POR',q:9},{n:'Casadei',pos:'CEN',q:9},{n:'Comuzzo',pos:'DIF',q:8},{n:'Belghali',pos:'DIF',q:8},{n:'Coco',pos:'DIF',q:7},{n:'Ismajli',pos:'DIF',q:7},{n:'Fortini',pos:'DIF',q:7},{n:'Cacciamani',pos:'CEN',q:7},{n:'Braganca',pos:'CEN',q:7},{n:'Fitz-Jim',pos:'CEN',q:6},{n:'Gineitis',pos:'CEN',q:6},{n:'Oristanio',pos:'CEN',q:6},{n:'Zapata D.',pos:'ATT',q:6},{n:'Comert',pos:'DIF',q:5},{n:'Patterson',pos:'DIF',q:5},{n:'Rodriguez R.',pos:'DIF',q:5},{n:'Ilkhan',pos:'CEN',q:4},{n:'Aboukhlal',pos:'CEN',q:3},{n:'Kulenovic',pos:'ATT',q:3},{n:'Mascardi',pos:'POR',q:1},{n:'Siviero',pos:'POR',q:1},{n:'Biraghi',pos:'DIF',q:1}],
    'Udinese': [{n:'Davis K.',pos:'ATT',q:19},{n:'Zaniolo',pos:'CEN',q:17},{n:'Solet',pos:'DIF',q:13},{n:'Ekkelenkamp',pos:'CEN',q:13},{n:'Kamara H.',pos:'DIF',q:9},{n:'Okoye',pos:'POR',q:8},{n:'Vojvoda',pos:'DIF',q:8},{n:'Karlstrom',pos:'CEN',q:8},{n:'Unai Gomez',pos:'CEN',q:7},{n:'Piotrowski',pos:'CEN',q:6},{n:'Gueye',pos:'ATT',q:6},{n:'Abankwah',pos:'DIF',q:5},{n:'Bertola',pos:'DIF',q:4},{n:'Miller L.',pos:'CEN',q:4},{n:'Kabasele',pos:'DIF',q:3},{n:'Ebosse',pos:'DIF',q:3},{n:'Zanoli',pos:'DIF',q:3},{n:'Arizala',pos:'DIF',q:3},{n:'Palma',pos:'DIF',q:2},{n:'Zarraga',pos:'CEN',q:2},{n:'Chakvetadze',pos:'CEN',q:2},{n:'Jovanovic',pos:'CEN',q:2},{n:'Padelli',pos:'POR',q:1},{n:'Mrozek',pos:'POR',q:1},{n:'Bayo V.',pos:'ATT',q:1}],
    'Genoa': [{n:'Baldanzi',pos:'CEN',q:11},{n:'Ostigard',pos:'DIF',q:10},{n:'Colombo',pos:'ATT',q:10},{n:'Vasquez',pos:'DIF',q:9},{n:'Osmajic',pos:'ATT',q:9},{n:'Vitinha O.',pos:'ATT',q:8},{n:'Bijlow',pos:'POR',q:7},{n:'Frendrup',pos:'CEN',q:7},{n:'Sow',pos:'CEN',q:7},{n:'El Shaarawy',pos:'CEN',q:7},{n:'Marcandalli',pos:'DIF',q:6},{n:'Ellertsson',pos:'CEN',q:6},{n:'Messias',pos:'CEN',q:5},{n:'Ehizibue',pos:'DIF',q:4},{n:'Amorim',pos:'CEN',q:4},{n:'Meichtry',pos:'CEN',q:4},{n:'Traorè Hj.',pos:'CEN',q:4},{n:'Mitaj',pos:'DIF',q:3},{n:'Drameh',pos:'DIF',q:3},{n:'Havel',pos:'ATT',q:3},{n:'Otoa',pos:'DIF',q:2},{n:'Sabelli',pos:'DIF',q:2},{n:'Sommariva',pos:'POR',q:1},{n:'Stolz',pos:'POR',q:1},{n:'Puczka',pos:'DIF',q:1},{n:'Venturino',pos:'CEN',q:1},{n:'Robinho Junior',pos:'ATT',q:1}],
    'Sassuolo': [{n:'Berardi',pos:'ATT',q:18},{n:'Laurientè',pos:'ATT',q:16},{n:'Esposito Se.',pos:'ATT',q:13},{n:'Bowie',pos:'ATT',q:11},{n:'Thorstvedt',pos:'CEN',q:10},{n:'Adzic',pos:'CEN',q:9},{n:'Volpato',pos:'CEN',q:9},{n:'Konè I.',pos:'CEN',q:8},{n:'Idzes',pos:'DIF',q:7},{n:'Doig',pos:'DIF',q:7},{n:'Leysen F.',pos:'DIF',q:7},{n:'Matic',pos:'CEN',q:7},{n:'Muric',pos:'POR',q:6},{n:'Obrador',pos:'DIF',q:6},{n:'Caleta-Car',pos:'DIF',q:6},{n:'Bakola',pos:'CEN',q:6},{n:'Cinquegrano',pos:'DIF',q:4},{n:'Dominguez B.',pos:'CEN',q:4},{n:'Walukiewicz',pos:'DIF',q:3},{n:'Odenthal',pos:'DIF',q:3},{n:'Sulemana I.',pos:'CEN',q:3},{n:'Lipani',pos:'CEN',q:3},{n:'Candè',pos:'DIF',q:2},{n:'Russo A.',pos:'POR',q:1},{n:'Turati',pos:'POR',q:1},{n:'Satalino',pos:'POR',q:1},{n:'Van Der Brempt',pos:'DIF',q:1},{n:'Pieragnolo',pos:'DIF',q:1},{n:'Boloca',pos:'CEN',q:1}],
    'Frosinone': [{n:'Raimondo',pos:'ATT',q:11},{n:'Calò',pos:'CEN',q:9},{n:'Ghedjemis',pos:'ATT',q:9},{n:'Kvernadze',pos:'ATT',q:9},{n:'Bobcek',pos:'ATT',q:9},{n:'Schmid',pos:'CEN',q:8},{n:'Bracaglia',pos:'DIF',q:7},{n:'Oyono A.',pos:'DIF',q:7},{n:'Palmisani',pos:'POR',q:6},{n:'Calvani',pos:'DIF',q:6},{n:'Monterisi',pos:'DIF',q:6},{n:'Zerbin',pos:'CEN',q:6},{n:'Fini',pos:'CEN',q:5},{n:'Masini',pos:'CEN',q:5},{n:'Cittadini',pos:'DIF',q:4},{n:'Terzic',pos:'DIF',q:4},{n:'Cichella',pos:'CEN',q:4},{n:'Grillitsch',pos:'CEN',q:4},{n:'Birligea',pos:'ATT',q:4},{n:'Hasa',pos:'CEN',q:3},{n:'Akpoguma',pos:'DIF',q:2},{n:'Tchato',pos:'DIF',q:2},{n:'Gelli F.',pos:'CEN',q:2},{n:'Desplanches',pos:'POR',q:1},{n:'Lolic',pos:'POR',q:1},{n:'Pisseri',pos:'POR',q:1},{n:'Amey',pos:'DIF',q:1},{n:'Omar Fayed',pos:'DIF',q:1},{n:'El Azzouzi A.',pos:'CEN',q:1},{n:'Kone B.',pos:'CEN',q:1}],
    'Cagliari': [{n:'Caprile',pos:'POR',q:11},{n:'Kevin Carlos',pos:'ATT',q:11},{n:'Maldini',pos:'ATT',q:9},{n:'Obert',pos:'DIF',q:8},{n:'Adopo',pos:'CEN',q:8},{n:'Romano',pos:'CEN',q:8},{n:'Mina',pos:'DIF',q:7},{n:'Zè Pedro',pos:'DIF',q:7},{n:'Winks',pos:'CEN',q:7},{n:'Fazzini',pos:'CEN',q:7},{n:'Mendy P.',pos:'ATT',q:7},{n:'Sugawara',pos:'DIF',q:6},{n:'Kofler',pos:'DIF',q:5},{n:'Rodriguez Ju.',pos:'DIF',q:5},{n:'Deiola',pos:'CEN',q:5},{n:'Felici',pos:'CEN',q:5},{n:'Fadera',pos:'CEN',q:4},{n:'Massolin',pos:'CEN',q:4},{n:'Nzola',pos:'ATT',q:4},{n:'Gagliardini',pos:'CEN',q:3},{n:'Idrissi R.',pos:'DIF',q:2},{n:'Sherri',pos:'POR',q:1},{n:'Radunovic',pos:'POR',q:1},{n:'Aurelio',pos:'DIF',q:1},{n:'Liteta',pos:'CEN',q:1},{n:'Ciervo',pos:'CEN',q:1},{n:'Trepy',pos:'ATT',q:1}],
    'Monza': [{n:'Mangas',pos:'DIF',q:9},{n:'Colpani',pos:'CEN',q:9},{n:'Cutrone',pos:'ATT',q:9},{n:'Akinsanmiro',pos:'CEN',q:7},{n:'Varela G.',pos:'ATT',q:7},{n:'Zeballos',pos:'ATT',q:7},{n:'Birindelli',pos:'DIF',q:6},{n:'Pessina',pos:'CEN',q:6},{n:'Robinson J.',pos:'ATT',q:6},{n:'Tourè I.',pos:'CEN',q:5},{n:'Mota',pos:'ATT',q:5},{n:'Thiam',pos:'POR',q:4},{n:'Lucchesi',pos:'DIF',q:4},{n:'Kouadio',pos:'DIF',q:4},{n:'Carboni A.',pos:'DIF',q:4},{n:'Folorunsho',pos:'CEN',q:4},{n:'Ngonge',pos:'ATT',q:4},{n:'Bakoune',pos:'DIF',q:2},{n:'Goglichidze',pos:'DIF',q:2},{n:'Colombo L.',pos:'CEN',q:2},{n:'Forson O.',pos:'CEN',q:2},{n:'Foe Ondoa',pos:'CEN',q:2},{n:'Tornqvist',pos:'POR',q:1},{n:'Strajnar',pos:'POR',q:1},{n:'Antov',pos:'DIF',q:1},{n:'Ziolkowski',pos:'DIF',q:1},{n:'Maye',pos:'DIF',q:1},{n:'Ciurria',pos:'CEN',q:1},{n:'Mout',pos:'CEN',q:1}],
    'Parma': [{n:'Romero D.',pos:'ATT',q:11},{n:'Tourè E.',pos:'ATT',q:10},{n:'Valeri',pos:'DIF',q:9},{n:'Delprato',pos:'DIF',q:8},{n:'Diego Carlos',pos:'DIF',q:8},{n:'Bernabè',pos:'CEN',q:7},{n:'Daffara',pos:'POR',q:6},{n:'Keita M.',pos:'CEN',q:6},{n:'Nicolussi Caviglia',pos:'CEN',q:5},{n:'Almqvist',pos:'CEN',q:5},{n:'Lontani',pos:'ATT',q:5},{n:'Troilo',pos:'DIF',q:4},{n:'Valenti',pos:'DIF',q:4},{n:'Britschgi',pos:'DIF',q:4},{n:'Frigan',pos:'ATT',q:4},{n:'Corvi',pos:'POR',q:3},{n:'Fabbian',pos:'CEN',q:3},{n:'Ordonez C.',pos:'CEN',q:3},{n:'Diallo O.',pos:'CEN',q:3},{n:'Elphege',pos:'ATT',q:3},{n:'Drobnic',pos:'DIF',q:2},{n:'Cremaschi',pos:'CEN',q:2},{n:'Sierro',pos:'CEN',q:2},{n:'Ghidotti',pos:'POR',q:1},{n:'Ndiaye',pos:'DIF',q:1},{n:'Carboni F.',pos:'DIF',q:1},{n:'De Martis',pos:'ATT',q:1}],
    'Lecce': [{n:'Tiago Gabriel',pos:'DIF',q:9},{n:'Coulibaly L.',pos:'CEN',q:9},{n:'Falcone',pos:'POR',q:8},{n:'Geubbels',pos:'ATT',q:8},{n:'Monteiro J.',pos:'CEN',q:7},{n:'Stulic',pos:'ATT',q:7},{n:'Veiga D.',pos:'DIF',q:6},{n:'Gallo',pos:'DIF',q:6},{n:'Pierotti',pos:'CEN',q:6},{n:'Siebert',pos:'DIF',q:5},{n:'Gaspar K.',pos:'DIF',q:4},{n:'Maleh',pos:'CEN',q:4},{n:'Ngom',pos:'CEN',q:4},{n:'Berisha M.',pos:'CEN',q:4},{n:'Gandelman',pos:'CEN',q:4},{n:'N\'Dri',pos:'ATT',q:4},{n:'Fatah',pos:'ATT',q:4},{n:'Gorter',pos:'CEN',q:3},{n:'Ilic',pos:'CEN',q:3},{n:'Penev',pos:'POR',q:1},{n:'Bleve',pos:'POR',q:1},{n:'Jean',pos:'DIF',q:1},{n:'Ndaba',pos:'DIF',q:1},{n:'Dembelè A.',pos:'DIF',q:1},{n:'Kaba',pos:'CEN',q:1},{n:'Fofana Sa.',pos:'CEN',q:1},{n:'Laerke',pos:'CEN',q:1}],
    'Venezia': [{n:'Adams A.',pos:'ATT',q:12},{n:'Yeboah J.',pos:'ATT',q:10},{n:'Busio',pos:'CEN',q:7},{n:'Rrahmani Al.',pos:'ATT',q:7},{n:'Hainaut',pos:'DIF',q:6},{n:'Basic',pos:'CEN',q:6},{n:'Perez K.',pos:'CEN',q:6},{n:'Stankovic F.',pos:'POR',q:5},{n:'Bella-Kotchap',pos:'DIF',q:5},{n:'Correia T.',pos:'DIF',q:5},{n:'Haps',pos:'DIF',q:5},{n:'Sohm',pos:'CEN',q:5},{n:'Moreno M.',pos:'DIF',q:4},{n:'Sagrado',pos:'DIF',q:4},{n:'Juan Jesus',pos:'DIF',q:4},{n:'Adorante',pos:'ATT',q:4},{n:'Fernandez T.',pos:'CEN',q:3},{n:'Halhal',pos:'DIF',q:2},{n:'Schingtienne',pos:'DIF',q:2},{n:'Sverko',pos:'DIF',q:2},{n:'Franjic',pos:'DIF',q:2},{n:'Helgason',pos:'CEN',q:2},{n:'Lauberbach',pos:'ATT',q:2},{n:'Grandi',pos:'POR',q:1},{n:'Pozzi',pos:'POR',q:1},{n:'Montipò',pos:'POR',q:1},{n:'Mazzocchi',pos:'DIF',q:1},{n:'Gomes',pos:'DIF',q:1},{n:'Dagasso',pos:'CEN',q:1},{n:'Duncan',pos:'CEN',q:1},{n:'Lisman',pos:'ATT',q:1}],
    'Como': [{n:'Paz N.',pos:'CEN',q:30},{n:'Kean',pos:'ATT',q:24},{n:'Douvikas',pos:'ATT',q:21},{n:'Baturina',pos:'CEN',q:20},{n:'Da Cunha',pos:'CEN',q:18},{n:'Butez',pos:'POR',q:15},{n:'Diao',pos:'ATT',q:14},{n:'Ramon',pos:'DIF',q:12},{n:'Perrone',pos:'CEN',q:11},{n:'Rodriguez Je.',pos:'CEN',q:11},{n:'Chalobah T.',pos:'DIF',q:10},{n:'Couto',pos:'DIF',q:9},{n:'Sanchez Ro.',pos:'POR',q:8},{n:'Kaiki',pos:'DIF',q:8},{n:'Valle',pos:'DIF',q:7},{n:'Kempf',pos:'DIF',q:6},{n:'Milla',pos:'CEN',q:6},{n:'Caqueret',pos:'CEN',q:6},{n:'Liberali',pos:'CEN',q:6},{n:'Addai',pos:'CEN',q:4},{n:'Smolcic I.',pos:'DIF',q:3},{n:'Ricci S.',pos:'CEN',q:3},{n:'Kambwala',pos:'DIF',q:2},{n:'Vigorito',pos:'POR',q:1},{n:'Goldaniga',pos:'DIF',q:1},{n:'Lahdo',pos:'CEN',q:1}],
  };

  // Rose reali di Serie B stagione 2026/27 (da Rose_SerieB_Fantacalcio), usate come
  // marcatori quando un club di Serie B gioca da avversario: stesso schema di
  // SERIE_A_ROSTERS (n=nome, pos=ruolo, q=quotazione fantacalcio).
  const SERIE_B_ROSTERS = {
    'Verona': [{n:'Mulattieri Samuele',pos:'ATT',q:41},{n:'Suslov Tomas',pos:'CEN',q:15},{n:'Harroui',pos:'CEN',q:14},{n:'Mosquera Daniel',pos:'ATT',q:14},{n:'Leali Nicola',pos:'POR',q:13},{n:'Zappa Gabriele',pos:'DIF',q:13},{n:'Edmundsson Andrias',pos:'DIF',q:12},{n:'Kastanos Grigoris',pos:'CEN',q:11},{n:'Sarr Amin',pos:'ATT',q:11},{n:'Livramento Dailon',pos:'ATT',q:10},{n:'Belghali Rafik',pos:'DIF',q:9},{n:'Bradaric Domagoj',pos:'DIF',q:9},{n:'Bernede Antoine',pos:'CEN',q:9},{n:'Compagnon Mattia',pos:'ATT',q:9},{n:'Serdar Suat',pos:'CEN',q:8},{n:'Calabrese Nicolo',pos:'DIF',q:6},{n:'Dawidowicz Pawel',pos:'DIF',q:5},{n:'Frese Martin',pos:'DIF',q:5},{n:'Cerbone Salvatore',pos:'ATT',q:5},{n:'Korac Seid',pos:'DIF',q:3},{n:'Oyegoke Daniel',pos:'DIF',q:3},{n:'Slotsager Tobias',pos:'DIF',q:3},{n:'Isaac Tomich',pos:'ATT',q:2},{n:'Arthur Borghi',pos:'POR',q:1},{n:'Perilli Simone',pos:'POR',q:1},{n:'Toniolo Giacomo',pos:'POR',q:1},{n:'Cham Fallou',pos:'DIF',q:1},{n:'De Battisti Davide',pos:'DIF',q:1},{n:'Feola Willam',pos:'DIF',q:1},{n:'Akale Ruben',pos:'CEN',q:1},{n:'Bega Leorat',pos:'CEN',q:1},{n:'Charlys',pos:'CEN',q:1},{n:'Monticelli Luca',pos:'CEN',q:1},{n:'Peci Jurgen',pos:'CEN',q:1},{n:'Szimionas Luca',pos:'CEN',q:1},{n:'Cruz Juan Manuel',pos:'ATT',q:1},{n:'Sezonienko Kacper',pos:'ATT',q:1},{n:'Vermesan Ioan',pos:'ATT',q:1}],
    'Empoli': [{n:'Shpendi Stiven',pos:'ATT',q:42},{n:'Distefano Filippo',pos:'ATT',q:20},{n:'Popov Bogdan',pos:'ATT',q:17},{n:'Perisan Samuele',pos:'POR',q:12},{n:'Saporiti Edoardo',pos:'CEN',q:11},{n:'Cauz Cristian',pos:'DIF',q:9},{n:'Guarino Gabriele',pos:'DIF',q:9},{n:'Magnino Luca',pos:'CEN',q:8},{n:'Yepes Gerard',pos:'CEN',q:8},{n:'Curto Marco',pos:'DIF',q:7},{n:'Corrado Niccolo',pos:'DIF',q:5},{n:'Seghetti Jacopo',pos:'POR',q:4},{n:'Ceesay Joseph',pos:'DIF',q:3},{n:'Tosto Lorenzo',pos:'DIF',q:3},{n:'Belardinelli Luca',pos:'CEN',q:3},{n:'Degli Innocenti Duccio',pos:'CEN',q:3},{n:'Zedadka',pos:'CEN',q:3},{n:'Sodero Andrea',pos:'ATT',q:3},{n:'Indragoli Gabriele',pos:'DIF',q:2},{n:'Brancolini Federico',pos:'POR',q:1},{n:'Gasparini Manuel',pos:'POR',q:1},{n:'Versari Francesco',pos:'POR',q:1},{n:'Bembnista Dawid',pos:'DIF',q:1},{n:'Pasalic Kevin',pos:'DIF',q:1},{n:'Romagnoli Simone',pos:'DIF',q:1},{n:'Baralla Alessio',pos:'CEN',q:1},{n:'Busiello Danilo',pos:'CEN',q:1},{n:'Deli Lapo',pos:'CEN',q:1},{n:'Orlandi Andrea',pos:'CEN',q:1},{n:'Perin Ernesto',pos:'CEN',q:1},{n:'Bianchi Flavio',pos:'ATT',q:1},{n:'Campaniello Thomas',pos:'ATT',q:1},{n:'Zanaga Edoardo',pos:'ATT',q:1}],
    'Sampdoria': [{n:'Tutino Gennaro',pos:'ATT',q:32},{n:'Insigne Lorenzo',pos:'ATT',q:30},{n:'Begic Tjas',pos:'ATT',q:20},{n:'Vindahl Jensen Peter',pos:'POR',q:13},{n:'Depaoli Fabio',pos:'DIF',q:13},{n:'Esposito Salvatore',pos:'CEN',q:11},{n:'Verschaeren Yari',pos:'CEN',q:10},{n:'Di Pardo Alessandro',pos:'DIF',q:9},{n:'Viti Mattia',pos:'DIF',q:8},{n:'Cicconi Manuel',pos:'CEN',q:7},{n:'Hernderson Liam',pos:'CEN',q:7},{n:'Conti Francesco',pos:'CEN',q:6},{n:'Makoumbou Antoine',pos:'CEN',q:6},{n:'Gartenmann Stefan',pos:'DIF',q:5},{n:'Ravanelli Luca',pos:'DIF',q:5},{n:'Abildgaard Oliver',pos:'CEN',q:4},{n:'Riccio Alessandro Pio',pos:'DIF',q:3},{n:'Bellemo Alessandro',pos:'CEN',q:3},{n:'Sinani Danel',pos:'ATT',q:3},{n:'Lauritsen Tobias',pos:'ATT',q:2},{n:'Ghidotti Simone',pos:'POR',q:1},{n:'Krastev Andrey',pos:'POR',q:1},{n:'Scardigno Nicholas',pos:'POR',q:1},{n:'Tantalocchi Elia',pos:'POR',q:1},{n:'Diop Karim',pos:'DIF',q:1},{n:'Ferrari Alex',pos:'DIF',q:1},{n:'Ferri Jordan',pos:'CEN',q:1},{n:'Girelli Stefano',pos:'CEN',q:1},{n:'Sekulov Nikola',pos:'CEN',q:1}],
    'Palermo': [{n:'Pohjanpalo Joel',pos:'ATT',q:65},{n:'Palumbo Antonio',pos:'CEN',q:32},{n:'Strefezza Gabriel',pos:'CEN',q:24},{n:'Pierozzi Niccolo',pos:'CEN',q:22},{n:'Hernani',pos:'CEN',q:20},{n:'Johnsen Dennis',pos:'CEN',q:19},{n:'Ranocchia Filippo',pos:'CEN',q:19},{n:'Le Douaron Jeremy',pos:'ATT',q:18},{n:'Vavassori Dominic',pos:'ATT',q:18},{n:'Perin Mattia',pos:'POR',q:17},{n:'Augello Tommaso',pos:'DIF',q:17},{n:'Segre Jacopo',pos:'CEN',q:15},{n:'Joronen Jess',pos:'POR',q:14},{n:'Ceccaroni Pietro',pos:'DIF',q:14},{n:'Bani Mattia',pos:'DIF',q:13},{n:'Cassandro Tommaso',pos:'DIF',q:12},{n:'Estevez Nahuel',pos:'CEN',q:11},{n:'Barba Federico',pos:'DIF',q:5},{n:'Peda Patryk',pos:'DIF',q:5},{n:'Gyasi Emmanuel',pos:'CEN',q:5},{n:'Gomes Claudio',pos:'CEN',q:3},{n:'Balaguss Nils',pos:'POR',q:1},{n:'Cutrona Francesco',pos:'POR',q:1},{n:'Fortin Mattia',pos:'POR',q:1},{n:'Nespola Manfredi',pos:'POR',q:1},{n:'Pizzuto Simone',pos:'POR',q:1},{n:'Blin Alexis',pos:'DIF',q:1},{n:'Bozzolan Andrea',pos:'DIF',q:1},{n:'Diakite Salim',pos:'DIF',q:1},{n:'Magnani Giangiacomo',pos:'DIF',q:1},{n:'Nicolosi Ettore',pos:'DIF',q:1},{n:'Avena Pietro',pos:'CEN',q:1},{n:'Squillacioti Salvatore',pos:'CEN',q:1}],
    'Cremonese': [{n:'Bonazzoli Federico',pos:'ATT',q:40},{n:'Vandeputte Jari',pos:'CEN',q:26},{n:'Nasti Marco',pos:'ATT',q:26},{n:'De Luca Manuel',pos:'ATT',q:24},{n:'Stuckler David',pos:'ATT',q:21},{n:'Fulignati Andrea',pos:'POR',q:16},{n:'Berti Tommaso',pos:'CEN',q:16},{n:'Baschirotto Federico',pos:'DIF',q:14},{n:'Pontisso Simone',pos:'CEN',q:14},{n:'Luperto Sebastiano',pos:'DIF',q:12},{n:'Collocolo Manuele',pos:'CEN',q:12},{n:'Licina Adin',pos:'CEN',q:11},{n:'Thorsby Morten',pos:'CEN',q:11},{n:'Barbieri Tommaso',pos:'DIF',q:9},{n:'Bianchetti Matteo',pos:'DIF',q:9},{n:'Vogliacco Alessandro',pos:'DIF',q:8},{n:'Gerli Fabio',pos:'CEN',q:8},{n:'Elia Salvatore',pos:'CEN',q:7},{n:'Duric Milan',pos:'ATT',q:7},{n:'Jack',pos:'DIF',q:5},{n:'Lickunas Adrian',pos:'ATT',q:4},{n:'Agazzi Federico',pos:'POR',q:3},{n:'Pezzella Giuseppe',pos:'DIF',q:3},{n:'Rocchetti Yuri',pos:'DIF',q:2},{n:'Lottici Tessadri',pos:'CEN',q:2},{n:'Festa Marco',pos:'POR',q:1},{n:'Cabianca Eddy',pos:'DIF',q:1},{n:'Folino Francesco',pos:'DIF',q:1},{n:'Lordkipanidze Dachi',pos:'DIF',q:1},{n:'Vigilati Tommaso',pos:'DIF',q:1},{n:'Brambilla Alessio',pos:'CEN',q:1},{n:'Grassi Alberto',pos:'CEN',q:1},{n:'Faye Nouroudine',pos:'ATT',q:1}],
    'Catanzaro': [{n:'Iemmello Pietro',pos:'ATT',q:37},{n:'Mosti Nicola',pos:'CEN',q:20},{n:'Koffi',pos:'ATT',q:18},{n:'Pigliacelli Mirko',pos:'POR',q:15},{n:'Pafundi Simone',pos:'CEN',q:14},{n:'Dorval Mehdi',pos:'DIF',q:13},{n:'Antonini Matias',pos:'DIF',q:12},{n:'Petriccione Jacopo',pos:'DIF',q:12},{n:'Gjoka Kevin',pos:'ATT',q:11},{n:'Pecorino Emanuele',pos:'ATT',q:11},{n:'Candela Antonio',pos:'DIF',q:9},{n:'Arditi Gabriel',pos:'ATT',q:9},{n:'Volpe Giovanni',pos:'ATT',q:9},{n:'D\'Alessandro Marco',pos:'CEN',q:7},{n:'Giovane Samuele',pos:'CEN',q:7},{n:'Alesi Gabriele',pos:'CEN',q:6},{n:'Postiglione Niccolo',pos:'DIF',q:5},{n:'Ruggero Marco',pos:'DIF',q:5},{n:'Verrengia Bruno',pos:'DIF',q:5},{n:'Maiolo Francesco',pos:'CEN',q:5},{n:'Frosinini Ruggero',pos:'DIF',q:4},{n:'Imperiale Marco',pos:'DIF',q:4},{n:'Garnica Alejo',pos:'ATT',q:4},{n:'Bashi Ervin',pos:'DIF',q:3},{n:'Tchaouna Franck',pos:'CEN',q:3},{n:'Di Francesco Federico',pos:'ATT',q:3},{n:'Morleo Umberto',pos:'DIF',q:2},{n:'Reita Francesco',pos:'CEN',q:2},{n:'Buso Nicolo',pos:'ATT',q:2},{n:'Borrelli Edoardo',pos:'POR',q:1},{n:'Madia Lorenzo',pos:'POR',q:1},{n:'Marietta Christian',pos:'POR',q:1},{n:'Coriano Martino',pos:'DIF',q:1},{n:'Paura Mario',pos:'DIF',q:1},{n:'Rombola Carlo',pos:'DIF',q:1}],
    'Modena': [{n:'Ambrosino Giuseppe',pos:'ATT',q:23},{n:'Pedro Mendes',pos:'ATT',q:23},{n:'Caso Giuseppe',pos:'ATT',q:16},{n:'Santoro Simone',pos:'CEN',q:14},{n:'Brugman Gaston',pos:'CEN',q:13},{n:'Chichizola Leandro',pos:'POR',q:12},{n:'Tonoli Daniel',pos:'DIF',q:12},{n:'Azzi Paulo',pos:'DIF',q:11},{n:'Zampano Francesco',pos:'DIF',q:11},{n:'Olzer Giacomo',pos:'CEN',q:11},{n:'Nieling Bryant',pos:'DIF',q:9},{n:'Bianco Alessandro',pos:'CEN',q:8},{n:'Montevago Daniele',pos:'ATT',q:7},{n:'Bacchin Luca',pos:'ATT',q:6},{n:'Nador Steven',pos:'DIF',q:5},{n:'Adorni Davide',pos:'DIF',q:3},{n:'Manquant Joris',pos:'ATT',q:3},{n:'Bozhanaj Kleis',pos:'CEN',q:2},{n:'Imputato Antonio',pos:'CEN',q:2},{n:'Consiglio Leonardo',pos:'POR',q:1},{n:'Laidani Abdullah',pos:'POR',q:1},{n:'Maran Andrea',pos:'POR',q:1},{n:'Odero Martino',pos:'DIF',q:1},{n:'Ronco Diego',pos:'DIF',q:1},{n:'Arnaboldi Pietro',pos:'CEN',q:1},{n:'Sersanti Alessandro',pos:'CEN',q:1},{n:'Stenio Zanetti',pos:'CEN',q:1},{n:'Colpo Edoardo',pos:'ATT',q:1}],
    'Pisa': [{n:'Moreo Stefano',pos:'ATT',q:31},{n:'Pittarello Filippo',pos:'ATT',q:28},{n:'Tramoni Matteo',pos:'CEN',q:24},{n:'Petagna Andrea',pos:'ATT',q:23},{n:'Marras Tommaso',pos:'ATT',q:20},{n:'Meister Henrik',pos:'ATT',q:15},{n:'Correia Omar',pos:'CEN',q:14},{n:'Rao Emanuele',pos:'CEN',q:13},{n:'Angori Samuele',pos:'DIF',q:12},{n:'Canestrelli Simone',pos:'DIF',q:12},{n:'Leone Giuseppe',pos:'CEN',q:12},{n:'Scuffet Simone',pos:'POR',q:11},{n:'Confente Alessandro',pos:'POR',q:9},{n:'Coppola Francesco',pos:'DIF',q:8},{n:'Leris Mehdi',pos:'CEN',q:8},{n:'Caracciolo Antonio',pos:'DIF',q:7},{n:'Piccinini Gabriele',pos:'CEN',q:7},{n:'Bonfanti Nicholas',pos:'ATT',q:7},{n:'Bozhinov Rosen',pos:'DIF',q:6},{n:'Calabresi Arturo',pos:'DIF',q:6},{n:'Zanon Simone',pos:'DIF',q:6},{n:'Vural Isak',pos:'CEN',q:5},{n:'Mbambi Jeremy',pos:'DIF',q:4},{n:'Lusuardi Mateus',pos:'DIF',q:3},{n:'Guizzo Tommaso',pos:'POR',q:1},{n:'Loria Leonardo',pos:'POR',q:1},{n:'Vukovic Ante',pos:'POR',q:1},{n:'Primasso Andrea',pos:'DIF',q:1},{n:'Bettazzi Brando',pos:'CEN',q:1},{n:'Maucci Giacomo',pos:'CEN',q:1},{n:'Vignato Emanuel',pos:'CEN',q:1},{n:'Buffon Louis',pos:'ATT',q:1},{n:'Giani Elia',pos:'ATT',q:1}],
    'Cesena': [{n:'Shpendi Cristian',pos:'ATT',q:47},{n:'Debenedetti Alessandro',pos:'ATT',q:18},{n:'Druiventak',pos:'CEN',q:11},{n:'Frabotta Gianluca',pos:'DIF',q:10},{n:'Fiori Antonio',pos:'ATT',q:10},{n:'Ciofi Andrea',pos:'DIF',q:9},{n:'Zaro Giovanni',pos:'DIF',q:8},{n:'Bisoli Dimitri',pos:'CEN',q:8},{n:'Gelli Jacopo',pos:'DIF',q:7},{n:'Ogunseye Roberto',pos:'ATT',q:7},{n:'Siano Alessandro',pos:'POR',q:4},{n:'Magni Vittorio',pos:'DIF',q:4},{n:'Mangraviti Massimiliano',pos:'DIF',q:4},{n:'Guidi Matteo',pos:'CEN',q:4},{n:'Pagano Riccardo',pos:'CEN',q:4},{n:'Tosku Frederik',pos:'ATT',q:4},{n:'Natta Mark',pos:'DIF',q:3},{n:'Arrigoni Tommaso',pos:'CEN',q:3},{n:'Caprini Daniel',pos:'CEN',q:3},{n:'Francesconi Matteo',pos:'CEN',q:3},{n:'Schirone Luca',pos:'CEN',q:3},{n:'David Antonio',pos:'DIF',q:2},{n:'Kebbeh Mamadou',pos:'DIF',q:2},{n:'Piacentini Matteo',pos:'DIF',q:2},{n:'Castagnetti Michele',pos:'CEN',q:2},{n:'Olivieri Edoardo',pos:'CEN',q:2},{n:'Zamagni Davide',pos:'CEN',q:2},{n:'Galvagno Filippo',pos:'ATT',q:2},{n:'Ferretti Luca',pos:'POR',q:1},{n:'Fontana Niccolo',pos:'POR',q:1},{n:'Gianfanti Simone',pos:'POR',q:1},{n:'Klinsmann Jonathan',pos:'POR',q:1},{n:'Domeniconi Riccardo',pos:'DIF',q:1},{n:'Pieraccini Simone',pos:'DIF',q:1},{n:'Pitti Enea',pos:'DIF',q:1},{n:'Giovannini Alessandro',pos:'CEN',q:1},{n:'Papa Wade Ibrahima',pos:'CEN',q:1},{n:'Bertaccini Filippo',pos:'ATT',q:1}],
    'Juve Stabia': [{n:'Di Nardo Antonio',pos:'ATT',q:26},{n:'Candellone Leonardo',pos:'ATT',q:23},{n:'Boer Pietro',pos:'POR',q:12},{n:'Karic Nermin',pos:'CEN',q:12},{n:'Bettella Davide',pos:'DIF',q:10},{n:'Patane Nicola',pos:'CEN',q:10},{n:'Matheus dos Santos',pos:'ATT',q:10},{n:'Piscopo Kevin',pos:'ATT',q:9},{n:'Bellich Marco',pos:'DIF',q:8},{n:'Buglio Davide',pos:'CEN',q:8},{n:'Ricciardi Manuel',pos:'DIF',q:7},{n:'Artioli Federico',pos:'CEN',q:5},{n:'Pierobon Christian',pos:'CEN',q:5},{n:'Sandrucci Romeo',pos:'ATT',q:5},{n:'Scuderi Giulio',pos:'DIF',q:4},{n:'Battistella Thomas',pos:'CEN',q:4},{n:'Gallea Beidi',pos:'DIF',q:3},{n:'Andreoni Cristian',pos:'DIF',q:2},{n:'Douglas Terrence',pos:'DIF',q:2},{n:'Torrasi Emanuele',pos:'CEN',q:2},{n:'Caccavo Luigi',pos:'ATT',q:2},{n:'Vetro Antonio',pos:'POR',q:1},{n:'Baldi Matteo',pos:'DIF',q:1},{n:'D\'Amore Francesco',pos:'DIF',q:1},{n:'Kassama Sheriff',pos:'DIF',q:1},{n:'Louati Alessandro',pos:'CEN',q:1},{n:'Meli Marco',pos:'CEN',q:1},{n:'Perin Daniel',pos:'CEN',q:1},{n:'Morachioli Gregorio',pos:'ATT',q:1},{n:'Petrovic Tomi',pos:'ATT',q:1},{n:'Piovanello Enrico',pos:'ATT',q:1}],
    'Sudtirol': [{n:'Merkaj Olger',pos:'ATT',q:29},{n:'Casiraghi Daniele',pos:'CEN',q:21},{n:'Plizzari Alessandro',pos:'POR',q:14},{n:'Molina Salvatore',pos:'CEN',q:13},{n:'Okoro Alvin Obinna',pos:'CEN',q:13},{n:'Vasic Aljosa',pos:'ATT',q:13},{n:'Bjarkason Bjarki',pos:'CEN',q:12},{n:'Giorgini Andrea',pos:'DIF',q:11},{n:'Burnete Rares',pos:'CEN',q:9},{n:'Rispoli Fabio',pos:'CEN',q:8},{n:'Tait Fabian',pos:'CEN',q:8},{n:'Mixtur Kenny',pos:'ATT',q:8},{n:'Adamonis Marius',pos:'POR',q:7},{n:'Veroli Davide',pos:'DIF',q:7},{n:'Vasco Lopez',pos:'ATT',q:7},{n:'Stivanello Riccardo',pos:'DIF',q:6},{n:'Tronchin Simone',pos:'CEN',q:6},{n:'Davi Simone',pos:'DIF',q:5},{n:'Veseli Frederic',pos:'DIF',q:5},{n:'El Kaouakibi Hamza',pos:'DIF',q:4},{n:'Zeroli Kevin',pos:'CEN',q:4},{n:'Davi Federico',pos:'DIF',q:3},{n:'Pyyhtia Niklas',pos:'CEN',q:3},{n:'Pietrangeli Nicola',pos:'DIF',q:2},{n:'Sabatini Carlo',pos:'DIF',q:2},{n:'Varnier Marco',pos:'DIF',q:2},{n:'Drago Giacomo',pos:'POR',q:1},{n:'Theiner Daniel',pos:'POR',q:1},{n:'Rottensteiner Benedikt',pos:'DIF',q:1},{n:'Stabile Giacomo',pos:'DIF',q:1},{n:'Vimercati Alessandro',pos:'DIF',q:1},{n:'Brik Dhirar',pos:'CEN',q:1},{n:'Frigerio Marco',pos:'CEN',q:1}],
    'Carrarese': [{n:'Abiuso Fabio',pos:'ATT',q:30},{n:'Finotto Mattia',pos:'ATT',q:20},{n:'Cisse Moustapha',pos:'ATT',q:13},{n:'Marconi Giacomo',pos:'ATT',q:11},{n:'Bleve Marco',pos:'POR',q:10},{n:'Pizzignacco Semuel',pos:'POR',q:10},{n:'Dagba Colin',pos:'DIF',q:9},{n:'Rouhi Jonas',pos:'DIF',q:9},{n:'Ruggeri Fabio',pos:'DIF',q:9},{n:'Romani Lorenzo',pos:'DIF',q:8},{n:'Belloni Niccolo',pos:'CEN',q:8},{n:'Schiavi Nicolas',pos:'CEN',q:8},{n:'Oliana Filippo',pos:'DIF',q:6},{n:'Parlanti Gabriele',pos:'DIF',q:6},{n:'Pinelli Pietro',pos:'CEN',q:6},{n:'Khafi Yanis',pos:'CEN',q:5},{n:'Reale Filippo',pos:'DIF',q:4},{n:'Salomon Bartosz',pos:'DIF',q:4},{n:'Topalovic Luka',pos:'CEN',q:4},{n:'Esteves Goncalo',pos:'DIF',q:2},{n:'Guercio Tommaso',pos:'DIF',q:2},{n:'Martini Jacopo',pos:'CEN',q:2},{n:'Fiorillo Vincenzo',pos:'POR',q:1},{n:'Garofani Giovanni',pos:'POR',q:1},{n:'Mazzini Stefano',pos:'POR',q:1},{n:'Bouah Devid Eugene',pos:'DIF',q:1},{n:'Capezzi Leonardo',pos:'CEN',q:1},{n:'Liberati Filippo',pos:'CEN',q:1},{n:'Melegoni Filippo',pos:'CEN',q:1},{n:'Rubino Tommaso',pos:'CEN',q:1},{n:'Torregrossa Ernesto',pos:'ATT',q:1}],
    'Mantova': [{n:'Gliozzi Ettore',pos:'ATT',q:40},{n:'Vlahović Vanja',pos:'ATT',q:25},{n:'Mancuso Leonardo',pos:'ATT',q:17},{n:'Ruocco Francesco',pos:'CEN',q:16},{n:'Bardi Francesco',pos:'POR',q:12},{n:'Mensah David',pos:'CEN',q:11},{n:'Silva Jonathan',pos:'CEN',q:11},{n:'Bragantini Davide',pos:'ATT',q:11},{n:'Benaissa Fahem',pos:'DIF',q:10},{n:'Cella Stefano',pos:'DIF',q:9},{n:'Tomasevic Bodin',pos:'DIF',q:9},{n:'Castellini Alessio',pos:'DIF',q:8},{n:'Ignacchiti Lorenzo',pos:'CEN',q:7},{n:'Meroni Andrea',pos:'DIF',q:5},{n:'Ilie Rares',pos:'CEN',q:5},{n:'Kouda Rachid',pos:'CEN',q:5},{n:'Maggioni Tommaso',pos:'DIF',q:4},{n:'Baraldi Stefano',pos:'CEN',q:4},{n:'Keita Sambaly',pos:'CEN',q:4},{n:'Trimboli Simone',pos:'CEN',q:4},{n:'Vesentini Filippo',pos:'CEN',q:4},{n:'Wieser David',pos:'CEN',q:3},{n:'Marai Cristian',pos:'DIF',q:2},{n:'Radaelli Nicolo',pos:'DIF',q:2},{n:'Cajazzo Ismael',pos:'CEN',q:2},{n:'Majer Zan',pos:'CEN',q:2},{n:'Gemello Luca',pos:'POR',q:1},{n:'Fedel Giacomo',pos:'CEN',q:1},{n:'Paoletti Flavio',pos:'CEN',q:1},{n:'Bellini Mattia',pos:'ATT',q:1},{n:'Chinetti Federico',pos:'ATT',q:1},{n:'Spinacce Matteo',pos:'ATT',q:1}],
    'Padova': [{n:'Bortolussi Mattia',pos:'ATT',q:24},{n:'Lasagna Kevin',pos:'ATT',q:22},{n:'Caprari Gianluca',pos:'ATT',q:20},{n:'Zanimacchia Luca',pos:'CEN',q:18},{n:'Zuelli Emanuele',pos:'CEN',q:15},{n:'Gomez Papu',pos:'ATT',q:15},{n:'Moro Luca',pos:'ATT',q:15},{n:'Buonaiuto Cristian',pos:'ATT',q:13},{n:'Sorrentino Alessandro',pos:'POR',q:12},{n:'Di Mariano Francesco',pos:'ATT',q:12},{n:'Capelli Alessandro',pos:'CEN',q:11},{n:'Fusi Paolo',pos:'CEN',q:11},{n:'Pompetti Marco',pos:'DIF',q:10},{n:'Dellavalle Alessandro',pos:'DIF',q:7},{n:'Lovato Matteo',pos:'DIF',q:7},{n:'Varas Kevin',pos:'CEN',q:7},{n:'Pastina Christian',pos:'DIF',q:6},{n:'Sgarbi Filippo',pos:'DIF',q:6},{n:'Giunti Giovanni',pos:'CEN',q:5},{n:'Faedo Carlo',pos:'DIF',q:3},{n:'Favale Giulio',pos:'DIF',q:3},{n:'Seghetti Alessandro',pos:'ATT',q:3},{n:'Barreca Antonio',pos:'DIF',q:2},{n:'Marcolini Diego',pos:'CEN',q:2},{n:'Mouquet Louis',pos:'POR',q:1},{n:'Bacci Jacopo',pos:'CEN',q:1},{n:'Lo Biudo Emiliano',pos:'ATT',q:1}],
    'Ascoli': [{n:'Brunori Matteo Sandri',pos:'ATT',q:35},{n:'Chakir Mohamed',pos:'ATT',q:21},{n:'D\'Uffizi Simone',pos:'ATT',q:17},{n:'Vitale Samuele',pos:'POR',q:13},{n:'De Pieri Giacomo',pos:'ATT',q:11},{n:'Corradini Giovanni',pos:'CEN',q:9},{n:'Guiebre Abdoul',pos:'CEN',q:9},{n:'Silipo Andrea',pos:'CEN',q:9},{n:'Gori Gabriele',pos:'ATT',q:9},{n:'Curado Marcos',pos:'DIF',q:6},{n:'Rizzo Nicholas',pos:'DIF',q:6},{n:'Acampora Gennaro',pos:'CEN',q:6},{n:'Milanese Tommaso',pos:'CEN',q:6},{n:'Perciun Sergiu',pos:'CEN',q:6},{n:'Damiani Samuele',pos:'CEN',q:5},{n:'Lo Scalzo Luca',pos:'CEN',q:4},{n:'Menna Damiano',pos:'DIF',q:3},{n:'Nicoletti Manuel',pos:'DIF',q:3},{n:'Oliveri Andrea',pos:'CEN',q:3},{n:'Barosi Davide',pos:'POR',q:1},{n:'Brzan Rok',pos:'POR',q:1},{n:'Crespi Gian Marco',pos:'POR',q:1},{n:'Dente Rocco',pos:'POR',q:1},{n:'Raffaelli Matteo',pos:'POR',q:1},{n:'Alagna Manuel',pos:'DIF',q:1},{n:'Dente Gerardo',pos:'DIF',q:1},{n:'De Witt Francesco',pos:'CEN',q:1},{n:'Del Sole Ferdinando',pos:'CEN',q:1},{n:'Rama Alex',pos:'CEN',q:1}],
    'Avellino': [{n:'Cheddira Walid',pos:'ATT',q:37},{n:'Biasci Tommaso',pos:'ATT',q:28},{n:'Fila Daniel',pos:'ATT',q:19},{n:'Palumbo Martin',pos:'CEN',q:15},{n:'Besaggio Michele',pos:'CEN',q:14},{n:'Martinelli Tommaso',pos:'POR',q:11},{n:'Sounas Dimitrios',pos:'CEN',q:11},{n:'Russo Raffaele',pos:'ATT',q:11},{n:'Izzo Armando',pos:'DIF',q:9},{n:'Simic Lorenco',pos:'DIF',q:9},{n:'Favilli Andrea',pos:'ATT',q:9},{n:'Cancellotti Tommaso',pos:'DIF',q:8},{n:'Enrici Patrick',pos:'DIF',q:8},{n:'Palmiero Luca',pos:'CEN',q:7},{n:'Aloisi Antonio',pos:'DIF',q:6},{n:'Moruzzi Brando',pos:'DIF',q:5},{n:'Di Maggio Luca',pos:'CEN',q:5},{n:'Insigne Roberto',pos:'ATT',q:5},{n:'Patierno Cosimo',pos:'ATT',q:5},{n:'Manzi Claudio',pos:'DIF',q:3},{n:'Maisto Francesco',pos:'CEN',q:3},{n:'Sala Marco',pos:'DIF',q:2},{n:'Iannarilli Antony',pos:'POR',q:1},{n:'Di Martino Leo',pos:'DIF',q:1},{n:'Arzillo Vincenzo',pos:'CEN',q:1},{n:'Della Rocca Mattia',pos:'CEN',q:1},{n:'Faticanti Giacomo',pos:'CEN',q:1},{n:'Mutanda Noah',pos:'CEN',q:1},{n:'Pandolfi Luca',pos:'ATT',q:1}],
    'Benevento': [{n:'Okereke David',pos:'ATT',q:24},{n:'Lamesta Davide',pos:'ATT',q:19},{n:'Salvemini Francesco',pos:'ATT',q:18},{n:'Tumminello Marco',pos:'ATT',q:17},{n:'Verdi Simone',pos:'CEN',q:14},{n:'Vannucchi Gianmarco',pos:'POR',q:12},{n:'Scognamillo Stefano',pos:'DIF',q:11},{n:'Cherubini Luigi',pos:'CEN',q:11},{n:'Beruatto Pietro',pos:'DIF',q:8},{n:'Maita Mattia',pos:'CEN',q:8},{n:'Giugliano Marco',pos:'ATT',q:8},{n:'Pierozzi Edoardo',pos:'DIF',q:7},{n:'Sernicola Leonardo',pos:'DIF',q:7},{n:'Mignani Guglielmo',pos:'ATT',q:7},{n:'Caldirola Luca',pos:'DIF',q:6},{n:'Saio Pietro',pos:'DIF',q:6},{n:'Kouan Christian',pos:'CEN',q:6},{n:'Prisco Antonio',pos:'CEN',q:6},{n:'Siatounis Antonis',pos:'CEN',q:5},{n:'Talia Angelo',pos:'CEN',q:5},{n:'Dalle Mura Christian',pos:'DIF',q:4},{n:'Battista Vincenzo',pos:'ATT',q:3},{n:'Celia Raffaele',pos:'DIF',q:2},{n:'Romano Raffaele',pos:'DIF',q:2},{n:'Esposito Manuel',pos:'POR',q:1},{n:'Mandato Francesco',pos:'POR',q:1},{n:'Russo Danilo',pos:'POR',q:1},{n:'Sylla Cheikh Alioune',pos:'POR',q:1},{n:'Ferrara Antonio',pos:'DIF',q:1},{n:'Ricci Giacomo',pos:'DIF',q:1},{n:'Carfora Lorenzo',pos:'CEN',q:1},{n:'Donatiello Matteo',pos:'CEN',q:1},{n:'Mehic Dino',pos:'CEN',q:1},{n:'Nardi Filippo',pos:'CEN',q:1},{n:'Pinato Marco',pos:'CEN',q:1},{n:'Schimmenti Emanuele',pos:'CEN',q:1},{n:'Simonetti Pier Luigi',pos:'CEN',q:1},{n:'Cantisani Raffaele',pos:'ATT',q:1},{n:'Logan Gaspar',pos:'ATT',q:1},{n:'Manconi Jacopo',pos:'ATT',q:1}],
    'Vicenza': [{n:'Moncini Gabriele',pos:'ATT',q:42},{n:'Rauti Nicola',pos:'ATT',q:20},{n:'Merkaj Silvio',pos:'ATT',q:17},{n:'Valoti Mattia',pos:'CEN',q:15},{n:'Morra Claudio',pos:'ATT',q:13},{n:'Gagno Riccardo',pos:'POR',q:11},{n:'Corazza Tommaso',pos:'DIF',q:10},{n:'Carraro Marco',pos:'CEN',q:10},{n:'Pellizzari Giulio',pos:'CEN',q:9},{n:'Pietrelli Alessandro',pos:'CEN',q:9},{n:'Zonta Loris',pos:'CEN',q:9},{n:'Alessio Filippo',pos:'ATT',q:9},{n:'Costa Filippo',pos:'DIF',q:8},{n:'Cuomo Giuseppe',pos:'DIF',q:7},{n:'Leverbe Maxime',pos:'DIF',q:6},{n:'Brighenti Nicolo',pos:'DIF',q:5},{n:'Caferri Lorenzo',pos:'DIF',q:5},{n:'Marchizza Riccardo',pos:'DIF',q:5},{n:'Cavion Michele',pos:'CEN',q:5},{n:'Vitale Mattia',pos:'CEN',q:5},{n:'Sandon Thomas',pos:'DIF',q:4},{n:'Vescovi Matteo',pos:'DIF',q:3},{n:'Rada Armand',pos:'CEN',q:3},{n:'Talarico Raul',pos:'CEN',q:3},{n:'Della Morte Matteo',pos:'DIF',q:2},{n:'Bagheria Filippo',pos:'POR',q:1},{n:'Basso Mattia',pos:'POR',q:1},{n:'Massolo Samuele',pos:'POR',q:1},{n:'Tsadjout Frank',pos:'ATT',q:1}],
    'Arezzo': [{n:'Cerri Alberto',pos:'ATT',q:21},{n:'Dezi Jacopo',pos:'CEN',q:15},{n:'Tavernelli Camillo',pos:'ATT',q:15},{n:'Nunziante Alessandro',pos:'POR',q:13},{n:'Ionita Artur',pos:'CEN',q:12},{n:'Arena Alessandro',pos:'ATT',q:11},{n:'Illanes Julian',pos:'DIF',q:9},{n:'Cortesi Matteo',pos:'ATT',q:9},{n:'Renzi Alessandro',pos:'CEN',q:8},{n:'Righetti Samuele',pos:'DIF',q:7},{n:'Cianci Pietro',pos:'ATT',q:7},{n:'Pattarello Emiliano',pos:'ATT',q:7},{n:'De Col Filippo',pos:'DIF',q:6},{n:'Moreschini Patrick',pos:'ATT',q:6},{n:'Gilli Matteo',pos:'DIF',q:5},{n:'Sussi Samuele',pos:'ATT',q:5},{n:'Casarosa Matias',pos:'DIF',q:4},{n:'Chierico Luca',pos:'CEN',q:4},{n:'Manes Aleandro',pos:'CEN',q:4},{n:'Sala Mattia',pos:'CEN',q:4},{n:'Capello Alessandro',pos:'ATT',q:4},{n:'Chiosa Marco',pos:'DIF',q:3},{n:'Viviani Mattia',pos:'CEN',q:3},{n:'Coccia Lorenzo',pos:'DIF',q:2},{n:'Coppolaro Mauro',pos:'DIF',q:2},{n:'Ravasio Mario',pos:'ATT',q:2},{n:'Galli Amoris',pos:'POR',q:1},{n:'Seculin Andrea',pos:'POR',q:1},{n:'Trombini Luca',pos:'POR',q:1},{n:'Mena Marlon',pos:'DIF',q:1},{n:'Tito Fabio',pos:'DIF',q:1},{n:'Ferrara Gabriele',pos:'CEN',q:1},{n:'Mawuli Shaka',pos:'CEN',q:1},{n:'Sani Ettore',pos:'CEN',q:1},{n:'Concetti Mattia',pos:'ATT',q:1},{n:'Varela Djamanca',pos:'ATT',q:1}],
    'Entella': [{n:'Forte Francesco',pos:'ATT',q:30},{n:'Franzoni Andrea',pos:'CEN',q:27},{n:'Cuppone Luigi',pos:'ATT',q:23},{n:'Corona Giacomo',pos:'ATT',q:19},{n:'Tiritiello Andrea',pos:'DIF',q:13},{n:'Guiu Bernat',pos:'ATT',q:13},{n:'Di Mario Stefano',pos:'DIF',q:11},{n:'Parodi Luca',pos:'DIF',q:10},{n:'Casarotto Matteo',pos:'ATT',q:10},{n:'Colombi Simone',pos:'POR',q:9},{n:'Marconi Ivan',pos:'DIF',q:8},{n:'Squizzato Niccolo',pos:'CEN',q:8},{n:'Alborghetti Mattia',pos:'DIF',q:7},{n:'Turicchia Riccardo',pos:'DIF',q:6},{n:'Tirelli Mattia',pos:'ATT',q:6},{n:'Valori Mattia',pos:'CEN',q:5},{n:'Previtali Nicolas',pos:'DIF',q:4},{n:'Benedetti Leonardo',pos:'CEN',q:4},{n:'Matteazzi Ernesto',pos:'CEN',q:3},{n:'Del Frate Federico',pos:'POR',q:2},{n:'Motolese Mattia',pos:'DIF',q:2},{n:'Costa Gabriele',pos:'CEN',q:2},{n:'Siaulys Ovidijus',pos:'POR',q:1},{n:'Boccadamo Antonio',pos:'DIF',q:1},{n:'Mezzoni Francesco',pos:'DIF',q:1},{n:'Bariti Davide',pos:'CEN',q:1},{n:'Nichetti Marco',pos:'CEN',q:1},{n:'Traniello Andrea',pos:'ATT',q:1}],
  };

  /* ---------------- stadio + biglietti ---------------- */
  // cost = il prezzo per fare l'upgrade A quel livello da quello sotto.
  const STADIUM = [
    { cap: 3500, cost: 0 }, { cap: 6000, cost: 1.2e6 }, { cap: 10000, cost: 3e6 }, { cap: 18000, cost: 8e6 },
    { cap: 28000, cost: 20e6 }, { cap: 42000, cost: 55e6 }, { cap: 60000, cost: 130e6 }, { cap: 80000, cost: 260e6 },
    { cap: 100000, cost: 420e6 },
  ];
  // fanGrow: il prezzo dei biglietti modella quanto velocemente cresce la TIFOSERIA ogni
  // stagione. Prezzi bassi riempiono lo stadio e fanno crescere nuovi tifosi; i prezzi
  // premium spremono il pubblico che già hai e frenano la crescita (e la fanno calare
  // in una stagione negativa).
  const TICKETS = [
    { k: 'cheap', label: 'Popolare', mult: 0.75, sent: 3, demand: 1.08, fanGrow: 0.012, hint: 'I tifosi accorrono, la tifoseria cresce più in fretta' },
    { k: 'std', label: 'Standard', mult: 1.0, sent: 0, demand: 1.0, fanGrow: 0.005, hint: 'Il prezzo giusto' },
    { k: 'high', label: 'Alto', mult: 1.3, sent: -3, demand: 0.93, fanGrow: -0.003, hint: 'Più incasso a biglietto, la crescita rallenta' },
    { k: 'prem', label: 'Premium', mult: 1.6, sent: -6, demand: 0.85, fanGrow: -0.012, hint: 'Incasso massimo, la tifoseria si ferma' },
  ];

  /* ---------------- nomi ---------------- */
  // Ampio mix di provenienze (come una vera rosa di Serie A/B): italiani, spagnoli/
  // latinoamericani, portoghesi/brasiliani, francesi, africani, balcanici, scandinavi,
  // tedeschi/olandesi. Pool grande apposta, per evitare che gli stessi nomi tornino
  // sempre negli stessi due-tre giocatori.
  const FIRST = [
    'Marco', 'Luca', 'Matteo', 'Andrea', 'Davide', 'Simone', 'Alessandro', 'Francesco', 'Lorenzo', 'Gabriele',
    'Riccardo', 'Federico', 'Nicolò', 'Giacomo', 'Tommaso', 'Leonardo', 'Antonio', 'Giuseppe', 'Salvatore', 'Vincenzo',
    'Stefano', 'Roberto', 'Paolo', 'Fabio', 'Daniele', 'Emanuele', 'Cristian', 'Manuel', 'Samuele', 'Mattia',
    'Giovanni', 'Filippo', 'Alessio', 'Emiliano', 'Massimo', 'Pietro', 'Enrico', 'Angelo',
    'Diego', 'Pablo', 'Rafael', 'Sergio', 'Javier', 'Alvaro', 'Carlos', 'Fernando', 'Ricardo', 'Miguel',
    'Juan', 'Rodrigo', 'Adrian', 'Gonzalo',
    'Thiago', 'Pedro', 'Bruno', 'Gustavo', 'Vinicius', 'Joao', 'Tiago', 'Eduardo', 'Wesley', 'Anderson', 'Felipe',
    'Antoine', 'Hugo', 'Lucas', 'Mathis', 'Theo', 'Enzo', 'Kylian', 'Adama', 'Moussa', 'Mamadou',
    'Karim', 'Youssef', 'Ibrahim', 'Mohamed', 'Amadou', 'Sadio', 'Ousmane', 'Cheikh', 'Boubacar', 'Idrissa',
    'Kwame', 'Kofi', 'Emmanuel', 'Victor', 'Chidi', 'Emeka',
    'Marko', 'Luka', 'Ivan', 'Stefan', 'Nemanja', 'Milan', 'Dusan', 'Filip', 'Dario', 'Bojan',
    'Aleksandar', 'Vladimir', 'Andrei', 'Radu',
    'Erik', 'Jonas', 'Nils', 'Anders', 'Magnus', 'Henrik', 'Lars', 'Sven', 'Oscar', 'Viktor',
    'Kevin', 'Michael', 'Lukas', 'Maximilian', 'Julian', 'Niklas', 'Daan', 'Sem', 'Wout', 'Ruud',
  ];
  const LAST = [
    'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco',
    'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti',
    'Barbieri', 'Fontana', 'Santoro', 'Mariani', 'Rinaldi', 'Caruso', 'Ferrara', 'Galli', 'Martini', 'Leone',
    'Longo', 'Gentile', 'Villa', 'Ferro', 'Marchetti', 'Bellini', 'Monti', 'Vitale', 'Amato', 'Testa',
    'Martinez', 'Fernandez', 'Garcia', 'Sanchez', 'Rodriguez', 'Lopez', 'Gonzalez', 'Perez', 'Diaz', 'Alonso',
    'Torres', 'Ramirez', 'Ortiz',
    'Silva', 'Santos', 'Oliveira', 'Pereira', 'Carvalho', 'Fonseca', 'Ribeiro', 'Moreira', 'Teixeira', 'Almeida',
    'Dubois', 'Moreau', 'Laurent', 'Lefebvre', 'Girard', 'Bernard', 'Petit', 'Roux', 'Fournier', 'Mercier',
    'Nkomo', 'Diallo', 'Traore', 'Mensah', 'Okafor', 'Eze', 'Adeyemi', 'Kone', 'Toure', 'Camara',
    'Bakayoko', 'Diarra', 'Sow', 'Sarr', 'Ndiaye', 'Cisse',
    'Kovac', 'Novak', 'Jankovic', 'Petrovic', 'Ivanovic', 'Radovic', 'Dragic', 'Vukovic', 'Popescu', 'Ionescu',
    'Nagy', 'Kowalski', 'Nowak',
    'Jansen', 'Andersen', 'Nielsen', 'Hansen', 'Larsen', 'Karlsson', 'Eriksson', 'Johansson', 'Berg', 'Lund',
    'Muller', 'Schmidt', 'Weber', 'Wagner', 'Becker', 'Hoffmann', 'Bakker', 'Visser',
  ];
  const genName = () => pick(FIRST) + ' ' + pick(LAST);

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
  // Coppe europee: l'avversario è straniero, quindi non peschiamo dai nostri database
  // italiani ma generiamo un nome plausibile combinando un prefisso e una città europee.
  const EURO_CLUB_PREFIX = ['Dynamo', 'Slavia', 'Sporting', 'Real', 'Atletico', 'Union', 'Rapid', 'Steaua', 'Partizan', 'Spartak', 'Legia', 'CSKA', 'Olympique', 'Girondins', 'Racing', 'FC'];
  const EURO_CITIES = ['Praga', 'Varsavia', 'Vienna', 'Zagabria', 'Belgrado', 'Sofia', 'Bucarest', 'Atene', 'Lisbona', 'Porto', 'Bruges', 'Rotterdam', 'Basilea', 'Zurigo', 'Salisburgo', 'Copenaghen', 'Oslo', 'Stoccolma', 'Helsinki', 'Bratislava', 'Budapest', 'Istanbul', 'Mosca', 'Kiev'];
  const genEuroClub = () => pick(EURO_CLUB_PREFIX) + ' ' + pick(EURO_CITIES);
  function cupOpponentName(key, oppStr) { return key === 'euro' ? genEuroClub() : pickCoppaOpponent(oppStr); }

  /* ---------------- ruoli + marcatori ---------------- */
  // Ogni giocatore ha un ruolo che ne condiziona la probabilità di segnare: gli
  // attaccanti vanno in gol molto più spesso, i centrocampisti con moderazione, i
  // difensori raramente, i portieri quasi mai (un'autorete avversaria a parte).
  const POS_LABEL = { POR: 'Portiere', DIF: 'Difensore', CEN: 'Centrocampista', ATT: 'Attaccante' };
  const POS_SCORE_WEIGHT = { POR: 0.04, DIF: 1.1, CEN: 3.2, ATT: 8.5 };
  // Distribuzione "di base" di un ruolo in una rosa, prima di guardare ai bisogni della
  // squadra (portieri pochi, difensori e centrocampisti il grosso, attaccanti un po' meno).
  const POS_BASE_WEIGHT = { POR: 0.10, DIF: 0.35, CEN: 0.30, ATT: 0.25 };
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
  function pickMatchLineup(squad) {
    const rated = squad.map((p) => ({ p, eff: p.ovr * (p.formSeason || 1) * (0.82 + Math.random() * 0.36) }));
    const byPos = { POR: [], DIF: [], CEN: [], ATT: [] };
    rated.forEach((r) => { if (byPos[r.p.pos]) byPos[r.p.pos].push(r); });
    Object.keys(byPos).forEach((k) => byPos[k].sort((a, b) => b.eff - a.eff));
    const need = { POR: 1, DIF: 4, CEN: 3, ATT: 3 };
    const starters = new Set();
    Object.keys(need).forEach((k) => byPos[k].slice(0, need[k]).forEach((r) => starters.add(r.p.pid)));
    const target = Math.min(11, squad.length);
    if (starters.size < target) {
      rated.slice().sort((a, b) => b.eff - a.eff).forEach((r) => { if (starters.size < target) starters.add(r.p.pid); });
    }
    const bench = squad.filter((p) => !starters.has(p.pid));
    const subsCount = Math.min(bench.length, 1 + rnd(3));
    const subs = new Set(shuffle(bench.slice()).slice(0, subsCount).map((p) => p.pid));
    return { starters, subs };
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
  // Chi serve l'assist: i centrocampisti ne fanno di più di chiunque, gli attaccanti un
  // po' meno (spesso sono loro a essere serviti), i difensori raramente, i portieri quasi
  // mai. Non può essere lo stesso giocatore che ha segnato.
  const POS_ASSIST_WEIGHT = { POR: 0.03, DIF: 1.0, CEN: 3.4, ATT: 2.2 };
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
  // ---- crescita/calo dell'overall a fine stagione ----
  // Quanto ci si aspetta da un giocatore nel suo ruolo in una stagione da titolare fisso
  // (gol + 0.7 per assist): chi ha giocato meno partite viene giudicato su un'asticella
  // proporzionalmente più bassa (le sue presenze reali su quelle della squadra), non
  // sullo stesso metro di chi ha giocato sempre. Così un panchinaro che rende molto nelle
  // poche gare avute può crescere anche più di un titolare che ha deluso.
  const POS_PROD_BASELINE = { POR: 0, DIF: 2.5, CEN: 6, ATT: 12 };
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

  const SPONSOR_BRANDS = {
    community: ['Panetteria del Borgo', 'Assicurazioni del Porto', 'Latteria Locale', 'Birrificio Vecchio Mulino', 'Autofficina Collina'],
    standard: ['NordGate Energia', 'Corona Telecom', 'Vetro Vertice', 'Redline Logistica', 'Ancora Finanza'],
    betting: ['ScommettiBene', 'FortunaKick', 'GoalRush Casinò', 'BetNazione', 'SpinWin'],
    global: ['Atlas Global', 'Vantage Air', 'Nimbus Tech', 'Meridian Bank', 'Solaris Motori'],
  };

  /* ---------------- stato ---------------- */
  const MAX_SEASONS = 20;
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
  function spinPlayer(premium) {
    const d = divOf();
    let ovr = gaussInt(d.avg + (premium ? 6 : 1), 4);
    if (premium && Math.random() < 0.09) ovr += 5 + rnd(4);   // lo scout scopre un gioiello
    ovr = clamp(ovr, 40, 94);
    const age = premium && Math.random() < 0.35 ? 18 + rnd(5) : 19 + rnd(13);
    return { n: genName(), ovr, age, wage: wageFor(ovr), yrs: 3 + rnd(2), pid: newPid(), pos: randPos(), seasonGoals: 0, seasonAssists: 0, seasonCleanSheets: 0, seasonApps: 0 };
  }
  // Svincolati: nessun costo di cartellino, rating scarso per il livello, stipendi modesti.
  // Servono a portare un club in difficoltà al minimo di 16 giocatori, non a vincere partite.
  const freeAgent = () => { const d = divOf(); const ovr = clamp(d.avg - 13 + rnd(6), 40, 94); return { n: genName(), ovr, age: 24 + rnd(9), wage: roundWage(wageFor(ovr) * 0.7), yrs: 1 + rnd(2), pid: newPid(), pos: randPos(), seasonGoals: 0, seasonAssists: 0, seasonCleanSheets: 0, seasonApps: 0 }; };
  const MIN_SQUAD = 16;
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
    S.squad.forEach((p) => { if (p.yrs == null) p.yrs = 2 + rnd(2); if (p.pid == null) p.pid = newPid(); if (!p.pos) p.pos = randPos(); if (p.seasonGoals == null) p.seasonGoals = 0; if (p.seasonAssists == null) p.seasonAssists = 0; if (p.seasonCleanSheets == null) p.seasonCleanSheets = 0; if (p.seasonApps == null) p.seasonApps = 0; });
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

  // Colore del badge overall in base a quanto è alto: scarso (grigio) → discreto
  // (bianco) → buono (azzurro) → ottimo (verde) → fuoriclasse (oro), sulla scala
  // 40-94 usata dal gioco.
  function ovrTier(ovr) {
    if (ovr >= 85) return { c: 'var(--gold)', bg: 'rgba(255,210,74,.16)' };
    if (ovr >= 75) return { c: 'var(--good)', bg: 'rgba(40,217,160,.14)' };
    if (ovr >= 65) return { c: '#6fb3ff', bg: 'rgba(111,179,255,.14)' };
    if (ovr >= 55) return { c: 'var(--txt)', bg: 'rgba(255,255,255,.07)' };
    return { c: 'var(--muted)', bg: 'rgba(255,255,255,.04)' };
  }
  const ovrBadge = (ovr) => { const t = ovrTier(ovr); return `background:${t.bg};color:${t.c}`; };

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
  function resumeDynasty() {
    const s = loadSave(); if (!s) return;
    S = s;
    normSquad();
    const sc = S._screen || 'owBoardScreen';
    if (sc === 'owSeasonEndScreen' && S._end) { renderSeasonEnd(); }
    else if (sc === 'owSeasonScreen' && S.seasonActive) {
      show('owSeasonScreen'); $('owLog').innerHTML = '';
      (S.results || []).forEach(logMatch); renderHud(); renderCups();
      if (S.played === (gp() >> 1) && !S.winterDone) openWinter();
    }
    else { renderBoard(); }
  }

  /* ---------------- avvio + acquisizione ---------------- */
  // Non si sceglie più un club con un nome già dato: si sceglie una SITUAZIONE di
  // partenza (che tipo di presidenza sarà). Il nome del club lo decide chi gioca, nel
  // campo qui sopra, pre-compilato con un suggerimento a caso.
  const SITUATIONS = [
    { key: 'gigante', title: 'Gigante in declino', blurb: 'Una piazza che sogna ancora la Serie A: tanta tifoseria, casse quasi vuote.', strRange: [46, 54], budgetRange: [1.6e6, 2.3e6], stadiumTier: 1, stadiumChance: 0.7, fanbaseRange: [1.15, 1.35] },
    { key: 'piccola', title: 'Piccola realtà solida', blurb: 'Pochi tifosi ma conti sempre in ordine: un progetto costruito con pazienza.', strRange: [42, 50], budgetRange: [2.8e6, 3.9e6], stadiumTier: 0, stadiumChance: 0, fanbaseRange: [0.85, 1.0] },
    { key: 'matricola', title: 'Matricola ambiziosa', blurb: 'Presidente facoltoso, fame di categoria superiore: il budget più alto sul tavolo.', strRange: [44, 52], budgetRange: [3.5e6, 4.6e6], stadiumTier: 0, stadiumChance: 0.2, fanbaseRange: [0.9, 1.05] },
    { key: 'provincia', title: 'Club di provincia stabile', blurb: 'Nessun lusso, ma né debiti né sorprese: si parte alla pari con tutti.', strRange: [43, 51], budgetRange: [2.2e6, 2.9e6], stadiumTier: 0, stadiumChance: 0, fanbaseRange: [0.95, 1.1] },
  ];
  let takeovers = null, selTakeover = -1;
  // Filtro/ordinamento della lista rosa in sala del consiglio: solo preferenza di vista,
  // non tocca lo stato di gioco.
  let squadRoleFilter = 'ALL', squadSortDesc = true;
  function genTakeovers() {
    return SITUATIONS.map((s) => ({
      key: s.key, title: s.title, blurb: s.blurb,
      str: s.strRange[0] + rnd(s.strRange[1] - s.strRange[0] + 1),
      budget: s.budgetRange[0] + Math.random() * (s.budgetRange[1] - s.budgetRange[0]),
      stadiumTier: Math.random() < s.stadiumChance ? s.stadiumTier : 0,
      fanbase: s.fanbaseRange[0] + Math.random() * (s.fanbaseRange[1] - s.fanbaseRange[0]),
    }));
  }
  function renderTakeovers() {
    const grid = $('takeoverGrid');
    grid.innerHTML = takeovers.map((t, i) => `
      <button type="button" class="ow-takeover ${selTakeover === i ? 'on' : ''}" data-i="${i}">
        <b>${t.title}</b>
        <small>${t.blurb}</small>
        <span class="ow-tk-row"><span>Budget</span><b>${fmtMoney(t.budget)}</b></span>
        <span class="ow-tk-row"><span>Stadio</span><b>${STADIUM[t.stadiumTier].cap.toLocaleString('it-IT')} posti</b></span>
        <span class="ow-tk-row"><span>Tifoseria</span><b>${t.fanbase >= 1.12 ? 'Ampia' : t.fanbase >= 1.0 ? 'Discreta' : 'Modesta'}</b></span>
      </button>`).join('');
    grid.querySelectorAll('.ow-takeover').forEach((el) => el.addEventListener('click', () => {
      selTakeover = +el.dataset.i;
      grid.querySelectorAll('.ow-takeover').forEach((x) => x.classList.toggle('on', +x.dataset.i === selTakeover));
    }));
  }
  function boot() {
    takeovers = genTakeovers(); renderTakeovers();
    if (!$('owClubName').value) $('owClubName').value = pick(POOLS[0]).n;   // suggerimento a caso, modificabile
    $('owRerollBtn').addEventListener('click', () => { takeovers = genTakeovers(); selTakeover = -1; renderTakeovers(); toast('Nuove condizioni di partenza sul tavolo.'); });
    $('owStartBtn').addEventListener('click', () => {
      if (selTakeover < 0) { toast('Scegli prima una situazione di partenza.'); return; }
      const go = () => startDynasty(($('owName').value || '').trim() || 'Il Presidente', takeovers[selTakeover], ($('owClubName').value || '').trim());
      if (!hasSave()) { go(); return; }
      overlay(`
        <h2>Iniziare una nuova carriera?</h2>
        <p>La carriera salvata andrà persa.</p>
        <div class="dyn-modal-actions">
          <button class="dyn-btn dyn-btn-primary" id="ovConfirmNew">Sì, ricomincia</button>
          <button class="dyn-btn" id="ovCancelNew">Annulla</button>
        </div>`);
      $('ovConfirmNew').onclick = () => { closeOverlay(); go(); };
      $('ovCancelNew').onclick = closeOverlay;
    });
    $('owContinueBtn').addEventListener('click', resumeDynasty);
    $('owHomeBtn').addEventListener('click', () => { saveGame(); location.href = 'index.html'; });
    if (hasSave()) { $('owContinueBtn').classList.remove('hidden'); $('owStartBtn').textContent = 'Inizia una nuova carriera'; $('owStartBtn').className = 'dyn-btn'; }
    window.addEventListener('pagehide', saveGame);
    $('owNextBtn').addEventListener('click', () => simMatch());
    $('owSimBtn').addEventListener('click', simToEnd);
    $('owTableBtn').addEventListener('click', showTable);
    $('owClubBtn').addEventListener('click', showClub);
  }
  function startDynasty(owner, t, customClub) {
    clearSave();
    const squad = [];
    for (let i = 0; i < 16; i++) { const ovr = clamp(gaussInt(t.str - 1, 3.5), 40, 55); squad.push({ n: genName(), ovr, age: 19 + rnd(12), wage: wageFor(ovr), yrs: 1 + rnd(3), pos: randPos(squad), seasonGoals: 0, seasonAssists: 0, seasonCleanSheets: 0, seasonApps: 0 }); }
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
    };
    normSquad();
    S.peakWorth = computeWorth();
    renderBoard();
  }

  /* ---------------- sala del consiglio ---------------- */
  function ladderHTML() {
    return `<div class="ow-ladder">${DIVS.map((d, i) => `<span class="ow-rung ${i === S.div ? 'on' : ''} ${i < S.div ? 'done' : ''}">${d.name}</span>`).join('<span class="ow-arrow">›</span>')}</div>`;
  }
  function meterHTML(label, v, warn) {
    const col = v >= 60 ? 'var(--dyn)' : v >= 35 ? 'var(--gold)' : 'var(--bad)';
    return `<div class="ow-meter"><span class="lbl">${label}</span><span class="bar"><span class="fill" style="width:${v}%;background:${col}"></span></span><span class="val" style="color:${col}">${Math.round(v)}${warn ? ' ⚠️' : ''}</span></div>`;
  }
  function renderBoard() {
    const d = divOf(), body = $('boardBody');
    normSquad();
    const fyCount = S.squad.filter(finalYear).length;
    if (!S.sponsorOpts && !S.sponsor) S.sponsorOpts = sponsorOffers();
    if (!S.mgrOpts) S.mgrOpts = [genManager(0), genManager(3), genManager(6)];
    const bill = kickoffBill();
    const free = freeToSpend();
    const broke = S.budget < bill;
    const worth = computeWorth(); S.peakWorth = Math.max(S.peakWorth, worth);
    const next = STADIUM[S.stadiumTier + 1];
    const squadFiltered = S.squad.slice()
      .filter((p) => squadRoleFilter === 'ALL' || p.pos === squadRoleFilter)
      .sort((a, b) => squadSortDesc ? b.ovr - a.ovr : a.ovr - b.ovr);
    const squadRows = squadFiltered.length ? squadFiltered.map((p) => {
      const fy = !p.loan && finalYear(p);
      return `
      <div class="ow-player${fy ? ' final' : ''}"><span class="ovr" style="${ovrBadge(p.ovr)}">${p.ovr}</span>
        <span class="postag postag-${p.pos}">${p.pos}</span>
        <span class="nm">${p.n}<small>età ${p.age}</small></span>
        ${p.loan ? '<span class="yy loan" title="Torna al suo club a fine stagione">prestito</span>' : `<span class="yy${fy ? ' fy' : ''}" title="Anni di contratto rimasti">${p.yrs}a</span>`}
        <span class="wg">${fmtWk(p.wage)}</span>
        ${fy ? `<button class="ow-renew" data-renew="${p.pid}" title="Offri un nuovo contratto">Rinnova</button>` : ''}
        ${p.loan ? '' : `<button class="ow-x" data-rel="${p.pid}" title="Vendi">💷</button>`}</div>`;
    }).join('') : '<div class="ow-sub" style="margin:10px 0">Nessun giocatore in questo ruolo.</div>';
    const estRevenue = estSeasonRevenue();
    body.innerHTML = `
      <div class="ow-stickybar">
        <div class="cell main"><span>Budget</span><b class="${S.budget < 0 ? 'bad' : ''}">${fmtMoney(S.budget)}</b></div>
        <div class="cell"><span>Costo d'avvio</span><b>${fmtMoney(bill)}</b></div>
        <div class="cell free"><span>Libero da spendere</span><b class="${free < 0 ? 'bad' : ''}">${fmtMoney(free)}</b></div>
      </div>
      <div class="dyn-top"><div class="dyn-top-title">La Sala del Consiglio</div><div class="dyn-top-sub">${S.owner} · ${S.club} · Stagione ${S.season} di ${MAX_SEASONS}</div></div>
      ${ladderHTML()}
      <div class="ow-sec ow-status">
        <div class="ow-bigmoney"><span>Valore del club</span><b>${fmtMoney(worth)}</b></div>
        <div class="ow-fin-row" style="padding:2px 0 6px"><span>Indice tifoseria (cresce con successo e prezzi equi)</span><b>${S.fanbase.toFixed(2)}</b></div>
        ${S.euro ? '<div class="ow-euroflag">' + EURO_COMPS[S.euroComp].flag + ' ' + EURO_COMPS[S.euroComp].name + ' questa stagione · grandi notti, grandi soldi</div>' : ''}
        ${meterHTML('Umore tifosi', S.sent, S.sent < 30)}
        ${meterHTML('Gradimento proprietario', S.ownerRating, S.ownerRating < 35)}
        ${S.ownerRating < 35 ? '<div class="ow-warn">⚠️ I tifosi ti vogliono fuori. Sotto 25 a fine stagione sarai costretto a dimetterti.</div>' : ''}
        ${S.debtSeasons ? '<div class="ow-warn">⚠️ Hai chiuso la scorsa stagione in rosso. Un\'altra stagione in debito significa amministrazione controllata.</div>' : ''}
      </div>
      <div class="ow-sec">
        <div class="ow-sec-title">📋 Bilancio di stagione</div>
        <div class="ow-fin-row"><span>Stipendi giocatori (${S.squad.length} giocatori, pagati all'avvio)</span><b>${fmtMoney(wageBill())}</b></div>
        <div class="ow-fin-row"><span>Stipendio allenatore (pagato all'avvio)</span><b>${fmtMoney(S.manager.salary)}</b></div>
        <div class="ow-fin-row total ${broke ? 'bad' : ''}"><span>Costo d'avvio</span><b>${fmtMoney(bill)}</b></div>
        <div class="ow-fin-row"><span>Ricavi di stagione (stima)</span><b>${fmtMoney(estRevenue)}</b></div>
        ${broke ? '<div class="ow-warn">⚠️ Ti mancano <b>' + fmtMoney(bill - S.budget) + '</b> per coprire il costo d\'avvio. Ricorda: gli spin spendono cassa anche se rifiuti il giocatore. Vendi giocatori (💷), prendi il bonus investitore o assumi un allenatore più economico prima dell\'inizio.</div>' : ''}
      </div>
      <div class="ow-sec">
        <div class="ow-sec-title">🧠 Allenatore</div>
        <div class="ow-mgr"><span class="ovr">${S.manager.rating}</span><span class="nm">${S.manager.n}<small>${fmtMoney(S.manager.salary)}/anno</small></span><span class="tag">In carica</span></div>
        <div class="ow-sub">Candidati (l'esonero paga il 30% di buonuscita):</div>
        ${S.mgrOpts.map((m, i) => `<div class="ow-mgr cand"><span class="ovr">${m.rating}</span><span class="nm">${m.n}<small>${fmtMoney(m.salary)}/anno</small></span><button class="dyn-mini ow-hire" data-hire="${i}">Assumi</button></div>`).join('')}
      </div>
      <div class="ow-sec">
        <div class="ow-sec-title">🤝 Sponsorizzazione</div>
        ${S.sponsor
          ? `<div class="ow-fin-row"><span>${S.sponsor.name} (${S.sponsor.left} ann${S.sponsor.left === 1 ? 'o' : 'i'} rimasti${S.sponsor.sent ? ', ' + (S.sponsor.sent > 0 ? 'i tifosi approvano' : 'i tifosi disapprovano') : ''})</span><b>${fmtMoney(S.sponsor.perYear)}/anno</b></div>`
          : `<div class="ow-sub">Nessuno sponsor di maglia. Scegli un accordo:</div>` + S.sponsorOpts.map((o, i) => `
            <button class="ow-offer" data-sp="${i}"><span class="info"><b>${o.name}</b><small>${o.years} anni${o.sent ? (o.sent > 0 ? ' · i tifosi approvano' : ' · i tifosi disapprovano') : ''}</small></span><span class="money">${fmtMoney(o.perYear)}/anno</span></button>`).join('')}
      </div>
      <div class="ow-sec">
        <div class="ow-sec-title">🏟️ Stadio + biglietti</div>
        <div class="ow-fin-row"><span>Capienza</span><b>${capOf().toLocaleString('it-IT')} posti</b></div>
        ${next ? `<button class="dyn-btn ow-upg" id="upgradeBtn" ${S.budget < next.cost ? 'disabled' : ''}>Amplia a ${next.cap.toLocaleString('it-IT')} posti · ${fmtMoney(next.cost)}</button>` : '<div class="ow-sub">Lo stadio è alla sua dimensione massima.</div>'}
        <div class="ow-sub" style="margin-top:10px">Prezzi biglietti (i tifosi reagiscono, la domanda cambia):</div>
        <div class="ow-tickets">${TICKETS.map((t, i) => `<button class="ow-ticket ${S.ticket === i ? 'on' : ''}" data-tk="${i}"><b>${t.label}</b><small>€${Math.round(d.ticket * t.mult)} medio · ${t.hint}</small></button>`).join('')}</div>
      </div>
      ${S.offers && S.offers.length ? `
      <div class="ow-sec">
        <div class="ow-sec-title">📨 Offerte di mercato</div>
        <div class="ow-sub">Club rivali vogliono i tuoi giocatori migliori. Incassa per una cifra, o rifiuta per tenere unita la rosa.</div>
        ${S.offers.map((o) => {
          const p = S.squad.find((x) => x.pid === o.pid); if (!p) return '';
          return `<div class="ow-bid">
            <div class="who"><span class="ovr" style="${ovrBadge(p.ovr)}">${p.ovr}</span><span class="nm">${p.n}<small>età ${p.age} · ${o.club} si fa avanti</small></span></div>
            <div class="act"><span class="fee">${fmtMoney(o.fee)}</span>
              <button class="dyn-mini ow-accept" data-acc="${o.pid}">Accetta</button>
              <button class="dyn-mini ow-reject" data-rej="${o.pid}">Rifiuta</button></div>
          </div>`;
        }).join('')}
      </div>` : ''}
      <div class="ow-sec">
        <div class="ow-sec-title">🎰 Rosa + spin</div>
        <div class="ow-sub">Rosa ${S.squad.length < MIN_SQUAD ? '<b style="color:var(--bad)">' + S.squad.length + ' su ' + MIN_SQUAD + ' giocatori necessari</b>' : S.squad.length + ' giocatori'} · rating <b>${squadStr()}</b> · media di categoria ${d.avg}${fyCount ? ' · <b style="color:var(--gold)">' + fyCount + ' in scadenza</b> (Rinnova o li perdi a zero)' : ''} · tocca 💷 per vendere</div>
        <div class="ow-spins">
          <button class="dyn-btn" id="spinStdBtn" ${S.budget < spinCostNow(false) ? 'disabled' : ''}>🎰 Spin giocatore · ${fmtMoney(spinCostNow(false))}</button>
          <button class="dyn-btn" id="spinPremBtn" ${S.budget < spinCostNow(true) ? 'disabled' : ''}>💎 Spin di lusso · ${fmtMoney(spinCostNow(true))}</button>
        </div>
        <div class="ow-sub" style="margin:0 0 8px">${S.spinsBought ? 'Affaticamento scout: i prezzi sono saliti perché hai già fatto ' + S.spinsBought + ' spin quest\'estate.' : 'Ogni spin di questa estate costa più del precedente.'}</div>
        <button class="dyn-btn ow-investor" id="freeAgentBtn">🖊️ Ingaggia uno svincolato · Gratis</button>
        ${!S.investorUsed ? `<button class="dyn-btn ow-investor" id="investorBtn">💼 Bonus investitore · +${fmtMoney(d.investor)}</button>` : ''}
        <div class="ow-squad-filters">
          ${['ALL', 'POR', 'DIF', 'CEN', 'ATT'].map((k) => `<button class="ow-filter-pill ${squadRoleFilter === k ? 'on' : ''}" data-role="${k}">${k === 'ALL' ? 'Tutti' : k}</button>`).join('')}
          <button class="ow-filter-pill ow-filter-sort" id="squadSortBtn" title="Ordina per overall">OVR ${squadSortDesc ? '▼' : '▲'}</button>
        </div>
        ${squadRoleFilter !== 'ALL' ? `<div class="ow-sub" style="margin:-4px 0 6px">${squadFiltered.length} di ${S.squad.length} giocatori</div>` : ''}
        <div class="ow-squadlist">${squadRows}</div>
      </div>
      <button class="dyn-btn dyn-btn-primary" id="startSeasonBtn">Inizia Stagione ${S.season} · ${d.name}</button>
      <div class="ow-exit-row">
        <button class="dyn-btn" id="sellBtn">💷 Vendi il club · ${fmtMoney(worth)}</button>
        <button class="dyn-btn" id="resignBtn">Dimettiti</button>
      </div>`;
    // colleghiamo tutto
    body.querySelectorAll('.ow-x').forEach((el) => el.addEventListener('click', () => {
      const i = S.squad.findIndex((x) => x.pid === +el.dataset.rel); const p = S.squad[i]; if (!p) return;
      const fee = Math.round(playerValue(p) * 0.3);
      S.squad.splice(i, 1); S.offers = (S.offers || []).filter((o) => o.pid !== p.pid); S.budget += fee;
      toast('Ceduto ' + p.n + ' per ' + fmtMoney(fee) + '.'); renderBoard(); saveGame();
    }));
    // Rinnova un contratto in scadenza: nuovi accordi (un aumento, più ripido per i giovani
    // talenti) oppure lo perdi a parametro zero.
    body.querySelectorAll('.ow-renew').forEach((el) => el.addEventListener('click', () => {
      const p = S.squad.find((x) => x.pid === +el.dataset.renew); if (!p) return;
      const nw = renewWage(p), ny = renewYears(p);
      overlay(`
        <h2>📝 Nuovo contratto</h2>
        <div class="ow-spin-card">
          <div class="big" style="color:${ovrTier(p.ovr).c}">${p.ovr}</div>
          <div class="nm">${p.n}</div>
          <div class="meta">età ${p.age} · guadagna <b>${fmtWk(p.wage)}</b>, ${p.yrs} ann${p.yrs === 1 ? 'o' : 'i'} rimasti</div>
          <div class="meta">Chiede <b>${fmtWk(nw)}</b> per <b>${ny} anni</b> · ${fmtMoney(nw * 52)}/anno</div>
          <div class="meta">Hai <b>${fmtMoney(freeToSpend())}</b> liberi dopo gli stipendi</div>
        </div>
        <div class="dyn-modal-actions">
          <button class="dyn-btn dyn-btn-primary" id="ovRenew">Accetta l'accordo</button>
          <button class="dyn-btn" id="ovNoRenew">Non ora</button>
        </div>`);
      $('ovRenew').onclick = () => { p.wage = nw; p.yrs = ny; closeOverlay(); toast(p.n + ' firma un nuovo contratto di ' + ny + ' anni.'); renderBoard(); saveGame(); };
      $('ovNoRenew').onclick = closeOverlay;
    }));
    // Accetta un'offerta: incassi la cifra, il giocatore parte. Vendere un vero big infastidisce l'ambiente.
    body.querySelectorAll('.ow-accept').forEach((el) => el.addEventListener('click', () => {
      const pid = +el.dataset.acc; const o = (S.offers || []).find((x) => x.pid === pid);
      const i = S.squad.findIndex((x) => x.pid === pid); if (!o || i < 0) return;
      const p = S.squad[i];
      S.budget += o.fee; S.squad.splice(i, 1); S.offers = S.offers.filter((x) => x.pid !== pid);
      if (p.ovr >= divOf().avg + 6) S.sent = clamp(S.sent - 3, 0, 100);
      toast('Venduto ' + p.n + ' al ' + o.club + ' per ' + fmtMoney(o.fee) + '.'); renderBoard(); saveGame();
    }));
    body.querySelectorAll('.ow-reject').forEach((el) => el.addEventListener('click', () => {
      const pid = +el.dataset.rej; const o = (S.offers || []).find((x) => x.pid === pid); if (!o) return;
      const p = S.squad.find((x) => x.pid === pid);
      S.offers = S.offers.filter((x) => x.pid !== pid);
      toast('Rifiuti l\'offerta del ' + o.club + (p ? ' per ' + p.n : '') + '.'); renderBoard(); saveGame();
    }));
    body.querySelectorAll('.ow-hire').forEach((el) => el.addEventListener('click', () => {
      const m = S.mgrOpts[+el.dataset.hire]; if (!m) return;
      const sev = Math.round(S.manager.salary * 0.3);
      if (S.budget < sev) { toast('Non puoi permetterti la buonuscita.'); return; }
      S.budget -= sev; S.manager = m; S.mgrOpts = null;
      toast(m.n + ' prende in carico la squadra. Buonuscita pagata: ' + fmtMoney(sev)); renderBoard(); saveGame();
    }));
    body.querySelectorAll('.ow-offer').forEach((el) => el.addEventListener('click', () => {
      const o = S.sponsorOpts[+el.dataset.sp]; if (!o) return;
      S.sponsor = o; S.sponsorOpts = null;
      toast('Firmato con ' + o.name + ' per ' + fmtMoney(o.perYear) + ' all\'anno.'); renderBoard(); saveGame();
    }));
    const upg = $('upgradeBtn');
    if (upg) upg.addEventListener('click', () => {
      const nx = STADIUM[S.stadiumTier + 1]; if (!nx || S.budget < nx.cost) return;
      spendGuard(nx.cost, 'L\'ampliamento', '', () => {
        S.budget -= nx.cost; S.stadiumTier++; S.stadiumSpent += nx.cost; S.sent = clamp(S.sent + 3, 0, 100);
        toast('Le ruspe entrano in azione. Nuova capienza: ' + nx.cap.toLocaleString('it-IT')); renderBoard(); saveGame();
      });
    });
    body.querySelectorAll('.ow-ticket').forEach((el) => el.addEventListener('click', () => { S.ticket = +el.dataset.tk; renderBoard(); saveGame(); }));
    const std = $('spinStdBtn'), prem = $('spinPremBtn');
    if (std) std.addEventListener('click', () => doSpin(false));
    if (prem) prem.addEventListener('click', () => doSpin(true));
    const fa = $('freeAgentBtn');
    if (fa) fa.addEventListener('click', () => {
      const p = freeAgent();
      overlay(`
        <h2>🖊️ Svincolato tesserato</h2>
        <div class="ow-spin-card">
          <div class="big" style="color:${ovrTier(p.ovr).c}">${p.ovr}</div>
          <div class="nm">${p.n} <span class="postag postag-${p.pos}" style="vertical-align:middle">${p.pos}</span></div>
          <div class="meta">${POS_LABEL[p.pos]} · età ${p.age} · ${fmtWk(p.wage)}</div>
        </div>
        <div class="dyn-modal-actions">
          <button class="dyn-btn dyn-btn-primary" id="ovFaOk">OK</button>
        </div>`);
      $('ovFaOk').onclick = () => {
        S.squad.push(p);
        closeOverlay();
        toast('Lo svincolato ' + p.n + ' si aggrega alla rosa.');
        renderBoard(); saveGame();
      };
    });
    const inv = $('investorBtn');
    if (inv) inv.addEventListener('click', () => {
      S.investorUsed = true; S.budget += divOf().investor;
      toast('Un investitore stacca un assegno: +' + fmtMoney(divOf().investor)); renderBoard(); saveGame();
    });
    body.querySelectorAll('[data-role]').forEach((el) => el.addEventListener('click', () => { squadRoleFilter = el.dataset.role; renderBoard(); }));
    const sortBtn = $('squadSortBtn');
    if (sortBtn) sortBtn.addEventListener('click', () => { squadSortDesc = !squadSortDesc; renderBoard(); });
    $('startSeasonBtn').addEventListener('click', startSeason);
    $('sellBtn').addEventListener('click', confirmSell);
    $('resignBtn').addEventListener('click', confirmResign);
    show('owBoardScreen'); saveGame();
  }
  function estSeasonRevenue() {
    const d = divOf(), t = TICKETS[S.ticket], ec = S.euro ? EURO_COMPS[S.euroComp] : null;
    const att = Math.min(capOf(), d.demand * S.fanbase * t.demand * (ec ? ec.attBoost : 1));
    const merch = d.demand * S.fanbase * d.ticket * 5;
    return Math.round(att * d.ticket * t.mult * (gp() / 2) + merch + d.prize + (S.sponsor ? S.sponsor.perYear : 0) + (ec ? ec.entry : 0) - (d.admin + S.stadiumSpent * 0.03));
  }
  // Controllo preventivo per le grandi spese: se l'acquisto lascerebbe la cassa sotto
  // il costo d'avvio (stipendi + allenatore), dillo IN NUMERI prima di prendere i soldi.
  function spendGuard(cost, label, extra, go) {
    const after = S.budget - cost, bill = kickoffBill();
    if (after >= bill) { go(); return; }
    overlay(`
      <h2>⚠️ Attenzione alla cassa</h2>
      <p>${label} costa <b>${fmtMoney(cost)}</b>, lasciando <b>${fmtMoney(after)}</b> in banca. Il costo d'avvio (stipendi + allenatore) è <b>${fmtMoney(bill)}</b>, quindi saresti <b>${fmtMoney(bill - after)}</b> corto per iniziare la stagione.${extra ? ' ' + extra : ''} Puoi vendere giocatori (💷) per recuperare.</p>
      <div class="dyn-modal-actions">
        <button class="dyn-btn dyn-btn-primary" id="ovGoAnyway">Fallo comunque</button>
        <button class="dyn-btn" id="ovHold">Aspetta</button>
      </div>`);
    $('ovGoAnyway').onclick = () => { closeOverlay(); go(); };
    $('ovHold').onclick = closeOverlay;
  }
  function doSpin(premium) {
    const cost = spinCostNow(premium);
    if (S.budget < cost) { toast('Budget non sufficiente.'); return; }
    spendGuard(cost, premium ? 'Uno spin di lusso' : 'Uno spin', 'I soldi dello spin si spendono anche se rifiuti il giocatore.', () => runSpin(premium, cost));
  }
  function runSpin(premium, cost) {
    const d = divOf();
    S.budget -= cost;
    S.spinsBought = (S.spinsBought || 0) + 1;
    const p = spinPlayer(premium);
    S._spin = p; saveGame();
    overlay(`
      <h2>${premium ? '💎 Lo scout torna' : '🎰 Lo scout torna'}</h2>
      <div class="ow-spin-card">
        <div class="big" style="color:${ovrTier(p.ovr).c}">${p.ovr}</div>
        <div class="nm">${p.n} <span class="postag postag-${p.pos}" style="vertical-align:middle">${p.pos}</span></div>
        <div class="meta">${POS_LABEL[p.pos]} · età ${p.age} · chiede <b>${fmtWk(p.wage)}</b> (${fmtMoney(p.wage * 52)}/anno)</div>
        <div class="meta">Hai <b>${fmtMoney(freeToSpend())}</b> liberi dopo gli stipendi</div>
        ${p.ovr >= d.avg + 7 ? '<div class="gem">⭐ Un colpo da titoli di giornale per questo livello</div>' : ''}
      </div>
      <div class="dyn-modal-actions">
        <button class="dyn-btn dyn-btn-primary" id="ovSign">Ingaggialo</button>
        <button class="dyn-btn" id="ovPass">Passa</button>
      </div>`);
    $('ovSign').onclick = () => {
      S.squad.push(p);
      if (p.ovr >= d.avg + 7) S.sent = clamp(S.sent + 2, 0, 100);
      S._spin = null; closeOverlay(); toast(p.n + ' firma.'); renderBoard(); saveGame();
    };
    $('ovPass').onclick = () => { S._spin = null; closeOverlay(); toast('Passi. I soldi dello spin sono spesi.'); renderBoard(); saveGame(); };
  }
  function confirmSell() {
    const worth = computeWorth();
    overlay(`
      <h2>💷 Vendi il club</h2>
      <p>Una cordata offre <b>${fmtMoney(worth)}</b> per ${S.club}. Vendere chiude qui la tua carriera.</p>
      <div class="dyn-modal-actions">
        <button class="dyn-btn dyn-btn-primary" id="ovSell">Vendi per ${fmtMoney(worth)}</button>
        <button class="dyn-btn" id="ovNo">Tieni il club</button>
      </div>`);
    $('ovSell').onclick = () => { closeOverlay(); endDynasty('sold', worth); };
    $('ovNo').onclick = closeOverlay;
  }
  function confirmResign() {
    overlay(`
      <h2>Dimettiti da presidente</h2>
      <p>Vuoi lasciare ${S.club} senza nient'altro che i ricordi? Il club non viene venduto, te ne vai e basta.</p>
      <div class="dyn-modal-actions">
        <button class="dyn-btn dyn-btn-primary" id="ovGo">Dimettiti</button>
        <button class="dyn-btn" id="ovNo">Resta</button>
      </div>`);
    $('ovGo').onclick = () => { closeOverlay(); endDynasty('resigned', 0); };
    $('ovNo').onclick = closeOverlay;
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
    S.seasonActive = true; S.winterDone = false; S.janSpinUsed = false;
    S.played = 0; S.pts = 0; S.gf = 0; S.ga = 0; S.wins = 0; S.results = []; S.last5 = []; S.form = 0;
    // Azzera le statistiche (valgono per la stagione in corso) e tira una "forma stagionale":
    // la maggior parte dei giocatori resta vicina alla norma, ma ogni tanto qualcuno esplode
    // (fino quasi al doppio della sua resa attesa) o vive un'annata opaca (anche la metà).
    S.squad.forEach((p) => { p.seasonGoals = 0; p.seasonAssists = 0; p.seasonCleanSheets = 0; p.seasonApps = 0; p.formSeason = clamp(1 + gaussInt(0, 28) / 100, 0.45, 1.9); });
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
    const row = { mw: fx.mw, opp: opp.name, home: fx.home, gf, ga, res, goalsFor, goalsAgainst };
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

  /* ---------------- mercato di gennaio ---------------- */
  function openWinter() {
    S._pause = true;
    const d = divOf(), janCost = Math.round(d.spin * 1.4);
    const cands = [genManager(2), genManager(5)];
    S._winterCands = cands;
    overlay(`
      <h2>❄️ Il mercato di gennaio</h2>
      <p>A metà strada. ${ord(currentPos())} in ${d.name}. Budget ${fmtMoney(S.budget)}.</p>
      ${!S.janSpinUsed ? `<button class="dyn-btn" id="ovJan" ${S.budget < janCost ? 'disabled' : ''}>🎰 Spin di gennaio · ${fmtMoney(janCost)}</button>` : ''}
      <div class="ow-sub" style="margin:10px 0 6px;text-align:left">Esonera ${S.manager.n} (30% di buonuscita) e nomina:</div>
      ${cands.map((m, i) => `<div class="ow-mgr cand"><span class="ovr">${m.rating}</span><span class="nm">${m.n}<small>${fmtMoney(m.salary)}/anno, metà pagata subito</small></span><button class="dyn-mini" data-wh="${i}">Assumi</button></div>`).join('')}
      <div class="dyn-modal-actions"><button class="dyn-btn dyn-btn-primary" id="ovPlayOn">Continua così</button></div>`);
    $('ovPlayOn').onclick = () => { S.winterDone = true; S._pause = false; closeOverlay(); saveGame(); if (S.played >= gp()) endSeason(); };
    const jan = $('ovJan');
    if (jan) jan.onclick = () => {
      if (S.budget < janCost) return;
      S.budget -= janCost; S.janSpinUsed = true;
      showJanCandidate(spinPlayer(false));
    };
    document.querySelectorAll('#owOverlayModal [data-wh]').forEach((el) => el.addEventListener('click', () => {
      const m = S._winterCands[+el.dataset.wh]; if (!m) return;
      const cost = Math.round(S.manager.salary * 0.3) + Math.round(m.salary * 0.5);
      if (S.budget < cost) { toast('Non puoi permetterti il cambio (buonuscita + metà stipendio).'); return; }
      S.budget -= cost; S.manager = m; toast(m.n + ' prende il timone a stagione in corso.');
      closeOverlay(); openWinter();
    }));
  }
  // Card del colpo di gennaio: prestito (economico, il giocatore torna al suo club a fine
  // stagione), acquisto (come un normale colpo di mercato: mezza stagione di stipendio più
  // un cartellino, resta in rosa) o cambia per pescare un altro candidato senza costo extra.
  function showJanCandidate(p) {
    const half = Math.round(p.wage * 26);
    const buyFee = Math.round(playerValue(p) * 0.6);
    const buyTotal = half + buyFee;
    overlay(`
      <h2>🎰 Colpo di gennaio</h2>
      <div class="ow-spin-card">
        <div class="big" style="color:${ovrTier(p.ovr).c}">${p.ovr}</div>
        <div class="nm">${p.n} <span class="postag postag-${p.pos}" style="vertical-align:middle">${p.pos}</span></div>
        <div class="meta">${POS_LABEL[p.pos]} · età ${p.age} · chiede <b>${fmtWk(p.wage)}</b></div>
      </div>
      <div class="dyn-modal-actions">
        <button class="dyn-btn dyn-btn-primary" id="ovLoan">🏷️ Prestito fino a giugno · ${fmtMoney(half)}</button>
        <button class="dyn-btn" id="ovBuy">💰 Acquisto a titolo definitivo · ${fmtMoney(buyTotal)}</button>
        <button class="dyn-btn" id="ovSwitch">🔄 Cambia giocatore</button>
        <button class="dyn-btn" id="ovPass">Passa</button>
      </div>`);
    $('ovLoan').onclick = () => {
      if (S.budget < half) { toast('Non puoi coprire il suo stipendio.'); return; }
      S.budget -= half; p.loan = true; S.squad.push(p);
      toast(p.n + ' arriva in prestito fino a fine stagione.');
      closeOverlay(); openWinter();
    };
    $('ovBuy').onclick = () => {
      if (S.budget < buyTotal) { toast('Non hai abbastanza per acquistarlo a titolo definitivo.'); return; }
      S.budget -= buyTotal; S.squad.push(p);
      toast(p.n + ' firma a titolo definitivo.');
      closeOverlay(); openWinter();
    };
    $('ovSwitch').onclick = () => { showJanCandidate(spinPlayer(false)); };
    $('ovPass').onclick = () => { toast('Passi su di lui.'); closeOverlay(); openWinter(); };
  }

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
    S.history.push({ season: S.season, div: d.name, pos, promoted, relegated, trophies, net, worth });
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
  function renderSeasonEnd() {
    const e = S._end, d = divOf(), body = $('owSeasonEndBody');
    const banner = e.fate === 'forced' ? ['😡 I tifosi hanno parlato', 'Gradimento troppo basso. Sei costretto a dimetterti.']
      : e.fate === 'admin' ? ['🏦 Amministrazione controllata', 'Due stagioni in rosso. La banca chiede i conti.']
      : e.promoted ? ['🎉 PROMOZIONE', e.playoff && e.playoff.won ? 'Su tramite i playoff dopo un ' + ord(e.pos) + ' posto!' : e.title ? 'Campioni di ' + d.name + '!' : 'Promossi al ' + ord(e.pos) + ' posto!']
      : e.playoff && !e.playoff.won ? ['💔 Delusione playoff', 'Eliminati in ' + (e.playoff.rounds.length > 1 ? 'finale' : 'semifinale') + ' playoff dopo un ' + ord(e.pos) + ' posto.']
      : e.relegated ? ['📉 Retrocessione', 'Giù al ' + ord(e.pos) + ' posto. I tifosi soffrono.']
      : e.title ? ['🏆 CAMPIONI', 'Vincitori di ' + d.name + '!']
      : ['Stagione ' + S.season + ' completata', ord(e.pos) + ' in ' + d.name + ' (i tifosi si aspettavano il ' + ord(e.exp) + ')'];
    const trophyChips = e.trophies.length ? e.trophies.map((t) => `<span class="trophy">🏆 ${t}</span>`).join('') : '<span class="trophy none">Nessun trofeo</span>';
    const playoffHTML = e.playoff ? `
        <div class="ow-sec-title" style="margin-top:12px">🏟️ I playoff</div>
        ${e.playoff.rounds.map((r) => {
          const usSc = fmtScorers(r.goalsFor), themSc = fmtScorers(r.goalsAgainst);
          return `<div class="ow-fin-row" style="flex-direction:column;align-items:stretch;gap:3px">
            <div style="display:flex;justify-content:space-between"><span>${r.stage} vs ${r.opp}</span><b class="${r.won ? 'good' : 'bad'}">${r.won ? 'V' : 'P'} ${r.gf}-${r.ga}${r.pens ? ' (rigori)' : ''}</b></div>
            ${(usSc || themSc) ? `<div class="mrow-scorers">${usSc ? '<div class="sc us">⚽ ' + usSc + '</div>' : ''}${themSc ? '<div class="sc them">🥅 ' + themSc + '</div>' : ''}</div>` : ''}
          </div>`;
        }).join('')}` : '';
    // Giocatori di movimento: marcatori, assistman e chiunque abbia comunque messo
    // piede in campo (anche solo da subentrato), non solo chi ha segnato o assistito. I
    // portieri hanno una statistica loro: i clean sheet, molto più significativi di un
    // gol che quasi non segnano mai.
    const scorers = S.squad.filter((p) => p.pos !== 'POR' && (p.seasonGoals > 0 || p.seasonAssists > 0 || p.seasonApps > 0))
      .sort((a, b) => b.seasonGoals - a.seasonGoals || b.seasonAssists - a.seasonAssists || (b.seasonApps || 0) - (a.seasonApps || 0) || b.ovr - a.ovr);
    const keepers = S.squad.filter((p) => p.pos === 'POR').sort((a, b) => (b.seasonApps || 0) - (a.seasonApps || 0) || (b.seasonCleanSheets || 0) - (a.seasonCleanSheets || 0) || b.ovr - a.ovr);
    const gkStarterPid = keepers.length ? keepers[0].pid : null;   // più presenze in stagione = titolare di fatto
    const topScorer = scorers.find((p) => p.seasonGoals > 0);
    // La variazione di overall della stagione appena chiusa: verde/su se è cresciuto,
    // rosso/giù se è calato, grigio se è rimasto stabile.
    const ovrDeltaHTML = (p) => {
      const d = p._ovrDelta || 0;
      const col = d > 0 ? 'var(--good)' : d < 0 ? 'var(--bad)' : 'var(--muted)';
      const arrow = d > 0 ? '▲' : d < 0 ? '▼' : '—';
      return `<span class="ovr-delta" style="color:${col}">${arrow}${Math.abs(d)}</span>`;
    };
    const appsHTML = (p) => `<span class="wg" style="font-size:12px" title="Presenze">🎽 ${p.seasonApps || 0}</span>`;
    const statsHTML = `
      <div class="ow-sec">
        <div class="ow-sec-title">📊 Statistiche giocatori</div>
        ${scorers.length ? `
          <div class="ow-sub">Marcatori e assist di ${S.club}${topScorer ? ' · capocannoniere ' + topScorer.n + ' (' + topScorer.seasonGoals + ')' : ''}</div>
          <div class="ow-squadlist" style="max-height:none">${scorers.map((p) => `
            <div class="ow-player">${ovrDeltaHTML(p)}<span class="ovr" style="${ovrBadge(p.ovr)}">${p.ovr}</span>
              <span class="postag postag-${p.pos}">${p.pos}</span>
              <span class="nm">${p.n}</span>
              <span class="wg" style="color:var(--gold);font-size:13px">⚽ ${p.seasonGoals || 0}</span>
              <span class="wg" style="font-size:13px">🅰️ ${p.seasonAssists || 0}</span>
              ${appsHTML(p)}</div>`).join('')}
          </div>` : '<div class="ow-sub">Nessun marcatore o assistman di rilievo questa stagione.</div>'}
        ${keepers.length ? `
          <div class="ow-sub" style="margin-top:10px">Portieri</div>
          <div class="ow-squadlist" style="max-height:none">${keepers.map((p) => `
            <div class="ow-player">${ovrDeltaHTML(p)}<span class="ovr" style="${ovrBadge(p.ovr)}">${p.ovr}</span>
              <span class="nm">${p.n}<small>${p.pid === gkStarterPid ? 'Titolare' : 'Riserva'}</small></span>
              <span class="wg" style="color:var(--good);font-size:13px">🧤 ${p.seasonCleanSheets || 0} clean sheet</span>
              ${appsHTML(p)}</div>`).join('')}
          </div>` : ''}
      </div>`;
    body.innerHTML = `
      <div class="dyn-top"><div class="dyn-top-title">${banner[0]}</div><div class="dyn-top-sub">${banner[1]}</div></div>
      <div class="dyn-panel">
        <div class="dyn-trophies">${trophyChips}</div>
        ${playoffHTML}
        <div class="ow-sec-title" style="margin-top:12px">📋 Bilancio economico</div>
        ${e.statement.map((r) => r[1] === 0 && r[0].indexOf('avvio') > 0 ? `<div class="ow-fin-row memo"><span>${r[0]}</span><b>già pagati</b></div>` : `<div class="ow-fin-row"><span>${r[0]}</span><b class="${r[1] < 0 ? 'bad' : ''}">${r[1] < 0 ? '-' : '+'}${fmtMoney(Math.abs(r[1]))}</b></div>`).join('')}
        <div class="ow-fin-row total"><span>Saldo di stagione</span><b class="${e.net < 0 ? 'bad' : ''}">${e.net < 0 ? '-' : '+'}${fmtMoney(Math.abs(e.net))}</b></div>
        <div class="ow-fin-row total"><span>Budget attuale</span><b class="${S.budget < 0 ? 'bad' : ''}">${fmtMoney(S.budget)}</b></div>
        <div class="ow-sec-title" style="margin-top:12px">📣 L'umore</div>
        ${e.sentItems.length ? e.sentItems.map((s) => `<div class="ow-fin-row"><span>${s[0]}</span><b class="${s[1] < 0 ? 'bad' : 'good'}">${s[1] > 0 ? '+' : ''}${s[1]}</b></div>`).join('') : '<div class="ow-sub">Un\'estate tranquilla in curva.</div>'}
        ${meterHTML('Umore tifosi', S.sent, S.sent < 30)}
        ${meterHTML('Gradimento (' + (e.ratingDelta >= 0 ? '+' : '') + e.ratingDelta + ')', S.ownerRating, S.ownerRating < 35)}
        <div class="ow-fin-row"><span>Indice tifoseria</span><b class="${(e.fbDelta || 0) < 0 ? 'bad' : 'good'}">${S.fanbase.toFixed(2)} (${(e.fbDelta || 0) >= 0 ? '+' : ''}${(e.fbDelta || 0).toFixed(2)})</b></div>
        ${e.euroQual ? '<div class="ow-fin-row"><span>' + EURO_COMPS[e.euroQual].flag + ' Qualificazione europea</span><b class="good">' + EURO_COMPS[e.euroQual].name + ' la prossima stagione</b></div>' : ''}
        <div class="ow-fin-row total" style="margin-top:10px"><span>Valore del club</span><b>${fmtMoney(e.worth)}</b></div>
      </div>
      ${statsHTML}
      <button class="dyn-btn dyn-btn-primary" id="owEndBtn">${e.fate ? 'Affronta le conseguenze' : S.season >= MAX_SEASONS ? 'Concludi la tua carriera' : 'Torna in sala del consiglio'}</button>`;
    $('owEndBtn').onclick = () => {
      if (e.fate === 'forced') { endDynasty('forced', 0); return; }
      if (e.fate === 'admin') { endDynasty('admin', 0); return; }
      if (S.season >= MAX_SEASONS) { endDynasty('retired', 0); return; }
      advance();
    };
    show('owSeasonEndScreen');
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
  function renderEnd() {
    const body = $('owEndBody'), how = S._how, worth = computeWorth();
    const heads = {
      sold: ['💷 VENDUTO', S.owner + ' vende ' + S.club + ' per ' + fmtMoney(S._sale) + ' dopo ' + (S.season) + ' stagion' + (S.season === 1 ? 'e' : 'i') + '.'],
      retired: ['🎖️ Venti stagioni', S.owner + ' lascia ' + S.club + ' dopo le ' + MAX_SEASONS + ' stagioni complete.'],
      resigned: ['Ti sei dimesso', S.owner + ' si dimette da presidente di ' + S.club + '.'],
      forced: ['😡 Cacciato', 'I tifosi hanno cacciato ' + S.owner + ' da ' + S.club + '.'],
      admin: ['🏦 Amministrazione controllata', S.club + ' ha finito i soldi sotto la tua gestione.'],
    };
    const h = heads[how] || heads.retired;
    const honours = [];
    const divShort = ['Eccellenza', 'Serie D', 'Serie C', 'Serie B', 'Serie A'];
    S.trophies.titles.forEach((n, i) => { if (n) honours.push(n + 'x Titolo ' + divShort[i]); });
    if (S.trophies.nat) honours.push(S.trophies.nat + 'x Coppa Italia');
    ['ucl', 'uel', 'conf'].forEach((k) => { if (S.trophies[k]) honours.push(S.trophies[k] + 'x ' + EURO_COMPS[k].name); });
    const topDiv = S.history.reduce((a, hh) => Math.max(a, DIVS.findIndex((x) => x.name === hh.div)), S.div);
    const promotions = S.history.filter((hh) => hh.promoted).length;
    body.innerHTML = `
      <div class="dyn-top"><div class="dyn-top-title">${h[0]}</div><div class="dyn-top-sub">${h[1]}</div></div>
      <div class="dyn-panel">
        <div class="pl-hero"><div class="big" style="font-size:56px">${fmtMoney(how === 'sold' ? S._sale : worth)}</div><div class="cap">${how === 'sold' ? 'PREZZO DI VENDITA' : 'VALORE FINALE DEL CLUB'}</div></div>
        <div class="dyn-trophies">${honours.length ? honours.map((x) => `<span class="trophy">🏆 ${x}</span>`).join('') : '<span class="trophy none">Nessun trofeo</span>'}</div>
        <div class="dyn-stat-row" style="grid-template-columns:1fr 1fr 1fr">
          <div class="dyn-stat"><span>Stagioni</span><b>${S.history.length}</b></div>
          <div class="dyn-stat"><span>Promozioni</span><b>${promotions}</b></div>
          <div class="dyn-stat"><span>Valore massimo</span><b>${fmtMoney(S.peakWorth)}</b></div>
        </div>
        <div class="dyn-verdict">Livello massimo: <b>${DIVS[Math.max(0, topDiv)].name}</b> · Stadio: <b>${capOf().toLocaleString('it-IT')} posti</b> · Trofei: <b>${S.trophies.total}</b></div>
      </div>
      <div class="pl-card" style="padding:14px 12px">
        <div class="dyn-top-sub" style="text-align:left;margin-bottom:8px">La storia, stagione per stagione</div>
        <div style="overflow-x:auto">
          <table class="dyn-table"><thead><tr><th>S</th><th>Categoria</th><th class="num">Pos</th><th class="num">Saldo</th><th class="num">Valore</th><th>Trofei</th></tr></thead>
          <tbody>${S.history.map((hh) => `<tr><td>${hh.season}${hh.promoted ? ' ⬆️' : hh.relegated ? ' ⬇️' : ''}</td><td>${hh.div}</td><td class="num">${hh.pos}</td><td class="num">${hh.net < 0 ? '-' : ''}${fmtMoney(Math.abs(hh.net))}</td><td class="num">${fmtMoney(hh.worth)}</td><td style="font-size:11px">${hh.trophies.length ? hh.trophies.join(', ') : '-'}</td></tr>`).join('')}</tbody></table>
        </div>
      </div>
      <button class="dyn-btn" id="owAgainBtn">Nuova carriera</button>
      <a class="dyn-back" href="index.html">Torna alla Dynasty</a>`;
    $('owAgainBtn').onclick = () => location.reload();
    show('owEndScreen');
  }

  /* ================= RENDER ================= */
  function show(id) {
    const el = $(id), wasHidden = el.classList.contains('hidden');
    document.querySelectorAll('.dyn-screen').forEach((s) => s.classList.add('hidden'));
    el.classList.remove('hidden');
    if (wasHidden) window.scrollTo(0, 0); // solo al cambio schermata: un re-render della stessa schermata non deve far saltare lo scroll in cima
    const tb = $('owTopbar'); if (tb) tb.classList.remove('hidden');
    if (S) { S._screen = id; saveGame(); }
  }
  function renderHud() {
    $('hudSeason').textContent = S.season + '/' + MAX_SEASONS;
    $('hudPlayed').textContent = S.played + '/' + gp();
    const pos = S.table ? (S.table.findIndex((t) => t.me) + 1) : 0;
    $('hudPos').textContent = pos ? ord(pos) : '-';
    $('hudPts').textContent = S.pts;
    $('owDivChip').textContent = divOf().name;
    $('owBudgetChip').querySelector('b').textContent = fmtMoney(S.budget);
    const pp = projectedPos();
    $('owProjChip').querySelector('b').textContent = pp ? ord(pp) : '-';
    $('owWorthChip').querySelector('b').textContent = fmtMoney(computeWorth());
    $('owNextBtn').disabled = !S.seasonActive || S.played >= gp();
    $('owSimBtn').disabled = !S.seasonActive || S.played >= gp();
    $('owNextBtn').textContent = S.played >= gp() ? 'Stagione completata' : 'Gioca prossima partita';
  }
  function renderCups() {
    const wrap = $('owCups'); if (!S.cups) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = Object.values(S.cups).map((c) => {
      const st = c.won ? 'win' : c.out ? 'out' : '';
      const label = c.won ? 'Vincitori' : c.out ? (c.rounds[c.at - 1] || 'Eliminati') : (c.at ? c.rounds[c.at - 1] : 'Iscritti');
      return `<span class="cup-pill ${st}">${c.name}: <b>${label}</b></span>`;
    }).join('');
  }
  function logMatch(m) {
    const row = document.createElement('div'); row.className = 'mrow';
    const usSc = fmtScorers(m.goalsFor), themSc = fmtScorers(m.goalsAgainst);
    const scorersHTML = (usSc || themSc) ? `<div class="mrow-scorers">
        ${usSc ? '<div class="sc us">⚽ ' + usSc + '</div>' : ''}
        ${themSc ? '<div class="sc them">🥅 ' + themSc + '</div>' : ''}
      </div>` : '';
    row.innerHTML = `<div class="mrow-mw">G${m.mw}</div>
      <div class="mrow-main"><div class="mrow-fix"><span class="ha">${m.home ? 'C' : 'T'}</span> vs ${m.opp}</div>${scorersHTML}</div>
      <div class="mrow-res ${m.res}">${m.gf}-${m.ga}</div>`;
    $('owLog').prepend(row);
  }
  function logCup(name, round, won, gf, ga, goalsFor, goalsAgainst, oppName) {
    const row = document.createElement('div'); row.className = 'mrow cup';
    const usSc = fmtScorers(goalsFor), themSc = fmtScorers(goalsAgainst);
    const scorersHTML = (usSc || themSc) ? `<div class="mrow-scorers">
        ${usSc ? '<div class="sc us">⚽ ' + usSc + '</div>' : ''}
        ${themSc ? '<div class="sc them">🥅 ' + themSc + '</div>' : ''}
      </div>` : '';
    row.innerHTML = `<div class="mrow-mw">${name.split(' ')[0]}</div>
      <div class="mrow-main"><div class="mrow-fix">${name} ${round}${oppName ? ' <span class="ha">vs ' + oppName + '</span>' : ''}</div><div class="mrow-you">${won ? (gf === ga ? 'Passa ai rigori' : 'Passa il turno') : (gf === ga ? 'Eliminato ai rigori' : 'Eliminato')}</div>${scorersHTML}</div>
      <div class="mrow-res ${won ? 'W' : 'L'}">${gf}-${ga}</div>`;
    $('owLog').prepend(row);
  }
  function computeTable() {
    const f = clamp(S.played / gp(), 0, 1);
    const rows = S.opps.map((o) => ({ name: o.name, pts: Math.round(o.pts * f), gd: Math.round((o.gf - o.ga) * f), me: false }));
    rows.push({ name: S.club, pts: S.pts, gd: S.gf - S.ga, me: true });
    rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd);
    S.table = rows;
  }
  function tableHTML() {
    const d = divOf();
    return `<table class="dyn-table"><thead><tr><th>Squadra</th><th class="num">Pt</th><th class="num">DR</th></tr></thead><tbody>${S.table.map((t, i) => {
      const zone = (d.euroSpots && i < d.euroSpots) ? 'ucl' : (d.uelPos && i === d.uelPos - 1) ? 'uel' : (d.confPos && i === d.confPos - 1) ? 'conf' : (d.promoted && i < d.promoted) ? 'ucl' : (d.playoff && i >= d.promoted && i < d.promoted + d.playoff) ? 'po' : (d.releg && i >= d.teams - d.releg) ? 'rel' : '';
      return `<tr class="${t.me ? 'me' : ''} ${zone}"><td>${i + 1}. ${t.name}</td><td class="num">${t.pts}</td><td class="num">${t.gd > 0 ? '+' : ''}${t.gd}</td></tr>`;
    }).join('')}</tbody></table>`;
  }
  function showTable() {
    computeTable();
    const d = divOf();
    const key = [d.euroSpots ? '<span style="color:var(--dyn)">▎Champions League</span>' : '', d.uelPos ? '<span style="color:var(--gold)">▎Europa League</span>' : '', d.confPos ? '<span style="color:var(--good)">▎Conference League</span>' : '', d.promoted ? '<span style="color:var(--dyn)">▎promozione</span>' : '', d.playoff ? '<span style="color:var(--gold)">▎playoff</span>' : '', d.releg ? '<span style="color:var(--bad)">▎retrocessione</span>' : ''].filter(Boolean).join(' &nbsp; ');
    overlay(`<h2>${d.name}</h2><div class="ow-sub" style="text-align:center">${key}</div><div style="max-height:62vh;overflow:auto;margin:-6px -6px 14px">${tableHTML()}</div><div class="dyn-modal-actions"><button class="dyn-btn dyn-btn-primary" id="ovClose">Chiudi</button></div>`);
    $('ovClose').onclick = closeOverlay;
  }
  function showClub() {
    const worth = computeWorth();
    overlay(`
      <h2>${S.club}</h2>
      <div class="ow-fin-row"><span>Budget</span><b>${fmtMoney(S.budget)}</b></div>
      <div class="ow-fin-row"><span>Valore del club</span><b>${fmtMoney(worth)}</b></div>
      <div class="ow-fin-row"><span>Stadio</span><b>${capOf().toLocaleString('it-IT')} posti</b></div>
      ${meterHTML('Umore tifosi', S.sent, S.sent < 30)}
      ${meterHTML('Gradimento proprietario', S.ownerRating, S.ownerRating < 35)}
      <div class="dyn-modal-actions" style="margin-top:12px">
        <button class="dyn-btn" id="ovSellNow">💷 Vendi per ${fmtMoney(worth)}</button>
        <button class="dyn-btn dyn-btn-primary" id="ovClose">Chiudi</button>
      </div>`);
    $('ovClose').onclick = closeOverlay;
    $('ovSellNow').onclick = () => { closeOverlay(); confirmSell(); };
  }

  /* ---------------- overlay / toast ---------------- */
  function overlay(html) { $('owOverlayModal').innerHTML = html; $('owOverlay').classList.remove('hidden'); }
  function closeOverlay() { $('owOverlay').classList.add('hidden'); }
  // Se arriva un nuovo toast mentre uno è ancora visibile, lo sostituisce subito (niente
  // coda che rallenta): resta comunque a schermo abbastanza a lungo da poterlo leggere.
  let toastT = null;
  function toast(msg) {
    const t = $('owToast');
    t.innerHTML = msg;
    t.classList.remove('hidden');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.add('hidden'), 3800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
