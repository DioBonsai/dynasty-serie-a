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

  // Quota di italiani per categoria (indice = S.div, 0=Eccellenza … 4=Serie A): scende
  // gradualmente, come la vera piramide del calcio italiano.
  const ITA_SHARE = [0.97, 0.90, 0.75, 0.55, 0.35];

  const CREST_DEFAULT = { shape: 'shield', colors: ['#f0c869', '#7a4f16'] };

  // Coppe europee: l'avversario è straniero, quindi non peschiamo dai nostri database
  // italiani ma generiamo un nome plausibile combinando un prefisso e una città europee.
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
    community: ['Panetteria del Borgo', 'Assicurazioni del Porto', 'Latteria Locale', 'Birrificio Vecchio Mulino', 'Autofficina Collina'],
    standard: ['NordGate Energia', 'Corona Telecom', 'Vetro Vertice', 'Redline Logistica', 'Ancora Finanza'],
    betting: ['ScommettiBene', 'FortunaKick', 'GoalRush Casinò', 'BetNazione', 'SpinWin'],
    global: ['Atlas Global', 'Vantage Air', 'Nimbus Tech', 'Meridian Bank', 'Solaris Motori'],
  };

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
  const SITUATIONS = [
    { key: 'gigante', title: 'Gigante in declino', blurb: 'Una piazza che sogna ancora la Serie A: tanta tifoseria, casse quasi vuote.', strRange: [46, 54], budgetRange: [1.6e6, 2.3e6], stadiumTier: 1, stadiumChance: 0.7, fanbaseRange: [1.15, 1.35] },
    { key: 'piccola', title: 'Piccola realtà solida', blurb: 'Pochi tifosi ma conti sempre in ordine: un progetto costruito con pazienza.', strRange: [42, 50], budgetRange: [2.8e6, 3.9e6], stadiumTier: 0, stadiumChance: 0, fanbaseRange: [0.85, 1.0] },
    { key: 'matricola', title: 'Matricola ambiziosa', blurb: 'Presidente facoltoso, fame di categoria superiore: il budget più alto sul tavolo.', strRange: [44, 52], budgetRange: [3.5e6, 4.6e6], stadiumTier: 0, stadiumChance: 0.2, fanbaseRange: [0.9, 1.05] },
    { key: 'provincia', title: 'Club di provincia stabile', blurb: 'Nessun lusso, ma né debiti né sorprese: si parte alla pari con tutti.', strRange: [43, 51], budgetRange: [2.2e6, 2.9e6], stadiumTier: 0, stadiumChance: 0, fanbaseRange: [0.95, 1.1] },
  ];
