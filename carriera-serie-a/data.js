'use strict';
/* ============================================================
   Presidente · Serie A — data.js
   Dati statici del gioco: la piramide delle categorie, le rose reali usate
   come avversari, stadio/biglietti, i pool di nomi/nazionalità, i pesi per
   ruolo e le altre tabelle costanti. Nessuna logica di gioco né rendering:
   solo numeri e stringhe che sim.js e ui.js leggono.
   Caricato per primo (vedi index.html): sim.js e ui.js si aspettano che
   queste costanti esistano già nello scope globale.
   ============================================================ */

  /* ---------------- la piramide ---------------- */
  // Cinque categorie, dal basso in alto. teams determina il numero di giornate ((teams-1)*2).
  // avg = il rating medio tipico della squadra in quella categoria (gli spin sono centrati lì).
  // demand = quanti tifosi verrebbero a vedere un club ben gestito a prezzi standard.
  // prize = base premio TV/montepremi di stagione, perPlace = extra per posizione scalata,
  // promoBonus arriva quando sali FUORI dalla categoria (quello della Serie B è
  // il "salto più ricco del calcio"), spin/premium = costo spin a quel livello.
  // Promozione secondo il sistema italiano reale (adattato): `promoted` salgono
  // direttamente e i successivi `playoff` posti si giocano UN posto extra a fine
  // stagione. Con `playoff` a 4 è un tabellone da 4 (semifinale + finale); con
  // `playoff` a 6, come la vera Serie B, è un tabellone da 6 (quarti fra i due
  // semi più bassi in classifica, poi semifinale con le teste di serie 3°/4°
  // già qualificate, poi finale). Eccellenza: prime 2 dirette.
  // Serie D: prime 3 + playoff (4°-7°), ultime 2 retrocedono. Serie C: prime 2 +
  // playoff (3°-6°), ultime 4 giù. Serie B: prime 2 + playoff (3°-8°, come nella
  // vera Serie B), ultime 3 giù. Serie A: ultime 3 giù.
  const DIVS = [
    { name: 'Eccellenza', teams: 24, avg: 47, demand: 4200, ticket: 14, prize: 0.15e6, perPlace: 6e3, promoted: 2, playoff: 0, releg: 0, promoBonus: 0.6e6, titleBonus: 0.25e6, spin: 75e3, premium: 225e3, cupBase: 35e3, admin: 120e3, mgrBase: 52, investor: 300e3 },
    { name: 'Serie D', teams: 24, avg: 54, demand: 7500, ticket: 17, prize: 1.0e6, perPlace: 15e3, promoted: 3, playoff: 4, releg: 2, promoBonus: 1.2e6, titleBonus: 0.5e6, spin: 200e3, premium: 600e3, cupBase: 70e3, admin: 250e3, mgrBase: 58, investor: 600e3 },
    { name: 'Serie C', teams: 24, avg: 60, demand: 13000, ticket: 21, prize: 1.6e6, perPlace: 25e3, promoted: 2, playoff: 4, releg: 4, promoBonus: 3e6, titleBonus: 1e6, spin: 500e3, premium: 2.5e6, cupBase: 140e3, admin: 450e3, mgrBase: 63, investor: 1.2e6 },
    { name: 'Serie B', teams: 24, avg: 66, demand: 24000, ticket: 28, prize: 9e6, perPlace: 120e3, promoted: 2, playoff: 6, releg: 3, promoBonus: 130e6, titleBonus: 3e6, spin: 1.5e6, premium: 8e6, cupBase: 500e3, admin: 1.5e6, mgrBase: 69, investor: 5e6 },
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
    'James', 'William', 'Thomas', 'Charlie', 'Jack', 'Harry', 'George', 'Oliver', 'Jacob', 'Ethan',
    'Ryan', 'Connor', 'Callum', 'Liam', 'Owen', 'Reece',
    'Emre', 'Cenk', 'Burak', 'Kerem', 'Arda', 'Ozan', 'Baris', 'Umut', 'Kaan',
    'Nikos', 'Dimitris', 'Kostas', 'Panagiotis', 'Giorgos', 'Christos', 'Vassilis',
    'Piotr', 'Krzysztof', 'Tomasz', 'Wojciech', 'Jakub', 'Marek', 'Pavel', 'Petr', 'Tomas', 'Ondrej',
    'Giorgi', 'Levan', 'Khvicha', 'Saba', 'Zurab',
    'Takumi', 'Kaoru', 'Hidemasa', 'Ritsu', 'Daizen', 'Minjae', 'Seunghyun',
    'Nahuel', 'Facundo', 'Franco', 'Agustin', 'Santiago', 'Nicolas', 'Ezequiel', 'Jonathan', 'Yerry', 'Duvan', 'Radamel',
    'Wilfried', 'Serge', 'Franck', 'Habib', 'Souleymane', 'Hamari', 'Alassane',
    'Rasmus', 'Mikkel', 'Casper', 'Jesper', 'Simon', 'Andreas', 'Fredrik',
    'Ahmed', 'Hassan', 'Yusuf', 'Omar', 'Ali', 'Tarik', 'Elias', 'Noah', 'Gabriel', 'Matheus',
    'Sean', 'Aidan', 'Declan', 'Conor', 'Cian', 'Ruairi', 'Rory', 'Euan', 'Fraser', 'Lewis', 'Gethin',
    'Achraf', 'Hakim', 'Sofyan', 'Nabil', 'Yassine', 'Anas', 'Zakaria', 'Walid', 'Amine', 'Rachid',
    'Mehdi', 'Sardar', 'Alireza', 'Saman',
    'Andriy', 'Oleksandr', 'Taras', 'Yevhen', 'Vitaliy', 'Denys', 'Artem',
    'Ante', 'Josip', 'Mario', 'Domagoj', 'Sime', 'Ivo',
    'Mihai', 'Alexandru', 'Florin', 'Constantin',
    'Yannick', 'Thibault', 'Axel', 'Jelle', 'Mats', 'Timothy',
    'Gylfi', 'Kolbeinn', 'Birkir', 'Aron',
    'Rui', 'Nuno', 'Goncalo', 'Diogo', 'Vitor', 'Nelson', 'Renato',
    'Cristobal', 'Maximiliano', 'Braian', 'Lautaro',
    'Tobias', 'Elliot', 'Freddie', 'Alfie', 'Arthur', 'Louis', 'Leon', 'Finn', 'Otto', 'Felix',
    'Junior', 'Patrick', 'Isaac', 'Caleb', 'Jayden', 'Malik', 'Xavier', 'Marcelo', 'Rogerio', 'Jorge',
    'Ismael', 'Yassin', 'Karam', 'Bilal', 'Tariq', 'Reda',
    'Dawit', 'Yonas', 'Tewodros',
    'Levi', 'Jayce', 'Micah',
    'Bogdan', 'Cezar', 'Kian', 'Zayn', 'Idris',
 ,
    'Iker', 'Unai', 'Aitor', 'Mikel', 'Asier', 'Ander', 'Gorka', 'Inigo', 'Rodri', 'Nico', 'Bernardo', 'Duarte', 'Vitorino', 'Edu', 'Exequiel', 'Alan', 'Marcos', 'Angel', 'Luiz', 'Everton', 'Richarlison', 'Casemiro', 'Fabinho', 'Alisson', 'Ederson', 'Danilo', 'Alex', 'Randal', 'Presnel', 'Aurelien', 'Benjamin', 'Christopher', 'Jules', 'Pape', 'Ismaila', 'Boulaye', 'Nampalys', 'Cheikhou', 'Krepin', 'Dejan', 'Sasa', 'Aleksa', 'Uros', 'Strahinja', 'Nikola', 'Andrija', 'Erling', 'Martin', 'Kristoffer', 'Sander', 'Ola', 'Alexander', 'Leo', 'Emil', 'Sindre', 'Timo', 'Kai', 'Joshua', 'Leroy', 'Ilkay', 'Frenkie', 'Matthijs', 'Denzel', 'Cody', 'Steven', 'Memphis', 'Xavi', 'Donyell', 'Justin', 'Quinten', 'Joaquin', 'Hernan', 'Ramiro', 'Cristhian', 'Yerson', 'Cristopher', 'Emerson', 'Wanderson', 'Robson', 'Fabricio', 'Leandro', 'Rodolfo', 'Joel', 'Bastien', 'Malo', 'Warren', 'Stephane', 'Wissam', 'Karl', 'Bakary', 'Yacouba', 'Souleyman', 'Amara', 'Djibril', 'Vaclav', 'Radek', 'Jaroslav', 'Tibor', 'Zoltan', 'Bela',
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
    'Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Thomas', 'Roberts', 'Walker', 'Wright',
    'White', 'Green', 'Hall', 'Wood', 'Clarke', 'Turner', 'Hill', 'Ward', 'Baker', 'Cooper',
    'Yilmaz', 'Demir', 'Kaya', 'Celik', 'Sahin', 'Aydin', 'Ozturk', 'Arslan',
    'Papadopoulos', 'Georgiou', 'Ioannou', 'Nikolaou',
    'Kaminski', 'Wojcik', 'Lewandowski', 'Zielinski', 'Novotny', 'Dvorak', 'Prochazka', 'Svoboda',
    'Kvaratskhelia', 'Mamardashvili', 'Sarkisyan', 'Petrosyan',
    'Tanaka', 'Sato', 'Suzuki', 'Kim', 'Lee', 'Park',
    'Acosta', 'Benitez', 'Cabrera', 'Duarte', 'Espinoza', 'Flores', 'Herrera', 'Medina', 'Paredes', 'Rojas', 'Vidal', 'Zapata',
    'Mbeki', 'Diakite', 'Coulibaly', 'Keita', 'Konate', 'Fofana', 'Balde', 'Mane', 'Adekunle', 'Nwosu', 'Chukwu',
    'Solberg', 'Halvorsen', 'Pedersen', 'Olsen', 'Svensson', 'Lindqvist', 'Makinen', 'Virtanen',
    'Kelly', 'Murphy', 'Walsh', 'McCarthy', 'Byrne', 'Doyle', 'Kennedy', 'Fitzgerald', 'Whelan', 'Brennan',
    'Benali', 'Boumediene', 'Cherif', 'Haddad', 'Mansouri', 'Saadi', 'Belkacem', 'Ferhat', 'Amrani', 'Bouazza',
    'Ghods', 'Nekounam', 'Azmoun',
    'Shevchenko', 'Yarmolenko', 'Konoplyanka', 'Zinchenko', 'Petrov', 'Ivanov', 'Sokolov',
    'Modric', 'Rakitic', 'Mandzukic', 'Kalinic', 'Brekalo', 'Vlasic', 'Barisic',
    'Stanciu', 'Chiriches', 'Sanmartean', 'Marin', 'Dragomir',
    'Vermeulen', 'Vandenberghe', 'Peeters', 'Willems', 'Mertens', 'Janssens', 'Claes', 'Wouters',
    'Sigurdsson', 'Thorarinsson', 'Bjarnason', 'Finnbogason', 'Gudjohnsen',
    'Cardoso', 'Machado', 'Nunes', 'Rocha', 'Pinto', 'Barbosa', 'Correia', 'Vieira', 'Faria', 'Antunes',
    'Gimenez', 'Arce', 'Chavez', 'Vargas', 'Salazar', 'Aguilar', 'Reyes', 'Contreras', 'Munoz', 'Castro',
    'Abubakar', 'Chukwuemeka', 'Onwuachi', 'Obi', 'Effiong', 'Yaboah', 'Appiah', 'Boateng', 'Adjei', 'Owusu',
    'Reid', 'Stewart', 'Watson', 'Mitchell', 'Campbell', 'Anderson',
    'Palmer', 'Foster', 'Cross', 'Hood', 'Marsh', 'Chapman', 'Dyer', 'Osei', 'Amankwah',
 ,
    'Aramburu', 'Zubimendi', 'Merino', 'Oyarzabal', 'Barrenetxea', 'Kubo', 'Pacheco', 'Fernandes', 'Guimaraes', 'Cancelo', 'Semedo', 'Guerreiro', 'Fonte', 'Firmino', 'Coutinho', 'Neymar', 'Marquinhos', 'Alex Sandro', 'Kounde', 'Upamecano', 'Saliba', 'Kimpembe', 'Digne', 'Coman', 'Nkunku', 'Barcola', 'Diaby', 'Diakhaby', 'Doucoure', 'Bissouma', 'Kalulu', 'Krunic', 'Vlahovic', 'Kostic', 'Milenkovic', 'Sucic', 'Majer', 'Ivanusec', 'Perisic', 'Brozovic', 'Kovacic', 'Pasalic', 'Skriniar', 'Hancko', 'Duda', 'Schick', 'Coufal', 'Soucek', 'Hlozek', 'Sadilek', 'Provod', 'Mandi', 'Boudaoui', 'Zaha', 'Doucet', 'Delort', 'Boudebouz', 'Feghouli', 'Belaili', 'Bounedjah', 'Mahrez', 'Bennacer', 'Elmas', 'Aleksandrov', 'Bozhinov', 'Berkovec', 'Radoslavov', 'Nedelev', 'Delev', 'Petrescu', 'Balaur', 'Radu', 'Tanase', 'Cicaldau', 'Sorescu', 'Burca', 'Racovitan', 'Screciu', 'Baze', 'Hoxha', 'Cikalleshi', 'Ismajli', 'Mavraj', 'Xhaka', 'Shaqiri', 'Embolo', 'Akanji', 'Widmer', 'Freuler', 'Zakaria', 'Elvedi', 'Zuber', 'Fassnacht', 'Frei', 'Ajeti', 'Gavranovic', 'Stocker', 'Lang', 'Sommer', 'Vargas',
  ];

  // Le prime voci di FIRST/LAST sono italiane in senso stretto (usate per i nazionali
  // italiani); il resto del pool è il mix multinazionale già esistente, riusato per
  // ogni giocatore straniero a prescindere dalla nazionalità estratta.
  const ITA_FIRST = FIRST.slice(0, 38), ITA_LAST = LAST.slice(0, 40);

  const FOREIGN_FIRST = FIRST.slice(38), FOREIGN_LAST = LAST.slice(40);

  /* ---------------- nazionalità ---------------- */
  // In Eccellenza la rosa è quasi tutta italiana; salendo di categoria la quota di
  // stranieri cresce, fino a rispecchiare una vera Serie A. NATIONS è la lista degli
  // esteri possibili (bandiera + nome); ITA è gestita a parte perché è sempre la più comune.
  const ITA_NAT = { code: 'ITA', name: 'Italia', flag: '🇮🇹' };

  const NATIONS = [
    { code: 'ESP', name: 'Spagna', flag: '🇪🇸' }, { code: 'ARG', name: 'Argentina', flag: '🇦🇷' },
    { code: 'BRA', name: 'Brasile', flag: '🇧🇷' }, { code: 'POR', name: 'Portogallo', flag: '🇵🇹' },
    { code: 'FRA', name: 'Francia', flag: '🇫🇷' }, { code: 'SEN', name: 'Senegal', flag: '🇸🇳' },
    { code: 'CIV', name: 'Costa d\'Avorio', flag: '🇨🇮' }, { code: 'MLI', name: 'Mali', flag: '🇲🇱' },
    { code: 'GHA', name: 'Ghana', flag: '🇬🇭' }, { code: 'NGA', name: 'Nigeria', flag: '🇳🇬' },
    { code: 'SRB', name: 'Serbia', flag: '🇷🇸' }, { code: 'CRO', name: 'Croazia', flag: '🇭🇷' },
    { code: 'ROU', name: 'Romania', flag: '🇷🇴' }, { code: 'SWE', name: 'Svezia', flag: '🇸🇪' },
    { code: 'NOR', name: 'Norvegia', flag: '🇳🇴' }, { code: 'DEN', name: 'Danimarca', flag: '🇩🇰' },
    { code: 'GER', name: 'Germania', flag: '🇩🇪' }, { code: 'NED', name: 'Olanda', flag: '🇳🇱' },
    { code: 'ENG', name: 'Inghilterra', flag: '🏴' }, { code: 'SCO', name: 'Scozia', flag: '🏴' },
    { code: 'IRL', name: 'Irlanda', flag: '🇮🇪' }, { code: 'TUR', name: 'Turchia', flag: '🇹🇷' },
    { code: 'GRE', name: 'Grecia', flag: '🇬🇷' }, { code: 'POL', name: 'Polonia', flag: '🇵🇱' },
    { code: 'CZE', name: 'Rep. Ceca', flag: '🇨🇿' }, { code: 'GEO', name: 'Georgia', flag: '🇬🇪' },
    { code: 'JPN', name: 'Giappone', flag: '🇯🇵' }, { code: 'KOR', name: 'Corea del Sud', flag: '🇰🇷' },
    { code: 'COL', name: 'Colombia', flag: '🇨🇴' }, { code: 'CHI', name: 'Cile', flag: '🇨🇱' },
    { code: 'MAR', name: 'Marocco', flag: '🇲🇦' }, { code: 'ALG', name: 'Algeria', flag: '🇩🇿' },
    { code: 'IRN', name: 'Iran', flag: '🇮🇷' }, { code: 'UKR', name: 'Ucraina', flag: '🇺🇦' },
    { code: 'ISL', name: 'Islanda', flag: '🇮🇸' }, { code: 'BEL', name: 'Belgio', flag: '🇧🇪' },
  ];

  // Bandiere disegnate a SVG (non emoji): su Windows i flag emoji spesso non hanno un
  // glifo dedicato e il sistema mostra il codice ISO in lettere ("IT", "ES", ...) al posto
  // della bandiera. Ogni voce è una ricetta semplificata (strisce/croce/cerchio/stella)
  // nei colori veri della bandiera, disegnata da flagSVG in sim.js.
  const FLAG_SPECS = {
    ITA: { type: 'v', colors: ['#009246', '#F1F2F1', '#CE2B37'] },
    ESP: { type: 'h', colors: ['#AA151B', '#F1BF00', '#AA151B'] },
    ARG: { type: 'h', colors: ['#74ACDF', '#F1F2F1', '#74ACDF'] },
    BRA: { type: 'h', colors: ['#009B3A', '#FEDF00', '#009B3A'] },
    POR: { type: 'v', colors: ['#006600', '#FF0000'] },
    FRA: { type: 'v', colors: ['#0055A4', '#F1F2F1', '#EF4135'] },
    SEN: { type: 'h', colors: ['#00853F', '#FDEF42', '#E31B23'] },
    CIV: { type: 'v', colors: ['#F77F00', '#F1F2F1', '#009E60'] },
    MLI: { type: 'v', colors: ['#14B53A', '#FCD116', '#CE1126'] },
    GHA: { type: 'h', colors: ['#CE1126', '#FCD116', '#006B3F'] },
    NGA: { type: 'v', colors: ['#008751', '#F1F2F1', '#008751'] },
    SRB: { type: 'h', colors: ['#C6363C', '#0C4076', '#F1F2F1'] },
    CRO: { type: 'h', colors: ['#FF0000', '#F1F2F1', '#171796'] },
    ROU: { type: 'v', colors: ['#002B7F', '#FCD116', '#CE1126'] },
    SWE: { type: 'cross', base: '#006AA7', cross: '#FECC02' },
    NOR: { type: 'cross', base: '#EF2B2D', cross: '#F1F2F1', outline: '#002868' },
    DEN: { type: 'cross', base: '#C60C30', cross: '#F1F2F1' },
    GER: { type: 'h', colors: ['#000000', '#DD0000', '#FFCE00'] },
    NED: { type: 'h', colors: ['#AE1C28', '#F1F2F1', '#21468B'] },
    ENG: { type: 'cross', base: '#F1F2F1', cross: '#CE1124' },
    SCO: { type: 'saltire', base: '#0065BF', cross: '#F1F2F1' },
    IRL: { type: 'v', colors: ['#169B62', '#F1F2F1', '#FF883E'] },
    TUR: { type: 'star', base: '#E30A17', starColor: '#F1F2F1' },
    GRE: { type: 'h', colors: ['#0D5EAF', '#F1F2F1', '#0D5EAF', '#F1F2F1', '#0D5EAF'] },
    POL: { type: 'h', colors: ['#F1F2F1', '#DC143C'] },
    CZE: { type: 'h', colors: ['#F1F2F1', '#D7141A'] },
    GEO: { type: 'star', base: '#F1F2F1', starColor: '#FF0000' },
    JPN: { type: 'circle', base: '#F1F2F1', circleColor: '#BC002D' },
    KOR: { type: 'circle', base: '#F1F2F1', circleColor: '#0047A0' },
    COL: { type: 'h', colors: ['#FCD116', '#FCD116', '#003893', '#CE1126'] },
    CHI: { type: 'h', colors: ['#F1F2F1', '#D52B1E'] },
    MAR: { type: 'star', base: '#C1272D', starColor: '#006233' },
    ALG: { type: 'v', colors: ['#006233', '#F1F2F1'] },
    IRN: { type: 'h', colors: ['#239F40', '#F1F2F1', '#DA0000'] },
    UKR: { type: 'h', colors: ['#005BBB', '#FFD500'] },
    ISL: { type: 'cross', base: '#02529C', cross: '#DC1E35', outline: '#F1F2F1' },
    BEL: { type: 'v', colors: ['#000000', '#FDDA24', '#EF3340'] },
  };

  // Quota di italiani per categoria (indice = S.div, 0=Eccellenza … 4=Serie A): scende
  // gradualmente, come la vera piramide del calcio italiano.
  const ITA_SHARE = [0.97, 0.90, 0.75, 0.55, 0.35];

  const CREST_DEFAULT = { shape: 'shield', colors: ['#f0c869', '#7a4f16'] };

  // Coppe europee: club veri, divisi per fascia di forza (in linea con oppBase di
  // EURO_COMPS). genEuroClub pesca dalla fascia della coppa in corso; il generatore
  // prefisso+città resta solo come riserva se una fascia dovesse esaurirsi.
  const EURO_CLUBS = {
    ucl: [
      { n: 'Real Madrid', s: 95 }, { n: 'Manchester City', s: 94 }, { n: 'Bayern Monaco', s: 92 },
      { n: 'Paris Saint-Germain', s: 91 }, { n: 'Liverpool', s: 90 }, { n: 'Barcellona', s: 90 },
      { n: 'Arsenal', s: 88 }, { n: 'Chelsea', s: 85 }, { n: 'Borussia Dortmund', s: 85 },
      { n: 'Atletico Madrid', s: 86 }, { n: 'Bayer Leverkusen', s: 84 }, { n: 'Manchester United', s: 83 },
      { n: 'Tottenham', s: 83 }, { n: 'Benfica', s: 81 }, { n: 'Porto', s: 80 }, { n: 'Ajax', s: 79 },
      { n: 'Sporting Lisbona', s: 82 }, { n: 'RB Lipsia', s: 82 }, { n: 'Marsiglia', s: 80 }, { n: 'Monaco', s: 79 },
    ],
    uel: [
      { n: 'West Ham', s: 76 }, { n: 'Villarreal', s: 78 }, { n: 'Real Sociedad', s: 76 },
      { n: 'Eintracht Francoforte', s: 77 }, { n: 'Rangers', s: 72 }, { n: 'Celtic', s: 73 },
      { n: 'Feyenoord', s: 77 }, { n: 'PSV Eindhoven', s: 78 }, { n: 'Olympiacos', s: 74 },
      { n: 'Fenerbahce', s: 76 }, { n: 'Galatasaray', s: 77 }, { n: 'Besiktas', s: 73 },
      { n: 'Sporting Braga', s: 73 }, { n: 'Slavia Praga', s: 71 }, { n: 'Dinamo Zagabria', s: 72 },
      { n: 'Shakhtar Donetsk', s: 74 }, { n: 'Club Brugge', s: 75 }, { n: 'Anderlecht', s: 72 },
      { n: 'Young Boys', s: 71 }, { n: 'Salisburgo', s: 78 },
    ],
    conf: [
      { n: 'Aberdeen', s: 63 }, { n: 'Molde', s: 62 }, { n: 'AZ Alkmaar', s: 68 }, { n: 'Nizza', s: 69 },
      { n: 'Lens', s: 70 }, { n: 'Konyaspor', s: 62 }, { n: 'Legia Varsavia', s: 65 }, { n: 'Slovan Bratislava', s: 63 },
      { n: 'Cluj', s: 61 }, { n: 'Ludogorets', s: 64 }, { n: 'Gent', s: 66 }, { n: 'Vitoria Guimaraes', s: 65 },
      { n: 'Maccabi Tel Aviv', s: 62 }, { n: 'Rakow Czestochowa', s: 60 }, { n: 'APOEL', s: 58 },
      { n: 'Zorya Luhansk', s: 59 }, { n: 'Apollon Limassol', s: 58 }, { n: 'Silkeborg', s: 60 },
      { n: 'Vikingur Reykjavik', s: 57 }, { n: 'Lincoln Red Imps', s: 54 },
    ],
  };

  // Rose reali dei 60 maggiori club europei (ricerca web, stagione 2025/26-2026/27): usate
  // come marcatori per le partite di coppa europea e come pool di partenza per il mercato
  // trasferimenti "semi-realistico" (vedi simulateTransferWindow in sim.js). Overall su scala
  // 40-99 come i nostri giocatori (non la quotazione fantacalcio delle rose italiane).
  const EURO_ROSTERS = {
    'Real Madrid': [{n:'Courtois',pos:'POR',ovr:89},{n:'Huijsen',pos:'DIF',ovr:85},{n:'Militao',pos:'DIF',ovr:84},{n:'Trent',pos:'DIF',ovr:86},{n:'Rudiger',pos:'DIF',ovr:85},{n:'Valverde',pos:'CEN',ovr:87},{n:'Bellingham',pos:'CEN',ovr:89},{n:'Tchouameni',pos:'CEN',ovr:85},{n:'Camavinga',pos:'CEN',ovr:84},{n:'Mbappe',pos:'ATT',ovr:93},{n:'Vinicius Jr',pos:'ATT',ovr:91},{n:'Rodrygo',pos:'ATT',ovr:85}],
    'Manchester City': [{n:'Donnarumma',pos:'POR',ovr:89},{n:'Dias',pos:'DIF',ovr:86},{n:'Gvardiol',pos:'DIF',ovr:85},{n:'Ait-Nouri',pos:'DIF',ovr:81},{n:'Rico Lewis',pos:'DIF',ovr:80},{n:'Foden',pos:'CEN',ovr:88},{n:'Enzo Fernandez',pos:'CEN',ovr:86},{n:'Kovacic',pos:'CEN',ovr:82},{n:'Cherki',pos:'CEN',ovr:83},{n:'Haaland',pos:'ATT',ovr:94},{n:'Doku',pos:'ATT',ovr:85},{n:'Ndiaye',pos:'ATT',ovr:80}],
    'Bayern Monaco': [{n:'Neuer',pos:'POR',ovr:84},{n:'Upamecano',pos:'DIF',ovr:85},{n:'Kim Min-jae',pos:'DIF',ovr:84},{n:'Tah',pos:'DIF',ovr:84},{n:'Davies',pos:'DIF',ovr:85},{n:'Kimmich',pos:'CEN',ovr:88},{n:'Musiala',pos:'CEN',ovr:89},{n:'Olise',pos:'CEN',ovr:87},{n:'Pavlovic',pos:'CEN',ovr:81},{n:'Kane',pos:'ATT',ovr:90},{n:'Diaz',pos:'ATT',ovr:85},{n:'Gnabry',pos:'ATT',ovr:80}],
    'Paris Saint-Germain': [{n:'Chevalier',pos:'POR',ovr:84},{n:'Hakimi',pos:'DIF',ovr:88},{n:'Marquinhos',pos:'DIF',ovr:85},{n:'Nuno Mendes',pos:'DIF',ovr:85},{n:'Zabarnyi',pos:'DIF',ovr:80},{n:'Vitinha',pos:'CEN',ovr:87},{n:'Joao Neves',pos:'CEN',ovr:86},{n:'Zaire-Emery',pos:'CEN',ovr:84},{n:'Fabian Ruiz',pos:'CEN',ovr:84},{n:'Dembele',pos:'ATT',ovr:91},{n:'Doue',pos:'ATT',ovr:87},{n:'Kvaratskhelia',pos:'ATT',ovr:87}],
    'Liverpool': [{n:'Alisson',pos:'POR',ovr:87},{n:'Van Dijk',pos:'DIF',ovr:87},{n:'Araujo',pos:'DIF',ovr:82},{n:'Frimpong',pos:'DIF',ovr:81},{n:'Gomez',pos:'DIF',ovr:79},{n:'Wirtz',pos:'CEN',ovr:88},{n:'Mac Allister',pos:'CEN',ovr:86},{n:'Szoboszlai',pos:'CEN',ovr:85},{n:'Gravenberch',pos:'CEN',ovr:84},{n:'Isak',pos:'ATT',ovr:88},{n:'Gakpo',pos:'ATT',ovr:83},{n:'Ekitike',pos:'ATT',ovr:82}],
    'Barcellona': [{n:'Joan Garcia',pos:'POR',ovr:83},{n:'Kounde',pos:'DIF',ovr:85},{n:'Cubarsi',pos:'DIF',ovr:83},{n:'Balde',pos:'DIF',ovr:83},{n:'Christensen',pos:'DIF',ovr:80},{n:'Pedri',pos:'CEN',ovr:88},{n:'De Jong',pos:'CEN',ovr:86},{n:'Gavi',pos:'CEN',ovr:85},{n:'Olmo',pos:'CEN',ovr:85},{n:'Yamal',pos:'ATT',ovr:91},{n:'Raphinha',pos:'ATT',ovr:88},{n:'Fermin Lopez',pos:'ATT',ovr:80}],
    'Arsenal': [{n:'Raya',pos:'POR',ovr:86},{n:'Saliba',pos:'DIF',ovr:88},{n:'Gabriel',pos:'DIF',ovr:86},{n:'Timber',pos:'DIF',ovr:83},{n:'Calafiori',pos:'DIF',ovr:83},{n:'Rice',pos:'CEN',ovr:87},{n:'Odegaard',pos:'CEN',ovr:87},{n:'Zubimendi',pos:'CEN',ovr:83},{n:'Eze',pos:'CEN',ovr:84},{n:'Saka',pos:'ATT',ovr:89},{n:'Gyokeres',pos:'ATT',ovr:85},{n:'Havertz',pos:'ATT',ovr:83}],
    'Chelsea': [{n:'E. Martinez',pos:'POR',ovr:84},{n:'James',pos:'DIF',ovr:82},{n:'Colwill',pos:'DIF',ovr:83},{n:'Fofana',pos:'DIF',ovr:81},{n:'Gusto',pos:'DIF',ovr:80},{n:'Caicedo',pos:'CEN',ovr:85},{n:'Palmer',pos:'CEN',ovr:87},{n:'Barco',pos:'CEN',ovr:78},{n:'Joao Pedro',pos:'ATT',ovr:83},{n:'Estevao',pos:'ATT',ovr:83},{n:'Neto',pos:'ATT',ovr:81},{n:'Gittens',pos:'ATT',ovr:78}],
    'Borussia Dortmund': [{n:'Kobel',pos:'POR',ovr:84},{n:'Schlotterbeck',pos:'DIF',ovr:83},{n:'Anton',pos:'DIF',ovr:79},{n:'Bensebaini',pos:'DIF',ovr:79},{n:'Ryerson',pos:'DIF',ovr:78},{n:'Jobe Bellingham',pos:'CEN',ovr:81},{n:'Nmecha',pos:'CEN',ovr:78},{n:'Sabitzer',pos:'CEN',ovr:79},{n:'Can',pos:'CEN',ovr:77},{n:'Guirassy',pos:'ATT',ovr:85},{n:'Beier',pos:'ATT',ovr:79},{n:'Fabio Silva',pos:'ATT',ovr:76}],
    'Atletico Madrid': [{n:'Oblak',pos:'POR',ovr:86},{n:'Le Normand',pos:'DIF',ovr:83},{n:'Hancko',pos:'DIF',ovr:82},{n:'Grimaldo',pos:'DIF',ovr:83},{n:'Pubill',pos:'DIF',ovr:78},{n:'Koke',pos:'CEN',ovr:80},{n:'Barrios',pos:'CEN',ovr:81},{n:'Baena',pos:'CEN',ovr:83},{n:'Llorente',pos:'CEN',ovr:80},{n:'Julian Alvarez',pos:'ATT',ovr:88},{n:'Lookman',pos:'ATT',ovr:84},{n:'Sorloth',pos:'ATT',ovr:82}],
    'Bayer Leverkusen': [{n:'Flekken',pos:'POR',ovr:80},{n:'Tapsoba',pos:'DIF',ovr:81},{n:'Hincapie',pos:'DIF',ovr:82},{n:'Grimaldo',pos:'DIF',ovr:84},{n:'Andrich',pos:'CEN',ovr:78},{n:'Aleix Garcia',pos:'CEN',ovr:81},{n:'Palacios',pos:'CEN',ovr:77},{n:'Tillman',pos:'CEN',ovr:79},{n:'Schick',pos:'ATT',ovr:82},{n:'Boniface',pos:'ATT',ovr:80},{n:'Poku',pos:'ATT',ovr:76}],
    'Manchester United': [{n:'Onana',pos:'POR',ovr:79},{n:'De Ligt',pos:'DIF',ovr:83},{n:'Lisandro Martinez',pos:'DIF',ovr:82},{n:'Dalot',pos:'DIF',ovr:78},{n:'Shaw',pos:'DIF',ovr:79},{n:'Bruno Fernandes',pos:'CEN',ovr:87},{n:'Casemiro',pos:'CEN',ovr:80},{n:'Mainoo',pos:'CEN',ovr:79},{n:'Ugarte',pos:'CEN',ovr:78},{n:'Cunha',pos:'ATT',ovr:83},{n:'Mbeumo',pos:'ATT',ovr:82},{n:'Sesko',pos:'ATT',ovr:80}],
    'Tottenham': [{n:'Vicario',pos:'POR',ovr:81},{n:'Romero',pos:'DIF',ovr:84},{n:'Van de Ven',pos:'DIF',ovr:82},{n:'Udogie',pos:'DIF',ovr:79},{n:'Porro',pos:'DIF',ovr:80},{n:'Bissouma',pos:'CEN',ovr:80},{n:'Bentancur',pos:'CEN',ovr:79},{n:'Maddison',pos:'CEN',ovr:82},{n:'Kudus',pos:'ATT',ovr:81},{n:'Richarlison',pos:'ATT',ovr:79},{n:'Solanke',pos:'ATT',ovr:80},{n:'Johnson',pos:'ATT',ovr:78}],
    'Benfica': [{n:'Trubin',pos:'POR',ovr:82},{n:'Antonio Silva',pos:'DIF',ovr:83},{n:'Otamendi',pos:'DIF',ovr:78},{n:'Bah',pos:'DIF',ovr:77},{n:'Kokcu',pos:'CEN',ovr:80},{n:'Florentino',pos:'CEN',ovr:76},{n:'Barrenechea',pos:'CEN',ovr:77},{n:'Richard Rios',pos:'CEN',ovr:79},{n:'Akturkoglu',pos:'ATT',ovr:78},{n:'Pavlidis',pos:'ATT',ovr:81},{n:'Aursnes',pos:'CEN',ovr:75}],
    'Porto': [{n:'Diogo Costa',pos:'POR',ovr:85},{n:'Nehuen Perez',pos:'DIF',ovr:78},{n:'Zaidu',pos:'DIF',ovr:75},{n:'Bednarek',pos:'DIF',ovr:76},{n:'Eustaquio',pos:'CEN',ovr:78},{n:'Alan Varela',pos:'CEN',ovr:80},{n:'Gabri Veiga',pos:'CEN',ovr:79},{n:'Rodrigo Mora',pos:'CEN',ovr:78},{n:'Pepe',pos:'ATT',ovr:77},{n:'Samu',pos:'ATT',ovr:78},{n:'Luuk de Jong',pos:'ATT',ovr:76},{n:'Borja Sainz',pos:'ATT',ovr:77}],
    'Ajax': [{n:'Jaros',pos:'POR',ovr:75},{n:'Sutalo',pos:'DIF',ovr:76},{n:'Rensch',pos:'DIF',ovr:75},{n:'Baas',pos:'DIF',ovr:73},{n:'Taylor',pos:'DIF',ovr:74},{n:'Berghuis',pos:'CEN',ovr:77},{n:'Klaassen',pos:'CEN',ovr:76},{n:'Gloukh',pos:'CEN',ovr:77},{n:'Godts',pos:'ATT',ovr:78},{n:'Traore',pos:'ATT',ovr:74},{n:'Weghorst',pos:'ATT',ovr:75}],
    'Sporting Lisbona': [{n:'Israel',pos:'POR',ovr:78},{n:'Debast',pos:'DIF',ovr:78},{n:'St. Juste',pos:'DIF',ovr:77},{n:'Quaresma',pos:'DIF',ovr:75},{n:'Morita',pos:'CEN',ovr:76},{n:'Zalazar',pos:'CEN',ovr:76},{n:'Pote',pos:'CEN',ovr:80},{n:'Trincao',pos:'ATT',ovr:80},{n:'Geny Catamo',pos:'ATT',ovr:77},{n:'Luis Suarez',pos:'ATT',ovr:79},{n:'Fotis Ioannidis',pos:'ATT',ovr:77}],
    'RB Lipsia': [{n:'Gulacsi',pos:'POR',ovr:78},{n:'Henrichs',pos:'DIF',ovr:77},{n:'Orban',pos:'DIF',ovr:78},{n:'Simakan',pos:'DIF',ovr:77},{n:'Baumgartner',pos:'CEN',ovr:80},{n:'Schlager',pos:'CEN',ovr:77},{n:'Diomande',pos:'CEN',ovr:76},{n:'Nusa',pos:'ATT',ovr:78},{n:'Openda',pos:'ATT',ovr:81},{n:'Konate',pos:'ATT',ovr:74}],
    'Marsiglia': [{n:'Rulli',pos:'POR',ovr:79},{n:'Balerdi',pos:'DIF',ovr:79},{n:'Egan-Riley',pos:'DIF',ovr:76},{n:'Emerson',pos:'DIF',ovr:77},{n:'Hojbjerg',pos:'CEN',ovr:79},{n:'Rongier',pos:'CEN',ovr:76},{n:'ORiley',pos:'CEN',ovr:78},{n:'Vermeeren',pos:'CEN',ovr:74},{n:'Weah',pos:'DIF',ovr:77},{n:'Greenwood',pos:'ATT',ovr:84},{n:'Aubameyang',pos:'ATT',ovr:78}],
    'Monaco': [{n:'Kohn',pos:'POR',ovr:77},{n:'Singo',pos:'DIF',ovr:78},{n:'Salisu',pos:'DIF',ovr:78},{n:'Vanderson',pos:'DIF',ovr:76},{n:'Zakaria',pos:'CEN',ovr:78},{n:'Golovin',pos:'CEN',ovr:80},{n:'Camara',pos:'CEN',ovr:76},{n:'Akliouche',pos:'ATT',ovr:79},{n:'Ben Seghir',pos:'ATT',ovr:76},{n:'Biereth',pos:'ATT',ovr:78},{n:'Ilenikhena',pos:'ATT',ovr:75},{n:'Balogun',pos:'ATT',ovr:77}],
    'West Ham': [{n:'Hermansen',pos:'POR',ovr:78},{n:'Walker-Peters',pos:'DIF',ovr:77},{n:'Kilman',pos:'DIF',ovr:76},{n:'Mavropanos',pos:'DIF',ovr:74},{n:'Todibo',pos:'DIF',ovr:75},{n:'Soucek',pos:'CEN',ovr:76},{n:'Alvarez',pos:'CEN',ovr:78},{n:'Bowen',pos:'ATT',ovr:82},{n:'Fullkrug',pos:'ATT',ovr:78},{n:'Wilson',pos:'ATT',ovr:75}],
    'Villarreal': [{n:'Tenas',pos:'POR',ovr:75},{n:'Foyth',pos:'DIF',ovr:79},{n:'Veiga',pos:'DIF',ovr:78},{n:'Cardona',pos:'DIF',ovr:74},{n:'Pedraza',pos:'DIF',ovr:74},{n:'Parejo',pos:'CEN',ovr:79},{n:'Partey',pos:'CEN',ovr:78},{n:'Comesana',pos:'CEN',ovr:74},{n:'Pepe',pos:'ATT',ovr:80},{n:'Moreno',pos:'ATT',ovr:79},{n:'Mikautadze',pos:'ATT',ovr:76}],
    'Real Sociedad': [{n:'Remiro',pos:'POR',ovr:80},{n:'Zubeldia',pos:'DIF',ovr:76},{n:'Aramburu',pos:'DIF',ovr:73},{n:'Caleta-Car',pos:'DIF',ovr:75},{n:'Aihen Munoz',pos:'DIF',ovr:73},{n:'Brais Mendez',pos:'CEN',ovr:78},{n:'Zakharyan',pos:'CEN',ovr:77},{n:'Sucic',pos:'CEN',ovr:74},{n:'Oyarzabal',pos:'ATT',ovr:83},{n:'Kubo',pos:'ATT',ovr:81},{n:'Barrenetxea',pos:'ATT',ovr:76}],
    'Eintracht Francoforte': [{n:'Koch',pos:'DIF',ovr:76},{n:'Brassier',pos:'DIF',ovr:73},{n:'Fernandes',pos:'DIF',ovr:74},{n:'Chandler',pos:'DIF',ovr:73},{n:'Doan',pos:'CEN',ovr:78},{n:'Hojlund',pos:'CEN',ovr:75},{n:'Goetze',pos:'CEN',ovr:77},{n:'Chaibi',pos:'CEN',ovr:74},{n:'Uzun',pos:'ATT',ovr:76},{n:'Burkardt',pos:'ATT',ovr:78}],
    'Rangers': [{n:'Pandur',pos:'POR',ovr:73},{n:'Souttar',pos:'DIF',ovr:74},{n:'Nedeljkovic',pos:'DIF',ovr:70},{n:'Godfrey',pos:'DIF',ovr:73},{n:'Sterling',pos:'DIF',ovr:70},{n:'Raskin',pos:'CEN',ovr:75},{n:'Neil',pos:'CEN',ovr:72},{n:'McCausland',pos:'CEN',ovr:71},{n:'Chermiti',pos:'ATT',ovr:74},{n:'Shankland',pos:'ATT',ovr:75},{n:'Bouanani',pos:'ATT',ovr:71}],
    'Celtic': [{n:'Sinisalo',pos:'POR',ovr:73},{n:'Carter-Vickers',pos:'DIF',ovr:77},{n:'Johnston',pos:'DIF',ovr:75},{n:'Scales',pos:'DIF',ovr:73},{n:'Trusty',pos:'DIF',ovr:72},{n:'McGregor',pos:'CEN',ovr:77},{n:'McCowan',pos:'CEN',ovr:73},{n:'Oxlade-Chamberlain',pos:'CEN',ovr:75},{n:'Jota',pos:'ATT',ovr:78},{n:'Nygren',pos:'ATT',ovr:74},{n:'Yang',pos:'ATT',ovr:71}],
    'Feyenoord': [{n:'Wellenreuther',pos:'POR',ovr:74},{n:'Smal',pos:'DIF',ovr:72},{n:'Bos',pos:'DIF',ovr:70},{n:'Hwang',pos:'CEN',ovr:75},{n:'Zerrouki',pos:'CEN',ovr:74},{n:'Moussa',pos:'ATT',ovr:73},{n:'Kokcu',pos:'CEN',ovr:76},{n:'Ueda',pos:'ATT',ovr:74},{n:'Bueno',pos:'ATT',ovr:73},{n:'Milambo',pos:'CEN',ovr:73}],
    'PSV Eindhoven': [{n:'Kovar',pos:'POR',ovr:75},{n:'Dest',pos:'DIF',ovr:78},{n:'Geertruida',pos:'DIF',ovr:79},{n:'Flamingo',pos:'DIF',ovr:73},{n:'Obispo',pos:'DIF',ovr:72},{n:'Til',pos:'CEN',ovr:75},{n:'Schouten',pos:'CEN',ovr:76},{n:'Wanner',pos:'CEN',ovr:74},{n:'Perisic',pos:'ATT',ovr:77},{n:'Pepi',pos:'ATT',ovr:75},{n:'Man',pos:'ATT',ovr:76}],
    'Olympiacos': [{n:'Ortega',pos:'POR',ovr:75},{n:'Saliakas',pos:'DIF',ovr:73},{n:'Pirola',pos:'DIF',ovr:73},{n:'Retsos',pos:'DIF',ovr:74},{n:'Carmo',pos:'DIF',ovr:73},{n:'Cabella',pos:'CEN',ovr:78},{n:'Fortounis',pos:'CEN',ovr:76},{n:'Freuler',pos:'CEN',ovr:78},{n:'Bailey',pos:'ATT',ovr:80},{n:'El Kaabi',pos:'ATT',ovr:77},{n:'Chiquinho',pos:'CEN',ovr:74}],
    'Fenerbahce': [{n:'Ederson',pos:'POR',ovr:78},{n:'Skriniar',pos:'DIF',ovr:79},{n:'Semedo',pos:'DIF',ovr:76},{n:'Ake',pos:'DIF',ovr:78},{n:'Oosterwolde',pos:'DIF',ovr:74},{n:'Kante',pos:'CEN',ovr:79},{n:'Guendouzi',pos:'CEN',ovr:78},{n:'Asensio',pos:'CEN',ovr:79},{n:'Irfan Can',pos:'CEN',ovr:75},{n:'Lukaku',pos:'ATT',ovr:82},{n:'Aktuerkoglu',pos:'ATT',ovr:78}],
    'Galatasaray': [{n:'Icardi',pos:'ATT',ovr:81},{n:'Osimhen',pos:'ATT',ovr:83},{n:'Sane',pos:'ATT',ovr:82},{n:'Gundogan',pos:'CEN',ovr:80},{n:'Torreira',pos:'CEN',ovr:77},{n:'Lemina',pos:'CEN',ovr:75},{n:'Sara',pos:'CEN',ovr:74},{n:'Sallai',pos:'ATT',ovr:76},{n:'Singo',pos:'DIF',ovr:76},{n:'Sanchez',pos:'DIF',ovr:75},{n:'Muslera',pos:'POR',ovr:70}],
    'Besiktas': [{n:'Immobile',pos:'ATT',ovr:79},{n:'Abraham',pos:'ATT',ovr:77},{n:'Rashica',pos:'ATT',ovr:74},{n:'Cerny',pos:'ATT',ovr:73},{n:'Under',pos:'ATT',ovr:74},{n:'Asllani',pos:'CEN',ovr:76},{n:'Ndidi',pos:'CEN',ovr:78},{n:'Uduokhai',pos:'DIF',ovr:73},{n:'Djalo',pos:'DIF',ovr:74},{n:'Ridvan',pos:'DIF',ovr:72},{n:'Destanoglu',pos:'POR',ovr:73}],
    'Sporting Braga': [{n:'Horta',pos:'ATT',ovr:80},{n:'Pau Victor',pos:'ATT',ovr:76},{n:'Gabriel Silva',pos:'ATT',ovr:74},{n:'Moutinho',pos:'CEN',ovr:76},{n:'Zalazar',pos:'CEN',ovr:75},{n:'Gorby',pos:'CEN',ovr:73},{n:'Huseinbasic',pos:'CEN',ovr:72},{n:'Vitor Carvalho',pos:'DIF',ovr:71},{n:'Barcia',pos:'DIF',ovr:71},{n:'Matheus',pos:'POR',ovr:72}],
    'Slavia Praga': [{n:'Chytil',pos:'ATT',ovr:76},{n:'Schranz',pos:'ATT',ovr:75},{n:'Kusej',pos:'ATT',ovr:73},{n:'Chory',pos:'ATT',ovr:71},{n:'Provod',pos:'CEN',ovr:78},{n:'Sadilek',pos:'CEN',ovr:74},{n:'Dorley',pos:'CEN',ovr:73},{n:'Doudera',pos:'DIF',ovr:73},{n:'Zima',pos:'DIF',ovr:74},{n:'Holes',pos:'DIF',ovr:71},{n:'Stanek',pos:'POR',ovr:72}],
    'Dinamo Zagabria': [{n:'Vidovic',pos:'ATT',ovr:75},{n:'Mudrazija',pos:'CEN',ovr:72},{n:'Misic',pos:'CEN',ovr:74},{n:'Zajc',pos:'CEN',ovr:76},{n:'Stojkovic',pos:'CEN',ovr:71},{n:'McKenna',pos:'DIF',ovr:75},{n:'Torrente',pos:'DIF',ovr:70},{n:'Goda',pos:'DIF',ovr:69},{n:'Valincic',pos:'DIF',ovr:68},{n:'Nevistic',pos:'POR',ovr:71}],
    'Shakhtar Donetsk': [{n:'Sudakov',pos:'CEN',ovr:82},{n:'Traore',pos:'ATT',ovr:77},{n:'Kaua Elias',pos:'ATT',ovr:74},{n:'Pedrinho',pos:'CEN',ovr:75},{n:'Marlon Gomes',pos:'CEN',ovr:74},{n:'Isaque',pos:'CEN',ovr:73},{n:'Bondar',pos:'DIF',ovr:76},{n:'Matviyenko',pos:'DIF',ovr:75},{n:'Vinicius Tobias',pos:'DIF',ovr:73},{n:'Karavaiev',pos:'DIF',ovr:72},{n:'Riznyk',pos:'POR',ovr:70}],
    'Club Brugge': [{n:'Vanaken',pos:'CEN',ovr:82},{n:'Tzolis',pos:'ATT',ovr:79},{n:'Nielsen',pos:'ATT',ovr:76},{n:'Jashari',pos:'CEN',ovr:78},{n:'Onyedika',pos:'CEN',ovr:74},{n:'Sabbe',pos:'DIF',ovr:73},{n:'Mechele',pos:'DIF',ovr:73},{n:'Spileers',pos:'DIF',ovr:72},{n:'Meijer',pos:'DIF',ovr:71},{n:'Mignolet',pos:'POR',ovr:76}],
    'Anderlecht': [{n:'Hazard',pos:'ATT',ovr:78},{n:'Verschaeren',pos:'CEN',ovr:77},{n:'Stroeykens',pos:'CEN',ovr:75},{n:'Sikan',pos:'ATT',ovr:73},{n:'Huerta',pos:'ATT',ovr:72},{n:'Rits',pos:'CEN',ovr:73},{n:'Foket',pos:'DIF',ovr:72},{n:'Sardella',pos:'DIF',ovr:71},{n:'Kana',pos:'DIF',ovr:70},{n:'Coosemans',pos:'POR',ovr:74}],
    'Young Boys': [{n:'Fassnacht',pos:'ATT',ovr:76},{n:'Sanches',pos:'CEN',ovr:75},{n:'Bedia',pos:'ATT',ovr:74},{n:'Hadjam',pos:'DIF',ovr:73},{n:'Ganvoula',pos:'ATT',ovr:72},{n:'Elia',pos:'ATT',ovr:71},{n:'Rieder',pos:'CEN',ovr:72},{n:'Lauper',pos:'CEN',ovr:70},{n:'Camara',pos:'DIF',ovr:69},{n:'Kayondo',pos:'POR',ovr:68}],
    'Salisburgo': [{n:'Ratkov',pos:'ATT',ovr:76},{n:'Kjaergaard',pos:'CEN',ovr:75},{n:'Vertessen',pos:'ATT',ovr:73},{n:'Alajbegovic',pos:'ATT',ovr:74},{n:'Bidstrup',pos:'CEN',ovr:73},{n:'Diabate',pos:'DIF',ovr:71},{n:'Lainer',pos:'DIF',ovr:73},{n:'Rasmussen',pos:'DIF',ovr:72},{n:'Baidoo',pos:'DIF',ovr:70},{n:'Schlager',pos:'POR',ovr:74}],
    'Aberdeen': [{n:'Mitov',pos:'POR',ovr:66},{n:'Devlin',pos:'DIF',ovr:64},{n:'McIntyre',pos:'DIF',ovr:63},{n:'Molloy',pos:'DIF',ovr:60},{n:'Armstrong',pos:'CEN',ovr:68},{n:'Palaversa',pos:'CEN',ovr:65},{n:'Cameron',pos:'CEN',ovr:61},{n:'Milanovic',pos:'ATT',ovr:62}],
    'Molde': [{n:'Haugen',pos:'POR',ovr:63},{n:'Breivik',pos:'DIF',ovr:65},{n:'Granaas',pos:'DIF',ovr:60},{n:'Møller Dæhli',pos:'CEN',ovr:70},{n:'Hansen',pos:'CEN',ovr:62},{n:'Abdullai',pos:'ATT',ovr:64},{n:'Gulbrandsen',pos:'ATT',ovr:66},{n:'Kikkenborg',pos:'ATT',ovr:60}],
    'AZ Alkmaar': [{n:'Owusu-Oduro',pos:'POR',ovr:66},{n:'Goes',pos:'DIF',ovr:69},{n:'Hoedt',pos:'DIF',ovr:68},{n:'Kasius',pos:'DIF',ovr:65},{n:'Koopmeiners',pos:'CEN',ovr:70},{n:'Clasie',pos:'CEN',ovr:67},{n:'Smit',pos:'CEN',ovr:64},{n:'Byskov',pos:'ATT',ovr:63}],
    'Nizza': [{n:'Diouf',pos:'POR',ovr:69},{n:'Bombito',pos:'DIF',ovr:71},{n:'Clauss',pos:'DIF',ovr:70},{n:'Bonfim',pos:'DIF',ovr:66},{n:'Boudaoui',pos:'CEN',ovr:72},{n:'Sanson',pos:'CEN',ovr:65},{n:'Diop',pos:'ATT',ovr:71},{n:'Wahi',pos:'ATT',ovr:70}],
    'Lens': [{n:'Samba',pos:'POR',ovr:71},{n:'Gradit',pos:'DIF',ovr:69},{n:'Medina',pos:'DIF',ovr:66},{n:'Machado',pos:'DIF',ovr:64},{n:'Mendy',pos:'CEN',ovr:65},{n:'Thauvin',pos:'ATT',ovr:72},{n:'Edouard',pos:'ATT',ovr:71},{n:'Said',pos:'ATT',ovr:63}],
    'Konyaspor': [{n:'Demirbag',pos:'POR',ovr:60},{n:'Bardhi',pos:'CEN',ovr:66},{n:'Ndao',pos:'CEN',ovr:62},{n:'Turuc',pos:'CEN',ovr:60},{n:'Muleka',pos:'ATT',ovr:65},{n:'Bostan',pos:'ATT',ovr:59},{n:'Yalcin',pos:'DIF',ovr:58},{n:'Kaya',pos:'DIF',ovr:56}],
    'Legia Varsavia': [{n:'Hindrich',pos:'POR',ovr:64},{n:'Vinagre',pos:'DIF',ovr:67},{n:'Piatkowski',pos:'DIF',ovr:65},{n:'Reca',pos:'DIF',ovr:63},{n:'Kapustka',pos:'CEN',ovr:68},{n:'Urbanski',pos:'CEN',ovr:64},{n:'Szymanski',pos:'CEN',ovr:62},{n:'Rajovic',pos:'ATT',ovr:65}],
    'Slovan Bratislava': [{n:'Takac',pos:'POR',ovr:62},{n:'Wimmer',pos:'DIF',ovr:66},{n:'Kozlovsky',pos:'DIF',ovr:60},{n:'Marković',pos:'DIF',ovr:59},{n:'Pokorny',pos:'CEN',ovr:63},{n:'Ignatenko',pos:'CEN',ovr:61},{n:'Sporar',pos:'ATT',ovr:68},{n:'Kuharevich',pos:'ATT',ovr:60}],
    'Cluj': [{n:'Gal',pos:'POR',ovr:60},{n:'Camora',pos:'DIF',ovr:63},{n:'Kresic',pos:'DIF',ovr:61},{n:'Masic',pos:'DIF',ovr:59},{n:'Barrios',pos:'CEN',ovr:62},{n:'Fica',pos:'CEN',ovr:58},{n:'Cordea',pos:'ATT',ovr:64},{n:'Biliboc',pos:'ATT',ovr:57}],
    'Ludogorets': [{n:'Padt',pos:'POR',ovr:63},{n:'Verdon',pos:'DIF',ovr:60},{n:'Cauly',pos:'CEN',ovr:66},{n:'Piotrowski',pos:'CEN',ovr:62},{n:'Tissera',pos:'ATT',ovr:68},{n:'Duah',pos:'ATT',ovr:66},{n:'Machado',pos:'ATT',ovr:61},{n:'Tekpetey',pos:'ATT',ovr:60}],
    'Gent': [{n:'Roef',pos:'POR',ovr:65},{n:'Torunarigha',pos:'DIF',ovr:63},{n:'Fofana',pos:'DIF',ovr:61},{n:'Peersman',pos:'DIF',ovr:60},{n:'Orban',pos:'CEN',ovr:66},{n:'Kums',pos:'CEN',ovr:64},{n:'Gudjohnsen',pos:'ATT',ovr:62},{n:'Nurudeen',pos:'ATT',ovr:59}],
    'Vitoria Guimaraes': [{n:'Bruno Varela',pos:'POR',ovr:64},{n:'Abascal',pos:'DIF',ovr:63},{n:'Alvaro Djalo',pos:'DIF',ovr:60},{n:'Samu',pos:'CEN',ovr:65},{n:'Ohashi',pos:'CEN',ovr:61},{n:'Oliveira',pos:'ATT',ovr:64},{n:'Camara',pos:'ATT',ovr:63},{n:'Tiago Silva',pos:'ATT',ovr:58}],
    'Maccabi Tel Aviv': [{n:'Melika',pos:'POR',ovr:62},{n:'Heitor',pos:'DIF',ovr:63},{n:'Revivo',pos:'DIF',ovr:61},{n:'Ben Harush',pos:'DIF',ovr:59},{n:'Peretz',pos:'CEN',ovr:64},{n:'Belic',pos:'CEN',ovr:62},{n:'Varela',pos:'ATT',ovr:65},{n:'Jehezkel',pos:'ATT',ovr:60}],
    'Rakow Czestochowa': [{n:'Trelowski',pos:'POR',ovr:62},{n:'Racovitan',pos:'DIF',ovr:64},{n:'Dawidowicz',pos:'DIF',ovr:62},{n:'Tudor',pos:'DIF',ovr:59},{n:'Adriano',pos:'CEN',ovr:63},{n:'Repka',pos:'CEN',ovr:60},{n:'Emreli',pos:'ATT',ovr:67},{n:'Ojo',pos:'ATT',ovr:58}],
    'APOEL': [{n:'Bruno Vale',pos:'POR',ovr:61},{n:'Laifis',pos:'DIF',ovr:63},{n:'Degenek',pos:'DIF',ovr:64},{n:'Stafylidis',pos:'DIF',ovr:60},{n:'Rosa',pos:'CEN',ovr:62},{n:'Limnios',pos:'CEN',ovr:64},{n:'Djuricic',pos:'ATT',ovr:66},{n:'Sotiriou',pos:'ATT',ovr:62}],
    'Zorya Luhansk': [{n:'Rybak',pos:'POR',ovr:58},{n:'Eskinja',pos:'DIF',ovr:59},{n:'Henrique',pos:'DIF',ovr:58},{n:'Jordan',pos:'DIF',ovr:57},{n:'Andjusic',pos:'CEN',ovr:60},{n:'Basic',pos:'CEN',ovr:58},{n:'Glushchenko',pos:'ATT',ovr:59},{n:'Zadorozhnyi',pos:'ATT',ovr:57}],
    'Apollon Limassol': [{n:'Leeuwenburgh',pos:'POR',ovr:63},{n:'Goldson',pos:'DIF',ovr:66},{n:'Aiwu',pos:'DIF',ovr:62},{n:'Bruno Gaspar',pos:'DIF',ovr:60},{n:'Rodrigues',pos:'CEN',ovr:64},{n:'Assuncao',pos:'CEN',ovr:61},{n:'Ugbo',pos:'ATT',ovr:65},{n:'Asoro',pos:'ATT',ovr:62}],
    'Silkeborg': [{n:'Larsen',pos:'POR',ovr:60},{n:'Ostrom',pos:'DIF',ovr:59},{n:'Poulsen',pos:'DIF',ovr:58},{n:'Ganchas',pos:'DIF',ovr:57},{n:'Oxenberg',pos:'CEN',ovr:61},{n:'Kirk',pos:'CEN',ovr:59},{n:'Ross',pos:'ATT',ovr:62},{n:'McCowatt',pos:'ATT',ovr:60}],
    'Vikingur Reykjavik': [{n:'Jonsson',pos:'POR',ovr:56},{n:'Stefansson',pos:'DIF',ovr:55},{n:'Thorkelsson',pos:'DIF',ovr:54},{n:'Finnbogason',pos:'CEN',ovr:55},{n:'Sigurdsson',pos:'CEN',ovr:57},{n:'Omarsson',pos:'ATT',ovr:60},{n:'Borgthorsson',pos:'ATT',ovr:58},{n:'Ingolfsson',pos:'ATT',ovr:55}],
    'Lincoln Red Imps': [{n:'Nauzet Garcia',pos:'POR',ovr:52},{n:'Mandi',pos:'DIF',ovr:51},{n:'Rutjens',pos:'DIF',ovr:50},{n:'Nano',pos:'CEN',ovr:52},{n:'Alvaro Romero',pos:'CEN',ovr:51},{n:'Casciaro',pos:'ATT',ovr:54},{n:'Kike Gomez',pos:'ATT',ovr:52},{n:'Sciortino',pos:'ATT',ovr:50}],
  };


  const EURO_CLUB_PREFIX = ['Dynamo', 'Slavia', 'Sporting', 'Real', 'Atletico', 'Union', 'Rapid', 'Steaua', 'Partizan', 'Spartak', 'Legia', 'CSKA', 'Olympique', 'Girondins', 'Racing', 'FC'];

  const EURO_CITIES = ['Praga', 'Varsavia', 'Vienna', 'Zagabria', 'Belgrado', 'Sofia', 'Bucarest', 'Atene', 'Lisbona', 'Porto', 'Bruges', 'Rotterdam', 'Basilea', 'Zurigo', 'Salisburgo', 'Copenaghen', 'Oslo', 'Stoccolma', 'Helsinki', 'Bratislava', 'Budapest', 'Istanbul', 'Mosca', 'Kiev'];

  /* ---------------- ruoli + marcatori ---------------- */
  // Ogni giocatore ha un ruolo che ne condiziona la probabilità di segnare: gli
  // attaccanti vanno in gol molto più spesso, i centrocampisti con moderazione, i
  // difensori raramente, i portieri quasi mai (un'autorete avversaria a parte).
  const POS_LABEL = { POR: 'Portiere', DIF: 'Difensore', CEN: 'Centrocampista', ATT: 'Attaccante' };

  const POS_SCORE_WEIGHT = { POR: 0.04, DIF: 1.1, CEN: 3.2, ATT: 8.5 };

  // Distribuzione "di base" di un ruolo in una rosa, prima di guardare ai bisogni della
  // squadra (portieri pochi, difensori e centrocampisti il grosso, attaccanti un po' meno).
  const POS_BASE_WEIGHT = { POR: 0.10, DIF: 0.35, CEN: 0.30, ATT: 0.25 };
  // Tetto massimo per ruolo: oltre questo numero, quel ruolo non viene più estratto (né
  // dagli spin né dagli svincolati né dal settore giovanile), a prescindere dal peso.
  const POS_CAP = { POR: 4, DIF: 8, CEN: 8, ATT: 6 };

  // Chi serve l'assist: i centrocampisti ne fanno di più di chiunque, gli attaccanti un
  // po' meno (spesso sono loro a essere serviti), i difensori raramente, i portieri quasi
  // mai. Non può essere lo stesso giocatore che ha segnato.
  const POS_ASSIST_WEIGHT = { POR: 0.03, DIF: 1.0, CEN: 3.4, ATT: 2.2 };

  // ---- crescita/calo dell'overall a fine stagione ----
  // Quanto ci si aspetta da un giocatore nel suo ruolo in una stagione da titolare fisso
  // (gol + 0.7 per assist): chi ha giocato meno partite viene giudicato su un'asticella
  // proporzionalmente più bassa (le sue presenze reali su quelle della squadra), non
  // sullo stesso metro di chi ha giocato sempre. Così un panchinaro che rende molto nelle
  // poche gare avute può crescere anche più di un titolare che ha deluso.
  const POS_PROD_BASELINE = { POR: 0, DIF: 2.5, CEN: 6, ATT: 12 };

  const SPONSOR_BRANDS = {
    community: ['Panetteria del Borgo', 'Assicurazioni del Porto', 'Latteria Locale', 'Birrificio Vecchio Mulino', 'Autofficina Collina', 'Pasticceria Reale', 'Ferramenta Centrale'],
    regional: ['Gruppo Adriatica', 'Edilizia del Nord', 'Distretto Energia', 'Cantine Riunite Sud', 'Trasporti Peninsulare', 'Confidi Regionale'],
    standard: ['NordGate Energia', 'Corona Telecom', 'Vetro Vertice', 'Redline Logistica', 'Ancora Finanza', 'Orizzonte Assicurazioni'],
    betting: ['ScommettiBene', 'FortunaKick', 'GoalRush Casinò', 'BetNazione', 'SpinWin', 'JackpotArena'],
    global: ['Atlas Global', 'Vantage Air', 'Nimbus Tech', 'Meridian Bank', 'Solaris Motori', 'Zenith Capital'],
  };

  // Allenatori reali: si aggiungono ai candidati generati (non li sostituiscono), pescati
  // solo quando il loro rating è vicino a quello richiesto dal club che offre il posto.
  const REAL_MANAGERS = [
    { n: 'Pep Guardiola', rating: 93 }, { n: 'Carlo Ancelotti', rating: 91 }, { n: 'Jurgen Klopp', rating: 90 },
    { n: 'Antonio Conte', rating: 88 }, { n: 'Luciano Spalletti', rating: 81 }, { n: 'Simone Inzaghi', rating: 85 },
    { n: 'Massimiliano Allegri', rating: 84 }, { n: 'Gian Piero Gasperini', rating: 82 }, { n: 'Thiago Motta', rating: 78 },
    { n: 'Stefano Pioli', rating: 77 }, { n: 'Roberto Mancini', rating: 76 }, { n: 'Claudio Ranieri', rating: 75 },
    { n: 'Vincenzo Italiano', rating: 76 }, { n: 'Gennaro Gattuso', rating: 73 }, { n: 'Ivan Juric', rating: 69 },
    { n: 'Walter Mazzarri', rating: 70 }, { n: 'Marco Baroni', rating: 67 }, { n: 'Raffaele Palladino', rating: 71 },
    { n: 'Eusebio Di Francesco', rating: 65 }, { n: 'Alberto Gilardino', rating: 64 }, { n: 'Davide Nicola', rating: 63 },
    { n: 'Paolo Zanetti', rating: 66 }, { n: 'Fabio Pecchia', rating: 61 }, { n: 'Rolando Maran', rating: 60 },
    { n: 'Fabio Liverani', rating: 58 }, { n: 'Fabio Cannavaro', rating: 59 }, { n: 'Cristian Bucchi', rating: 56 },
  ];

  /* ---------------- stato ---------------- */
  const MAX_SEASONS = 20;

  /* ---------------- settore giovanile / scouting ---------------- */
  // Un investimento persistente (4 livelli) che rende ogni spin migliore in media e più
  // affidabile (meno varianza), e alza la chance del "colpo" da titoli di giornale. Dal
  // livello 2 in su può anche regalare un giovane di prospettiva gratis a inizio stagione.
  const SCOUT_TIERS = [
    { name: 'Nessuno', bonus: 0, varDelta: 0, gem: 0, prospectChance: 0 },
    { name: 'Base', bonus: 2, varDelta: -0.6, gem: 0.02, prospectChance: 0.20 },
    { name: 'Avanzato', bonus: 4, varDelta: -1.1, gem: 0.05, prospectChance: 0.38 },
    { name: 'Elite', bonus: 7, varDelta: -1.6, gem: 0.09, prospectChance: 0.60 },
  ];

  const MIN_SQUAD = 16;

  /* ---------------- avvio + acquisizione ---------------- */
  // Non si sceglie più un club con un nome già dato: si sceglie una SITUAZIONE di
  // partenza (che tipo di presidenza sarà). Il nome del club lo decide chi gioca, nel
  // campo qui sopra, pre-compilato con un suggerimento a caso.
  // Ogni situazione ha una variante di titolo/racconto per fascia di categoria (bassa:
  // Eccellenza-Serie C, media: Serie B, alta: Serie A): gli stessi 4 archetipi economici,
  // ma raccontati in modo che abbia senso anche partendo già in alto — "piccola realtà" o
  // "provincia" restano credibili in Serie A (Cagliari, Lecce...) ma con un altro nome e
  // un'altra storia, non lo stesso testo pensato per l'Eccellenza.
  const SITUATIONS = [
    {
      key: 'gigante', strRange: [46, 54], budgetRange: [1.6e6, 2.3e6], stadiumTier: 1, stadiumChance: 0.7, fanbaseRange: [1.15, 1.35],
      variants: {
        low: { title: 'Gigante in declino', blurb: 'Una piazza che sogna ancora la Serie A: tanta tifoseria, casse quasi vuote.' },
        mid: { title: 'Nobile decaduta', blurb: 'Una big retrocessa che non si è ancora ripresa: tanta tifoseria, conti in affanno.' },
        high: { title: 'Big in crisi', blurb: 'Un nome che pesa in Europa ma le ultime stagioni sono state dure: tifoseria enorme, casse in rosso.' },
      },
    },
    {
      key: 'piccola', strRange: [42, 50], budgetRange: [2.8e6, 3.9e6], stadiumTier: 0, stadiumChance: 0, fanbaseRange: [0.85, 1.0],
      variants: {
        low: { title: 'Piccola realtà solida', blurb: 'Pochi tifosi ma conti sempre in ordine: un progetto costruito con pazienza.' },
        mid: { title: 'Matricola tranquilla', blurb: 'Pochi clamori ma bilanci sani: una salvezza onesta come obiettivo minimo.' },
        high: { title: 'Provinciale di lusso', blurb: 'Una piazza raccolta ma organizzata: bilanci in ordine anche nella categoria più cara d\'Europa.' },
      },
    },
    {
      key: 'matricola', strRange: [44, 52], budgetRange: [3.5e6, 4.6e6], stadiumTier: 0, stadiumChance: 0.2, fanbaseRange: [0.9, 1.05],
      variants: {
        low: { title: 'Matricola ambiziosa', blurb: 'Presidente facoltoso, fame di categoria superiore: il budget più alto sul tavolo.' },
        mid: { title: 'Progetto ambizioso', blurb: 'Un fondo con soldi veri punta dritto alla Serie A: il budget più alto sul tavolo.' },
        high: { title: 'Nuova proprietà facoltosa', blurb: 'Un fondo straniero ha appena rilevato il club con ambizioni europee: il budget più alto sul tavolo.' },
      },
    },
    {
      key: 'provincia', strRange: [43, 51], budgetRange: [2.2e6, 2.9e6], stadiumTier: 0, stadiumChance: 0, fanbaseRange: [0.95, 1.1],
      variants: {
        low: { title: 'Club di provincia stabile', blurb: 'Nessun lusso, ma né debiti né sorprese: si parte alla pari con tutti.' },
        mid: { title: 'Onesta realtà di categoria', blurb: 'Nessun lusso, ma né debiti né sorprese: una stagione tranquilla è già un successo.' },
        high: { title: 'Piazza storica in equilibrio', blurb: 'Nessun lusso, ma né debiti né sorprese: la permanenza tranquilla è l\'obiettivo.' },
      },
    },
  ];
