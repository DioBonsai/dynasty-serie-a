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
  // Sei categorie, dal basso in alto. teams determina il numero di giornate ((teams-1)*2).
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
  // vera Serie B), ultime 3 giù. Serie A: ultime 3 giù. Promozione: come Eccellenza,
  // prime 2 dirette + playoff, nessuna retrocessione modellata sotto di lei.
  const DIVS = [
    { name: 'Promozione', teams: 24, avg: 48, demand: 2200, ticket: 9, prize: 0.06e6, perPlace: 3e3, promoted: 2, playoff: 4, releg: 0, promoBonus: 0.3e6, titleBonus: 0.12e6, spin: 40e3, premium: 120e3, cupBase: 18e3, admin: 60e3, mgrBase: 46, investor: 150e3 },
    { name: 'Eccellenza', teams: 24, avg: 55, demand: 4200, ticket: 14, prize: 0.15e6, perPlace: 6e3, promoted: 2, playoff: 4, releg: 3, promoBonus: 0.6e6, titleBonus: 0.25e6, spin: 75e3, premium: 225e3, cupBase: 35e3, admin: 120e3, mgrBase: 52, investor: 300e3 },
    { name: 'Serie D', teams: 24, avg: 62, demand: 7500, ticket: 17, prize: 1.0e6, perPlace: 15e3, promoted: 3, playoff: 4, releg: 2, promoBonus: 1.2e6, titleBonus: 0.5e6, spin: 200e3, premium: 600e3, cupBase: 70e3, admin: 250e3, mgrBase: 58, investor: 600e3 },
    { name: 'Serie C', teams: 24, avg: 68, demand: 13000, ticket: 21, prize: 1.6e6, perPlace: 25e3, promoted: 2, playoff: 4, releg: 4, promoBonus: 3e6, titleBonus: 1e6, spin: 500e3, premium: 2.5e6, cupBase: 140e3, admin: 450e3, mgrBase: 63, investor: 1.2e6 },
    { name: 'Serie B', teams: 20, avg: 74, demand: 24000, ticket: 28, prize: 9e6, perPlace: 120e3, promoted: 2, playoff: 6, releg: 3, promoBonus: 130e6, titleBonus: 3e6, spin: 1.5e6, premium: 8e6, cupBase: 500e3, admin: 1.5e6, mgrBase: 69, investor: 5e6 },
    { name: 'Serie A', teams: 20, avg: 83, demand: 52000, ticket: 42, prize: 105e6, perPlace: 3.1e6, promoted: 0, playoff: 0, releg: 3, euroSpots: 4, uelPos: 5, confPos: 6, promoBonus: 0, titleBonus: 30e6, spin: 6e6, premium: 30e6, cupBase: 2e6, admin: 6e6, mgrBase: 76, investor: 15e6 },
  ];

  // La Coppa Italia è UNA sola coppa, non sei tornei separati: nella realtà il tabellone
  // dei "grandi" (44 squadre fra Serie A/B/C) è preceduto da un intero percorso di turni
  // per chi parte dai dilettanti — chi è più in basso nella piramide deve semplicemente
  // superare più turni per arrivare alla stessa identica finale, esattamente come le
  // teste di serie di Serie A (le prime 8 dell'anno prima) entrano direttamente agli
  // ottavi mentre gli altri club entrano nei turni precedenti. Stesso trofeo in fondo al
  // percorso per tutti, solo il numero di ostacoli prima cambia con la categoria. Regola
  // reale 2024/25: gara secca fino agli ottavi, quarti e semifinale andata/ritorno,
  // finale gara secca in sede neutra (Stadio Olimpico) — qui replicata su MISURA per
  // ciascuna categoria (gli ultimi due turni prima della finale sono sempre quelli a
  // doppio confronto, quali che siano nel tabellone di quella categoria).
  const CUP_ROUNDS_BY_DIV = [
    ['Turno preliminare', 'Primo turno', 'Secondo turno', 'Trentaduesimi', 'Sedicesimi', 'Ottavi', 'Quarti', 'Semifinale', 'Finale'],
    ['Primo turno', 'Secondo turno', 'Trentaduesimi', 'Sedicesimi', 'Ottavi', 'Quarti', 'Semifinale', 'Finale'],
    ['Secondo turno', 'Trentaduesimi', 'Sedicesimi', 'Ottavi', 'Quarti', 'Semifinale', 'Finale'],
    ['Trentaduesimi', 'Sedicesimi', 'Ottavi', 'Quarti', 'Semifinale', 'Finale'],
    ['Sedicesimi', 'Ottavi', 'Quarti', 'Semifinale', 'Finale'],
    ['Ottavi', 'Quarti', 'Semifinale', 'Finale'],
  ];

  // Tetto massimo di overall raggiungibile con uno spin, per categoria: vale ALLO STESSO
  // MODO sia per i giocatori generati sia per quelli veri pescati dalle rose reali (vedi
  // spinPlayer in sim.js) — prima i giocatori veri erano di fatto limitati più in basso
  // (dalla fascia usata per cercarli) rispetto al tetto "ufficiale" applicato solo ai
  // generati, un'incoerenza. Stesso ordine di DIVS: Promozione…Serie A.
  const SPIN_CAPS = [
    { base: 64, premium: 76 },
    { base: 71, premium: 80 },
    { base: 78, premium: 85 },
    { base: 84, premium: 90 },
    { base: 90, premium: 95 },
    { base: 95, premium: 99 },
  ];

  // Il modulo scelto ora pesa davvero sulla partita (prima era solo l'anteprima grafica):
  // atk/def sono un piccolo delta aggiunto/sottratto al numero atteso di gol fatti/subiti.
  // Un modulo più offensivo (3-4-3) segna un po' di più ma incassa un po' di più; uno più
  // difensivo (5-3-2) il contrario. Il 4-3-3 resta il modulo "neutro" di riferimento.
  const FORMATION_TACTICS = {
    '433': { atk: 0, def: 0 },
    '442': { atk: -0.03, def: -0.05 },
    '352': { atk: 0.03, def: 0.04 },
    '4231': { atk: 0.06, def: 0.02 },
    '343': { atk: 0.14, def: 0.12 },
    '532': { atk: -0.14, def: -0.12 },
    '424': { atk: 0.22, def: 0.20 },   // il più sbilanciato in avanti di tutti: 4 attaccanti, solo 2 mediani a coprire
  };

  // Eventi narrativi casuali: pura ambientazione fra una partita e l'altra (non toccano
  // rosa/infortuni/squalifiche, quelli restano gestiti dal motore partite), un piccolo
  // bump di umore/gradimento/budget per dare al gioco qualche "storia" oltre ai numeri di
  // bilancio. Un evento SENZA `choices` applica il suo effetto e si limita a un bottone
  // "Continua"; uno CON `choices` lascia scegliere fra 2 opzioni con esiti diversi, ed è
  // l'effetto della scelta (non un default) a essere applicato.
  const NARRATIVE_EVENTS = [
    { icon: '🔥', title: 'Striscione in curva', text: 'Un vecchio striscione della curva torna a sventolare prima della sfida più sentita: la squadra sente il calore del pubblico.', sent: 4 },
    { icon: '😠', title: 'Caso spogliatoio', text: 'Un piccolo caso spogliatoio tiene banco per qualche giorno prima di rientrare.', sent: -4 },
    { icon: '📣', title: 'Marcia dei tifosi', text: 'I tifosi organizzano una marcia di sostegno alla squadra alla vigilia di una partita delicata.', sent: 5 },
    { icon: '📰', title: 'Elogio della stampa', text: 'La stampa locale elogia la gestione economica del club.', sent: 2, budgetPct: 0.004 },
    {
      icon: '🚑', title: 'Allarme alla vigilia',
      requires: (S) => S.squad && S.squad.some((p) => !p.loan),
      build: (S) => ({ player: S.squad.filter((p) => !p.loan).sort((a, b) => b.ovr - a.ovr)[0] }),
      text: (S, ctx) => (ctx && ctx.player ? ctx.player.n : 'Un titolare') + ' si ferma precauzionalmente alla vigilia per un fastidio muscolare: lo staff medico preferisce non rischiare.',
      sent: -3,
    },
    { icon: '🌱', title: 'Il vivaio fa notizia', text: 'Il settore giovanile viene lodato in un articolo sulla stampa sportiva.', sent: 3 },
    { icon: '📺', title: 'Servizio TV', text: 'Un servizio TV racconta la crescita del club: la piazza si sente vista.', sent: 3 },
    { icon: '🏗️', title: 'Ritardi allo stadio', text: 'Ritardi nei lavori allo stadio fanno discutere i tifosi abbonati.', sent: -2 },
    {
      icon: '💰', title: 'Sirene di mercato',
      requires: (S) => S.squad && S.squad.some((p) => !p.loan && p.age <= 24),
      build: (S) => ({ player: S.squad.filter((p) => !p.loan && p.age <= 24).sort((a, b) => b.ovr - a.ovr)[0] }),
      text: (S, ctx) => 'Un club più ricco fa la corte a ' + (ctx && ctx.player ? ctx.player.n : 'uno dei tuoi giovani migliori') + ': la piazza aspetta una tua parola.',
      choices: [
        { label: 'Rassicura pubblicamente i tifosi', sent: 4 },
        { label: 'Lascia correre le voci', sent: -3 },
      ],
    },
    {
      icon: '🤝', title: 'Offerta sponsor lampo',
      text: 'Uno sponsor locale offre un contributo una tantum per un\'iniziativa benefica legata al club.',
      choices: [
        { label: 'Accetta, i tifosi apprezzeranno', sent: 5, budgetPct: 0.008 },
        { label: 'Rifiuta, meglio restare indipendenti', sent: -1 },
      ],
    },
    {
      icon: '🟨', title: 'Polemica arbitrale',
      text: 'Le polemiche sull\'ultima direzione di gara infiammano il dibattito in città: la stampa aspetta una reazione del presidente.',
      choices: [
        { label: 'Attacca pubblicamente l\'arbitro', sent: 3, ownerRating: -2 },
        { label: 'Minimizza, testa bassa', sent: -1, ownerRating: 1 },
      ],
    },
    {
      icon: '🎽', title: 'Visita a sorpresa',
      text: 'Un ex giocatore del club, ora ritirato, si presenta a sorpresa agli allenamenti.',
      choices: [
        { label: 'Organizza un evento con i tifosi', sent: 5, budgetPct: -0.003 },
        { label: 'Una visita informale, niente di più', sent: 1 },
      ],
    },
    {
      icon: '🗞️', title: 'Cambio di proprietà nell\'aria',
      text: 'Le voci su un possibile cambio di proprietà agitano l\'ambiente per qualche giorno.',
      choices: [
        { label: 'Smentisci con una conferenza stampa', sent: 2, ownerRating: 2 },
        { label: 'Ignora le voci', sent: -3 },
      ],
    },
    {
      icon: '🎓', title: 'Talento del vivaio in pressing',
      requires: (S) => S.squad && S.squad.some((p) => !p.loan && p.age <= 21),
      build: (S) => ({ player: S.squad.filter((p) => !p.loan && p.age <= 21).sort((a, b) => a.age - b.age)[0] }),
      text: (S, ctx) => (ctx && ctx.player ? ctx.player.n : 'Un prodotto del settore giovanile') + ' chiede al mister maggiore spazio in prima squadra.',
      choices: [
        { label: 'Promettigli spazio nelle prossime partite', sent: 3 },
        { label: 'Chiedigli ancora un po\' di pazienza', sent: -2 },
      ],
    },
    {
      icon: '🎟️', title: 'Polemica sui prezzi dei biglietti',
      text: 'I tifosi protestano per il prezzo dei biglietti dell\'ultima trasferta.',
      choices: [
        { label: 'Scusati e promuovi un tetto ai prezzi', sent: 4, budgetPct: -0.005 },
        { label: 'Difendi la scelta commerciale', sent: -3, budgetPct: 0.004 },
      ],
    },
    {
      icon: '⚔️', title: 'Vigilia di derby',
      text: 'Il derby cittadino è alle porte e la tensione in città sale di ora in ora.',
      choices: [
        { label: 'Lancia un appello alla sportività', sent: 2, ownerRating: 1 },
        { label: 'Carica l\'ambiente con dichiarazioni piccanti', sent: 5, ownerRating: -2 },
      ],
    },
    {
      icon: '📸', title: 'Video virale imbarazzante',
      text: 'Un video di allenamento finito online mette in imbarazzo lo spogliatoio.',
      choices: [
        { label: 'Minimizza con ironia sui social', sent: 2 },
        { label: 'Convoca una riunione interna severa', sent: -2, ownerRating: 2 },
      ],
    },
    {
      icon: '🌧️', title: 'Il campo è da rifare',
      text: 'Il terreno di gioco è in condizioni pessime e i giocatori si lamentano apertamente.',
      choices: [
        { label: 'Investi subito in manutenzione', sent: 3, budgetPct: -0.01 },
        { label: 'Rimanda l\'intervento a fine stagione', sent: -3 },
      ],
    },
    {
      icon: '🎗️', title: 'Invito di beneficenza',
      text: 'Una onlus locale invita la squadra a disputare una partita di beneficenza.',
      choices: [
        { label: 'Accetta con entusiasmo', sent: 5, budgetPct: -0.002 },
        { label: 'Declina per il fitto calendario', sent: -1 },
      ],
    },
    {
      icon: '🕵️', title: 'Scout avversario in tribuna',
      text: 'Uno scout di un club rivale è stato avvistato allo stadio durante l\'ultimo allenamento.',
      choices: [
        { label: 'Blinda gli allenamenti agli estranei', ownerRating: 1 },
        { label: 'Non dare peso alla cosa', sent: -1 },
      ],
    },
    {
      icon: '🎂', title: 'Anniversario del club',
      text: 'Ricorre un anniversario storico della fondazione del club.',
      choices: [
        { label: 'Organizza una grande festa per i tifosi', sent: 6, budgetPct: -0.006 },
        { label: 'Una cerimonia sobria, senza spese', sent: 2 },
      ],
    },
    {
      icon: '🗯️', title: 'Giocatore nel mirino dei social',
      requires: (S) => S.squad && S.squad.some((p) => !p.loan),
      build: (S) => ({ player: S.squad.filter((p) => !p.loan).sort((a, b) => b.ovr - a.ovr)[0] }),
      text: (S, ctx) => (ctx && ctx.player ? ctx.player.n : 'Un big della rosa') + ' è bersaglio di critiche pesanti sui social dopo l\'ultima uscita.',
      choices: [
        { label: 'Difendilo pubblicamente', sent: 2, ownerRating: 1 },
        { label: 'Lascia correre senza commenti', sent: -2 },
      ],
    },
    {
      icon: '🏅', title: 'Premio alla carriera per il presidente',
      text: 'Un\'associazione imprenditoriale locale vuole conferirti un riconoscimento alla carriera.',
      choices: [
        { label: 'Accetta e usa il palco per parlare del club', sent: 3, ownerRating: 2 },
        { label: 'Rifiuta con umiltà, il merito è di tutti', ownerRating: 1 },
      ],
    },
    // ---- eventi che toccano leve diverse dal solo umore: tifoseria, prestigio, lo sponsor
    // in carica, o direttamente un giocatore preciso della rosa (con un vero rischio) ----
    { icon: '📱', title: 'Il club diventa virale', text: 'Un contenuto social del club fa il giro del web e porta nuovi tifosi.', fanbaseDelta: 0.02, sent: 3 },
    { icon: '🙊', title: 'Gaffe sui social ufficiali', text: 'Un post infelice dai canali ufficiali allontana alcuni simpatizzanti.', fanbaseDelta: -0.02, sent: -3 },
    { icon: '🎖️', title: 'Premio al settore giovanile', text: 'Il vivaio del club riceve un riconoscimento da un ente calcistico regionale.', prestige: 1e6, sent: 2 },
    {
      icon: '🌍', title: 'Riflettori internazionali',
      text: 'Una rivista sportiva internazionale vuole raccontare la storia del club.',
      choices: [
        { label: 'Concedi l\'intervista in esclusiva', prestige: 2e6, sent: 3 },
        { label: 'Declina, meglio la riservatezza', ownerRating: 1 },
      ],
    },
    {
      icon: '🤝', title: 'Lo sponsor chiede un incontro',
      requires: (S) => !!S.sponsor,
      text: (S) => S.sponsor.name + ' propone un rinnovo anticipato dell\'accordo attuale, a condizioni migliori per entrambi.',
      choices: [
        {
          label: 'Accetta il rinnovo anticipato',
          hint: '+2 umore, +10% incasso sponsor annuo, contratto rinnovato per intero',
          apply: (S) => {
            if (!S.sponsor) return;
            S.sponsor.perYear = Math.round(S.sponsor.perYear * 1.1 / 1e4) * 1e4;
            S.sponsor.left = S.sponsor.years;
            S.sent = clamp(S.sent + 2, 0, 100);
          },
        },
        { label: 'Aspetta la scadenza naturale', sent: 1 },
      ],
    },
    {
      icon: '🩹', title: 'Titolare acciaccato, vuole giocare',
      requires: (S) => S.squad && S.squad.some((p) => !p.loan),
      build: (S) => ({ player: S.squad.filter((p) => !p.loan).sort((a, b) => b.ovr - a.ovr)[0] }),
      text: (S, ctx) => (ctx && ctx.player ? ctx.player.n : 'Il tuo giocatore migliore') + ' è acciaccato ma vuole esserci nella prossima partita, nonostante il rischio.',
      choices: [
        {
          label: 'Fallo giocare titolare',
          hint: '30% di rischio infortunio (1-3 giornate, -4 umore), altrimenti +3 umore',
          apply: (S, ctx) => {
            const p = ctx && ctx.player; if (!p) return;
            if (Math.random() < 0.3) {
              p.outWeeks = Math.max(p.outWeeks || 0, 1 + rnd(3));
              S.sent = clamp(S.sent - 4, 0, 100);
              toast(p.n + ' si infortuna e salterà le prossime partite.');
            } else {
              S.sent = clamp(S.sent + 3, 0, 100);
            }
          },
        },
        { label: 'Tienilo precauzionalmente a riposo', sent: -1 },
      ],
    },
    // ---- altri dieci imprevisti, stesso mix di prima: alcuni a esito singolo, altri a
    // scelta, un paio legati a un giocatore preciso della rosa ----
    { icon: '⚽', title: 'Vittoria in amichevole a sorpresa', text: 'Un\'amichevole estiva contro una big finisce con un successo inatteso: la piazza ne parla per giorni.', sent: 4 },
    { icon: '💸', title: 'Ritardo nei pagamenti minori', text: 'Un fornitore lamenta un ritardo nei pagamenti: nulla di grave, ma la stampa locale ne fa un caso.', sent: -2, budgetPct: -0.003 },
    {
      icon: '🎂', title: 'Compleanno in gruppo',
      requires: (S) => S.squad && S.squad.some((p) => !p.loan),
      build: (S) => ({ player: pick(S.squad.filter((p) => !p.loan)) }),
      text: (S, ctx) => 'Lo spogliatoio festeggia il compleanno di ' + (ctx && ctx.player ? ctx.player.n : 'un compagno') + ' con una piccola festa a sorpresa.',
      sent: 3,
    },
    {
      icon: '🎬', title: 'Un documentario sul club',
      text: 'Una produzione indipendente propone un documentario sulla stagione del club.',
      choices: [
        { label: 'Apri le porte alle telecamere', prestige: 1.5e6, sent: 2 },
        { label: 'Meglio restare riservati', ownerRating: 1 },
      ],
    },
    { icon: '🚌', title: 'Trasferta complicata', text: 'Uno sciopero dei trasporti rende difficile raggiungere lo stadio per l\'ultima trasferta: pochi tifosi al seguito.', sent: -2 },
    {
      icon: '🗣️', title: 'Discorso del capitano',
      requires: (S) => S.squad && S.squad.some((p) => !p.loan),
      build: (S) => ({ player: S.squad.filter((p) => !p.loan).sort((a, b) => b.ovr - a.ovr)[0] }),
      text: (S, ctx) => (ctx && ctx.player ? ctx.player.n : 'Il capitano') + ' tiene un discorso allo spogliatoio prima della sfida più difficile della stagione.',
      sent: 4,
    },
    {
      icon: '📵', title: 'Caso social nel settore giovanile',
      text: 'Un post polemico di un giovane del vivaio sui social fa discutere.',
      choices: [
        { label: 'Richiamo privato, si passa oltre', sent: -1 },
        { label: 'Comunicato ufficiale di scuse', sent: 2, ownerRating: -1 },
      ],
    },
    {
      icon: '🏟️', title: 'Naming rights per lo stadio',
      text: 'Un\'azienda locale propone di legare il proprio nome allo stadio per una stagione.',
      choices: [
        { label: 'Accetta l\'accordo', budgetPct: 0.01, sent: -2 },
        { label: 'Rifiuta, lo stadio resta suo', sent: 2 },
      ],
    },
    {
      icon: '😴', title: 'Un titolare chiede riposo',
      requires: (S) => S.squad && S.squad.some((p) => !p.loan),
      build: (S) => ({ player: S.squad.filter((p) => !p.loan).sort((a, b) => b.ovr - a.ovr)[0] }),
      text: (S, ctx) => (ctx && ctx.player ? ctx.player.n : 'Un titolare') + ' chiede di essere risparmiato nella prossima gara per stanchezza accumulata.',
      choices: [
        { label: 'Accontentalo', sent: 2 },
        { label: 'Chiedigli comunque il massimo', sent: -2 },
      ],
    },
    { icon: '🌟', title: 'Elogio dall\'estero', text: 'Una rivista sportiva straniera dedica un elogio al progetto tecnico del club.', prestige: 1e6, sent: 3 },
    // ---- altri venticinque imprevisti, per allargare il pool su una carriera di 20 stagioni
    // (con la stessa probabilità di innesco, un pool più ampio significa vederli ripetere
    // molto meno spesso) — stesso mix di sempre, nessuno con `apply` su misura oltre ai due
    // già esistenti, per restare tutti sicuri da auto-risolvere in multiplayer.
    { icon: '🎊', title: 'Festa promozione improvvisata', text: 'Un gruppo di tifosi organizza una festa spontanea sotto la sede del club dopo l\'ultimo risultato positivo.', sent: 5 },
    { icon: '🥶', title: 'Partita rinviata per neve', text: 'Il maltempo costringe a rinviare l\'ultima gara: qualche malumore fra gli abbonati per la trasferta sprecata.', sent: -2 },
    { icon: '📻', title: 'Intervista radiofonica riuscita', text: 'Un\'intervista del presidente a una radio locale viene accolta con favore dai tifosi.', sent: 3, ownerRating: 1 },
    {
      icon: '🧑‍🏫', title: 'Corso per giovani allenatori',
      text: 'Il club propone di ospitare un corso federale per giovani allenatori nel proprio centro sportivo.',
      choices: [
        { label: 'Ospitalo, ottima immagine per il club', prestige: 0.8e6, budgetPct: -0.002 },
        { label: 'Declina, servono gli spazi per la prima squadra', sent: -1 },
      ],
    },
    { icon: '🚏', title: 'Nuova linea bus per lo stadio', text: 'Il comune attiva una linea bus dedicata alle giornate di partita: più pubblico atteso.', fanbaseDelta: 0.015, sent: 2 },
    {
      icon: '🧤', title: 'Il portiere titolare in dubbio',
      requires: (S) => S.squad && S.squad.some((p) => !p.loan && p.pos === 'POR'),
      build: (S) => ({ player: S.squad.filter((p) => !p.loan && p.pos === 'POR').sort((a, b) => b.ovr - a.ovr)[0] }),
      text: (S, ctx) => (ctx && ctx.player ? ctx.player.n : 'Il portiere titolare') + ' lamenta un fastidio alla mano dopo l\'ultimo allenamento.',
      sent: -2,
    },
    {
      icon: '🏆', title: 'Sorteggio di coppa avvincente',
      text: 'Il sorteggio del turno successivo regala un accoppiamento che fa sognare la piazza.',
      choices: [
        { label: 'Cavalca l\'entusiasmo in conferenza', sent: 4, ownerRating: 1 },
        { label: 'Abbassa le aspettative, testa bassa', ownerRating: 2 },
      ],
    },
    { icon: '🖼️', title: 'Murale in onore del club', text: 'Un artista di strada dipinge un murale dedicato al club nel quartiere dello stadio.', sent: 4, prestige: 0.4e6 },
    { icon: '📉', title: 'Calo di abbonamenti', text: 'I rinnovi degli abbonamenti procedono più a rilento del previsto quest\'anno.', sent: -3, fanbaseDelta: -0.01 },
    { icon: '📈', title: 'Boom di abbonamenti', text: 'La campagna abbonamenti va oltre ogni aspettativa: la tifoseria cresce.', sent: 3, fanbaseDelta: 0.015 },
    {
      icon: '🎮', title: 'Il club sbarca nell\'eSport',
      text: 'Una software house propone di inserire il club in un videogioco di calcio ufficiale.',
      choices: [
        { label: 'Accetta, nuova visibilità per il brand', prestige: 1e6, budgetPct: 0.003 },
        { label: 'Non è una priorità adesso', sent: -1 },
      ],
    },
    {
      icon: '🧳', title: 'Ritiro estivo in una nuova località',
      text: 'Lo staff propone di cambiare sede per il ritiro pre-campionato, più costosa ma meglio attrezzata.',
      choices: [
        { label: 'Approva la spesa extra', budgetPct: -0.006, sent: 3 },
        { label: 'Resta nella sede di sempre', sent: -1 },
      ],
    },
    { icon: '🎙️', title: 'Podcast dedicato ai tifosi', text: 'Alcuni tifosi lanciano un podcast settimanale sul club: la community si stringe attorno alla squadra.', sent: 3, fanbaseDelta: 0.01 },
    {
      icon: '🥊', title: 'Battibecco fra compagni',
      requires: (S) => S.squad && S.squad.filter((p) => !p.loan).length >= 2,
      build: (S) => { const pool = S.squad.filter((p) => !p.loan); return { a: pick(pool), b: pick(pool) }; },
      text: (S, ctx) => 'Un battibecco in allenamento fra ' + (ctx && ctx.a ? ctx.a.n : 'due compagni') + ' e un altro titolare tiene banco per un giorno prima di rientrare.',
      sent: -2,
    },
    { icon: '🏥', title: 'Donazione all\'ospedale cittadino', text: 'Il club dona parte degli incassi di una partita all\'ospedale cittadino: gesto molto apprezzato.', sent: 5, ownerRating: 2, budgetPct: -0.004 },
    {
      icon: '🎯', title: 'Il mister chiede rinforzi',
      text: 'L\'allenatore chiede pubblicamente rinforzi sul mercato per puntare più in alto.',
      choices: [
        { label: 'Promettigli supporto a gennaio', sent: 2 },
        { label: 'Ricordagli i conti del club', sent: -2, ownerRating: 1 },
      ],
    },
    { icon: '🌦️', title: 'Rinvio last minute', text: 'Un temporale improvviso rinvia la partita a pochi minuti dal fischio d\'inizio: caos organizzativo ma nessun danno.', sent: -1 },
    {
      icon: '🧵', title: 'Nuova maglia acclamata',
      text: 'La nuova maglia da trasferta conquista subito i tifosi sui social.',
      choices: [
        { label: 'Rifornisci lo store, richiesta alta', budgetPct: 0.006, sent: 2 },
        { label: 'Produzione limitata, meglio non rischiare', sent: -1 },
      ],
    },
    { icon: '🚨', title: 'Allarme meteo per la trasferta', text: 'Un\'allerta meteo complica i viaggi dei tifosi al seguito per l\'ultima trasferta.', sent: -1 },
    {
      icon: '🏫', title: 'Progetto scuole del club',
      text: 'Il settore giovanile propone un progetto di avviamento allo sport nelle scuole cittadine.',
      choices: [
        { label: 'Finanzia il progetto', budgetPct: -0.005, sent: 4, prestige: 0.5e6 },
        { label: 'Rimanda a stagione migliore', sent: -1 },
      ],
    },
    { icon: '🎤', title: 'Conferenza stampa tesa', text: 'Una domanda scomoda in conferenza stampa mette in difficoltà lo spogliatoio per qualche giorno.', sent: -2, ownerRating: -1 },
    { icon: '🤳', title: 'Sfida social fra tifoserie', text: 'Una simpatica sfida social con i tifosi di un\'altra piazza fa il giro del web.', sent: 3, fanbaseDelta: 0.01 },
    {
      icon: '💼', title: 'Offerta di co-sponsorizzazione',
      requires: (S) => !!S.sponsor,
      text: (S) => 'Un\'azienda propone un accordo di co-sponsorizzazione da affiancare a ' + S.sponsor.name + '.',
      choices: [
        { label: 'Accetta, entrate extra subito', budgetPct: 0.007, sent: -1 },
        { label: 'Rifiuta, meglio un solo main sponsor', sent: 2 },
      ],
    },
    { icon: '🧓', title: 'Ex bandiera in tribuna', text: 'Una vecchia bandiera del club, ora ritirata, assiste alla partita dalla tribuna d\'onore: standing ovation per lui.', sent: 4, prestige: 0.5e6 },
    { icon: '🛑', title: 'Sciopero dei tifosi organizzati', text: 'La curva organizzata annuncia una protesta silenziosa per la prossima partita.', sent: -4, ownerRating: -1 },
    {
      icon: '📝', title: 'Un club più ricco fa un\'offerta al tuo staff',
      // Un allenatore/DS chiaramente sopra il livello della categoria attira l'interesse di
      // chi può pagarlo di più: prima si controlla l'allenatore (il ruolo più visibile),
      // solo se non è lui abbastanza forte si guarda al direttore sportivo.
      requires: (S) => {
        const base = (DIVS[S.div] || {}).mgrBase || 70;
        return (S.manager && S.manager.rating >= base + 12) || (S.sportingDirector && S.sportingDirector.rating >= base + 8);
      },
      build: (S) => {
        const base = (DIVS[S.div] || {}).mgrBase || 70;
        return { role: (S.manager && S.manager.rating >= base + 12) ? 'manager' : 'ds' };
      },
      text: (S, ctx) => {
        const isManager = !ctx || ctx.role === 'manager';
        const person = isManager ? S.manager : S.sportingDirector;
        return 'Un club più prestigioso ha messo gli occhi su ' + (person ? person.n : 'un membro del tuo staff') + ' (' + (isManager ? 'il tuo allenatore' : 'il tuo direttore sportivo') + '): per trattenerlo serve un accordo migliore.';
      },
      choices: [
        {
          label: 'Trattienilo con un rinnovo migliore',
          hint: 'Stipendio +25% da subito',
          apply: (S, ctx) => {
            const isManager = !ctx || ctx.role === 'manager';
            const person = isManager ? S.manager : S.sportingDirector;
            if (!person) return;
            person.salary = Math.round(person.salary * 1.25 / 1e3) * 1e3;
            S.sent = clamp(S.sent + 2, 0, 100);
          },
        },
        {
          label: 'Lascialo andare',
          hint: 'Incassi un indennizzo, ma dovrai trovarne uno nuovo',
          apply: (S, ctx) => {
            const isManager = !ctx || ctx.role === 'manager';
            const person = isManager ? S.manager : S.sportingDirector;
            if (!person) return;
            S.budget += Math.round(person.salary * 0.6 / 1e3) * 1e3;
            if (isManager) {
              const base = (DIVS[S.div] || {}).mgrBase || 70;
              const r = clamp(base - 6 + rnd(10), 45, 90);
              const nat = pickNationality(S.div);
              S.manager = { n: genName(nat), rating: r, salary: mgrSalaryFor(r), nat, spec: pick(MANAGER_SPECS).key };
            } else {
              S.sportingDirector = null; S.dsOpts = null;
            }
            S.sent = clamp(S.sent - 2, 0, 100);
          },
        },
      ],
    },
  ];

  // Ogni allenatore (generato o candidato) ha una specializzazione, oltre al rating: un
  // piccolo tratto distintivo, non un moltiplicatore che rende uno strettamente più forte
  // di un altro.
  const MANAGER_SPECS = [
    { key: 'builder', label: 'Costruttore di giovani', icon: '🌱', desc: 'I suoi under 23 crescono un filo più in fretta a fine stagione.' },
    { key: 'motivator', label: 'Motivatore', icon: '🔥', desc: 'Dimezza il contraccolpo da doppia promozione consecutiva e tiene la squadra sul pezzo quando l\'umore è a terra.' },
    { key: 'tactician', label: 'Tattico', icon: '📋', desc: 'Un piccolo bonus di rendimento in campo, sempre.' },
    { key: 'medic', label: 'Preparatore di ferro', icon: '🩺', desc: 'Uno staff medico-atletico di alto livello: la rosa si infortuna e si squalifica un po\' meno spesso.' },
    { key: 'negotiator', label: 'Negoziatore', icon: '💬', desc: 'Sa trattare bene con i giocatori: i rinnovi di contratto costano un po\' meno.' },
  ];

  // Staff tecnico, secondo ruolo assumibile oltre l'allenatore: non tocca la squadra in campo,
  // solo il mercato in uscita (offerte che arrivano per i tuoi giocatori). Chiavi diverse da
  // MANAGER_SPECS di proposito, anche se lette da una lookup separata (dsSpecOf, ui.js): niente
  // ambiguità visiva fra "il negoziatore dell'allenatore" e questo.
  const DS_SPECS = [
    { key: 'sales_expert', label: 'Esperto di cessioni', icon: '💰', desc: 'Offerte in uscita più alte per i tuoi giocatori più richiesti.' },
    { key: 'scout_network', label: 'Rete di osservatori', icon: '🔭', desc: 'Più club rivali si fanno avanti per i tuoi giocatori migliori.' },
    { key: 'all_rounder', label: 'Uomo di fiducia', icon: '⚖️', desc: 'Nessuna specializzazione spiccata, ma costa un po\' meno.' },
  ];

  // Derby/rivalità storiche: coppie di nomi già presenti nei POOLS di qualche categoria
  // (vere per Serie A/B/C, plausibili per geografia nelle categorie con nomi di fantasia).
  // Il match conta come derby quando ENTRAMBI i nomi di una coppia si affrontano nella
  // stessa stagione — indipendentemente da quale POOLS li contiene in quel momento, dato
  // che la piramide viva può spostarli di categoria negli anni.
  const DERBIES = [
    ['Inter', 'Milan'], ['Roma', 'Lazio'], ['Torino', 'Juventus'],
    ['Avellino', 'Benevento'], ['Padova', 'Vicenza'],
    ['Perugia', 'Ternana'], ['Catania', 'Messina'],
    ['Frascati', 'Marino'], ['Fiumicino', 'Ostia Antica'],
    ['Anzio', 'Aprilia'], ['Formia', 'Gaeta'],
    ['Chieri', 'Bra'], ['Recanatese', 'Castelfidardo'],
  ];
  function isDerby(nameA, nameB) { return DERBIES.some(([a, b]) => (a === nameA && b === nameB) || (a === nameB && b === nameA)); }

  const WORTH_BASE = [1.5e6, 4e6, 10e6, 25e6, 90e6, 450e6];

  const TROPHY_WORTH = [0.25e6, 0.6e6, 1.5e6, 4e6, 20e6, 280e6];   // il valore di brand duraturo di uno scudetto/titolo, per categoria

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
    [ // Promozione (un gradino sotto l'Eccellenza)
      { n: 'Torrenova', s: 55 }, { n: 'Palmarola', s: 54 }, { n: 'Casal Bernocchi', s: 54 }, { n: 'Ostia Antica', s: 53 },
      { n: 'Bufalotta', s: 53 }, { n: 'Fiumicino', s: 52 }, { n: 'Ardea', s: 52 }, { n: 'Cerveteri', s: 51 },
      { n: 'Nettuno', s: 51 }, { n: 'Velletri', s: 50 }, { n: 'Genzano', s: 50 }, { n: 'Marino', s: 50 },
      { n: 'Zagarolo', s: 49 }, { n: 'Palestrina', s: 49 }, { n: 'Frascati', s: 48 }, { n: 'Ciampino', s: 48 },
      { n: 'Monterotondo Scalo', s: 48 }, { n: 'Fonte Nuova', s: 47 }, { n: 'Mentana', s: 47 }, { n: 'Palombara', s: 46 },
      { n: 'Tivoli Terme', s: 46 }, { n: 'Vicovaro Alta', s: 45 }, { n: 'Subiaco', s: 45 }, { n: 'Cave', s: 44 },
    ],
    [ // Eccellenza
      { n: 'Nuova Florida', s: 63 }, { n: 'Vis Artena', s: 62 }, { n: 'Aurelia Antica', s: 61 }, { n: 'Boreale', s: 60 },
      { n: 'Grifone Gialloverde', s: 59 }, { n: 'Real Monterotondo', s: 59 }, { n: 'Palocco', s: 58 }, { n: 'Almas Roma', s: 58 },
      { n: 'Atletico Morena', s: 57 }, { n: 'San Basilio', s: 57 }, { n: 'Vicovaro', s: 56 }, { n: 'Guidonia Montecelio', s: 56 },
      { n: 'Colleferro', s: 55 }, { n: 'Anzio', s: 55 }, { n: 'Aprilia', s: 55 }, { n: 'Pomezia', s: 54 },
      { n: 'Cynthialbalonga', s: 54 }, { n: 'Ladispoli', s: 53 }, { n: 'Boca Fiumicino', s: 53 }, { n: 'Tor Sapienza', s: 52 },
      { n: 'Santa Marinella', s: 52 }, { n: 'Formia', s: 51 }, { n: 'Fondi', s: 51 }, { n: 'Gaeta', s: 51 },
    ],
    [ // Serie D
      { n: 'Fiorenzuola', s: 69 }, { n: 'San Giuliano City', s: 68 }, { n: 'Chieri', s: 67 }, { n: 'Bra', s: 67 },
      { n: 'Derthona', s: 66 }, { n: 'Lavagnese', s: 66 }, { n: 'Legnago Salus', s: 66 }, { n: 'Ostiamare', s: 65 },
      { n: 'Sarnese', s: 64 }, { n: 'Nardò', s: 64 }, { n: 'Gravina', s: 64 }, { n: 'Fasano', s: 63 },
      { n: 'Nocerina', s: 63 }, { n: 'Gelbison', s: 62 }, { n: 'Manfredonia', s: 62 }, { n: 'Sancataldese', s: 61 },
      { n: 'Vigor Senigallia', s: 61 }, { n: 'Castelfidardo', s: 61 }, { n: 'Recanatese', s: 60 }, { n: 'Termoli', s: 60 },
      { n: 'Notaresco', s: 59 }, { n: 'Montevarchi', s: 59 }, { n: 'Poggibonsi', s: 59 }, { n: 'Trastevere', s: 58 },
    ],
    [ // Serie C
      { n: 'Padova', s: 76 }, { n: 'Vicenza', s: 75 }, { n: 'Triestina', s: 74 }, { n: 'Pescara', s: 73 },
      { n: 'Ternana', s: 73 }, { n: 'Perugia', s: 72 }, { n: 'Foggia', s: 72 }, { n: 'Avellino', s: 71 },
      { n: 'Catania', s: 71 }, { n: 'Benevento', s: 70 }, { n: 'Casertana', s: 70 }, { n: 'Turris', s: 69 },
      { n: 'Monopoli', s: 69 }, { n: 'Picerno', s: 68 }, { n: 'Crotone', s: 68 }, { n: 'Taranto', s: 67 },
      { n: 'Latina', s: 67 }, { n: 'Giugliano', s: 66 }, { n: 'Sorrento', s: 66 }, { n: 'Potenza', s: 65 },
      { n: 'Cerignola', s: 65 }, { n: 'Messina', s: 64 }, { n: 'Trapani', s: 64 }, { n: 'Rimini', s: 63 },
    ],
    [ // Serie B (20 club reali stagione 2026/27, come il vero campionato)
      { n: 'Verona', s: 83 }, { n: 'Empoli', s: 82 }, { n: 'Sampdoria', s: 80 }, { n: 'Palermo', s: 79 },
      { n: 'Cremonese', s: 78 }, { n: 'Catanzaro', s: 77 }, { n: 'Modena', s: 77 }, { n: 'Pisa', s: 76 },
      { n: 'Cesena', s: 76 }, { n: 'Juve Stabia', s: 75 }, { n: 'Sudtirol', s: 75 }, { n: 'Carrarese', s: 73 },
      { n: 'Mantova', s: 73 }, { n: 'Padova', s: 72 }, { n: 'Ascoli', s: 72 }, { n: 'Avellino', s: 71 },
      { n: 'Benevento', s: 71 }, { n: 'Vicenza', s: 70 }, { n: 'Arezzo', s: 70 }, { n: 'Entella', s: 69 },
    ],
    [ // Serie A (massima serie)
      { n: 'Napoli', s: 95 }, { n: 'Inter', s: 92 }, { n: 'Juventus', s: 92 }, { n: 'Milan', s: 89 },
      { n: 'Atalanta', s: 89 }, { n: 'Roma', s: 88 }, { n: 'Fiorentina', s: 87 }, { n: 'Bologna', s: 85 },
      { n: 'Lazio', s: 84 }, { n: 'Torino', s: 83 }, { n: 'Udinese', s: 82 }, { n: 'Genoa', s: 81 },
      { n: 'Sassuolo', s: 81 }, { n: 'Frosinone', s: 80 }, { n: 'Cagliari', s: 79 }, { n: 'Monza', s: 79 },
      { n: 'Parma', s: 78 }, { n: 'Lecce', s: 77 }, { n: 'Venezia', s: 76 }, { n: 'Como', s: 75 },
    ],
  ];

  // Rose reali di Serie A stagione 2026/27 (da Quotazioni Fantacalcio), usate come
  // marcatori quando un club di Serie A gioca da avversario: n=nome, pos=ruolo,
  // q=quotazione fantacalcio (proxy della sua importanza offensiva/difensiva).
  const SERIE_A_ROSTERS = {
    'Napoli': [{n:'Hojlund',pos:'ATT',q:28,nat:'DEN',age:23},{n:'McTominay',pos:'CEN',q:26,nat:'SCO',age:29},{n:'De Bruyne',pos:'CEN',q:17,nat:'BEL',age:35},{n:'Rrahmani',pos:'DIF',q:14,nat:'KVX',age:32},{n:'Santos A.',pos:'ATT',q:14,nat:'BRA'},{n:'Di Lorenzo',pos:'DIF',q:12,nat:'ITA',age:33},{n:'Meret',pos:'POR',q:10,nat:'ITA',age:29},{n:'Lobotka',pos:'CEN',q:10,nat:'SVK',age:31},{n:'Zambo Anguissa',pos:'CEN',q:10,nat:'CMR',age:30},{n:'Politano',pos:'CEN',q:10,nat:'ITA',age:33},{n:'Vergara',pos:'CEN',q:9,nat:'ITA'},{n:'Spinazzola',pos:'DIF',q:8,nat:'ITA',age:33},{n:'Buongiorno',pos:'DIF',q:6,nat:'ITA',age:27},{n:'Badiashile',pos:'DIF',q:6,nat:'FRA'},{n:'Milinkovic-Savic V.',pos:'POR',q:5,nat:'SRB'},{n:'Beukema',pos:'DIF',q:5,nat:'NED'},{n:'Favasuli',pos:'DIF',q:5,nat:'ITA'},{n:'Neres',pos:'ATT',q:5,nat:'BRA'},{n:'Olivera',pos:'DIF',q:4,nat:'URU'},{n:'Lang',pos:'ATT',q:4,nat:'NED'},{n:'Gilmour',pos:'CEN',q:3,nat:'SCO'},{n:'Giovane',pos:'ATT',q:3,nat:'BRA'},{n:'Lucca',pos:'ATT',q:3,nat:'ITA'},{n:'Marin R.',pos:'DIF',q:2,nat:'ESP'},{n:'Contini',pos:'POR',q:1,nat:'ITA'},{n:'Marianucci',pos:'DIF',q:1,nat:'ITA'}],
    'Inter': [{n:'Martinez L.',pos:'ATT',q:34,nat:'ARG',age:29},{n:'Dimarco',pos:'DIF',q:30,nat:'ITA',age:28},{n:'Thuram',pos:'ATT',q:30,nat:'FRA',age:29},{n:'Calhanoglu',pos:'CEN',q:27,nat:'TUR',age:32},{n:'Barella',pos:'CEN',q:18,nat:'ITA',age:29},{n:'Esposito F.P.',pos:'ATT',q:18,nat:'ITA',age:21},{n:'Martinez Jo.',pos:'POR',q:16,nat:'ESP',age:27},{n:'Akanji',pos:'DIF',q:15,nat:'SUI',age:31},{n:'Bastoni',pos:'DIF',q:14,nat:'ITA',age:27},{n:'Zielinski',pos:'CEN',q:13,nat:'POL',age:32},{n:'Bisseck',pos:'DIF',q:12,nat:'GER'},{n:'Stones',pos:'DIF',q:12,nat:'ENG',age:32},{n:'Jones C.',pos:'CEN',q:12,nat:'ENG',age:25},{n:'Spence',pos:'DIF',q:11,nat:'ENG'},{n:'Diouf',pos:'CEN',q:10,nat:'FRA'},{n:'Carlos Augusto',pos:'DIF',q:9,nat:'BRA'},{n:'Sucic P.',pos:'CEN',q:8,nat:'CRO'},{n:'Bonny',pos:'ATT',q:8,nat:'CIV'},{n:'Pavard',pos:'DIF',q:6,nat:'FRA',age:30},{n:'Luis Henrique',pos:'CEN',q:4,nat:'BRA'},{n:'Mkhitaryan',pos:'CEN',q:4,nat:'ARM',age:37},{n:'Stankovic A.',pos:'CEN',q:2,nat:'SRB'},{n:'Di Gennaro',pos:'POR',q:1,nat:'ITA'},{n:'Provedel',pos:'POR',q:1,nat:'ITA'}],
    'Juventus': [{n:'Kolo Muani',pos:'ATT',q:24,nat:'FRA',age:27},{n:'Woltemade',pos:'ATT',q:22,nat:'GER',age:24},{n:'Yildiz',pos:'ATT',q:21,nat:'TUR',age:21},{n:'Vicario',pos:'POR',q:16,nat:'ITA',age:29},{n:'Bremer',pos:'DIF',q:16,nat:'BRA',age:29},{n:'McKennie',pos:'CEN',q:16,nat:'USA',age:28},{n:'Kalulu',pos:'DIF',q:13,nat:'FRA',age:26},{n:'Conceicao',pos:'CEN',q:13,nat:'POR',age:24},{n:'Gonzalez N.',pos:'CEN',q:13,nat:'ARG',age:25},{n:'Alajbegovic',pos:'CEN',q:11,nat:'BIH'},{n:'Thuram K.',pos:'CEN',q:9,nat:'FRA',age:25},{n:'Lucumì',pos:'DIF',q:8,nat:'COL'},{n:'Cambiaso',pos:'DIF',q:8,nat:'ITA',age:26},{n:'Locatelli',pos:'CEN',q:8,nat:'ITA',age:28},{n:'Zhegrova',pos:'CEN',q:8,nat:'KVX',age:27},{n:'Celik',pos:'DIF',q:7,nat:'TUR'},{n:'Koopmeiners',pos:'CEN',q:7,nat:'NED',age:28},{n:'Sarr P.',pos:'CEN',q:7,nat:'SEN',age:24},{n:'Boga',pos:'ATT',q:6,nat:'CIV',age:29},{n:'Gatti',pos:'DIF',q:5,nat:'ITA'},{n:'Kelly L.',pos:'DIF',q:5,nat:'ENG'},{n:'Douglas Luiz',pos:'CEN',q:4,nat:'BRA'},{n:'Milik',pos:'ATT',q:4,nat:'POL',age:32},{n:'Ekhator',pos:'ATT',q:2,nat:'ITA'},{n:'Pinsoglio',pos:'POR',q:1,nat:'ITA'},{n:'Grabara',pos:'POR',q:1,nat:'POL'},{n:'Rugani',pos:'DIF',q:1,nat:'ITA'},{n:'Cabal',pos:'DIF',q:1,nat:'COL'}],
    'Milan': [{n:'Ramos G.',pos:'ATT',q:26,nat:'POR'},{n:'Pulisic',pos:'CEN',q:24,nat:'USA',age:28},{n:'Rabiot',pos:'CEN',q:23,nat:'FRA',age:31},{n:'Maignan',pos:'POR',q:14,nat:'FRA',age:31},{n:'Pavlovic',pos:'DIF',q:13,nat:'SRB',age:25},{n:'Moreira',pos:'CEN',q:13,nat:'BEL'},{n:'Gila',pos:'DIF',q:12,nat:'ESP'},{n:'Modric',pos:'CEN',q:12,nat:'CRO',age:41},{n:'Saelemaekers',pos:'CEN',q:10,nat:'BEL',age:27},{n:'Bartesaghi',pos:'DIF',q:8,nat:'ITA',age:21},{n:'Chukwueze',pos:'CEN',q:8,nat:'NGA',age:27},{n:'Hutchinson',pos:'CEN',q:7,nat:'ENG'},{n:'Gabbia',pos:'DIF',q:6,nat:'ITA'},{n:'Tomori',pos:'DIF',q:6,nat:'ENG',age:28},{n:'Cissè A.',pos:'CEN',q:6,nat:'ITA'},{n:'De Winter',pos:'DIF',q:5,nat:'BEL'},{n:'Jashari',pos:'CEN',q:5,nat:'SUI'},{n:'Musah',pos:'CEN',q:5,nat:'USA'},{n:'Loftus-Cheek',pos:'CEN',q:4,nat:'ENG',age:30},{n:'Camarda',pos:'ATT',q:4,nat:'ITA'},{n:'Estupinan',pos:'DIF',q:3,nat:'ECU'},{n:'Terracciano',pos:'POR',q:1,nat:'ITA'},{n:'Torriani',pos:'POR',q:1,nat:'ITA'},{n:'Diawara S.',pos:'DIF',q:1,nat:'FRA'},{n:'Terracciano F.',pos:'DIF',q:1,nat:'ITA'},{n:'Comotto',pos:'CEN',q:1,nat:'ITA'}],
    'Atalanta': [{n:'Scamacca',pos:'ATT',q:20,nat:'ITA',age:27},{n:'Krstovic',pos:'ATT',q:17,nat:'MNE',age:26},{n:'Carnesecchi',pos:'POR',q:16,nat:'ITA',age:25},{n:'De Ketelaere',pos:'ATT',q:16,nat:'BEL',age:25},{n:'Samardzic',pos:'CEN',q:13,nat:'SRB'},{n:'Raspadori',pos:'ATT',q:13,nat:'ITA',age:26},{n:'Ederson D.S.',pos:'CEN',q:12,nat:'BRA',age:25},{n:'Kessiè',pos:'CEN',q:11,nat:'CIV',age:29},{n:'Scalvini',pos:'DIF',q:10,nat:'ITA',age:23},{n:'Rowe',pos:'CEN',q:10,nat:'ENG'},{n:'Zappacosta',pos:'DIF',q:8,nat:'ITA',age:34},{n:'Pasalic',pos:'CEN',q:8,nat:'CRO',age:31},{n:'Hien',pos:'DIF',q:7,nat:'SWE'},{n:'Gaetano',pos:'CEN',q:7,nat:'ITA'},{n:'Zalewski',pos:'CEN',q:7,nat:'POL',age:24},{n:'Kolasinac',pos:'DIF',q:6,nat:'BIH',age:33},{n:'Bernasconi',pos:'DIF',q:6,nat:'ITA'},{n:'Kristensen T.',pos:'DIF',q:6,nat:'DEN'},{n:'Elmas',pos:'CEN',q:6,nat:'MKD',age:27},{n:'Bellanova',pos:'DIF',q:5,nat:'ITA'},{n:'Sulemana K.',pos:'ATT',q:5,nat:'GHA'},{n:'Kossounou',pos:'DIF',q:3,nat:'CIV'},{n:'Sportiello',pos:'POR',q:1,nat:'ITA'},{n:'Pompei',pos:'POR',q:1,nat:'ITA'}],
    'Roma': [{n:'Malen',pos:'ATT',q:37,nat:'NED',age:27},{n:'Mora',pos:'CEN',q:20,nat:'POR'},{n:'Svilar',pos:'POR',q:19,nat:'SRB',age:26},{n:'Wesley',pos:'DIF',q:18,nat:'BRA',age:23},{n:'Molina N.',pos:'DIF',q:18,nat:'ARG',age:28},{n:'Dybala',pos:'ATT',q:16,nat:'ARG',age:33},{n:'Mancini',pos:'DIF',q:15,nat:'ITA',age:28},{n:'Soulè',pos:'ATT',q:15,nat:'ARG',age:23},{n:'Castro S.',pos:'ATT',q:14,nat:'ARG'},{n:'N\'Dicka',pos:'DIF',q:12,nat:'CIV',age:27},{n:'Hermoso',pos:'DIF',q:11,nat:'ESP',age:31},{n:'Konè M.',pos:'CEN',q:10,nat:'FRA',age:25},{n:'Cristante',pos:'CEN',q:9,nat:'ITA',age:31},{n:'Pellegrini Lo.',pos:'CEN',q:9,nat:'ITA',age:30},{n:'Pisilli',pos:'CEN',q:8,nat:'ITA'},{n:'Koulierakis',pos:'DIF',q:7,nat:'GRE'},{n:'Balerdi',pos:'DIF',q:7,nat:'ARG'},{n:'Ghilardi',pos:'DIF',q:5,nat:'ITA'},{n:'Rensch',pos:'DIF',q:4,nat:'NED'},{n:'De Roon',pos:'CEN',q:4,nat:'NED',age:36},{n:'Lulli',pos:'DIF',q:3,nat:'ITA'},{n:'De Marzi',pos:'POR',q:1,nat:'USA'},{n:'Gollini',pos:'POR',q:1,nat:'ITA'}],
    'Fiorentina': [{n:'Atta',pos:'CEN',q:16,nat:'FRA'},{n:'Pellegrino M.',pos:'ATT',q:16,nat:'ARG'},{n:'Mastantuono',pos:'CEN',q:14,nat:'ARG'},{n:'Beto',pos:'ATT',q:14,nat:'GNB',age:28},{n:'Goncalves P.',pos:'CEN',q:11,nat:'POR'},{n:'De Gea',pos:'POR',q:10,nat:'ESP',age:35},{n:'Dodò',pos:'DIF',q:9,nat:'BRA',age:28},{n:'Dragusin',pos:'DIF',q:8,nat:'ROU'},{n:'Jimenez A.',pos:'DIF',q:8,nat:'ESP'},{n:'Fagioli',pos:'CEN',q:8,nat:'ITA',age:25},{n:'Ndour',pos:'CEN',q:8,nat:'ITA'},{n:'Gnonto',pos:'ATT',q:7,nat:'ITA',age:22},{n:'Viery',pos:'DIF',q:6,nat:'BRA'},{n:'Oulai',pos:'CEN',q:6,nat:'CIV'},{n:'Valdepenas',pos:'DIF',q:5,nat:'ESP'},{n:'Njie',pos:'CEN',q:5,nat:'SWE'},{n:'Parisi',pos:'DIF',q:4,nat:'ITA'},{n:'Pongracic',pos:'DIF',q:3,nat:'CRO'},{n:'Ranieri L.',pos:'DIF',q:3,nat:'ITA',age:29},{n:'Brescianini',pos:'CEN',q:3,nat:'ITA'},{n:'Joao Mario',pos:'DIF',q:2,nat:'POR'},{n:'Christensen O.',pos:'POR',q:1,nat:'DEN'},{n:'Lezzerini',pos:'POR',q:1,nat:'ITA'}],
    'Bologna': [{n:'Orsolini',pos:'CEN',q:24,nat:'ITA',age:29},{n:'Dovbyk',pos:'ATT',q:16,nat:'UKR',age:29},{n:'Skorupski',pos:'POR',q:10,nat:'POL',age:35},{n:'Bernardeschi',pos:'CEN',q:10,nat:'ITA',age:32},{n:'Piccoli',pos:'ATT',q:9,nat:'ITA',age:25},{n:'Miranda J.',pos:'DIF',q:8,nat:'ESP'},{n:'Theate',pos:'DIF',q:8,nat:'BEL'},{n:'Ferguson',pos:'CEN',q:8,nat:'SCO',age:26},{n:'Cambiaghi',pos:'CEN',q:8,nat:'ITA'},{n:'Pobega',pos:'CEN',q:7,nat:'ITA',age:27},{n:'Odgaard',pos:'CEN',q:7,nat:'DEN'},{n:'Mbangula',pos:'CEN',q:7,nat:'BEL'},{n:'Heggem',pos:'DIF',q:6,nat:'NOR'},{n:'Holm',pos:'DIF',q:6,nat:'SWE'},{n:'Zortea',pos:'DIF',q:6,nat:'ITA'},{n:'Vitik',pos:'DIF',q:4,nat:'CZE'},{n:'Amondarain',pos:'CEN',q:4,nat:'ARG'},{n:'Moro N.',pos:'CEN',q:4,nat:'CRO'},{n:'Helland',pos:'DIF',q:3,nat:'NOR'},{n:'Pessina Mas.',pos:'POR',q:2,nat:'ITA'},{n:'Casale',pos:'DIF',q:2,nat:'ITA'},{n:'Alhassane',pos:'DIF',q:2,nat:'NIG'},{n:'El Azzouzi O.',pos:'CEN',q:2,nat:'MAR'},{n:'Enem',pos:'ATT',q:2,nat:'NED'},{n:'Happonen',pos:'POR',q:1,nat:'FIN'},{n:'De Silvestri',pos:'DIF',q:1,nat:'ITA'},{n:'Libra',pos:'CEN',q:1,nat:'VEN'}],
    'Lazio': [{n:'Zaccagni',pos:'CEN',q:16,nat:'ITA',age:31},{n:'Gudmundsson A.',pos:'CEN',q:13,nat:'ISL'},{n:'Taylor K.',pos:'CEN',q:13,nat:'NED'},{n:'Mandas',pos:'POR',q:11,nat:'GRE'},{n:'Frattesi',pos:'CEN',q:11,nat:'ITA',age:27},{n:'Pinamonti',pos:'ATT',q:11,nat:'ITA',age:27},{n:'Cancellieri',pos:'CEN',q:10,nat:'ITA'},{n:'Isaksen',pos:'CEN',q:9,nat:'DEN',age:25},{n:'Doekhi',pos:'DIF',q:8,nat:'NED',age:28},{n:'Noslin',pos:'ATT',q:8,nat:'NED'},{n:'Tavares N.',pos:'DIF',q:7,nat:'POR',age:26},{n:'Marusic',pos:'DIF',q:6,nat:'MNE'},{n:'Sutalo J.',pos:'DIF',q:6,nat:'CRO'},{n:'Leite',pos:'DIF',q:6,nat:'POR'},{n:'Rovella',pos:'CEN',q:6,nat:'ITA',age:24},{n:'Pedraza',pos:'DIF',q:5,nat:'ESP'},{n:'Provstgaard',pos:'DIF',q:4,nat:'DEN'},{n:'Floriani Mussolini',pos:'DIF',q:4,nat:'ITA'},{n:'Dele-Bashiru',pos:'CEN',q:4,nat:'NGA'},{n:'Belahyane',pos:'CEN',q:3,nat:'MAR'},{n:'Cataldi',pos:'CEN',q:3,nat:'ITA',age:29},{n:'Motta',pos:'POR',q:1,nat:'ITA'},{n:'Renzetti',pos:'POR',q:1,nat:'ITA'},{n:'Patric',pos:'DIF',q:1,nat:'ESP'},{n:'Lazzari',pos:'DIF',q:1,nat:'ITA'},{n:'Pellegrini Lu.',pos:'DIF',q:1,nat:'ITA'},{n:'Przyborek',pos:'CEN',q:1,nat:'POL'}],
    'Torino': [{n:'Simeone',pos:'ATT',q:14,nat:'ARG',age:31},{n:'Vlasic',pos:'CEN',q:12,nat:'CRO',age:29},{n:'Adams C.',pos:'ATT',q:11,nat:'SCO',age:30},{n:'Mandragora',pos:'CEN',q:10,nat:'ITA',age:29},{n:'Perri',pos:'POR',q:9,nat:'BRA'},{n:'Casadei',pos:'CEN',q:9,nat:'ITA',age:23},{n:'Comuzzo',pos:'DIF',q:8,nat:'ITA'},{n:'Belghali',pos:'DIF',q:8,nat:'ALG'},{n:'Coco',pos:'DIF',q:7,nat:'EQG',age:28},{n:'Ismajli',pos:'DIF',q:7,nat:'ALB',age:30},{n:'Fortini',pos:'DIF',q:7,nat:'ITA'},{n:'Cacciamani',pos:'CEN',q:7,nat:'ITA'},{n:'Braganca',pos:'CEN',q:7,nat:'POR'},{n:'Fitz-Jim',pos:'CEN',q:6,nat:'NED'},{n:'Gineitis',pos:'CEN',q:6,nat:'LTU'},{n:'Oristanio',pos:'CEN',q:6,nat:'ITA'},{n:'Zapata D.',pos:'ATT',q:6,nat:'COL'},{n:'Comert',pos:'DIF',q:5,nat:'SUI'},{n:'Patterson',pos:'DIF',q:5,nat:'SCO'},{n:'Rodriguez R.',pos:'DIF',q:5,nat:'SUI'},{n:'Ilkhan',pos:'CEN',q:4,nat:'TUR'},{n:'Aboukhlal',pos:'CEN',q:3,nat:'MAR'},{n:'Kulenovic',pos:'ATT',q:3,nat:'CRO'},{n:'Mascardi',pos:'POR',q:1,nat:'ITA'},{n:'Siviero',pos:'POR',q:1,nat:'ITA'},{n:'Biraghi',pos:'DIF',q:1,nat:'ITA'}],
    'Udinese': [{n:'Davis K.',pos:'ATT',q:19,nat:'ENG',age:26},{n:'Zaniolo',pos:'CEN',q:17,nat:'ITA',age:27},{n:'Solet',pos:'DIF',q:13,nat:'FRA'},{n:'Ekkelenkamp',pos:'CEN',q:13,nat:'NED'},{n:'Kamara H.',pos:'DIF',q:9,nat:'CIV'},{n:'Okoye',pos:'POR',q:8,nat:'NGA',age:26},{n:'Vojvoda',pos:'DIF',q:8,nat:'KVX'},{n:'Karlstrom',pos:'CEN',q:8,nat:'SWE'},{n:'Unai Gomez',pos:'CEN',q:7,nat:'ESP'},{n:'Piotrowski',pos:'CEN',q:6,nat:'POL'},{n:'Gueye',pos:'ATT',q:6,nat:'SEN'},{n:'Abankwah',pos:'DIF',q:5,nat:'IRL'},{n:'Bertola',pos:'DIF',q:4,nat:'ITA'},{n:'Miller L.',pos:'CEN',q:4,nat:'SCO'},{n:'Kabasele',pos:'DIF',q:3,nat:'BEL'},{n:'Ebosse',pos:'DIF',q:3,nat:'CMR'},{n:'Zanoli',pos:'DIF',q:3,nat:'ITA'},{n:'Arizala',pos:'DIF',q:3,nat:'COL'},{n:'Palma',pos:'DIF',q:2,nat:'GER'},{n:'Zarraga',pos:'CEN',q:2,nat:'ESP'},{n:'Chakvetadze',pos:'CEN',q:2,nat:'GEO'},{n:'Jovanovic',pos:'CEN',q:2,nat:'SRB'},{n:'Padelli',pos:'POR',q:1,nat:'ITA'},{n:'Mrozek',pos:'POR',q:1,nat:'POL'},{n:'Bayo V.',pos:'ATT',q:1,nat:'CIV'}],
    'Genoa': [{n:'Baldanzi',pos:'CEN',q:11,nat:'ITA'},{n:'Ostigard',pos:'DIF',q:10,nat:'NOR'},{n:'Colombo',pos:'ATT',q:10,nat:'ITA',age:24},{n:'Vasquez',pos:'DIF',q:9,nat:'MEX',age:28},{n:'Osmajic',pos:'ATT',q:9,nat:'MNE'},{n:'Vitinha O.',pos:'ATT',q:8,nat:'POR'},{n:'Bijlow',pos:'POR',q:7,nat:'NED',age:28},{n:'Frendrup',pos:'CEN',q:7,nat:'DEN',age:26},{n:'Sow',pos:'CEN',q:7,nat:'SUI'},{n:'El Shaarawy',pos:'CEN',q:7,nat:'ITA',age:33},{n:'Marcandalli',pos:'DIF',q:6,nat:'ITA'},{n:'Ellertsson',pos:'CEN',q:6,nat:'ISL'},{n:'Messias',pos:'CEN',q:5,nat:'BRA'},{n:'Ehizibue',pos:'DIF',q:4,nat:'NED'},{n:'Amorim',pos:'CEN',q:4,nat:'BRA'},{n:'Meichtry',pos:'CEN',q:4,nat:'SUI'},{n:'Traorè Hj.',pos:'CEN',q:4,nat:'CIV'},{n:'Mitaj',pos:'DIF',q:3,nat:'ALB'},{n:'Drameh',pos:'DIF',q:3,nat:'ENG'},{n:'Havel',pos:'ATT',q:3,nat:'AUT'},{n:'Otoa',pos:'DIF',q:2,nat:'DEN'},{n:'Sabelli',pos:'DIF',q:2,nat:'ITA'},{n:'Sommariva',pos:'POR',q:1,nat:'ITA'},{n:'Stolz',pos:'POR',q:1,nat:'AUT'},{n:'Puczka',pos:'DIF',q:1,nat:'AUT'},{n:'Venturino',pos:'CEN',q:1,nat:'ITA'},{n:'Robinho Junior',pos:'ATT',q:1,nat:'BRA'}],
    'Sassuolo': [{n:'Berardi',pos:'ATT',q:18,nat:'ITA',age:32},{n:'Laurientè',pos:'ATT',q:16,nat:'FRA',age:28},{n:'Esposito Se.',pos:'ATT',q:13,nat:'ITA',age:22},{n:'Bowie',pos:'ATT',q:11,nat:'SCO'},{n:'Thorstvedt',pos:'CEN',q:10,nat:'NOR'},{n:'Adzic',pos:'CEN',q:9,nat:'MNE',age:21},{n:'Volpato',pos:'CEN',q:9,nat:'AUS',age:23},{n:'Konè I.',pos:'CEN',q:8,nat:'CAN'},{n:'Idzes',pos:'DIF',q:7,nat:'IDN'},{n:'Doig',pos:'DIF',q:7,nat:'SCO'},{n:'Leysen F.',pos:'DIF',q:7,nat:'BEL'},{n:'Matic',pos:'CEN',q:7,nat:'SRB',age:38},{n:'Muric',pos:'POR',q:6,nat:'KVX'},{n:'Obrador',pos:'DIF',q:6,nat:'ESP'},{n:'Caleta-Car',pos:'DIF',q:6,nat:'CRO'},{n:'Bakola',pos:'CEN',q:6,nat:'FRA'},{n:'Cinquegrano',pos:'DIF',q:4,nat:'ITA'},{n:'Dominguez B.',pos:'CEN',q:4,nat:'ARG'},{n:'Walukiewicz',pos:'DIF',q:3,nat:'POL'},{n:'Odenthal',pos:'DIF',q:3,nat:'NED'},{n:'Sulemana I.',pos:'CEN',q:3,nat:'GHA'},{n:'Lipani',pos:'CEN',q:3,nat:'ITA'},{n:'Candè',pos:'DIF',q:2,nat:'GNB'},{n:'Russo A.',pos:'POR',q:1,nat:'ITA'},{n:'Turati',pos:'POR',q:1,nat:'ITA'},{n:'Satalino',pos:'POR',q:1,nat:'ITA'},{n:'Van Der Brempt',pos:'DIF',q:1,nat:'BEL'},{n:'Pieragnolo',pos:'DIF',q:1,nat:'ITA'},{n:'Boloca',pos:'CEN',q:1,nat:'ITA',age:27}],
    'Frosinone': [{n:'Raimondo',pos:'ATT',q:11,nat:'ITA',age:25},{n:'Calò',pos:'CEN',q:9,nat:'ITA'},{n:'Ghedjemis',pos:'ATT',q:9,nat:'ALG'},{n:'Kvernadze',pos:'ATT',q:9,nat:'GEO'},{n:'Bobcek',pos:'ATT',q:9,nat:'SVK'},{n:'Schmid',pos:'CEN',q:8,nat:'AUT'},{n:'Bracaglia',pos:'DIF',q:7,nat:'ITA'},{n:'Oyono A.',pos:'DIF',q:7,nat:'GAB'},{n:'Palmisani',pos:'POR',q:6,nat:'ITA'},{n:'Calvani',pos:'DIF',q:6,nat:'ITA'},{n:'Monterisi',pos:'DIF',q:6,nat:'ITA'},{n:'Zerbin',pos:'CEN',q:6,nat:'ITA'},{n:'Fini',pos:'CEN',q:5,nat:'ITA'},{n:'Masini',pos:'CEN',q:5,nat:'ITA'},{n:'Cittadini',pos:'DIF',q:4,nat:'ITA'},{n:'Terzic',pos:'DIF',q:4,nat:'SRB'},{n:'Cichella',pos:'CEN',q:4,nat:'ITA'},{n:'Grillitsch',pos:'CEN',q:4,nat:'AUT'},{n:'Birligea',pos:'ATT',q:4,nat:'ROU'},{n:'Hasa',pos:'CEN',q:3,nat:'ALB'},{n:'Akpoguma',pos:'DIF',q:2,nat:'GER'},{n:'Tchato',pos:'DIF',q:2,nat:'CMR'},{n:'Gelli F.',pos:'CEN',q:2,nat:'ITA'},{n:'Desplanches',pos:'POR',q:1,nat:'ITA'},{n:'Lolic',pos:'POR',q:1,nat:'BIH'},{n:'Pisseri',pos:'POR',q:1,nat:'ITA'},{n:'Amey',pos:'DIF',q:1,nat:'ITA'},{n:'Omar Fayed',pos:'DIF',q:1,nat:'EGY'},{n:'El Azzouzi A.',pos:'CEN',q:1,nat:'MAR'},{n:'Kone B.',pos:'CEN',q:1,nat:'CIV'}],
    'Cagliari': [{n:'Caprile',pos:'POR',q:11,nat:'ITA'},{n:'Kevin Carlos',pos:'ATT',q:11,nat:'ESP',age:25},{n:'Maldini',pos:'ATT',q:9,nat:'ITA',age:24},{n:'Obert',pos:'DIF',q:8,nat:'SVK'},{n:'Adopo',pos:'CEN',q:8,nat:'FRA'},{n:'Romano',pos:'CEN',q:8,nat:'ITA'},{n:'Mina',pos:'DIF',q:7,nat:'COL',age:31},{n:'Zè Pedro',pos:'DIF',q:7,nat:'POR'},{n:'Winks',pos:'CEN',q:7,nat:'ENG',age:30},{n:'Fazzini',pos:'CEN',q:7,nat:'ITA'},{n:'Mendy P.',pos:'ATT',q:7,nat:'SEN'},{n:'Sugawara',pos:'DIF',q:6,nat:'JPN'},{n:'Kofler',pos:'DIF',q:5,nat:'ITA'},{n:'Rodriguez Ju.',pos:'DIF',q:5,nat:'URU'},{n:'Deiola',pos:'CEN',q:5,nat:'ITA'},{n:'Felici',pos:'CEN',q:5,nat:'ITA'},{n:'Fadera',pos:'CEN',q:4,nat:'GAM'},{n:'Massolin',pos:'CEN',q:4,nat:'FRA'},{n:'Nzola',pos:'ATT',q:4,nat:'ANG'},{n:'Gagliardini',pos:'CEN',q:3,nat:'ITA'},{n:'Idrissi R.',pos:'DIF',q:2,nat:'ITA'},{n:'Sherri',pos:'POR',q:1,nat:'ALB'},{n:'Radunovic',pos:'POR',q:1,nat:'SRB'},{n:'Aurelio',pos:'DIF',q:1,nat:'ITA'},{n:'Liteta',pos:'CEN',q:1,nat:'ZAM'},{n:'Ciervo',pos:'CEN',q:1,nat:'ITA'},{n:'Trepy',pos:'ATT',q:1,nat:'FRA'}],
    'Monza': [{n:'Mangas',pos:'DIF',q:9,nat:'POR'},{n:'Colpani',pos:'CEN',q:9,nat:'ITA',age:27},{n:'Cutrone',pos:'ATT',q:9,nat:'ITA',age:28},{n:'Akinsanmiro',pos:'CEN',q:7,nat:'NGA'},{n:'Varela G.',pos:'ATT',q:7,nat:'POR'},{n:'Zeballos',pos:'ATT',q:7,nat:'ARG'},{n:'Birindelli',pos:'DIF',q:6,nat:'ITA'},{n:'Pessina',pos:'CEN',q:6,nat:'ITA'},{n:'Robinson J.',pos:'ATT',q:6,nat:'ENG'},{n:'Tourè I.',pos:'CEN',q:5,nat:'GER'},{n:'Mota',pos:'ATT',q:5,nat:'POR'},{n:'Thiam',pos:'POR',q:4,nat:'SEN'},{n:'Lucchesi',pos:'DIF',q:4,nat:'ITA'},{n:'Kouadio',pos:'DIF',q:4,nat:'ITA'},{n:'Carboni A.',pos:'DIF',q:4,nat:'ITA'},{n:'Folorunsho',pos:'CEN',q:4,nat:'ITA'},{n:'Ngonge',pos:'ATT',q:4,nat:'BEL'},{n:'Bakoune',pos:'DIF',q:2,nat:'ITA'},{n:'Goglichidze',pos:'DIF',q:2,nat:'GEO'},{n:'Colombo L.',pos:'CEN',q:2,nat:'ITA'},{n:'Forson O.',pos:'CEN',q:2,nat:'ENG'},{n:'Foe Ondoa',pos:'CEN',q:2,nat:'FRA'},{n:'Tornqvist',pos:'POR',q:1,nat:'SWE'},{n:'Strajnar',pos:'POR',q:1,nat:'SVN'},{n:'Antov',pos:'DIF',q:1,nat:'BUL'},{n:'Ziolkowski',pos:'DIF',q:1,nat:'POL'},{n:'Maye',pos:'DIF',q:1,nat:'FRA'},{n:'Ciurria',pos:'CEN',q:1,nat:'ITA'},{n:'Mout',pos:'CEN',q:1,nat:'ITA'}],
    'Parma': [{n:'Romero D.',pos:'ATT',q:11,nat:'ARG',age:27},{n:'Tourè E.',pos:'ATT',q:10,nat:'MLI'},{n:'Valeri',pos:'DIF',q:9,nat:'ITA',age:25},{n:'Delprato',pos:'DIF',q:8,nat:'ITA'},{n:'Diego Carlos',pos:'DIF',q:8,nat:'BRA',age:33},{n:'Bernabè',pos:'CEN',q:7,nat:'ESP',age:25},{n:'Daffara',pos:'POR',q:6,nat:'ITA'},{n:'Keita M.',pos:'CEN',q:6,nat:'BEL'},{n:'Nicolussi Caviglia',pos:'CEN',q:5,nat:'ITA'},{n:'Almqvist',pos:'CEN',q:5,nat:'SWE'},{n:'Lontani',pos:'ATT',q:5,nat:'ITA'},{n:'Troilo',pos:'DIF',q:4,nat:'ARG'},{n:'Valenti',pos:'DIF',q:4,nat:'ARG'},{n:'Britschgi',pos:'DIF',q:4,nat:'SUI'},{n:'Frigan',pos:'ATT',q:4,nat:'CRO'},{n:'Corvi',pos:'POR',q:3,nat:'ITA'},{n:'Fabbian',pos:'CEN',q:3,nat:'ITA'},{n:'Ordonez C.',pos:'CEN',q:3,nat:'ARG'},{n:'Diallo O.',pos:'CEN',q:3,nat:'ESP'},{n:'Elphege',pos:'ATT',q:3,nat:'FRA'},{n:'Drobnic',pos:'DIF',q:2,nat:'SVN'},{n:'Cremaschi',pos:'CEN',q:2,nat:'USA'},{n:'Sierro',pos:'CEN',q:2,nat:'SUI'},{n:'Ghidotti',pos:'POR',q:1,nat:'ITA'},{n:'Ndiaye',pos:'DIF',q:1,nat:'SEN'},{n:'Carboni F.',pos:'DIF',q:1,nat:'ARG'},{n:'De Martis',pos:'ATT',q:1,nat:'ARG'}],
    'Lecce': [{n:'Tiago Gabriel',pos:'DIF',q:9,nat:'POR'},{n:'Coulibaly L.',pos:'CEN',q:9,nat:'MLI'},{n:'Falcone',pos:'POR',q:8,nat:'ITA'},{n:'Geubbels',pos:'ATT',q:8,nat:'FRA'},{n:'Monteiro J.',pos:'CEN',q:7,nat:'SUI'},{n:'Stulic',pos:'ATT',q:7,nat:'SRB'},{n:'Veiga D.',pos:'DIF',q:6,nat:'POR'},{n:'Gallo',pos:'DIF',q:6,nat:'ITA'},{n:'Pierotti',pos:'CEN',q:6,nat:'ARG'},{n:'Siebert',pos:'DIF',q:5,nat:'GER'},{n:'Gaspar K.',pos:'DIF',q:4,nat:'ANG'},{n:'Maleh',pos:'CEN',q:4,nat:'MAR'},{n:'Ngom',pos:'CEN',q:4,nat:'MTN'},{n:'Berisha M.',pos:'CEN',q:4,nat:'ALB'},{n:'Gandelman',pos:'CEN',q:4,nat:'ISR'},{n:'N\'Dri',pos:'ATT',q:4,nat:'NIG'},{n:'Fatah',pos:'ATT',q:4,nat:'SWE'},{n:'Gorter',pos:'CEN',q:3,nat:'NED'},{n:'Ilic',pos:'CEN',q:3,nat:'SRB'},{n:'Penev',pos:'POR',q:1,nat:'BUL'},{n:'Bleve',pos:'POR',q:1,nat:'ITA'},{n:'Jean',pos:'DIF',q:1,nat:'FRA'},{n:'Ndaba',pos:'DIF',q:1,nat:'IRL'},{n:'Dembelè A.',pos:'DIF',q:1,nat:'FRA'},{n:'Kaba',pos:'CEN',q:1,nat:'FRA'},{n:'Fofana Sa.',pos:'CEN',q:1,nat:'TOG'},{n:'Laerke',pos:'CEN',q:1,nat:'DEN'}],
    'Venezia': [{n:'Adams A.',pos:'ATT',q:12,nat:'NGA',age:26},{n:'Yeboah J.',pos:'ATT',q:10,nat:'ECU'},{n:'Busio',pos:'CEN',q:7,nat:'USA',age:24},{n:'Rrahmani Al.',pos:'ATT',q:7,nat:'KVX'},{n:'Hainaut',pos:'DIF',q:6,nat:'FRA'},{n:'Basic',pos:'CEN',q:6,nat:'CRO'},{n:'Perez K.',pos:'CEN',q:6,nat:'ESP'},{n:'Stankovic F.',pos:'POR',q:5,nat:'SRB'},{n:'Bella-Kotchap',pos:'DIF',q:5,nat:'GER'},{n:'Correia T.',pos:'DIF',q:5,nat:'POR'},{n:'Haps',pos:'DIF',q:5,nat:'SUR'},{n:'Sohm',pos:'CEN',q:5,nat:'SUI'},{n:'Moreno M.',pos:'DIF',q:4,nat:'ARG'},{n:'Sagrado',pos:'DIF',q:4,nat:'BEL'},{n:'Juan Jesus',pos:'DIF',q:4,nat:'BRA'},{n:'Adorante',pos:'ATT',q:4,nat:'ITA'},{n:'Fernandez T.',pos:'CEN',q:3,nat:'ESP'},{n:'Halhal',pos:'DIF',q:2,nat:'MAR'},{n:'Schingtienne',pos:'DIF',q:2,nat:'BEL'},{n:'Sverko',pos:'DIF',q:2,nat:'CRO'},{n:'Franjic',pos:'DIF',q:2,nat:'CRO'},{n:'Helgason',pos:'CEN',q:2,nat:'ISL'},{n:'Lauberbach',pos:'ATT',q:2,nat:'GER'},{n:'Grandi',pos:'POR',q:1,nat:'ITA'},{n:'Pozzi',pos:'POR',q:1,nat:'ITA'},{n:'Montipò',pos:'POR',q:1,nat:'ITA'},{n:'Mazzocchi',pos:'DIF',q:1,nat:'ITA'},{n:'Gomes',pos:'DIF',q:1,nat:'ESP'},{n:'Dagasso',pos:'CEN',q:1,nat:'ITA'},{n:'Duncan',pos:'CEN',q:1,nat:'GHA'},{n:'Lisman',pos:'ATT',q:1,nat:'POL'}],
    'Como': [{n:'Paz N.',pos:'CEN',q:30,nat:'ARG',age:22},{n:'Kean',pos:'ATT',q:24,nat:'ITA',age:26},{n:'Douvikas',pos:'ATT',q:21,nat:'GRE',age:27},{n:'Baturina',pos:'CEN',q:20,nat:'CRO',age:24},{n:'Da Cunha',pos:'CEN',q:18,nat:'FRA',age:24},{n:'Butez',pos:'POR',q:15,nat:'FRA',age:30},{n:'Diao',pos:'ATT',q:14,nat:'SEN',age:22},{n:'Ramon',pos:'DIF',q:12,nat:'ESP'},{n:'Perrone',pos:'CEN',q:11,nat:'ARG',age:23},{n:'Rodriguez Je.',pos:'CEN',q:11,nat:'ESP'},{n:'Chalobah T.',pos:'DIF',q:10,nat:'ENG'},{n:'Couto',pos:'DIF',q:9,nat:'BRA'},{n:'Sanchez Ro.',pos:'POR',q:8,nat:'ESP'},{n:'Kaiki',pos:'DIF',q:8,nat:'BRA'},{n:'Valle',pos:'DIF',q:7,nat:'ESP'},{n:'Kempf',pos:'DIF',q:6,nat:'GER'},{n:'Milla',pos:'CEN',q:6,nat:'ESP'},{n:'Caqueret',pos:'CEN',q:6,nat:'FRA',age:26},{n:'Liberali',pos:'CEN',q:6,nat:'ITA'},{n:'Addai',pos:'CEN',q:4,nat:'NED'},{n:'Smolcic I.',pos:'DIF',q:3,nat:'CRO'},{n:'Ricci S.',pos:'CEN',q:3,nat:'ITA',age:24},{n:'Kambwala',pos:'DIF',q:2,nat:'FRA'},{n:'Vigorito',pos:'POR',q:1,nat:'ITA'},{n:'Goldaniga',pos:'DIF',q:1,nat:'ITA'},{n:'Lahdo',pos:'CEN',q:1,nat:'SWE'}],
  };

  // Rose reali di Serie B stagione 2026/27 (da Rose_SerieB_Fantacalcio), usate come
  // marcatori quando un club di Serie B gioca da avversario: stesso schema di
  // SERIE_A_ROSTERS (n=nome, pos=ruolo, q=quotazione fantacalcio).
  const SERIE_B_ROSTERS = {
    'Verona': [{n:'Mulattieri Samuele',pos:'ATT',q:41,nat:'ITA',age:26},{n:'Suslov Tomas',pos:'CEN',q:15,nat:'SVK'},{n:'Harroui',pos:'CEN',q:14,nat:'MAR'},{n:'Mosquera Daniel',pos:'ATT',q:14,nat:'COL'},{n:'Leali Nicola',pos:'POR',q:13,nat:'ITA'},{n:'Zappa Gabriele',pos:'DIF',q:13,nat:'ITA'},{n:'Edmundsson Andrias',pos:'DIF',q:12,nat:'FRO'},{n:'Kastanos Grigoris',pos:'CEN',q:11,nat:'CYP'},{n:'Sarr Amin',pos:'ATT',q:11,nat:'SWE'},{n:'Livramento Dailon',pos:'ATT',q:10,nat:'CPV'},{n:'Belghali Rafik',pos:'DIF',q:9,nat:'ALG'},{n:'Bradaric Domagoj',pos:'DIF',q:9,nat:'CRO'},{n:'Bernede Antoine',pos:'CEN',q:9,nat:'FRA'},{n:'Compagnon Mattia',pos:'ATT',q:9,nat:'ITA'},{n:'Serdar Suat',pos:'CEN',q:8,nat:'GER'},{n:'Calabrese Nicolo',pos:'DIF',q:6,nat:'ITA'},{n:'Dawidowicz Pawel',pos:'DIF',q:5,nat:'POL'},{n:'Frese Martin',pos:'DIF',q:5,nat:'DEN'},{n:'Cerbone Salvatore',pos:'ATT',q:5,nat:'ITA'},{n:'Korac Seid',pos:'DIF',q:3,nat:'LUX'},{n:'Oyegoke Daniel',pos:'DIF',q:3,nat:'ENG'},{n:'Slotsager Tobias',pos:'DIF',q:3,nat:'DEN'},{n:'Isaac Tomich',pos:'ATT',q:2,nat:'BRA'},{n:'Arthur Borghi',pos:'POR',q:1,nat:'ITA'},{n:'Perilli Simone',pos:'POR',q:1,nat:'ITA'},{n:'Toniolo Giacomo',pos:'POR',q:1,nat:'ITA'},{n:'Cham Fallou',pos:'DIF',q:1,nat:'GAM'},{n:'De Battisti Davide',pos:'DIF',q:1,nat:'ITA'},{n:'Feola Willam',pos:'DIF',q:1,nat:'ITA'},{n:'Akale Ruben',pos:'CEN',q:1,nat:'FRA'},{n:'Bega Leorat',pos:'CEN',q:1,nat:'SUI'},{n:'Charlys',pos:'CEN',q:1,nat:'BRA'},{n:'Monticelli Luca',pos:'CEN',q:1,nat:'ITA'},{n:'Peci Jurgen',pos:'CEN',q:1,nat:'ALB'},{n:'Szimionas Luca',pos:'CEN',q:1,nat:'ROU'},{n:'Cruz Juan Manuel',pos:'ATT',q:1,nat:'ARG'},{n:'Sezonienko Kacper',pos:'ATT',q:1,nat:'POL'},{n:'Vermesan Ioan',pos:'ATT',q:1,nat:'ROU'}],
    'Empoli': [{n:'Shpendi Stiven',pos:'ATT',q:42,nat:'ALB',age:23},{n:'Distefano Filippo',pos:'ATT',q:20,nat:'ITA',age:25},{n:'Popov Bogdan',pos:'ATT',q:17,nat:'UKR'},{n:'Perisan Samuele',pos:'POR',q:12,nat:'ITA'},{n:'Saporiti Edoardo',pos:'CEN',q:11,nat:'ITA'},{n:'Cauz Cristian',pos:'DIF',q:9,nat:'ITA'},{n:'Guarino Gabriele',pos:'DIF',q:9,nat:'ITA'},{n:'Magnino Luca',pos:'CEN',q:8,nat:'ITA'},{n:'Yepes Gerard',pos:'CEN',q:8,nat:'ESP'},{n:'Curto Marco',pos:'DIF',q:7,nat:'ITA'},{n:'Corrado Niccolo',pos:'DIF',q:5,nat:'ITA'},{n:'Seghetti Jacopo',pos:'POR',q:4,nat:'ITA'},{n:'Ceesay Joseph',pos:'DIF',q:3,nat:'GAM'},{n:'Tosto Lorenzo',pos:'DIF',q:3,nat:'ITA'},{n:'Belardinelli Luca',pos:'CEN',q:3,nat:'ITA'},{n:'Degli Innocenti Duccio',pos:'CEN',q:3,nat:'ITA'},{n:'Zedadka',pos:'CEN',q:3,nat:'ALG'},{n:'Sodero Andrea',pos:'ATT',q:3,nat:'ITA'},{n:'Indragoli Gabriele',pos:'DIF',q:2,nat:'ITA'},{n:'Brancolini Federico',pos:'POR',q:1,nat:'ITA'},{n:'Gasparini Manuel',pos:'POR',q:1,nat:'ITA'},{n:'Versari Francesco',pos:'POR',q:1,nat:'ITA'},{n:'Bembnista Dawid',pos:'DIF',q:1,nat:'POL'},{n:'Pasalic Kevin',pos:'DIF',q:1,nat:'CRO'},{n:'Romagnoli Simone',pos:'DIF',q:1,nat:'ITA'},{n:'Baralla Alessio',pos:'CEN',q:1,nat:'ITA'},{n:'Busiello Danilo',pos:'CEN',q:1,nat:'ITA'},{n:'Deli Lapo',pos:'CEN',q:1,nat:'ITA'},{n:'Orlandi Andrea',pos:'CEN',q:1,nat:'ITA'},{n:'Perin Ernesto',pos:'CEN',q:1,nat:'ITA'},{n:'Bianchi Flavio',pos:'ATT',q:1,nat:'ITA'},{n:'Campaniello Thomas',pos:'ATT',q:1,nat:'ITA'},{n:'Zanaga Edoardo',pos:'ATT',q:1,nat:'ITA'}],
    'Sampdoria': [{n:'Tutino Gennaro',pos:'ATT',q:32,nat:'ITA',age:30},{n:'Insigne Lorenzo',pos:'ATT',q:30,nat:'ITA',age:35},{n:'Begic Tjas',pos:'ATT',q:20,nat:'SVN'},{n:'Vindahl Jensen Peter',pos:'POR',q:13,nat:'DEN'},{n:'Depaoli Fabio',pos:'DIF',q:13,nat:'ITA',age:29},{n:'Esposito Salvatore',pos:'CEN',q:11,nat:'ITA'},{n:'Verschaeren Yari',pos:'CEN',q:10,nat:'BEL'},{n:'Di Pardo Alessandro',pos:'DIF',q:9,nat:'ITA'},{n:'Viti Mattia',pos:'DIF',q:8,nat:'ITA'},{n:'Cicconi Manuel',pos:'CEN',q:7,nat:'ITA'},{n:'Hernderson Liam',pos:'CEN',q:7,nat:'SCO'},{n:'Conti Francesco',pos:'CEN',q:6,nat:'ITA'},{n:'Makoumbou Antoine',pos:'CEN',q:6,nat:'CGO'},{n:'Gartenmann Stefan',pos:'DIF',q:5,nat:'SUI'},{n:'Ravanelli Luca',pos:'DIF',q:5,nat:'ITA'},{n:'Abildgaard Oliver',pos:'CEN',q:4,nat:'DEN'},{n:'Riccio Alessandro Pio',pos:'DIF',q:3,nat:'ITA'},{n:'Bellemo Alessandro',pos:'CEN',q:3,nat:'ITA'},{n:'Sinani Danel',pos:'ATT',q:3,nat:'LUX'},{n:'Lauritsen Tobias',pos:'ATT',q:2,nat:'NOR'},{n:'Ghidotti Simone',pos:'POR',q:1,nat:'ITA'},{n:'Krastev Andrey',pos:'POR',q:1,nat:'BUL'},{n:'Scardigno Nicholas',pos:'POR',q:1,nat:'ITA'},{n:'Tantalocchi Elia',pos:'POR',q:1,nat:'ITA'},{n:'Diop Karim',pos:'DIF',q:1,nat:'ITA'},{n:'Ferrari Alex',pos:'DIF',q:1,nat:'ITA'},{n:'Ferri Jordan',pos:'CEN',q:1,nat:'FRA'},{n:'Girelli Stefano',pos:'CEN',q:1,nat:'ITA'},{n:'Sekulov Nikola',pos:'CEN',q:1,nat:'ITA'}],
    'Palermo': [{n:'Pohjanpalo Joel',pos:'ATT',q:65,nat:'FIN',age:31},{n:'Palumbo Antonio',pos:'CEN',q:32,nat:'ITA',age:28},{n:'Strefezza Gabriel',pos:'CEN',q:24,nat:'BRA'},{n:'Pierozzi Niccolo',pos:'CEN',q:22,nat:'ITA'},{n:'Hernani',pos:'CEN',q:20,nat:'BRA',age:31},{n:'Johnsen Dennis',pos:'CEN',q:19,nat:'NOR'},{n:'Ranocchia Filippo',pos:'CEN',q:19,nat:'ITA'},{n:'Le Douaron Jeremy',pos:'ATT',q:18,nat:'FRA'},{n:'Vavassori Dominic',pos:'ATT',q:18,nat:'ITA'},{n:'Perin Mattia',pos:'POR',q:17,nat:'ITA',age:33},{n:'Augello Tommaso',pos:'DIF',q:17,nat:'ITA'},{n:'Segre Jacopo',pos:'CEN',q:15,nat:'ITA'},{n:'Joronen Jess',pos:'POR',q:14,nat:'FIN'},{n:'Ceccaroni Pietro',pos:'DIF',q:14,nat:'ITA'},{n:'Bani Mattia',pos:'DIF',q:13,nat:'ITA'},{n:'Cassandro Tommaso',pos:'DIF',q:12,nat:'ITA'},{n:'Estevez Nahuel',pos:'CEN',q:11,nat:'ARG'},{n:'Barba Federico',pos:'DIF',q:5,nat:'ITA'},{n:'Peda Patryk',pos:'DIF',q:5,nat:'POL'},{n:'Gyasi Emmanuel',pos:'CEN',q:5,nat:'GHA'},{n:'Gomes Claudio',pos:'CEN',q:3,nat:'FRA'},{n:'Balaguss Nils',pos:'POR',q:1,nat:'LVA'},{n:'Cutrona Francesco',pos:'POR',q:1,nat:'ITA'},{n:'Fortin Mattia',pos:'POR',q:1,nat:'ITA'},{n:'Nespola Manfredi',pos:'POR',q:1,nat:'ITA'},{n:'Pizzuto Simone',pos:'POR',q:1,nat:'ITA'},{n:'Blin Alexis',pos:'DIF',q:1,nat:'FRA'},{n:'Bozzolan Andrea',pos:'DIF',q:1,nat:'ITA'},{n:'Diakite Salim',pos:'DIF',q:1,nat:'MLI'},{n:'Magnani Giangiacomo',pos:'DIF',q:1,nat:'ITA'},{n:'Nicolosi Ettore',pos:'DIF',q:1,nat:'ITA'},{n:'Avena Pietro',pos:'CEN',q:1,nat:'ITA'},{n:'Squillacioti Salvatore',pos:'CEN',q:1,nat:'ITA'}],
    'Cremonese': [{n:'Bonazzoli Federico',pos:'ATT',q:40,nat:'ITA',age:30},{n:'Vandeputte Jari',pos:'CEN',q:26,nat:'BEL',age:29},{n:'Nasti Marco',pos:'ATT',q:26,nat:'ITA',age:23},{n:'De Luca Manuel',pos:'ATT',q:24,nat:'ITA',age:28},{n:'Stuckler David',pos:'ATT',q:21,nat:'DEN'},{n:'Fulignati Andrea',pos:'POR',q:16,nat:'ITA'},{n:'Berti Tommaso',pos:'CEN',q:16,nat:'ITA'},{n:'Baschirotto Federico',pos:'DIF',q:14,nat:'ITA',age:29},{n:'Pontisso Simone',pos:'CEN',q:14,nat:'ITA'},{n:'Luperto Sebastiano',pos:'DIF',q:12,nat:'ITA'},{n:'Collocolo Manuele',pos:'CEN',q:12,nat:'ITA'},{n:'Licina Adin',pos:'CEN',q:11,nat:'GER'},{n:'Thorsby Morten',pos:'CEN',q:11,nat:'NOR'},{n:'Barbieri Tommaso',pos:'DIF',q:9,nat:'ITA'},{n:'Bianchetti Matteo',pos:'DIF',q:9,nat:'ITA'},{n:'Vogliacco Alessandro',pos:'DIF',q:8,nat:'ITA'},{n:'Gerli Fabio',pos:'CEN',q:8,nat:'ITA'},{n:'Elia Salvatore',pos:'CEN',q:7,nat:'ITA'},{n:'Duric Milan',pos:'ATT',q:7,nat:'BIH'},{n:'Jack',pos:'DIF',q:5,nat:'BRA'},{n:'Lickunas Adrian',pos:'ATT',q:4,nat:'LTU'},{n:'Agazzi Federico',pos:'POR',q:3,nat:'ITA'},{n:'Pezzella Giuseppe',pos:'DIF',q:3,nat:'ITA'},{n:'Rocchetti Yuri',pos:'DIF',q:2,nat:'ITA'},{n:'Lottici Tessadri',pos:'CEN',q:2,nat:'ITA'},{n:'Festa Marco',pos:'POR',q:1,nat:'ITA'},{n:'Cabianca Eddy',pos:'DIF',q:1,nat:'ITA'},{n:'Folino Francesco',pos:'DIF',q:1,nat:'ITA'},{n:'Lordkipanidze Dachi',pos:'DIF',q:1,nat:'GEO'},{n:'Vigilati Tommaso',pos:'DIF',q:1,nat:'ITA'},{n:'Brambilla Alessio',pos:'CEN',q:1,nat:'ITA'},{n:'Grassi Alberto',pos:'CEN',q:1,nat:'ITA'},{n:'Faye Nouroudine',pos:'ATT',q:1,nat:'SEN'}],
    'Catanzaro': [{n:'Iemmello Pietro',pos:'ATT',q:37,nat:'ITA',age:34},{n:'Mosti Nicola',pos:'CEN',q:20,nat:'ITA'},{n:'Koffi',pos:'ATT',q:18,nat:'CIV'},{n:'Pigliacelli Mirko',pos:'POR',q:15,nat:'ITA'},{n:'Pafundi Simone',pos:'CEN',q:14,nat:'ITA'},{n:'Dorval Mehdi',pos:'DIF',q:13,nat:'ALG'},{n:'Antonini Matias',pos:'DIF',q:12,nat:'BRA'},{n:'Petriccione Jacopo',pos:'DIF',q:12,nat:'ITA'},{n:'Gjoka Kevin',pos:'ATT',q:11,nat:'ALB'},{n:'Pecorino Emanuele',pos:'ATT',q:11,nat:'ITA'},{n:'Candela Antonio',pos:'DIF',q:9,nat:'ITA'},{n:'Arditi Gabriel',pos:'ATT',q:9,nat:'ITA'},{n:'Volpe Giovanni',pos:'ATT',q:9,nat:'ITA'},{n:'D\'Alessandro Marco',pos:'CEN',q:7,nat:'ITA'},{n:'Giovane Samuele',pos:'CEN',q:7,nat:'ITA'},{n:'Alesi Gabriele',pos:'CEN',q:6,nat:'ITA'},{n:'Postiglione Niccolo',pos:'DIF',q:5,nat:'ITA'},{n:'Ruggero Marco',pos:'DIF',q:5,nat:'ITA'},{n:'Verrengia Bruno',pos:'DIF',q:5,nat:'ITA'},{n:'Maiolo Francesco',pos:'CEN',q:5,nat:'ITA'},{n:'Frosinini Ruggero',pos:'DIF',q:4,nat:'ITA'},{n:'Imperiale Marco',pos:'DIF',q:4,nat:'ITA'},{n:'Garnica Alejo',pos:'ATT',q:4,nat:'ARG'},{n:'Bashi Ervin',pos:'DIF',q:3,nat:'ALB'},{n:'Tchaouna Franck',pos:'CEN',q:3,nat:'CHA'},{n:'Di Francesco Federico',pos:'ATT',q:3,nat:'ITA'},{n:'Morleo Umberto',pos:'DIF',q:2,nat:'ITA'},{n:'Reita Francesco',pos:'CEN',q:2,nat:'ITA'},{n:'Buso Nicolo',pos:'ATT',q:2,nat:'ITA'},{n:'Borrelli Edoardo',pos:'POR',q:1,nat:'ITA'},{n:'Madia Lorenzo',pos:'POR',q:1,nat:'ITA'},{n:'Marietta Christian',pos:'POR',q:1,nat:'ITA'},{n:'Coriano Martino',pos:'DIF',q:1,nat:'ITA'},{n:'Paura Mario',pos:'DIF',q:1,nat:'ITA'},{n:'Rombola Carlo',pos:'DIF',q:1,nat:'ITA'}],
    'Modena': [{n:'Ambrosino Giuseppe',pos:'ATT',q:23,nat:'ITA'},{n:'Pedro Mendes',pos:'ATT',q:23,nat:'POR'},{n:'Caso Giuseppe',pos:'ATT',q:16,nat:'ITA'},{n:'Santoro Simone',pos:'CEN',q:14,nat:'ITA'},{n:'Brugman Gaston',pos:'CEN',q:13,nat:'URU'},{n:'Chichizola Leandro',pos:'POR',q:12,nat:'ARG'},{n:'Tonoli Daniel',pos:'DIF',q:12,nat:'ITA'},{n:'Azzi Paulo',pos:'DIF',q:11,nat:'BRA'},{n:'Zampano Francesco',pos:'DIF',q:11,nat:'ITA'},{n:'Olzer Giacomo',pos:'CEN',q:11,nat:'ITA'},{n:'Nieling Bryant',pos:'DIF',q:9,nat:'NED'},{n:'Bianco Alessandro',pos:'CEN',q:8,nat:'ITA'},{n:'Montevago Daniele',pos:'ATT',q:7,nat:'ITA'},{n:'Bacchin Luca',pos:'ATT',q:6,nat:'ITA'},{n:'Nador Steven',pos:'DIF',q:5,nat:'TOG'},{n:'Adorni Davide',pos:'DIF',q:3,nat:'ITA'},{n:'Manquant Joris',pos:'ATT',q:3,nat:'FRA'},{n:'Bozhanaj Kleis',pos:'CEN',q:2,nat:'ALB'},{n:'Imputato Antonio',pos:'CEN',q:2,nat:'ITA'},{n:'Consiglio Leonardo',pos:'POR',q:1,nat:'ITA'},{n:'Laidani Abdullah',pos:'POR',q:1,nat:'SUI'},{n:'Maran Andrea',pos:'POR',q:1,nat:'ITA'},{n:'Odero Martino',pos:'DIF',q:1,nat:'ITA'},{n:'Ronco Diego',pos:'DIF',q:1,nat:'ITA'},{n:'Arnaboldi Pietro',pos:'CEN',q:1,nat:'ITA'},{n:'Sersanti Alessandro',pos:'CEN',q:1,nat:'ITA'},{n:'Stenio Zanetti',pos:'CEN',q:1,nat:'BRA'},{n:'Colpo Edoardo',pos:'ATT',q:1,nat:'ITA'}],
    'Pisa': [{n:'Moreo Stefano',pos:'ATT',q:31,nat:'ITA',age:35},{n:'Pittarello Filippo',pos:'ATT',q:28,nat:'ITA'},{n:'Tramoni Matteo',pos:'CEN',q:24,nat:'FRA',age:27},{n:'Petagna Andrea',pos:'ATT',q:23,nat:'ITA',age:31},{n:'Marras Tommaso',pos:'ATT',q:20,nat:'ITA'},{n:'Meister Henrik',pos:'ATT',q:15,nat:'DEN'},{n:'Correia Omar',pos:'CEN',q:14,nat:'FRA'},{n:'Rao Emanuele',pos:'CEN',q:13,nat:'ITA'},{n:'Angori Samuele',pos:'DIF',q:12,nat:'ITA'},{n:'Canestrelli Simone',pos:'DIF',q:12,nat:'ITA'},{n:'Leone Giuseppe',pos:'CEN',q:12,nat:'ITA'},{n:'Scuffet Simone',pos:'POR',q:11,nat:'ITA'},{n:'Confente Alessandro',pos:'POR',q:9,nat:'ITA'},{n:'Coppola Francesco',pos:'DIF',q:8,nat:'ITA'},{n:'Leris Mehdi',pos:'CEN',q:8,nat:'ALG'},{n:'Caracciolo Antonio',pos:'DIF',q:7,nat:'ITA'},{n:'Piccinini Gabriele',pos:'CEN',q:7,nat:'ITA'},{n:'Bonfanti Nicholas',pos:'ATT',q:7,nat:'ITA'},{n:'Bozhinov Rosen',pos:'DIF',q:6,nat:'BUL'},{n:'Calabresi Arturo',pos:'DIF',q:6,nat:'ITA'},{n:'Zanon Simone',pos:'DIF',q:6,nat:'ITA'},{n:'Vural Isak',pos:'CEN',q:5,nat:'TUR'},{n:'Mbambi Jeremy',pos:'DIF',q:4,nat:'BEL'},{n:'Lusuardi Mateus',pos:'DIF',q:3,nat:'BRA'},{n:'Guizzo Tommaso',pos:'POR',q:1,nat:'ITA'},{n:'Loria Leonardo',pos:'POR',q:1,nat:'ITA'},{n:'Vukovic Ante',pos:'POR',q:1,nat:'CRO'},{n:'Primasso Andrea',pos:'DIF',q:1,nat:'ITA'},{n:'Bettazzi Brando',pos:'CEN',q:1,nat:'ITA'},{n:'Maucci Giacomo',pos:'CEN',q:1,nat:'ITA'},{n:'Vignato Emanuel',pos:'CEN',q:1,nat:'ITA'},{n:'Buffon Louis',pos:'ATT',q:1,nat:'CZE'},{n:'Giani Elia',pos:'ATT',q:1,nat:'ITA'}],
    'Cesena': [{n:'Shpendi Cristian',pos:'ATT',q:47,nat:'ALB'},{n:'Debenedetti Alessandro',pos:'ATT',q:18,nat:'ITA'},{n:'Druiventak',pos:'CEN',q:11,nat:'NED'},{n:'Frabotta Gianluca',pos:'DIF',q:10,nat:'ITA'},{n:'Fiori Antonio',pos:'ATT',q:10,nat:'ITA'},{n:'Ciofi Andrea',pos:'DIF',q:9,nat:'ITA'},{n:'Zaro Giovanni',pos:'DIF',q:8,nat:'ITA'},{n:'Bisoli Dimitri',pos:'CEN',q:8,nat:'ITA'},{n:'Gelli Jacopo',pos:'DIF',q:7,nat:'ITA'},{n:'Ogunseye Roberto',pos:'ATT',q:7,nat:'NGA'},{n:'Siano Alessandro',pos:'POR',q:4,nat:'ITA'},{n:'Magni Vittorio',pos:'DIF',q:4,nat:'ITA'},{n:'Mangraviti Massimiliano',pos:'DIF',q:4,nat:'ITA'},{n:'Guidi Matteo',pos:'CEN',q:4,nat:'ITA'},{n:'Pagano Riccardo',pos:'CEN',q:4,nat:'ITA'},{n:'Tosku Frederik',pos:'ATT',q:4,nat:'KVX'},{n:'Natta Mark',pos:'DIF',q:3,nat:'AUS'},{n:'Arrigoni Tommaso',pos:'CEN',q:3,nat:'ITA'},{n:'Caprini Daniel',pos:'CEN',q:3,nat:'ITA'},{n:'Francesconi Matteo',pos:'CEN',q:3,nat:'ITA'},{n:'Schirone Luca',pos:'CEN',q:3,nat:'ITA'},{n:'David Antonio',pos:'DIF',q:2,nat:'ROU'},{n:'Kebbeh Mamadou',pos:'DIF',q:2,nat:'GAM'},{n:'Piacentini Matteo',pos:'DIF',q:2,nat:'ITA'},{n:'Castagnetti Michele',pos:'CEN',q:2,nat:'ITA'},{n:'Olivieri Edoardo',pos:'CEN',q:2,nat:'ITA'},{n:'Zamagni Davide',pos:'CEN',q:2,nat:'ITA'},{n:'Galvagno Filippo',pos:'ATT',q:2,nat:'ITA'},{n:'Ferretti Luca',pos:'POR',q:1,nat:'ITA'},{n:'Fontana Niccolo',pos:'POR',q:1,nat:'ITA'},{n:'Gianfanti Simone',pos:'POR',q:1,nat:'ITA'},{n:'Klinsmann Jonathan',pos:'POR',q:1,nat:'USA'},{n:'Domeniconi Riccardo',pos:'DIF',q:1,nat:'ITA'},{n:'Pieraccini Simone',pos:'DIF',q:1,nat:'ITA'},{n:'Pitti Enea',pos:'DIF',q:1,nat:'ITA'},{n:'Giovannini Alessandro',pos:'CEN',q:1,nat:'ITA'},{n:'Papa Wade Ibrahima',pos:'CEN',q:1,nat:'SEN'},{n:'Bertaccini Filippo',pos:'ATT',q:1,nat:'ITA'}],
    'Juve Stabia': [{n:'Di Nardo Antonio',pos:'ATT',q:26,nat:'ITA'},{n:'Candellone Leonardo',pos:'ATT',q:23,nat:'ITA'},{n:'Boer Pietro',pos:'POR',q:12,nat:'ITA'},{n:'Karic Nermin',pos:'CEN',q:12,nat:'SWE'},{n:'Bettella Davide',pos:'DIF',q:10,nat:'ITA'},{n:'Patane Nicola',pos:'CEN',q:10,nat:'ITA'},{n:'Matheus dos Santos',pos:'ATT',q:10,nat:'BRA'},{n:'Piscopo Kevin',pos:'ATT',q:9,nat:'ITA'},{n:'Bellich Marco',pos:'DIF',q:8,nat:'ITA'},{n:'Buglio Davide',pos:'CEN',q:8,nat:'ITA'},{n:'Ricciardi Manuel',pos:'DIF',q:7,nat:'ITA'},{n:'Artioli Federico',pos:'CEN',q:5,nat:'ITA'},{n:'Pierobon Christian',pos:'CEN',q:5,nat:'ITA'},{n:'Sandrucci Romeo',pos:'ATT',q:5,nat:'ITA'},{n:'Scuderi Giulio',pos:'DIF',q:4,nat:'ITA'},{n:'Battistella Thomas',pos:'CEN',q:4,nat:'ITA'},{n:'Gallea Beidi',pos:'DIF',q:3,nat:'MLI'},{n:'Andreoni Cristian',pos:'DIF',q:2,nat:'ITA'},{n:'Douglas Terrence',pos:'DIF',q:2,nat:'NED'},{n:'Torrasi Emanuele',pos:'CEN',q:2,nat:'ITA'},{n:'Caccavo Luigi',pos:'ATT',q:2,nat:'ITA'},{n:'Vetro Antonio',pos:'POR',q:1,nat:'ITA'},{n:'Baldi Matteo',pos:'DIF',q:1,nat:'ITA'},{n:'D\'Amore Francesco',pos:'DIF',q:1,nat:'ITA'},{n:'Kassama Sheriff',pos:'DIF',q:1,nat:'GAM'},{n:'Louati Alessandro',pos:'CEN',q:1,nat:'ITA'},{n:'Meli Marco',pos:'CEN',q:1,nat:'ITA'},{n:'Perin Daniel',pos:'CEN',q:1,nat:'ITA'},{n:'Morachioli Gregorio',pos:'ATT',q:1,nat:'ITA'},{n:'Petrovic Tomi',pos:'ATT',q:1,nat:'SRB'},{n:'Piovanello Enrico',pos:'ATT',q:1,nat:'ITA'}],
    'Sudtirol': [{n:'Merkaj Olger',pos:'ATT',q:29,nat:'ALB'},{n:'Casiraghi Daniele',pos:'CEN',q:21,nat:'ITA'},{n:'Plizzari Alessandro',pos:'POR',q:14,nat:'ITA'},{n:'Molina Salvatore',pos:'CEN',q:13,nat:'ITA'},{n:'Okoro Alvin Obinna',pos:'CEN',q:13,nat:'ITA'},{n:'Vasic Aljosa',pos:'ATT',q:13,nat:'SRB'},{n:'Bjarkason Bjarki',pos:'CEN',q:12,nat:'ISL'},{n:'Giorgini Andrea',pos:'DIF',q:11,nat:'ITA'},{n:'Burnete Rares',pos:'CEN',q:9,nat:'ROU'},{n:'Rispoli Fabio',pos:'CEN',q:8,nat:'ITA'},{n:'Tait Fabian',pos:'CEN',q:8,nat:'ITA'},{n:'Mixtur Kenny',pos:'ATT',q:8,nat:'FRA'},{n:'Adamonis Marius',pos:'POR',q:7,nat:'LTU'},{n:'Veroli Davide',pos:'DIF',q:7,nat:'ITA'},{n:'Vasco Lopez',pos:'ATT',q:7,nat:'CPV'},{n:'Stivanello Riccardo',pos:'DIF',q:6,nat:'ITA'},{n:'Tronchin Simone',pos:'CEN',q:6,nat:'ITA'},{n:'Davi Simone',pos:'DIF',q:5,nat:'ITA'},{n:'Veseli Frederic',pos:'DIF',q:5,nat:'ALB'},{n:'El Kaouakibi Hamza',pos:'DIF',q:4,nat:'MAR'},{n:'Zeroli Kevin',pos:'CEN',q:4,nat:'ITA'},{n:'Davi Federico',pos:'DIF',q:3,nat:'ITA'},{n:'Pyyhtia Niklas',pos:'CEN',q:3,nat:'FIN'},{n:'Pietrangeli Nicola',pos:'DIF',q:2,nat:'ITA'},{n:'Sabatini Carlo',pos:'DIF',q:2,nat:'ITA'},{n:'Varnier Marco',pos:'DIF',q:2,nat:'ITA'},{n:'Drago Giacomo',pos:'POR',q:1,nat:'ITA'},{n:'Theiner Daniel',pos:'POR',q:1,nat:'ITA'},{n:'Rottensteiner Benedikt',pos:'DIF',q:1,nat:'ITA'},{n:'Stabile Giacomo',pos:'DIF',q:1,nat:'ITA'},{n:'Vimercati Alessandro',pos:'DIF',q:1,nat:'ITA'},{n:'Brik Dhirar',pos:'CEN',q:1,nat:'TUN'},{n:'Frigerio Marco',pos:'CEN',q:1,nat:'ITA'}],
    'Carrarese': [{n:'Abiuso Fabio',pos:'ATT',q:30,nat:'ITA'},{n:'Finotto Mattia',pos:'ATT',q:20,nat:'ITA'},{n:'Cisse Moustapha',pos:'ATT',q:13,nat:'GUI'},{n:'Marconi Giacomo',pos:'ATT',q:11,nat:'ITA'},{n:'Bleve Marco',pos:'POR',q:10,nat:'ITA'},{n:'Pizzignacco Semuel',pos:'POR',q:10,nat:'ITA'},{n:'Dagba Colin',pos:'DIF',q:9,nat:'FRA'},{n:'Rouhi Jonas',pos:'DIF',q:9,nat:'SWE'},{n:'Ruggeri Fabio',pos:'DIF',q:9,nat:'ITA'},{n:'Romani Lorenzo',pos:'DIF',q:8,nat:'ITA'},{n:'Belloni Niccolo',pos:'CEN',q:8,nat:'ITA'},{n:'Schiavi Nicolas',pos:'CEN',q:8,nat:'ARG'},{n:'Oliana Filippo',pos:'DIF',q:6,nat:'ITA'},{n:'Parlanti Gabriele',pos:'DIF',q:6,nat:'ITA'},{n:'Pinelli Pietro',pos:'CEN',q:6,nat:'ITA'},{n:'Khafi Yanis',pos:'CEN',q:5,nat:'MAR'},{n:'Reale Filippo',pos:'DIF',q:4,nat:'ITA'},{n:'Salomon Bartosz',pos:'DIF',q:4,nat:'POL'},{n:'Topalovic Luka',pos:'CEN',q:4,nat:'CRO'},{n:'Esteves Goncalo',pos:'DIF',q:2,nat:'POR'},{n:'Guercio Tommaso',pos:'DIF',q:2,nat:'ITA'},{n:'Martini Jacopo',pos:'CEN',q:2,nat:'ITA'},{n:'Fiorillo Vincenzo',pos:'POR',q:1,nat:'ITA'},{n:'Garofani Giovanni',pos:'POR',q:1,nat:'ITA'},{n:'Mazzini Stefano',pos:'POR',q:1,nat:'ITA'},{n:'Bouah Devid Eugene',pos:'DIF',q:1,nat:'ITA'},{n:'Capezzi Leonardo',pos:'CEN',q:1,nat:'ITA'},{n:'Liberati Filippo',pos:'CEN',q:1,nat:'ITA'},{n:'Melegoni Filippo',pos:'CEN',q:1,nat:'ITA'},{n:'Rubino Tommaso',pos:'CEN',q:1,nat:'ITA'},{n:'Torregrossa Ernesto',pos:'ATT',q:1,nat:'ITA'}],
    'Mantova': [{n:'Gliozzi Ettore',pos:'ATT',q:40,nat:'ITA'},{n:'Vlahović Vanja',pos:'ATT',q:25,nat:'SRB'},{n:'Mancuso Leonardo',pos:'ATT',q:17,nat:'ITA',age:35},{n:'Ruocco Francesco',pos:'CEN',q:16,nat:'ITA'},{n:'Bardi Francesco',pos:'POR',q:12,nat:'ITA'},{n:'Mensah David',pos:'CEN',q:11,nat:'GHA'},{n:'Silva Jonathan',pos:'CEN',q:11,nat:'BRA'},{n:'Bragantini Davide',pos:'ATT',q:11,nat:'ITA'},{n:'Benaissa Fahem',pos:'DIF',q:10,nat:'FRA'},{n:'Cella Stefano',pos:'DIF',q:9,nat:'ITA'},{n:'Tomasevic Bodin',pos:'DIF',q:9,nat:'MNE'},{n:'Castellini Alessio',pos:'DIF',q:8,nat:'ITA'},{n:'Ignacchiti Lorenzo',pos:'CEN',q:7,nat:'ITA'},{n:'Meroni Andrea',pos:'DIF',q:5,nat:'ITA'},{n:'Ilie Rares',pos:'CEN',q:5,nat:'ROU'},{n:'Kouda Rachid',pos:'CEN',q:5,nat:'BFA'},{n:'Maggioni Tommaso',pos:'DIF',q:4,nat:'ITA'},{n:'Baraldi Stefano',pos:'CEN',q:4,nat:'ITA'},{n:'Keita Sambaly',pos:'CEN',q:4,nat:'FRA'},{n:'Trimboli Simone',pos:'CEN',q:4,nat:'ITA'},{n:'Vesentini Filippo',pos:'CEN',q:4,nat:'ITA'},{n:'Wieser David',pos:'CEN',q:3,nat:'ITA'},{n:'Marai Cristian',pos:'DIF',q:2,nat:'ITA'},{n:'Radaelli Nicolo',pos:'DIF',q:2,nat:'ITA'},{n:'Cajazzo Ismael',pos:'CEN',q:2,nat:'CAN'},{n:'Majer Zan',pos:'CEN',q:2,nat:'SVN'},{n:'Gemello Luca',pos:'POR',q:1,nat:'ITA'},{n:'Fedel Giacomo',pos:'CEN',q:1,nat:'ITA'},{n:'Paoletti Flavio',pos:'CEN',q:1,nat:'ITA'},{n:'Bellini Mattia',pos:'ATT',q:1,nat:'ITA'},{n:'Chinetti Federico',pos:'ATT',q:1,nat:'ITA'},{n:'Spinacce Matteo',pos:'ATT',q:1,nat:'ITA'}],
    'Padova': [{n:'Bortolussi Mattia',pos:'ATT',q:24,nat:'ITA'},{n:'Lasagna Kevin',pos:'ATT',q:22,nat:'ITA',age:32},{n:'Caprari Gianluca',pos:'ATT',q:20,nat:'ITA',age:33},{n:'Zanimacchia Luca',pos:'CEN',q:18,nat:'ITA'},{n:'Zuelli Emanuele',pos:'CEN',q:15,nat:'ITA'},{n:'Gomez Papu',pos:'ATT',q:15,nat:'ARG'},{n:'Moro Luca',pos:'ATT',q:15,nat:'ITA'},{n:'Buonaiuto Cristian',pos:'ATT',q:13,nat:'ITA'},{n:'Sorrentino Alessandro',pos:'POR',q:12,nat:'ITA'},{n:'Di Mariano Francesco',pos:'ATT',q:12,nat:'ITA'},{n:'Capelli Alessandro',pos:'CEN',q:11,nat:'ITA'},{n:'Fusi Paolo',pos:'CEN',q:11,nat:'ITA'},{n:'Pompetti Marco',pos:'DIF',q:10,nat:'ITA'},{n:'Dellavalle Alessandro',pos:'DIF',q:7,nat:'ITA'},{n:'Lovato Matteo',pos:'DIF',q:7,nat:'ITA'},{n:'Varas Kevin',pos:'CEN',q:7,nat:'ECU'},{n:'Pastina Christian',pos:'DIF',q:6,nat:'ITA'},{n:'Sgarbi Filippo',pos:'DIF',q:6,nat:'ITA'},{n:'Giunti Giovanni',pos:'CEN',q:5,nat:'ITA'},{n:'Faedo Carlo',pos:'DIF',q:3,nat:'ITA'},{n:'Favale Giulio',pos:'DIF',q:3,nat:'ITA'},{n:'Seghetti Alessandro',pos:'ATT',q:3,nat:'ITA'},{n:'Barreca Antonio',pos:'DIF',q:2,nat:'ITA'},{n:'Marcolini Diego',pos:'CEN',q:2,nat:'ITA'},{n:'Mouquet Louis',pos:'POR',q:1,nat:'FRA'},{n:'Bacci Jacopo',pos:'CEN',q:1,nat:'ITA'},{n:'Lo Biudo Emiliano',pos:'ATT',q:1,nat:'ITA'}],
    'Ascoli': [{n:'Brunori Matteo Sandri',pos:'ATT',q:35,nat:'ITA',age:32},{n:'Chakir Mohamed',pos:'ATT',q:21,nat:'ITA'},{n:'D\'Uffizi Simone',pos:'ATT',q:17,nat:'ITA'},{n:'Vitale Samuele',pos:'POR',q:13,nat:'ITA'},{n:'De Pieri Giacomo',pos:'ATT',q:11,nat:'ITA'},{n:'Corradini Giovanni',pos:'CEN',q:9,nat:'ITA'},{n:'Guiebre Abdoul',pos:'CEN',q:9,nat:'BFA'},{n:'Silipo Andrea',pos:'CEN',q:9,nat:'ITA'},{n:'Gori Gabriele',pos:'ATT',q:9,nat:'ITA'},{n:'Curado Marcos',pos:'DIF',q:6,nat:'ARG'},{n:'Rizzo Nicholas',pos:'DIF',q:6,nat:'ITA'},{n:'Acampora Gennaro',pos:'CEN',q:6,nat:'ITA'},{n:'Milanese Tommaso',pos:'CEN',q:6,nat:'ITA'},{n:'Perciun Sergiu',pos:'CEN',q:6,nat:'MDA'},{n:'Damiani Samuele',pos:'CEN',q:5,nat:'ITA'},{n:'Lo Scalzo Luca',pos:'CEN',q:4,nat:'ITA'},{n:'Menna Damiano',pos:'DIF',q:3,nat:'ITA'},{n:'Nicoletti Manuel',pos:'DIF',q:3,nat:'ITA'},{n:'Oliveri Andrea',pos:'CEN',q:3,nat:'ITA'},{n:'Barosi Davide',pos:'POR',q:1,nat:'ITA'},{n:'Brzan Rok',pos:'POR',q:1,nat:'SVN'},{n:'Crespi Gian Marco',pos:'POR',q:1,nat:'ITA'},{n:'Dente Rocco',pos:'POR',q:1,nat:'ITA'},{n:'Raffaelli Matteo',pos:'POR',q:1,nat:'ITA'},{n:'Alagna Manuel',pos:'DIF',q:1,nat:'ITA'},{n:'Dente Gerardo',pos:'DIF',q:1,nat:'ITA'},{n:'De Witt Francesco',pos:'CEN',q:1,nat:'ITA'},{n:'Del Sole Ferdinando',pos:'CEN',q:1,nat:'ITA'},{n:'Rama Alex',pos:'CEN',q:1,nat:'ALB'}],
    'Avellino': [{n:'Cheddira Walid',pos:'ATT',q:37,nat:'MAR',age:28},{n:'Biasci Tommaso',pos:'ATT',q:28,nat:'ITA'},{n:'Fila Daniel',pos:'ATT',q:19,nat:'CZE'},{n:'Palumbo Martin',pos:'CEN',q:15,nat:'NOR'},{n:'Besaggio Michele',pos:'CEN',q:14,nat:'ITA'},{n:'Martinelli Tommaso',pos:'POR',q:11,nat:'ITA'},{n:'Sounas Dimitrios',pos:'CEN',q:11,nat:'GRE'},{n:'Russo Raffaele',pos:'ATT',q:11,nat:'ITA'},{n:'Izzo Armando',pos:'DIF',q:9,nat:'ITA'},{n:'Simic Lorenco',pos:'DIF',q:9,nat:'CRO'},{n:'Favilli Andrea',pos:'ATT',q:9,nat:'ITA'},{n:'Cancellotti Tommaso',pos:'DIF',q:8,nat:'ITA'},{n:'Enrici Patrick',pos:'DIF',q:8,nat:'ITA'},{n:'Palmiero Luca',pos:'CEN',q:7,nat:'ITA'},{n:'Aloisi Antonio',pos:'DIF',q:6,nat:'ITA'},{n:'Moruzzi Brando',pos:'DIF',q:5,nat:'ITA'},{n:'Di Maggio Luca',pos:'CEN',q:5,nat:'ITA'},{n:'Insigne Roberto',pos:'ATT',q:5,nat:'ITA'},{n:'Patierno Cosimo',pos:'ATT',q:5,nat:'ITA'},{n:'Manzi Claudio',pos:'DIF',q:3,nat:'ITA'},{n:'Maisto Francesco',pos:'CEN',q:3,nat:'ITA'},{n:'Sala Marco',pos:'DIF',q:2,nat:'ITA'},{n:'Iannarilli Antony',pos:'POR',q:1,nat:'ITA'},{n:'Di Martino Leo',pos:'DIF',q:1,nat:'ITA'},{n:'Arzillo Vincenzo',pos:'CEN',q:1,nat:'ITA'},{n:'Della Rocca Mattia',pos:'CEN',q:1,nat:'ITA'},{n:'Faticanti Giacomo',pos:'CEN',q:1,nat:'ITA'},{n:'Mutanda Noah',pos:'CEN',q:1,nat:'ITA'},{n:'Pandolfi Luca',pos:'ATT',q:1,nat:'ITA'}],
    'Benevento': [{n:'Okereke David',pos:'ATT',q:24,nat:'NGA',age:29},{n:'Lamesta Davide',pos:'ATT',q:19,nat:'ITA'},{n:'Salvemini Francesco',pos:'ATT',q:18,nat:'ITA'},{n:'Tumminello Marco',pos:'ATT',q:17,nat:'ITA'},{n:'Verdi Simone',pos:'CEN',q:14,nat:'ITA',age:34},{n:'Vannucchi Gianmarco',pos:'POR',q:12,nat:'ITA'},{n:'Scognamillo Stefano',pos:'DIF',q:11,nat:'ITA'},{n:'Cherubini Luigi',pos:'CEN',q:11,nat:'ITA'},{n:'Beruatto Pietro',pos:'DIF',q:8,nat:'ITA'},{n:'Maita Mattia',pos:'CEN',q:8,nat:'ITA'},{n:'Giugliano Marco',pos:'ATT',q:8,nat:'ITA'},{n:'Pierozzi Edoardo',pos:'DIF',q:7,nat:'ITA'},{n:'Sernicola Leonardo',pos:'DIF',q:7,nat:'ITA'},{n:'Mignani Guglielmo',pos:'ATT',q:7,nat:'ITA'},{n:'Caldirola Luca',pos:'DIF',q:6,nat:'ITA'},{n:'Saio Pietro',pos:'DIF',q:6,nat:'ITA'},{n:'Kouan Christian',pos:'CEN',q:6,nat:'CIV'},{n:'Prisco Antonio',pos:'CEN',q:6,nat:'ITA'},{n:'Siatounis Antonis',pos:'CEN',q:5,nat:'GRE'},{n:'Talia Angelo',pos:'CEN',q:5,nat:'ITA'},{n:'Dalle Mura Christian',pos:'DIF',q:4,nat:'ITA'},{n:'Battista Vincenzo',pos:'ATT',q:3,nat:'ITA'},{n:'Celia Raffaele',pos:'DIF',q:2,nat:'ITA'},{n:'Romano Raffaele',pos:'DIF',q:2,nat:'ITA'},{n:'Esposito Manuel',pos:'POR',q:1,nat:'ITA'},{n:'Mandato Francesco',pos:'POR',q:1,nat:'ITA'},{n:'Russo Danilo',pos:'POR',q:1,nat:'ITA'},{n:'Sylla Cheikh Alioune',pos:'POR',q:1,nat:'SEN'},{n:'Ferrara Antonio',pos:'DIF',q:1,nat:'ITA'},{n:'Ricci Giacomo',pos:'DIF',q:1,nat:'ITA'},{n:'Carfora Lorenzo',pos:'CEN',q:1,nat:'ITA'},{n:'Donatiello Matteo',pos:'CEN',q:1,nat:'ITA'},{n:'Mehic Dino',pos:'CEN',q:1,nat:'BIH'},{n:'Nardi Filippo',pos:'CEN',q:1,nat:'ITA'},{n:'Pinato Marco',pos:'CEN',q:1,nat:'ITA'},{n:'Schimmenti Emanuele',pos:'CEN',q:1,nat:'ITA'},{n:'Simonetti Pier Luigi',pos:'CEN',q:1,nat:'ITA'},{n:'Cantisani Raffaele',pos:'ATT',q:1,nat:'ITA'},{n:'Logan Gaspar',pos:'ATT',q:1,nat:'BRA'},{n:'Manconi Jacopo',pos:'ATT',q:1,nat:'ITA'}],
    'Vicenza': [{n:'Moncini Gabriele',pos:'ATT',q:42,nat:'ITA',age:29},{n:'Rauti Nicola',pos:'ATT',q:20,nat:'ITA'},{n:'Merkaj Silvio',pos:'ATT',q:17,nat:'ALB'},{n:'Valoti Mattia',pos:'CEN',q:15,nat:'ITA'},{n:'Morra Claudio',pos:'ATT',q:13,nat:'ITA'},{n:'Gagno Riccardo',pos:'POR',q:11,nat:'ITA'},{n:'Corazza Tommaso',pos:'DIF',q:10,nat:'ITA'},{n:'Carraro Marco',pos:'CEN',q:10,nat:'ITA'},{n:'Pellizzari Giulio',pos:'CEN',q:9,nat:'ITA'},{n:'Pietrelli Alessandro',pos:'CEN',q:9,nat:'ITA'},{n:'Zonta Loris',pos:'CEN',q:9,nat:'ITA'},{n:'Alessio Filippo',pos:'ATT',q:9,nat:'ITA'},{n:'Costa Filippo',pos:'DIF',q:8,nat:'ITA'},{n:'Cuomo Giuseppe',pos:'DIF',q:7,nat:'ITA'},{n:'Leverbe Maxime',pos:'DIF',q:6,nat:'FRA'},{n:'Brighenti Nicolo',pos:'DIF',q:5,nat:'ITA'},{n:'Caferri Lorenzo',pos:'DIF',q:5,nat:'ITA'},{n:'Marchizza Riccardo',pos:'DIF',q:5,nat:'ITA'},{n:'Cavion Michele',pos:'CEN',q:5,nat:'ITA'},{n:'Vitale Mattia',pos:'CEN',q:5,nat:'ITA'},{n:'Sandon Thomas',pos:'DIF',q:4,nat:'ITA'},{n:'Vescovi Matteo',pos:'DIF',q:3,nat:'ITA'},{n:'Rada Armand',pos:'CEN',q:3,nat:'ALB'},{n:'Talarico Raul',pos:'CEN',q:3,nat:'ITA'},{n:'Della Morte Matteo',pos:'DIF',q:2,nat:'ITA'},{n:'Bagheria Filippo',pos:'POR',q:1,nat:'ITA'},{n:'Basso Mattia',pos:'POR',q:1,nat:'ITA'},{n:'Massolo Samuele',pos:'POR',q:1,nat:'ITA'},{n:'Tsadjout Frank',pos:'ATT',q:1,nat:'ITA'}],
    'Arezzo': [{n:'Cerri Alberto',pos:'ATT',q:21,nat:'ITA',age:30},{n:'Dezi Jacopo',pos:'CEN',q:15,nat:'ITA'},{n:'Tavernelli Camillo',pos:'ATT',q:15,nat:'ITA'},{n:'Nunziante Alessandro',pos:'POR',q:13,nat:'ITA'},{n:'Ionita Artur',pos:'CEN',q:12,nat:'MDA'},{n:'Arena Alessandro',pos:'ATT',q:11,nat:'ITA'},{n:'Illanes Julian',pos:'DIF',q:9,nat:'ARG'},{n:'Cortesi Matteo',pos:'ATT',q:9,nat:'ITA'},{n:'Renzi Alessandro',pos:'CEN',q:8,nat:'ITA'},{n:'Righetti Samuele',pos:'DIF',q:7,nat:'ITA'},{n:'Cianci Pietro',pos:'ATT',q:7,nat:'ITA'},{n:'Pattarello Emiliano',pos:'ATT',q:7,nat:'ITA'},{n:'De Col Filippo',pos:'DIF',q:6,nat:'ITA'},{n:'Moreschini Patrick',pos:'ATT',q:6,nat:'ITA'},{n:'Gilli Matteo',pos:'DIF',q:5,nat:'ITA'},{n:'Sussi Samuele',pos:'ATT',q:5,nat:'ITA'},{n:'Casarosa Matias',pos:'DIF',q:4,nat:'ARG'},{n:'Chierico Luca',pos:'CEN',q:4,nat:'ITA'},{n:'Manes Aleandro',pos:'CEN',q:4,nat:'ITA'},{n:'Sala Mattia',pos:'CEN',q:4,nat:'ITA'},{n:'Capello Alessandro',pos:'ATT',q:4,nat:'ITA'},{n:'Chiosa Marco',pos:'DIF',q:3,nat:'ITA'},{n:'Viviani Mattia',pos:'CEN',q:3,nat:'ITA'},{n:'Coccia Lorenzo',pos:'DIF',q:2,nat:'ITA'},{n:'Coppolaro Mauro',pos:'DIF',q:2,nat:'ITA'},{n:'Ravasio Mario',pos:'ATT',q:2,nat:'ITA'},{n:'Galli Amoris',pos:'POR',q:1,nat:'ITA'},{n:'Seculin Andrea',pos:'POR',q:1,nat:'ITA'},{n:'Trombini Luca',pos:'POR',q:1,nat:'ITA'},{n:'Mena Marlon',pos:'DIF',q:1,nat:'DOM'},{n:'Tito Fabio',pos:'DIF',q:1,nat:'ITA'},{n:'Ferrara Gabriele',pos:'CEN',q:1,nat:'ITA'},{n:'Mawuli Shaka',pos:'CEN',q:1,nat:'GHA'},{n:'Sani Ettore',pos:'CEN',q:1,nat:'ITA'},{n:'Concetti Mattia',pos:'ATT',q:1,nat:'ITA'},{n:'Varela Djamanca',pos:'ATT',q:1,nat:'GNB'}],
    'Entella': [{n:'Forte Francesco',pos:'ATT',q:30,nat:'ITA'},{n:'Franzoni Andrea',pos:'CEN',q:27,nat:'ITA'},{n:'Cuppone Luigi',pos:'ATT',q:23,nat:'ITA'},{n:'Corona Giacomo',pos:'ATT',q:19,nat:'ITA'},{n:'Tiritiello Andrea',pos:'DIF',q:13,nat:'ITA'},{n:'Guiu Bernat',pos:'ATT',q:13,nat:'ESP'},{n:'Di Mario Stefano',pos:'DIF',q:11,nat:'ITA'},{n:'Parodi Luca',pos:'DIF',q:10,nat:'ITA'},{n:'Casarotto Matteo',pos:'ATT',q:10,nat:'ITA'},{n:'Colombi Simone',pos:'POR',q:9,nat:'ITA'},{n:'Marconi Ivan',pos:'DIF',q:8,nat:'ITA'},{n:'Squizzato Niccolo',pos:'CEN',q:8,nat:'ITA'},{n:'Alborghetti Mattia',pos:'DIF',q:7,nat:'ITA'},{n:'Turicchia Riccardo',pos:'DIF',q:6,nat:'ITA'},{n:'Tirelli Mattia',pos:'ATT',q:6,nat:'ITA'},{n:'Valori Mattia',pos:'CEN',q:5,nat:'ITA'},{n:'Previtali Nicolas',pos:'DIF',q:4,nat:'ITA'},{n:'Benedetti Leonardo',pos:'CEN',q:4,nat:'ITA'},{n:'Matteazzi Ernesto',pos:'CEN',q:3,nat:'ITA'},{n:'Del Frate Federico',pos:'POR',q:2,nat:'ITA'},{n:'Motolese Mattia',pos:'DIF',q:2,nat:'ITA'},{n:'Costa Gabriele',pos:'CEN',q:2,nat:'ITA'},{n:'Siaulys Ovidijus',pos:'POR',q:1,nat:'LTU'},{n:'Boccadamo Antonio',pos:'DIF',q:1,nat:'ITA'},{n:'Mezzoni Francesco',pos:'DIF',q:1,nat:'ITA'},{n:'Bariti Davide',pos:'CEN',q:1,nat:'ITA'},{n:'Nichetti Marco',pos:'CEN',q:1,nat:'ITA'},{n:'Traniello Andrea',pos:'ATT',q:1,nat:'ITA'}],
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
    'Bianco', 'Vitali', 'Pellegrini', 'Sala', 'Farina', 'Rizzi', 'Gatti', 'Serra', 'Coppola', 'De Santis',
    'D\'Angelo', 'Marini', 'Grasso', 'Valentini', 'Messina', 'Fabbri', 'Guerra', 'Rossetti', 'Parisi', 'Sorrentino',
    'Grimaldi', 'De Angelis', 'Palumbo', 'Riva', 'Basile', 'Milani', 'Bianchini', 'Piras', 'Ferretti', 'Bernardi',
    'Neri', 'Piazza', 'Cattaneo', 'Negri', 'Orlando', 'Pagano', 'Rossini', 'D\'Amico', 'Trevisan', 'Angelini',
    'Battaglia', 'Beretta', 'Bevilacqua', 'Bianconi', 'Bonetti', 'Borrelli', 'Bosco', 'Cannavaro', 'Capasso', 'Caputo',
    'Carbone', 'Cassano', 'Cervi', 'Chiesa', 'Cirillo', 'Colella', 'Colonna', 'Corsini', 'Damiani', 'D\'Amato',
    'De Rosa', 'Di Marco', 'Di Stefano', 'Donati', 'Fabbrini', 'Fanelli', 'Federici', 'Ferrante', 'Fiore', 'Franceschini',
    'Franco', 'Gasperini', 'Genovese', 'Gianni', 'Grieco', 'Guidi', 'Iacobelli', 'Iannucci', 'Leoni', 'Lombardo',
    'Lorenzini', 'Maggi', 'Malavolti', 'Manzo', 'Marra', 'Melis', 'Meloni', 'Merlo', 'Mirabelli', 'Montanari',
    'Morandi', 'Nardi', 'Natali', 'Palermo', 'Palmieri', 'Pasquali', 'Pastore', 'Perrone', 'Piscopo', 'Pozzi',
    'Abate', 'Acquaviva', 'Agostini', 'Albanese', 'Aloisi', 'Amoroso', 'Ancona', 'Antonelli', 'Arena', 'Baldini',
    'Baresi', 'Bartolini', 'Battistini', 'Bellucci', 'Belotti', 'Benedetti', 'Bergamini', 'Berardi', 'Bertini', 'Bettini',
    'Biondi', 'Boni', 'Bordin', 'Borghi', 'Bosi', 'Bracci', 'Brambilla', 'Bruni', 'Buonocore', 'Cacciatore',
    'Calabrese', 'Calderone', 'Calvi', 'Camisa', 'Campana', 'Cannizzo', 'Capobianco', 'Capra', 'Caravaggio', 'Cardinale',
    'Carnevale', 'Carraro', 'Carrera', 'Casadei', 'Casali', 'Castellano', 'Catalano', 'Cavalieri', 'Cavallaro', 'Cavalli',
    'Ceccarelli', 'Cecchini', 'Celentano', 'Cerruti', 'Chiara', 'Cianci', 'Cimino', 'Cinquegrana', 'Cipolla', 'Cocco',
    'Colangelo', 'Coletti', 'Collura', 'Comi', 'Conte', 'Coppa', 'Corradi', 'Corsi', 'Cosentino', 'Costanzo',
    'Crescenzi', 'Crisci', 'Cucinotta', 'Curti', 'D\'Alessandro', 'D\'Amore', 'D\'Antonio', 'D\'Auria', 'D\'Errico', 'D\'Onofrio',
    'De Bernardi', 'De Bonis', 'De Filippo', 'De Giorgio', 'De Grandis', 'De Marchi', 'De Martino', 'De Nardis', 'De Paoli', 'De Vito',
    'Del Bono', 'Del Vecchio', 'Della Rocca', 'Di Bari', 'Di Bella', 'Di Biase', 'Di Carlo', 'Di Costanzo', 'Di Fabio', 'Di Gennaro',
    'Di Giacomo', 'Di Giovanni', 'Di Lorenzo', 'Di Maggio', 'Di Matteo', 'Di Nardo', 'Di Palma', 'Di Pasquale', 'Di Salvo', 'Errico',
    'Esposti', 'Fabiani', 'Falco', 'Falcone', 'Fanti', 'Farinelli', 'Fattori', 'Favaro', 'Fazio', 'Ferraresi',
    'Ferrarese', 'Ferraro', 'Fiorentino', 'Fiorillo', 'Fiorini', 'Foglia', 'Forlani', 'Fornaciari', 'Forte', 'Fossati',
    'Fracassi', 'Franzese', 'Frattini', 'Fresu', 'Frigo', 'Fumagalli', 'Gabrielli', 'Gagliardi', 'Galante', 'Galasso',
    'Gallina', 'Gambino', 'Gargano', 'Gasparini', 'Gatto', 'Gavioli', 'Gazzola', 'Ghezzi', 'Giacobbe', 'Giampaolo',
    'Giannetti', 'Giannini', 'Gioia', 'Giuliani', 'Golino', 'Gori', 'Governatori', 'Graziani', 'Guarino', 'Guerrieri',
    'Guglielmi', 'Iadanza', 'Ianniello', 'Improta', 'Innocenti', 'Lai', 'Landi', 'Lanza', 'La Rocca', 'Lauria',
    'Liguori', 'Loi', 'Lucchesi', 'Luongo', 'Maccarone', 'Magni', 'Maiorano', 'Manca', 'Manni', 'Mantovani',
    'Marsili', 'Martino', 'Marzano', 'Mastrangelo', 'Matarazzo', 'Mazza', 'Mazzarella', 'Mazzei', 'Mazzola', 'Menegatti',
    'Miceli', 'Michelini', 'Minervini', 'Mistretta', 'Modica', 'Montefiori', 'Montesano', 'Morbidelli', 'Morra', 'Muscara',
    'Nappi', 'Nardelli', 'Nastasi', 'Nenci', 'Nobile', 'Nole', 'Nucci', 'Nuti', 'Onorati', 'Orsini',
    'Ottaviani', 'Pace', 'Pagliuca', 'Palazzolo', 'Pandolfi', 'Pane', 'Panetta', 'Panzeri', 'Papa', 'Papini',
    'Pasini', 'Piroddi', 'Passeri', 'Pastorelli', 'Patrizi', 'Pecoraro', 'Pellizzari', 'Peluso', 'Pennisi', 'Perri',
    'Petrucci', 'Piccinini', 'Pignatelli', 'Pilotti', 'Pinna', 'Pontecorvo', 'Piovan', 'Pistoia', 'Pizzo', 'Poggi',
    'Polverini', 'Porcelli', 'Prete', 'Puglisi', 'Quaranta', 'Quattrone', 'Ranieri', 'Rea', 'Renzi', 'Ricciardelli',
    'Abbate', 'Accardi', 'Adamo', 'Agnello', 'Alberti', 'Albini', 'Alighieri', 'Amadei', 'Ambrosini', 'Ammirati',
    'Anastasi', 'Andreoli', 'Angeloni', 'Ansaldo', 'Ardito', 'Arici', 'Ariosto', 'Armani', 'Arrighi', 'Ascoli',
    'Attanasio', 'Avanzi', 'Avolio', 'Baccarini', 'Baldacci', 'Ballerini', 'Balzano', 'Banfi', 'Baraldi', 'Barchi',
    'Barone', 'Bartoli', 'Basili', 'Bassani', 'Bassi', 'Bassini', 'Battaglini', 'Bazzi', 'Bedini', 'Bellandi',
    'Belletti', 'Bellomo', 'Benassi', 'Bencini', 'Bendinelli', 'Benigni', 'Bentivoglio', 'Bergonzi', 'Berlinguer', 'Bertacchini',
    'Bertoli', 'Bettoni', 'Biagi', 'Bianchetti', 'Bibbiani', 'Bignami', 'Binetti', 'Boccaccio', 'Boccardi', 'Bolognesi',
    'Bonanni', 'Bonaventura', 'Bonvicini', 'Borelli', 'Borgognoni', 'Borsani', 'Bortolotti', 'Bosisio', 'Bragagnolo', 'Brescia',
    'Bresciani', 'Brizzi', 'Bruschi', 'Buccella', 'Bucci', 'Buonarroti', 'Buratti', 'Caccamo', 'Cadeddu', 'Caiazzo',
    'Calandra', 'Calisti', 'Calo', 'Camozzi', 'Campagnolo', 'Canale', 'Candela', 'Cantone', 'Capaldo', 'Capponi',
    'Caravella', 'Carini', 'Carminati', 'Carraresi', 'Casaburi', 'Cascio', 'Casolari', 'Castiglia', 'Castiglione', 'Catania',
    'Cattani', 'Cavaliere', 'Cazzaniga', 'Cecchetti', 'Ceccotti', 'Celi', 'Cesari', 'Chiaramonte', 'Chiodini', 'Ciampa',
    'Ciampi', 'Ciccone', 'Ciccotti', 'Cioffi', 'Ciotti', 'Cocchi', 'Colacino', 'Colamarino', 'Collina', 'Comencini',
    'Coniglio', 'Consoli', 'Contestabile', 'Cordaro', 'Cordisco', 'Corradini', 'Cortese', 'Costantini', 'Cottone', 'Crescimanno',
    'Crippa', 'Curcio', 'Dallara', 'Daniele', 'De Ceglie', 'De Cesare', 'De Lisi', 'De Rossi', 'De Simone', 'De Vecchi',
    'Della Valle', 'Denti', 'Diotallevi', 'Domenici', 'Donnini', 'Doria', 'Dossena', 'Fabris', 'Faccioli', 'Falbo',
    'Martinez', 'Fernandez', 'Garcia', 'Sanchez', 'Rodriguez', 'Lopez', 'Gonzalez', 'Perez', 'Diaz', 'Alonso',
    'Torres', 'Ramirez', 'Ortiz', 'Silva', 'Santos', 'Oliveira', 'Pereira', 'Carvalho', 'Fonseca', 'Ribeiro',
    'Moreira', 'Teixeira', 'Almeida', 'Dubois', 'Moreau', 'Laurent', 'Lefebvre', 'Girard', 'Bernard', 'Petit',
    'Roux', 'Fournier', 'Mercier', 'Nkomo', 'Diallo', 'Traore', 'Mensah', 'Okafor', 'Eze', 'Adeyemi',
    'Kone', 'Toure', 'Camara', 'Bakayoko', 'Diarra', 'Sow', 'Sarr', 'Ndiaye', 'Cisse', 'Kovac',
    'Novak', 'Jankovic', 'Petrovic', 'Ivanovic', 'Radovic', 'Dragic', 'Vukovic', 'Popescu', 'Ionescu', 'Nagy',
    'Kowalski', 'Nowak', 'Jansen', 'Andersen', 'Nielsen', 'Hansen', 'Larsen', 'Karlsson', 'Eriksson', 'Johansson',
    'Berg', 'Lund', 'Muller', 'Schmidt', 'Weber', 'Wagner', 'Becker', 'Hoffmann', 'Bakker', 'Visser',
    'Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Thomas', 'Roberts', 'Walker', 'Wright',
    'White', 'Green', 'Hall', 'Wood', 'Clarke', 'Turner', 'Hill', 'Ward', 'Baker', 'Cooper',
    'Yilmaz', 'Demir', 'Kaya', 'Celik', 'Sahin', 'Aydin', 'Ozturk', 'Arslan', 'Papadopoulos', 'Georgiou',
    'Ioannou', 'Nikolaou', 'Kaminski', 'Wojcik', 'Lewandowski', 'Zielinski', 'Novotny', 'Dvorak', 'Prochazka', 'Svoboda',
    'Kvaratskhelia', 'Mamardashvili', 'Sarkisyan', 'Petrosyan', 'Tanaka', 'Sato', 'Suzuki', 'Kim', 'Lee', 'Park',
    'Acosta', 'Benitez', 'Cabrera', 'Duarte', 'Espinoza', 'Flores', 'Herrera', 'Medina', 'Paredes', 'Rojas',
    'Vidal', 'Zapata', 'Mbeki', 'Diakite', 'Coulibaly', 'Keita', 'Konate', 'Fofana', 'Balde', 'Mane',
    'Adekunle', 'Nwosu', 'Chukwu', 'Solberg', 'Halvorsen', 'Pedersen', 'Olsen', 'Svensson', 'Lindqvist', 'Makinen',
    'Virtanen', 'Kelly', 'Murphy', 'Walsh', 'McCarthy', 'Byrne', 'Doyle', 'Kennedy', 'Fitzgerald', 'Whelan',
    'Brennan', 'Benali', 'Boumediene', 'Cherif', 'Haddad', 'Mansouri', 'Saadi', 'Belkacem', 'Ferhat', 'Amrani',
    'Bouazza', 'Ghods', 'Nekounam', 'Azmoun', 'Shevchenko', 'Yarmolenko', 'Konoplyanka', 'Zinchenko', 'Petrov', 'Ivanov',
    'Sokolov', 'Modric', 'Rakitic', 'Mandzukic', 'Kalinic', 'Brekalo', 'Vlasic', 'Barisic', 'Stanciu', 'Chiriches',
    'Sanmartean', 'Marin', 'Dragomir', 'Vermeulen', 'Vandenberghe', 'Peeters', 'Willems', 'Mertens', 'Janssens', 'Claes',
    'Wouters', 'Sigurdsson', 'Thorarinsson', 'Bjarnason', 'Finnbogason', 'Gudjohnsen', 'Cardoso', 'Machado', 'Nunes', 'Rocha',
    'Pinto', 'Barbosa', 'Correia', 'Vieira', 'Faria', 'Antunes', 'Gimenez', 'Arce', 'Chavez', 'Vargas',
    'Salazar', 'Aguilar', 'Reyes', 'Contreras', 'Munoz', 'Castro', 'Abubakar', 'Chukwuemeka', 'Onwuachi', 'Obi',
    'Effiong', 'Yaboah', 'Appiah', 'Boateng', 'Adjei', 'Owusu', 'Reid', 'Stewart', 'Watson', 'Mitchell',
    'Campbell', 'Anderson', 'Palmer', 'Foster', 'Cross', 'Hood', 'Marsh', 'Chapman', 'Dyer', 'Osei',
    'Amankwah', 'Aramburu', 'Zubimendi', 'Merino', 'Oyarzabal', 'Barrenetxea', 'Kubo', 'Pacheco', 'Fernandes', 'Guimaraes',
    'Cancelo', 'Semedo', 'Guerreiro', 'Fonte', 'Firmino', 'Coutinho', 'Neymar', 'Marquinhos', 'Alex Sandro', 'Kounde',
    'Upamecano', 'Saliba', 'Kimpembe', 'Digne', 'Coman', 'Nkunku', 'Barcola', 'Diaby', 'Diakhaby', 'Doucoure',
    'Bissouma', 'Kalulu', 'Krunic', 'Vlahovic', 'Kostic', 'Milenkovic', 'Sucic', 'Majer', 'Ivanusec', 'Perisic',
    'Brozovic', 'Kovacic', 'Pasalic', 'Skriniar', 'Hancko', 'Duda', 'Schick', 'Coufal', 'Soucek', 'Hlozek',
    'Sadilek', 'Provod', 'Mandi', 'Boudaoui', 'Zaha', 'Doucet', 'Delort', 'Boudebouz', 'Feghouli', 'Belaili',
    'Bounedjah', 'Mahrez', 'Bennacer', 'Elmas', 'Aleksandrov', 'Bozhinov', 'Berkovec', 'Radoslavov', 'Nedelev', 'Delev',
    'Petrescu', 'Balaur', 'Radu', 'Tanase', 'Cicaldau', 'Sorescu', 'Burca', 'Racovitan', 'Screciu', 'Baze',
    'Hoxha', 'Cikalleshi', 'Ismajli', 'Mavraj', 'Xhaka', 'Shaqiri', 'Embolo', 'Akanji', 'Widmer', 'Freuler',
    'Zakaria', 'Elvedi', 'Zuber', 'Fassnacht', 'Frei', 'Ajeti', 'Gavranovic', 'Stocker', 'Lang', 'Sommer',
    'Vargas', 'Morales', 'Jimenez', 'Ruiz', 'Hernandez', 'Gutierrez', 'Navarro', 'Romero', 'Molina', 'Delgado',
    'Ortega', 'Marquez', 'Iglesias', 'Nunez', 'Cortes', 'Guerrero', 'Vega', 'Ramos', 'Soto', 'Bravo',
    'Rios', 'Araujo', 'Monteiro', 'Cunha', 'Pinheiro', 'Freitas', 'Neves', 'Lima', 'Batista', 'Farias',
    'Xavier', 'Bastos', 'Soares', 'Tavares', 'Amaral', 'Peixoto', 'Dias', 'Braga', 'Miranda', 'Azevedo',
    'Paiva', 'Lambert', 'Rousseau', 'Vincent', 'Fontaine', 'Chevalier', 'Robin', 'Morel', 'Garnier', 'Faure',
    'Andre', 'Blanc', 'Guerin', 'Boyer', 'Barbier', 'Rey', 'Leroy', 'Colin', 'Renard', 'Perrin',
    'Marchand', 'Fischer', 'Meyer', 'Wolf', 'Schroeder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krueger',
    'Hartmann', 'Lange', 'Werner', 'Krause', 'Lehmann', 'Schmitt', 'Klein', 'Kraus', 'Vogel', 'Friedrich',
    'Seidel', 'Robinson', 'Harrison', 'Morgan', 'Bell', 'Cook', 'Bailey', 'Rogers', 'Bennett', 'Gray',
    'James', 'Watkins', 'Price', 'Owen', 'Phillips', 'Shaw', 'Fisher', 'Graham', 'Reynolds', 'Ellis',
    'Marshall', 'Ryan', 'O\'Connor', 'O\'Brien', 'Sullivan', 'Gallagher', 'Flynn', 'McDonnell', 'Nolan', 'Hogan',
    'Quinn', 'Peters', 'De Vries', 'Van Dijk', 'Van den Berg', 'Jacobs', 'De Jong', 'Meijer', 'De Boer', 'Kuipers',
    'Van Leeuwen', 'Sorensen', 'Christensen', 'Gustavsson', 'Nilsson', 'Persson', 'Jonsson', 'Vestergaard', 'Kristiansen', 'Moller',
    'Bergstrom', 'Kowalczyk', 'Zajac', 'Wisniewski', 'Dabrowski', 'Krajnc', 'Horvat', 'Simic', 'Maric', 'Jovanovic',
    'Stankovic', 'Todorov', 'Dimitrov', 'Angelov', 'Georgiev', 'Konstantinou', 'Christodoulou', 'Antoniou', 'Dimitriou', 'Pappas',
    'Vasileiou', 'Kilic', 'Aksoy', 'Polat', 'Ozkan', 'Cetin', 'Dogan', 'Yamamoto', 'Watanabe', 'Ito',
    'Nakamura', 'Kobayashi', 'Kato', 'Choi', 'Jung', 'Kang', 'Wang', 'Khalil', 'Hassan', 'Mahmoud',
    'Youssef', 'Karimi', 'Rahimi', 'Hosseini', 'Bensalem', 'Zidane', 'Bouzid', 'Adebayo', 'Okonkwo', 'Nwachukwu',
    'Danso', 'Asante', 'Mwangi', 'Otieno', 'Diagne', 'Faye', 'Thiam', 'Ferreira', 'Costa Silva', 'Gomes',
    'Henrique', 'Baptista', 'Serrano', 'Leiva', 'Cardenas', 'Escobar', 'Paredes Ruiz', 'Sotelo', 'Barrios', 'Cifuentes',
    'Bermudez', 'Renner', 'Brandt', 'Kruger', 'Bergmann', 'Schulze', 'Richter', 'Kohler', 'Ziegler', 'Stein',
    'Vogt', 'Harding', 'Wallace', 'Stevens', 'Warren', 'Holland', 'Newton', 'Barrett', 'Hutton', 'Pearce',
    'Sharp', 'Kavanagh', 'Molloy', 'Casey', 'Naughton', 'Hennessy', 'Lynch', 'Delaney', 'Cassidy', 'McKenna',
    'Duffy', 'Van der Meer', 'De Groot', 'Vermeer', 'Dekker', 'Smit', 'Van Dam', 'Mulder', 'Post', 'Kramer',
    'De Wit', 'Backman', 'Lindgren', 'Holm', 'Sandberg', 'Forsberg', 'Ekstrom', 'Palmqvist', 'Dahl', 'Wikstrom',
    'Blomqvist', 'Duque', 'Franca', 'Assis', 'Cavaco', 'Salgado', 'Moutinho', 'Rebelo', 'Mata', 'Pinho',
    'Cordeiro', 'Villalobos', 'Zambrano', 'Arellano', 'Bustos', 'Cardona', 'Godoy', 'Lozano', 'Mena', 'Ovalle',
    'Quiroga', 'Renaud', 'Chauvin', 'Aubert', 'Gauthier', 'Marchal', 'Noel', 'Picard', 'Tessier', 'Caron',
    'Lucena', 'Krieger', 'Hahn', 'Beck', 'Frank', 'Winkler', 'Busch', 'Albrecht', 'Pohl', 'Sauer',
    'Ludwig', 'Bird', 'Chambers', 'Perkins', 'Webb', 'Simpson', 'Holmes', 'Pearson', 'Dawson', 'Sinclair',
    'Grant',
  ];

  // Le prime voci di FIRST/LAST sono italiane in senso stretto (usate per i nazionali
  // italiani); il resto del pool è il mix multinazionale già esistente, riusato per
  // ogni giocatore straniero a prescindere dalla nazionalità estratta.
  const ITA_FIRST = FIRST.slice(0, 38), ITA_LAST = LAST.slice(0, 540);

  const FOREIGN_FIRST = FIRST.slice(38), FOREIGN_LAST = LAST.slice(540);

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
    // Aggiunte per coprire le nazionalità reali dei giocatori delle rose vere (Serie A,
    // Serie B, club europei): stessa struttura, solo più varietà geografica.
    { code: 'URU', name: 'Uruguay', flag: '🇺🇾' }, { code: 'SUI', name: 'Svizzera', flag: '🇨🇭' },
    { code: 'AUT', name: 'Austria', flag: '🇦🇹' }, { code: 'HUN', name: 'Ungheria', flag: '🇭🇺' },
    { code: 'USA', name: 'Stati Uniti', flag: '🇺🇸' }, { code: 'CAN', name: 'Canada', flag: '🇨🇦' },
    { code: 'MEX', name: 'Messico', flag: '🇲🇽' }, { code: 'VEN', name: 'Venezuela', flag: '🇻🇪' },
    { code: 'ECU', name: 'Ecuador', flag: '🇪🇨' }, { code: 'DOM', name: 'Rep. Dominicana', flag: '🇩🇴' },
    { code: 'JAM', name: 'Giamaica', flag: '🇯🇲' }, { code: 'SUR', name: 'Suriname', flag: '🇸🇷' },
    { code: 'CUW', name: 'Curaçao', flag: '🇨🇼' },
    { code: 'CMR', name: 'Camerun', flag: '🇨🇲' }, { code: 'EGY', name: 'Egitto', flag: '🇪🇬' },
    { code: 'TUN', name: 'Tunisia', flag: '🇹🇳' }, { code: 'BFA', name: 'Burkina Faso', flag: '🇧🇫' },
    { code: 'GUI', name: 'Guinea', flag: '🇬🇳' }, { code: 'GNB', name: 'Guinea-Bissau', flag: '🇬🇼' },
    { code: 'GAM', name: 'Gambia', flag: '🇬🇲' }, { code: 'GAB', name: 'Gabon', flag: '🇬🇦' },
    { code: 'EQG', name: 'Guinea Equatoriale', flag: '🇬🇶' }, { code: 'CPV', name: 'Capo Verde', flag: '🇨🇻' },
    { code: 'ANG', name: 'Angola', flag: '🇦🇴' }, { code: 'MOZ', name: 'Mozambico', flag: '🇲🇿' },
    { code: 'COD', name: 'RD Congo', flag: '🇨🇩' }, { code: 'CGO', name: 'Congo', flag: '🇨🇬' },
    { code: 'CHA', name: 'Ciad', flag: '🇹🇩' }, { code: 'ZAM', name: 'Zambia', flag: '🇿🇲' },
    { code: 'UGA', name: 'Uganda', flag: '🇺🇬' }, { code: 'TOG', name: 'Togo', flag: '🇹🇬' },
    { code: 'MTN', name: 'Mauritania', flag: '🇲🇷' }, { code: 'NIG', name: 'Niger', flag: '🇳🇪' },
    { code: 'LBR', name: 'Liberia', flag: '🇱🇷' },
    { code: 'RUS', name: 'Russia', flag: '🇷🇺' }, { code: 'ARM', name: 'Armenia', flag: '🇦🇲' },
    { code: 'AZE', name: 'Azerbaigian', flag: '🇦🇿' }, { code: 'ISR', name: 'Israele', flag: '🇮🇱' },
    { code: 'ALB', name: 'Albania', flag: '🇦🇱' }, { code: 'KVX', name: 'Kosovo', flag: '🇽🇰' },
    { code: 'MKD', name: 'Macedonia del Nord', flag: '🇲🇰' }, { code: 'MNE', name: 'Montenegro', flag: '🇲🇪' },
    { code: 'BIH', name: 'Bosnia ed Erzegovina', flag: '🇧🇦' }, { code: 'SVN', name: 'Slovenia', flag: '🇸🇮' },
    { code: 'SVK', name: 'Slovacchia', flag: '🇸🇰' }, { code: 'BUL', name: 'Bulgaria', flag: '🇧🇬' },
    { code: 'MDA', name: 'Moldavia', flag: '🇲🇩' }, { code: 'LTU', name: 'Lituania', flag: '🇱🇹' },
    { code: 'LVA', name: 'Lettonia', flag: '🇱🇻' }, { code: 'LUX', name: 'Lussemburgo', flag: '🇱🇺' },
    { code: 'CYP', name: 'Cipro', flag: '🇨🇾' }, { code: 'FRO', name: 'Isole Faroe', flag: '🇫🇴' },
    { code: 'GIB', name: 'Gibilterra', flag: '🇬🇮' }, { code: 'WAL', name: 'Galles', flag: '🏴' },
    { code: 'NIR', name: 'Irlanda del Nord', flag: '🇬🇧' },
    { code: 'FIN', name: 'Finlandia', flag: '🇫🇮' }, { code: 'AUS', name: 'Australia', flag: '🇦🇺' },
    { code: 'NZL', name: 'Nuova Zelanda', flag: '🇳🇿' }, { code: 'IDN', name: 'Indonesia', flag: '🇮🇩' },
    // Aggiunte per la Squadra Icone (leggende ritirate): nazionalità sudamericane e altre
    // non ancora coperte dalle rose reali contemporanee.
    { code: 'PAR', name: 'Paraguay', flag: '🇵🇾' }, { code: 'PER', name: 'Perù', flag: '🇵🇪' },
    { code: 'BOL', name: 'Bolivia', flag: '🇧🇴' }, { code: 'CRC', name: 'Costa Rica', flag: '🇨🇷' },
    { code: 'HON', name: 'Honduras', flag: '🇭🇳' }, { code: 'KSA', name: 'Arabia Saudita', flag: '🇸🇦' },
    { code: 'RSA', name: 'Sudafrica', flag: '🇿🇦' },
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
    // Le nazionalità sotto mancavano del tutto da questa mappa: senza una ricetta qui
    // flagOf ripiega sull'emoji bandiera (vedi sim.js), che su molti sistemi (Windows in
    // testa) per parecchi di questi paesi non ha un glifo dedicato e mostra il codice ISO
    // in lettere al posto della bandiera — la causa delle "bandiere sbagliate" segnalate.
    URU: { type: 'h', colors: ['#F1F2F1', '#0038A8', '#F1F2F1', '#0038A8', '#F1F2F1'] },
    SUI: { type: 'cross', base: '#D52B1E', cross: '#F1F2F1' },
    AUT: { type: 'h', colors: ['#ED2939', '#F1F2F1', '#ED2939'] },
    HUN: { type: 'h', colors: ['#CE2939', '#F1F2F1', '#477050'] },
    USA: { type: 'h', colors: ['#B22234', '#F1F2F1', '#B22234', '#F1F2F1', '#B22234'] },
    CAN: { type: 'v', colors: ['#FF0000', '#F1F2F1', '#FF0000'] },
    MEX: { type: 'v', colors: ['#006847', '#F1F2F1', '#CE1126'] },
    VEN: { type: 'h', colors: ['#FFCC00', '#00247D', '#CF142B'] },
    ECU: { type: 'h', colors: ['#FFDD00', '#FFDD00', '#034EA2', '#EF3340'] },
    DOM: { type: 'cross', base: '#CE1126', cross: '#F1F2F1', outline: '#002D62' },
    JAM: { type: 'saltire', base: '#009B3A', cross: '#FED100' },
    SUR: { type: 'h', colors: ['#377E3F', '#F1F2F1', '#B40A2D', '#F1F2F1', '#377E3F'] },
    CUW: { type: 'h', colors: ['#002B7F', '#F9E814', '#002B7F'] },
    CMR: { type: 'v', colors: ['#007A5E', '#CE1126', '#FCD116'] },
    EGY: { type: 'h', colors: ['#CE1126', '#F1F2F1', '#000000'] },
    TUN: { type: 'circle', base: '#E70013', circleColor: '#F1F2F1' },
    BFA: { type: 'h', colors: ['#EF2B2D', '#009739'] },
    GUI: { type: 'v', colors: ['#CE1126', '#FCD116', '#009460'] },
    GNB: { type: 'v', colors: ['#CE1126', '#FCD116', '#009739'] },
    GAM: { type: 'h', colors: ['#CE1126', '#0C1C8C', '#3A7728'] },
    GAB: { type: 'h', colors: ['#009E60', '#FCD116', '#3A75C4'] },
    EQG: { type: 'h', colors: ['#3E9A00', '#F1F2F1', '#E32118'] },
    CPV: { type: 'h', colors: ['#003893', '#F1F2F1', '#CF142B', '#F1F2F1', '#003893'] },
    ANG: { type: 'h', colors: ['#CE1126', '#000000'] },
    MOZ: { type: 'h', colors: ['#009739', '#000000', '#FCD116'] },
    COD: { type: 'star', base: '#007FFF', starColor: '#F7D618' },
    CGO: { type: 'saltire', base: '#009543', cross: '#DC241F' },
    CHA: { type: 'v', colors: ['#002664', '#FECB00', '#C60C30'] },
    ZAM: { type: 'v', colors: ['#198A00', '#DE2010', '#000000', '#EF7D00'] },
    UGA: { type: 'h', colors: ['#000000', '#FCDC04', '#D90000', '#000000', '#FCDC04', '#D90000'] },
    TOG: { type: 'h', colors: ['#006A4E', '#FFCE00', '#006A4E', '#FFCE00', '#006A4E'] },
    MTN: { type: 'star', base: '#00A95C', starColor: '#FFC400' },
    NIG: { type: 'h', colors: ['#E05206', '#F1F2F1', '#0DB02B'] },
    LBR: { type: 'h', colors: ['#BF0A30', '#F1F2F1', '#BF0A30', '#F1F2F1', '#BF0A30'] },
    RUS: { type: 'h', colors: ['#F1F2F1', '#0039A6', '#D52B1E'] },
    ARM: { type: 'h', colors: ['#D90012', '#0033A0', '#F2A800'] },
    AZE: { type: 'h', colors: ['#00B9E4', '#EF3340', '#509E2F'] },
    ISR: { type: 'star', base: '#F1F2F1', starColor: '#0038B8' },
    ALB: { type: 'h', colors: ['#E41E20'] },
    KVX: { type: 'star', base: '#244AA5', starColor: '#FFD700' },
    MKD: { type: 'star', base: '#D20000', starColor: '#FFE600' },
    MNE: { type: 'star', base: '#C40308', starColor: '#D4AF37' },
    BIH: { type: 'star', base: '#002395', starColor: '#FECB00' },
    SVN: { type: 'h', colors: ['#F1F2F1', '#005DA4', '#ED1C24'] },
    SVK: { type: 'h', colors: ['#F1F2F1', '#0B4EA2', '#EE1C25'] },
    BUL: { type: 'h', colors: ['#F1F2F1', '#00966E', '#D62612'] },
    MDA: { type: 'v', colors: ['#0046AE', '#FFD200', '#CC092F'] },
    LTU: { type: 'h', colors: ['#FDB913', '#006A44', '#C1272D'] },
    LVA: { type: 'h', colors: ['#9E3039', '#F1F2F1', '#9E3039'] },
    LUX: { type: 'h', colors: ['#ED2939', '#F1F2F1', '#00A1DE'] },
    CYP: { type: 'circle', base: '#F1F2F1', circleColor: '#D57800' },
    FRO: { type: 'cross', base: '#F1F2F1', cross: '#EF3340', outline: '#0071BC' },
    GIB: { type: 'h', colors: ['#F1F2F1', '#DA291C'] },
    WAL: { type: 'h', colors: ['#F1F2F1', '#00B140'] },
    NIR: { type: 'cross', base: '#F1F2F1', cross: '#E2001A' },
    FIN: { type: 'cross', base: '#F1F2F1', cross: '#003580' },
    AUS: { type: 'star', base: '#00008B', starColor: '#F1F2F1' },
    NZL: { type: 'star', base: '#00247D', starColor: '#CC142B' },
    IDN: { type: 'h', colors: ['#CE1126', '#F1F2F1'] },
    PAR: { type: 'h', colors: ['#D52B1E', '#F1F2F1', '#0038A8'] },
    PER: { type: 'v', colors: ['#D91023', '#F1F2F1', '#D91023'] },
    BOL: { type: 'h', colors: ['#D52B1E', '#F9E300', '#007934'] },
    CRC: { type: 'h', colors: ['#002B7F', '#F1F2F1', '#CE1126', '#F1F2F1', '#002B7F'] },
    HON: { type: 'h', colors: ['#0073CF', '#F1F2F1', '#0073CF'] },
    KSA: { type: 'h', colors: ['#006C35'] },
    RSA: { type: 'h', colors: ['#000000', '#FFB612', '#007A4D'] },
  };

  // Quota di italiani per categoria (indice = S.div, 0=Eccellenza … 4=Serie A): scende
  // gradualmente, come la vera piramide del calcio italiano.
  const ITA_SHARE = [0.98, 0.97, 0.90, 0.75, 0.55, 0.35];

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
    'Real Madrid': [{n:'Courtois',pos:'POR',ovr:89,nat:'BEL',age:34},{n:'Huijsen',pos:'DIF',ovr:85,nat:'ESP',age:21},{n:'Militao',pos:'DIF',ovr:84,nat:'BRA',age:25},{n:'Trent',pos:'DIF',ovr:86,nat:'ENG',age:27},{n:'Rudiger',pos:'DIF',ovr:85,nat:'GER',age:33},{n:'Valverde',pos:'CEN',ovr:87,nat:'URU',age:27},{n:'Bellingham',pos:'CEN',ovr:89,nat:'ENG',age:23},{n:'Tchouameni',pos:'CEN',ovr:85,nat:'FRA',age:26},{n:'Camavinga',pos:'CEN',ovr:84,nat:'FRA',age:23},{n:'Mbappe',pos:'ATT',ovr:93,nat:'FRA',age:27},{n:'Vinicius Jr',pos:'ATT',ovr:91,nat:'BRA',age:26},{n:'Rodrygo',pos:'ATT',ovr:85,nat:'BRA',age:25}],
    'Manchester City': [{n:'Donnarumma',pos:'POR',ovr:89,nat:'ITA',age:27},{n:'Dias',pos:'DIF',ovr:86,nat:'POR',age:29},{n:'Gvardiol',pos:'DIF',ovr:85,nat:'CRO',age:24},{n:'Ait-Nouri',pos:'DIF',ovr:81,nat:'ALG',age:25},{n:'Rico Lewis',pos:'DIF',ovr:80,nat:'ENG',age:22},{n:'Foden',pos:'CEN',ovr:88,nat:'ENG',age:26},{n:'Enzo Fernandez',pos:'CEN',ovr:86,nat:'ARG',age:25},{n:'Kovacic',pos:'CEN',ovr:82,nat:'CRO',age:32},{n:'Cherki',pos:'CEN',ovr:83,nat:'FRA',age:23},{n:'Haaland',pos:'ATT',ovr:94,nat:'NOR',age:26},{n:'Doku',pos:'ATT',ovr:85,nat:'BEL',age:24},{n:'Ndiaye',pos:'ATT',ovr:80,nat:'SEN',age:26}],
    'Bayern Monaco': [{n:'Neuer',pos:'POR',ovr:84,nat:'GER',age:40},{n:'Upamecano',pos:'DIF',ovr:85,nat:'FRA',age:27},{n:'Kim Min-jae',pos:'DIF',ovr:84,nat:'KOR',age:30},{n:'Tah',pos:'DIF',ovr:84,nat:'GER',age:30},{n:'Davies',pos:'DIF',ovr:85,nat:'CAN',age:26},{n:'Kimmich',pos:'CEN',ovr:88,nat:'GER',age:31},{n:'Musiala',pos:'CEN',ovr:89,nat:'GER',age:23},{n:'Olise',pos:'CEN',ovr:87,nat:'FRA',age:24},{n:'Pavlovic',pos:'CEN',ovr:81,nat:'SRB',age:22},{n:'Kane',pos:'ATT',ovr:90,nat:'ENG',age:33},{n:'Diaz',pos:'ATT',ovr:85,nat:'COL',age:30},{n:'Gnabry',pos:'ATT',ovr:80,nat:'GER',age:31}],
    'Paris Saint-Germain': [{n:'Chevalier',pos:'POR',ovr:84,nat:'FRA',age:25},{n:'Hakimi',pos:'DIF',ovr:88,nat:'MAR',age:27},{n:'Marquinhos',pos:'DIF',ovr:85,nat:'BRA',age:32},{n:'Nuno Mendes',pos:'DIF',ovr:85,nat:'POR',age:24},{n:'Zabarnyi',pos:'DIF',ovr:80,nat:'UKR',age:24},{n:'Vitinha',pos:'CEN',ovr:87,nat:'POR',age:26},{n:'Joao Neves',pos:'CEN',ovr:86,nat:'POR',age:21},{n:'Zaire-Emery',pos:'CEN',ovr:84,nat:'FRA',age:20},{n:'Fabian Ruiz',pos:'CEN',ovr:84,nat:'ESP',age:30},{n:'Dembele',pos:'ATT',ovr:91,nat:'FRA',age:29},{n:'Doue',pos:'ATT',ovr:87,nat:'FRA',age:20},{n:'Kvaratskhelia',pos:'ATT',ovr:87,nat:'GEO',age:25}],
    'Liverpool': [{n:'Alisson',pos:'POR',ovr:87,nat:'BRA',age:34},{n:'Van Dijk',pos:'DIF',ovr:87,nat:'NED',age:35},{n:'Araujo',pos:'DIF',ovr:82,nat:'URU',age:27},{n:'Frimpong',pos:'DIF',ovr:81,nat:'NED',age:26},{n:'Gomez',pos:'DIF',ovr:79,nat:'ENG',age:29},{n:'Wirtz',pos:'CEN',ovr:88,nat:'GER',age:23},{n:'Mac Allister',pos:'CEN',ovr:86,nat:'ARG',age:27},{n:'Szoboszlai',pos:'CEN',ovr:85,nat:'HUN',age:26},{n:'Gravenberch',pos:'CEN',ovr:84,nat:'NED',age:24},{n:'Isak',pos:'ATT',ovr:88,nat:'SWE',age:27},{n:'Gakpo',pos:'ATT',ovr:83,nat:'NED',age:27},{n:'Ekitike',pos:'ATT',ovr:82,nat:'FRA',age:24}],
    'Barcellona': [{n:'Joan Garcia',pos:'POR',ovr:83,nat:'ESP',age:25},{n:'Kounde',pos:'DIF',ovr:85,nat:'FRA',age:27},{n:'Cubarsi',pos:'DIF',ovr:83,nat:'ESP',age:19},{n:'Balde',pos:'DIF',ovr:83,nat:'ESP',age:23},{n:'Christensen',pos:'DIF',ovr:80,nat:'DEN',age:30},{n:'Pedri',pos:'CEN',ovr:88,nat:'ESP',age:24},{n:'De Jong',pos:'CEN',ovr:86,nat:'NED',age:29},{n:'Gavi',pos:'CEN',ovr:85,nat:'ESP',age:22},{n:'Olmo',pos:'CEN',ovr:85,nat:'ESP',age:28},{n:'Yamal',pos:'ATT',ovr:91,nat:'ESP',age:19},{n:'Raphinha',pos:'ATT',ovr:88,nat:'BRA',age:29},{n:'Fermin Lopez',pos:'ATT',ovr:80,nat:'ESP',age:23}],
    'Arsenal': [{n:'Raya',pos:'POR',ovr:86,nat:'ESP',age:30},{n:'Saliba',pos:'DIF',ovr:88,nat:'FRA',age:25},{n:'Gabriel',pos:'DIF',ovr:86,nat:'BRA',age:28},{n:'Timber',pos:'DIF',ovr:83,nat:'NED',age:25},{n:'Calafiori',pos:'DIF',ovr:83,nat:'ITA',age:24},{n:'Rice',pos:'CEN',ovr:87,nat:'ENG',age:27},{n:'Odegaard',pos:'CEN',ovr:87,nat:'NOR',age:27},{n:'Zubimendi',pos:'CEN',ovr:83,nat:'ESP',age:27},{n:'Eze',pos:'CEN',ovr:84,nat:'ENG',age:28},{n:'Saka',pos:'ATT',ovr:89,nat:'ENG',age:24},{n:'Gyokeres',pos:'ATT',ovr:85,nat:'SWE',age:28},{n:'Havertz',pos:'ATT',ovr:83,nat:'GER',age:27}],
    'Chelsea': [{n:'E. Martinez',pos:'POR',ovr:84,nat:'ARG',age:34},{n:'James',pos:'DIF',ovr:82,nat:'ENG',age:26},{n:'Colwill',pos:'DIF',ovr:83,nat:'ENG',age:23},{n:'Fofana',pos:'DIF',ovr:81,nat:'FRA',age:26},{n:'Gusto',pos:'DIF',ovr:80,nat:'FRA',age:23},{n:'Caicedo',pos:'CEN',ovr:85,nat:'ECU',age:24},{n:'Palmer',pos:'CEN',ovr:87,nat:'ENG',age:24},{n:'Barco',pos:'CEN',ovr:78,nat:'ARG',age:21},{n:'Joao Pedro',pos:'ATT',ovr:83,nat:'BRA',age:24},{n:'Estevao',pos:'ATT',ovr:83,nat:'BRA',age:19},{n:'Neto',pos:'ATT',ovr:81,nat:'POR',age:26},{n:'Gittens',pos:'ATT',ovr:78,nat:'ENG',age:22}],
    'Borussia Dortmund': [{n:'Kobel',pos:'POR',ovr:84,nat:'SUI',age:29},{n:'Schlotterbeck',pos:'DIF',ovr:83,nat:'GER',age:27},{n:'Anton',pos:'DIF',ovr:79,nat:'GER',age:30},{n:'Bensebaini',pos:'DIF',ovr:79,nat:'ALG',age:31},{n:'Ryerson',pos:'DIF',ovr:78,nat:'NOR',age:29},{n:'Jobe Bellingham',pos:'CEN',ovr:81,nat:'ENG',age:21},{n:'Nmecha',pos:'CEN',ovr:78,nat:'GER',age:26},{n:'Sabitzer',pos:'CEN',ovr:79,nat:'AUT',age:32},{n:'Can',pos:'CEN',ovr:77,nat:'GER',age:32},{n:'Guirassy',pos:'ATT',ovr:85,nat:'GUI',age:30},{n:'Beier',pos:'ATT',ovr:79,nat:'GER',age:24},{n:'Fabio Silva',pos:'ATT',ovr:76,nat:'POR',age:24}],
    'Atletico Madrid': [{n:'Oblak',pos:'POR',ovr:86,nat:'SVN',age:33},{n:'Le Normand',pos:'DIF',ovr:83,nat:'ESP',age:30},{n:'Hancko',pos:'DIF',ovr:82,nat:'SVK',age:29},{n:'Grimaldo',pos:'DIF',ovr:83,nat:'ESP',age:30},{n:'Pubill',pos:'DIF',ovr:78,nat:'ESP',age:23},{n:'Koke',pos:'CEN',ovr:80,nat:'ESP',age:34},{n:'Barrios',pos:'CEN',ovr:81,nat:'ESP',age:23},{n:'Baena',pos:'CEN',ovr:83,nat:'ESP',age:25},{n:'Llorente',pos:'CEN',ovr:80,nat:'ESP',age:31},{n:'Julian Alvarez',pos:'ATT',ovr:88,nat:'ARG',age:26},{n:'Lookman',pos:'ATT',ovr:84,nat:'NGA',age:28},{n:'Sorloth',pos:'ATT',ovr:82,nat:'NOR',age:30}],
    'Bayer Leverkusen': [{n:'Flekken',pos:'POR',ovr:80,nat:'NED',age:33},{n:'Tapsoba',pos:'DIF',ovr:81,nat:'BFA',age:27},{n:'Hincapie',pos:'DIF',ovr:82,nat:'ECU',age:24},{n:'Grimaldo',pos:'DIF',ovr:84,nat:'ESP',age:30},{n:'Andrich',pos:'CEN',ovr:78,nat:'GER',age:32},{n:'Aleix Garcia',pos:'CEN',ovr:81,nat:'ESP',age:29},{n:'Palacios',pos:'CEN',ovr:77,nat:'ARG',age:28},{n:'Tillman',pos:'CEN',ovr:79,nat:'USA',age:24},{n:'Schick',pos:'ATT',ovr:82,nat:'CZE',age:30},{n:'Boniface',pos:'ATT',ovr:80,nat:'NGA',age:26},{n:'Poku',pos:'ATT',ovr:76,nat:'NED'}],
    'Manchester United': [{n:'Onana',pos:'POR',ovr:79,nat:'CMR',age:30},{n:'De Ligt',pos:'DIF',ovr:83,nat:'NED',age:27},{n:'Lisandro Martinez',pos:'DIF',ovr:82,nat:'ARG',age:28},{n:'Dalot',pos:'DIF',ovr:78,nat:'POR',age:27},{n:'Shaw',pos:'DIF',ovr:79,nat:'ENG',age:31},{n:'Bruno Fernandes',pos:'CEN',ovr:87,nat:'POR',age:32},{n:'Casemiro',pos:'CEN',ovr:80,nat:'BRA',age:34},{n:'Mainoo',pos:'CEN',ovr:79,nat:'ENG',age:21},{n:'Ugarte',pos:'CEN',ovr:78,nat:'URU',age:24},{n:'Cunha',pos:'ATT',ovr:83,nat:'BRA',age:27},{n:'Mbeumo',pos:'ATT',ovr:82,nat:'CMR',age:27},{n:'Sesko',pos:'ATT',ovr:80,nat:'SVN',age:23}],
    'Tottenham': [{n:'Vicario',pos:'POR',ovr:81,nat:'ITA',age:29},{n:'Romero',pos:'DIF',ovr:84,nat:'ARG',age:28},{n:'Van de Ven',pos:'DIF',ovr:82,nat:'NED',age:25},{n:'Udogie',pos:'DIF',ovr:79,nat:'ITA',age:24},{n:'Porro',pos:'DIF',ovr:80,nat:'ESP',age:27},{n:'Bissouma',pos:'CEN',ovr:80,nat:'MLI',age:30},{n:'Bentancur',pos:'CEN',ovr:79,nat:'URU',age:29},{n:'Maddison',pos:'CEN',ovr:82,nat:'ENG',age:30},{n:'Kudus',pos:'ATT',ovr:81,nat:'GHA',age:25},{n:'Richarlison',pos:'ATT',ovr:79,nat:'BRA',age:29},{n:'Solanke',pos:'ATT',ovr:80,nat:'ENG',age:29},{n:'Johnson',pos:'ATT',ovr:78,nat:'WAL',age:25}],
    'Benfica': [{n:'Trubin',pos:'POR',ovr:82,nat:'UKR',age:24},{n:'Antonio Silva',pos:'DIF',ovr:83,nat:'POR',age:22},{n:'Otamendi',pos:'DIF',ovr:78,nat:'ARG',age:38},{n:'Bah',pos:'DIF',ovr:77,nat:'DEN',age:29},{n:'Kokcu',pos:'CEN',ovr:80,nat:'TUR'},{n:'Florentino',pos:'CEN',ovr:76,nat:'POR',age:27},{n:'Barrenechea',pos:'CEN',ovr:77,nat:'ARG',age:25},{n:'Richard Rios',pos:'CEN',ovr:79,nat:'COL',age:26},{n:'Akturkoglu',pos:'ATT',ovr:78,nat:'TUR',age:27},{n:'Pavlidis',pos:'ATT',ovr:81,nat:'GRE',age:28},{n:'Aursnes',pos:'CEN',ovr:75,nat:'NOR',age:31}],
    'Porto': [{n:'Diogo Costa',pos:'POR',ovr:85,nat:'POR',age:27},{n:'Nehuen Perez',pos:'DIF',ovr:78,nat:'ARG',age:27},{n:'Zaidu',pos:'DIF',ovr:75,nat:'NGA',age:29},{n:'Bednarek',pos:'DIF',ovr:76,nat:'POL',age:30},{n:'Eustaquio',pos:'CEN',ovr:78,nat:'CAN',age:28},{n:'Alan Varela',pos:'CEN',ovr:80,nat:'ARG',age:26},{n:'Gabri Veiga',pos:'CEN',ovr:79,nat:'ESP',age:24},{n:'Rodrigo Mora',pos:'CEN',ovr:78,nat:'POR',age:19},{n:'Pepe',pos:'ATT',ovr:77,nat:'BRA',age:30},{n:'Samu',pos:'ATT',ovr:78,nat:'ESP',age:24},{n:'Luuk de Jong',pos:'ATT',ovr:76,nat:'NED',age:36},{n:'Borja Sainz',pos:'ATT',ovr:77,nat:'ESP',age:26}],
    'Ajax': [{n:'Jaros',pos:'POR',ovr:75,nat:'CZE',age:23},{n:'Sutalo',pos:'DIF',ovr:76,nat:'CRO',age:26},{n:'Rensch',pos:'DIF',ovr:75,nat:'NED',age:23},{n:'Baas',pos:'DIF',ovr:73,nat:'NED',age:22},{n:'Taylor',pos:'DIF',ovr:74,nat:'NED'},{n:'Berghuis',pos:'CEN',ovr:77,nat:'NED',age:34},{n:'Klaassen',pos:'CEN',ovr:76,nat:'NED',age:32},{n:'Gloukh',pos:'CEN',ovr:77,nat:'ISR',age:22},{n:'Godts',pos:'ATT',ovr:78,nat:'BEL',age:21},{n:'Traore',pos:'ATT',ovr:74,nat:'BFA'},{n:'Weghorst',pos:'ATT',ovr:75,nat:'NED',age:33}],
    'Sporting Lisbona': [{n:'Israel',pos:'POR',ovr:78,nat:'URU',age:26},{n:'Debast',pos:'DIF',ovr:78,nat:'BEL',age:22},{n:'St. Juste',pos:'DIF',ovr:77,nat:'NED',age:29},{n:'Quaresma',pos:'DIF',ovr:75,nat:'POR',age:43},{n:'Morita',pos:'CEN',ovr:76,nat:'JPN',age:31},{n:'Zalazar',pos:'CEN',ovr:76,nat:'URU',age:26},{n:'Pote',pos:'CEN',ovr:80,nat:'POR',age:27},{n:'Trincao',pos:'ATT',ovr:80,nat:'POR',age:26},{n:'Geny Catamo',pos:'ATT',ovr:77,nat:'MOZ',age:25},{n:'Luis Suarez',pos:'ATT',ovr:79,nat:'COL',age:21},{n:'Fotis Ioannidis',pos:'ATT',ovr:77,nat:'GRE',age:28}],
    'RB Lipsia': [{n:'Gulacsi',pos:'POR',ovr:78,nat:'HUN',age:35},{n:'Henrichs',pos:'DIF',ovr:77,nat:'GER',age:29},{n:'Orban',pos:'DIF',ovr:78,nat:'HUN',age:28},{n:'Simakan',pos:'DIF',ovr:77,nat:'FRA',age:26},{n:'Baumgartner',pos:'CEN',ovr:80,nat:'AUT',age:27},{n:'Schlager',pos:'CEN',ovr:77,nat:'AUT',age:29},{n:'Diomande',pos:'CEN',ovr:76,nat:'CIV'},{n:'Nusa',pos:'ATT',ovr:78,nat:'NOR',age:20},{n:'Openda',pos:'ATT',ovr:81,nat:'BEL'},{n:'Konate',pos:'ATT',ovr:74,nat:'FRA'}],
    'Marsiglia': [{n:'Rulli',pos:'POR',ovr:79,nat:'ARG',age:34},{n:'Balerdi',pos:'DIF',ovr:79,nat:'ARG',age:27},{n:'Egan-Riley',pos:'DIF',ovr:76,nat:'ENG'},{n:'Emerson',pos:'DIF',ovr:77,nat:'ITA',age:32},{n:'Hojbjerg',pos:'CEN',ovr:79,nat:'DEN',age:30},{n:'Rongier',pos:'CEN',ovr:76,nat:'FRA',age:30},{n:'ORiley',pos:'CEN',ovr:78,nat:'DEN',age:26},{n:'Vermeeren',pos:'CEN',ovr:74,nat:'BEL'},{n:'Weah',pos:'DIF',ovr:77,nat:'USA',age:26},{n:'Greenwood',pos:'ATT',ovr:84,nat:'ENG',age:24},{n:'Aubameyang',pos:'ATT',ovr:78,nat:'GAB',age:37}],
    'Monaco': [{n:'Kohn',pos:'POR',ovr:77,nat:'SUI',age:28},{n:'Singo',pos:'DIF',ovr:78,nat:'CIV',age:25},{n:'Salisu',pos:'DIF',ovr:78,nat:'GHA',age:26},{n:'Vanderson',pos:'DIF',ovr:76,nat:'BRA',age:25},{n:'Zakaria',pos:'CEN',ovr:78,nat:'SUI',age:29},{n:'Golovin',pos:'CEN',ovr:80,nat:'RUS',age:30},{n:'Camara',pos:'CEN',ovr:76,nat:'SEN',age:26},{n:'Akliouche',pos:'ATT',ovr:79,nat:'FRA',age:22},{n:'Ben Seghir',pos:'ATT',ovr:76,nat:'MAR',age:22},{n:'Biereth',pos:'ATT',ovr:78,nat:'DEN',age:22},{n:'Ilenikhena',pos:'ATT',ovr:75,nat:'NGA'},{n:'Balogun',pos:'ATT',ovr:77,nat:'USA',age:25}],
    'West Ham': [{n:'Hermansen',pos:'POR',ovr:78,nat:'DEN',age:26},{n:'Walker-Peters',pos:'DIF',ovr:77,nat:'ENG',age:29},{n:'Kilman',pos:'DIF',ovr:76,nat:'ENG',age:29},{n:'Mavropanos',pos:'DIF',ovr:74,nat:'GRE'},{n:'Todibo',pos:'DIF',ovr:75,nat:'FRA',age:26},{n:'Soucek',pos:'CEN',ovr:76,nat:'CZE',age:31},{n:'Alvarez',pos:'CEN',ovr:78,nat:'MEX',age:27},{n:'Bowen',pos:'ATT',ovr:82,nat:'ENG',age:29},{n:'Fullkrug',pos:'ATT',ovr:78,nat:'GER',age:33},{n:'Wilson',pos:'ATT',ovr:75,nat:'ENG',age:34}],
    'Villarreal': [{n:'Tenas',pos:'POR',ovr:75,nat:'ESP'},{n:'Foyth',pos:'DIF',ovr:79,nat:'ARG',age:28},{n:'Veiga',pos:'DIF',ovr:78,nat:'POR',age:23},{n:'Cardona',pos:'DIF',ovr:74,nat:'ESP'},{n:'Pedraza',pos:'DIF',ovr:74,nat:'ESP'},{n:'Parejo',pos:'CEN',ovr:79,nat:'ESP',age:37},{n:'Partey',pos:'CEN',ovr:78,nat:'GHA',age:32},{n:'Comesana',pos:'CEN',ovr:74,nat:'ESP',age:22},{n:'Pepe',pos:'ATT',ovr:80,nat:'CIV',age:27},{n:'Moreno',pos:'ATT',ovr:79,nat:'ESP',age:28},{n:'Mikautadze',pos:'ATT',ovr:76,nat:'GEO',age:25}],
    'Real Sociedad': [{n:'Remiro',pos:'POR',ovr:80,nat:'ESP',age:31},{n:'Zubeldia',pos:'DIF',ovr:76,nat:'ESP',age:28},{n:'Aramburu',pos:'DIF',ovr:73,nat:'VEN'},{n:'Caleta-Car',pos:'DIF',ovr:75,nat:'CRO',age:30},{n:'Aihen Munoz',pos:'DIF',ovr:73,nat:'ESP'},{n:'Brais Mendez',pos:'CEN',ovr:78,nat:'ESP',age:29},{n:'Zakharyan',pos:'CEN',ovr:77,nat:'RUS',age:23},{n:'Sucic',pos:'CEN',ovr:74,nat:'CRO'},{n:'Oyarzabal',pos:'ATT',ovr:83,nat:'ESP',age:29},{n:'Kubo',pos:'ATT',ovr:81,nat:'JPN',age:25},{n:'Barrenetxea',pos:'ATT',ovr:76,nat:'ESP',age:24}],
    'Eintracht Francoforte': [{n:'Koch',pos:'DIF',ovr:76,nat:'GER',age:29},{n:'Brassier',pos:'DIF',ovr:73,nat:'FRA'},{n:'Fernandes',pos:'DIF',ovr:74,nat:'BRA'},{n:'Chandler',pos:'DIF',ovr:73,nat:'USA'},{n:'Doan',pos:'CEN',ovr:78,nat:'JPN',age:27},{n:'Hojlund',pos:'CEN',ovr:75,nat:'DEN'},{n:'Goetze',pos:'CEN',ovr:77,nat:'GER',age:34},{n:'Chaibi',pos:'CEN',ovr:74,nat:'ALG'},{n:'Uzun',pos:'ATT',ovr:76,nat:'TUR',age:21},{n:'Burkardt',pos:'ATT',ovr:78,nat:'GER',age:26}],
    'Rangers': [{n:'Pandur',pos:'POR',ovr:73,nat:'CRO'},{n:'Souttar',pos:'DIF',ovr:74,nat:'SCO',age:28},{n:'Nedeljkovic',pos:'DIF',ovr:70,nat:'SRB'},{n:'Godfrey',pos:'DIF',ovr:73,nat:'ENG',age:28},{n:'Sterling',pos:'DIF',ovr:70,nat:'ENG'},{n:'Raskin',pos:'CEN',ovr:75,nat:'BEL',age:25},{n:'Neil',pos:'CEN',ovr:72,nat:'ENG'},{n:'McCausland',pos:'CEN',ovr:71,nat:'NIR'},{n:'Chermiti',pos:'ATT',ovr:74,nat:'POR'},{n:'Shankland',pos:'ATT',ovr:75,nat:'SCO',age:31},{n:'Bouanani',pos:'ATT',ovr:71,nat:'ALG'}],
    'Celtic': [{n:'Sinisalo',pos:'POR',ovr:73,nat:'FIN'},{n:'Carter-Vickers',pos:'DIF',ovr:77,nat:'USA',age:29},{n:'Johnston',pos:'DIF',ovr:75,nat:'CAN'},{n:'Scales',pos:'DIF',ovr:73,nat:'IRL'},{n:'Trusty',pos:'DIF',ovr:72,nat:'USA'},{n:'McGregor',pos:'CEN',ovr:77,nat:'SCO',age:34},{n:'McCowan',pos:'CEN',ovr:73,nat:'SCO'},{n:'Oxlade-Chamberlain',pos:'CEN',ovr:75,nat:'ENG',age:33},{n:'Jota',pos:'ATT',ovr:78,nat:'POR',age:27},{n:'Nygren',pos:'ATT',ovr:74,nat:'SWE'},{n:'Yang',pos:'ATT',ovr:71,nat:'KOR'}],
    'Feyenoord': [{n:'Wellenreuther',pos:'POR',ovr:74,nat:'GER',age:33},{n:'Smal',pos:'DIF',ovr:72,nat:'NED'},{n:'Bos',pos:'DIF',ovr:70,nat:'AUS'},{n:'Hwang',pos:'CEN',ovr:75,nat:'KOR',age:30},{n:'Zerrouki',pos:'CEN',ovr:74,nat:'ALG',age:27},{n:'Moussa',pos:'ATT',ovr:73,nat:'ALG'},{n:'Kokcu',pos:'CEN',ovr:76,nat:'TUR'},{n:'Ueda',pos:'ATT',ovr:74,nat:'JPN',age:28},{n:'Bueno',pos:'ATT',ovr:73,nat:'ESP'},{n:'Milambo',pos:'CEN',ovr:73,nat:'NED'}],
    'PSV Eindhoven': [{n:'Kovar',pos:'POR',ovr:75,nat:'CZE',age:26},{n:'Dest',pos:'DIF',ovr:78,nat:'USA',age:25},{n:'Geertruida',pos:'DIF',ovr:79,nat:'NED',age:25},{n:'Flamingo',pos:'DIF',ovr:73,nat:'NED'},{n:'Obispo',pos:'DIF',ovr:72,nat:'CUW'},{n:'Til',pos:'CEN',ovr:75,nat:'NED',age:29},{n:'Schouten',pos:'CEN',ovr:76,nat:'NED',age:29},{n:'Wanner',pos:'CEN',ovr:74,nat:'AUT',age:20},{n:'Perisic',pos:'ATT',ovr:77,nat:'CRO',age:37},{n:'Pepi',pos:'ATT',ovr:75,nat:'USA',age:23},{n:'Man',pos:'ATT',ovr:76,nat:'ROU',age:28}],
    'Olympiacos': [{n:'Ortega',pos:'POR',ovr:75,nat:'GER'},{n:'Saliakas',pos:'DIF',ovr:73,nat:'GRE'},{n:'Pirola',pos:'DIF',ovr:73,nat:'ITA'},{n:'Retsos',pos:'DIF',ovr:74,nat:'GRE'},{n:'Carmo',pos:'DIF',ovr:73,nat:'ANG'},{n:'Cabella',pos:'CEN',ovr:78,nat:'FRA',age:36},{n:'Fortounis',pos:'CEN',ovr:76,nat:'GRE',age:34},{n:'Freuler',pos:'CEN',ovr:78,nat:'SUI',age:34},{n:'Bailey',pos:'ATT',ovr:80,nat:'JAM',age:29},{n:'El Kaabi',pos:'ATT',ovr:77,nat:'MAR',age:30},{n:'Chiquinho',pos:'CEN',ovr:74,nat:'POR'}],
    'Fenerbahce': [{n:'Ederson',pos:'POR',ovr:78,nat:'BRA',age:32},{n:'Skriniar',pos:'DIF',ovr:79,nat:'SVK',age:31},{n:'Semedo',pos:'DIF',ovr:76,nat:'POR',age:32},{n:'Ake',pos:'DIF',ovr:78,nat:'NED',age:31},{n:'Oosterwolde',pos:'DIF',ovr:74,nat:'NED',age:26},{n:'Kante',pos:'CEN',ovr:79,nat:'FRA',age:35},{n:'Guendouzi',pos:'CEN',ovr:78,nat:'FRA',age:26},{n:'Asensio',pos:'CEN',ovr:79,nat:'ESP',age:30},{n:'Irfan Can',pos:'CEN',ovr:75,nat:'TUR',age:31},{n:'Lukaku',pos:'ATT',ovr:82,nat:'BEL'},{n:'Aktuerkoglu',pos:'ATT',ovr:78,nat:'TUR',age:27}],
    'Galatasaray': [{n:'Icardi',pos:'ATT',ovr:81,nat:'ARG',age:33},{n:'Osimhen',pos:'ATT',ovr:83,nat:'NGA',age:27},{n:'Sane',pos:'ATT',ovr:82,nat:'GER',age:30},{n:'Gundogan',pos:'CEN',ovr:80,nat:'GER',age:36},{n:'Torreira',pos:'CEN',ovr:77,nat:'URU',age:30},{n:'Lemina',pos:'CEN',ovr:75,nat:'GAB',age:32},{n:'Sara',pos:'CEN',ovr:74,nat:'BRA'},{n:'Sallai',pos:'ATT',ovr:76,nat:'HUN',age:29},{n:'Singo',pos:'DIF',ovr:76,nat:'CIV',age:27},{n:'Sanchez',pos:'DIF',ovr:75,nat:'COL',age:30},{n:'Muslera',pos:'POR',ovr:70,nat:'URU'}],
    'Besiktas': [{n:'Immobile',pos:'ATT',ovr:79,nat:'ITA',age:36},{n:'Abraham',pos:'ATT',ovr:77,nat:'ENG',age:28},{n:'Rashica',pos:'ATT',ovr:74,nat:'KVX'},{n:'Cerny',pos:'ATT',ovr:73,nat:'CZE'},{n:'Under',pos:'ATT',ovr:74,nat:'TUR'},{n:'Asllani',pos:'CEN',ovr:76,nat:'ALB',age:24},{n:'Ndidi',pos:'CEN',ovr:78,nat:'NGA',age:30},{n:'Uduokhai',pos:'DIF',ovr:73,nat:'GER'},{n:'Djalo',pos:'DIF',ovr:74,nat:'POR'},{n:'Ridvan',pos:'DIF',ovr:72,nat:'TUR'},{n:'Destanoglu',pos:'POR',ovr:73,nat:'TUR'}],
    'Sporting Braga': [{n:'Horta',pos:'ATT',ovr:80,nat:'POR',age:32},{n:'Pau Victor',pos:'ATT',ovr:76,nat:'ESP',age:25},{n:'Gabriel Silva',pos:'ATT',ovr:74,nat:'BRA'},{n:'Moutinho',pos:'CEN',ovr:76,nat:'POR',age:40},{n:'Zalazar',pos:'CEN',ovr:75,nat:'URU'},{n:'Gorby',pos:'CEN',ovr:73,nat:'FRA'},{n:'Huseinbasic',pos:'CEN',ovr:72,nat:'BIH'},{n:'Vitor Carvalho',pos:'DIF',ovr:71,nat:'BRA'},{n:'Barcia',pos:'DIF',ovr:71,nat:'ESP'},{n:'Matheus',pos:'POR',ovr:72,nat:'BRA'}],
    'Slavia Praga': [{n:'Chytil',pos:'ATT',ovr:76,nat:'CZE',age:27},{n:'Schranz',pos:'ATT',ovr:75,nat:'SVK',age:31},{n:'Kusej',pos:'ATT',ovr:73,nat:'CZE'},{n:'Chory',pos:'ATT',ovr:71,nat:'CZE'},{n:'Provod',pos:'CEN',ovr:78,nat:'CZE',age:28},{n:'Sadilek',pos:'CEN',ovr:74,nat:'CZE'},{n:'Dorley',pos:'CEN',ovr:73,nat:'LBR'},{n:'Doudera',pos:'DIF',ovr:73,nat:'CZE'},{n:'Zima',pos:'DIF',ovr:74,nat:'CZE'},{n:'Holes',pos:'DIF',ovr:71,nat:'CZE'},{n:'Stanek',pos:'POR',ovr:72,nat:'CZE'}],
    'Dinamo Zagabria': [{n:'Vidovic',pos:'ATT',ovr:75,nat:'CRO'},{n:'Mudrazija',pos:'CEN',ovr:72,nat:'CRO'},{n:'Misic',pos:'CEN',ovr:74,nat:'CRO'},{n:'Zajc',pos:'CEN',ovr:76,nat:'SVN',age:33},{n:'Stojkovic',pos:'CEN',ovr:71,nat:'CRO'},{n:'McKenna',pos:'DIF',ovr:75,nat:'SCO'},{n:'Torrente',pos:'DIF',ovr:70,nat:'ESP'},{n:'Goda',pos:'DIF',ovr:69,nat:'CRO'},{n:'Valincic',pos:'DIF',ovr:68,nat:'CRO'},{n:'Nevistic',pos:'POR',ovr:71,nat:'CRO'}],
    'Shakhtar Donetsk': [{n:'Sudakov',pos:'CEN',ovr:82,nat:'UKR',age:24},{n:'Traore',pos:'ATT',ovr:77,nat:'BFA',age:25},{n:'Kaua Elias',pos:'ATT',ovr:74,nat:'BRA'},{n:'Pedrinho',pos:'CEN',ovr:75,nat:'BRA',age:29},{n:'Marlon Gomes',pos:'CEN',ovr:74,nat:'BRA'},{n:'Isaque',pos:'CEN',ovr:73,nat:'BRA'},{n:'Bondar',pos:'DIF',ovr:76,nat:'UKR',age:27},{n:'Matviyenko',pos:'DIF',ovr:75,nat:'UKR',age:29},{n:'Vinicius Tobias',pos:'DIF',ovr:73,nat:'BRA'},{n:'Karavaiev',pos:'DIF',ovr:72,nat:'UKR'},{n:'Riznyk',pos:'POR',ovr:70,nat:'UKR'}],
    'Club Brugge': [{n:'Vanaken',pos:'CEN',ovr:82,nat:'BEL',age:34},{n:'Tzolis',pos:'ATT',ovr:79,nat:'GRE',age:25},{n:'Nielsen',pos:'ATT',ovr:76,nat:'SWE',age:25},{n:'Jashari',pos:'CEN',ovr:78,nat:'SUI',age:24},{n:'Onyedika',pos:'CEN',ovr:74,nat:'NGA'},{n:'Sabbe',pos:'DIF',ovr:73,nat:'BEL'},{n:'Mechele',pos:'DIF',ovr:73,nat:'BEL',age:34},{n:'Spileers',pos:'DIF',ovr:72,nat:'BEL'},{n:'Meijer',pos:'DIF',ovr:71,nat:'NED'},{n:'Mignolet',pos:'POR',ovr:76,nat:'BEL',age:38}],
    'Anderlecht': [{n:'Hazard',pos:'ATT',ovr:78,nat:'BEL',age:25},{n:'Verschaeren',pos:'CEN',ovr:77,nat:'BEL',age:24},{n:'Stroeykens',pos:'CEN',ovr:75,nat:'BEL',age:22},{n:'Sikan',pos:'ATT',ovr:73,nat:'UKR'},{n:'Huerta',pos:'ATT',ovr:72,nat:'MEX'},{n:'Rits',pos:'CEN',ovr:73,nat:'BEL'},{n:'Foket',pos:'DIF',ovr:72,nat:'BEL'},{n:'Sardella',pos:'DIF',ovr:71,nat:'BEL',age:26},{n:'Kana',pos:'DIF',ovr:70,nat:'BEL'},{n:'Coosemans',pos:'POR',ovr:74,nat:'BEL'}],
    'Young Boys': [{n:'Fassnacht',pos:'ATT',ovr:76,nat:'SUI',age:31},{n:'Sanches',pos:'CEN',ovr:75,nat:'POR',age:29},{n:'Bedia',pos:'ATT',ovr:74,nat:'CIV'},{n:'Hadjam',pos:'DIF',ovr:73,nat:'ALG'},{n:'Ganvoula',pos:'ATT',ovr:72,nat:'CGO'},{n:'Elia',pos:'ATT',ovr:71,nat:'COD'},{n:'Rieder',pos:'CEN',ovr:72,nat:'SUI'},{n:'Lauper',pos:'CEN',ovr:70,nat:'SUI'},{n:'Camara',pos:'DIF',ovr:69,nat:'GUI'},{n:'Kayondo',pos:'POR',ovr:68,nat:'UGA'}],
    'Salisburgo': [{n:'Ratkov',pos:'ATT',ovr:76,nat:'SRB',age:23},{n:'Kjaergaard',pos:'CEN',ovr:75,nat:'DEN'},{n:'Vertessen',pos:'ATT',ovr:73,nat:'BEL'},{n:'Alajbegovic',pos:'ATT',ovr:74,nat:'BIH'},{n:'Bidstrup',pos:'CEN',ovr:73,nat:'DEN'},{n:'Diabate',pos:'DIF',ovr:71,nat:'MLI'},{n:'Lainer',pos:'DIF',ovr:73,nat:'AUT'},{n:'Rasmussen',pos:'DIF',ovr:72,nat:'DEN'},{n:'Baidoo',pos:'DIF',ovr:70,nat:'AUT'},{n:'Schlager',pos:'POR',ovr:74,nat:'AUT'}],
    'Aberdeen': [{n:'Mitov',pos:'POR',ovr:66,nat:'BUL'},{n:'Devlin',pos:'DIF',ovr:64,nat:'SCO'},{n:'McIntyre',pos:'DIF',ovr:63,nat:'SCO'},{n:'Molloy',pos:'DIF',ovr:60,nat:'IRL'},{n:'Armstrong',pos:'CEN',ovr:68,nat:'SCO'},{n:'Palaversa',pos:'CEN',ovr:65,nat:'CRO'},{n:'Cameron',pos:'CEN',ovr:61,nat:'SCO'},{n:'Milanovic',pos:'ATT',ovr:62,nat:'AUS'}],
    'Molde': [{n:'Haugen',pos:'POR',ovr:63,nat:'NOR'},{n:'Breivik',pos:'DIF',ovr:65,nat:'NOR'},{n:'Granaas',pos:'DIF',ovr:60,nat:'NOR'},{n:'Møller Dæhli',pos:'CEN',ovr:70,nat:'NOR'},{n:'Hansen',pos:'CEN',ovr:62,nat:'NOR'},{n:'Abdullai',pos:'ATT',ovr:64,nat:'GHA'},{n:'Gulbrandsen',pos:'ATT',ovr:66,nat:'NOR'},{n:'Kikkenborg',pos:'ATT',ovr:60,nat:'DEN'}],
    'AZ Alkmaar': [{n:'Owusu-Oduro',pos:'POR',ovr:66,nat:'NED'},{n:'Goes',pos:'DIF',ovr:69,nat:'NED'},{n:'Hoedt',pos:'DIF',ovr:68,nat:'NED'},{n:'Kasius',pos:'DIF',ovr:65,nat:'NED'},{n:'Koopmeiners',pos:'CEN',ovr:70,nat:'NED'},{n:'Clasie',pos:'CEN',ovr:67,nat:'NED'},{n:'Smit',pos:'CEN',ovr:64,nat:'NED'},{n:'Byskov',pos:'ATT',ovr:63,nat:'DEN'}],
    'Nizza': [{n:'Diouf',pos:'POR',ovr:69,nat:'SEN'},{n:'Bombito',pos:'DIF',ovr:71,nat:'CAN'},{n:'Clauss',pos:'DIF',ovr:70,nat:'FRA'},{n:'Bonfim',pos:'DIF',ovr:66,nat:'BRA'},{n:'Boudaoui',pos:'CEN',ovr:72,nat:'ALG'},{n:'Sanson',pos:'CEN',ovr:65,nat:'FRA'},{n:'Diop',pos:'ATT',ovr:71,nat:'MAR'},{n:'Wahi',pos:'ATT',ovr:70,nat:'FRA'}],
    'Lens': [{n:'Samba',pos:'POR',ovr:71,nat:'FRA'},{n:'Gradit',pos:'DIF',ovr:69,nat:'FRA'},{n:'Medina',pos:'DIF',ovr:66,nat:'ARG'},{n:'Machado',pos:'DIF',ovr:64,nat:'COL'},{n:'Mendy',pos:'CEN',ovr:65,nat:'SEN'},{n:'Thauvin',pos:'ATT',ovr:72,nat:'FRA'},{n:'Edouard',pos:'ATT',ovr:71,nat:'FRA'},{n:'Said',pos:'ATT',ovr:63,nat:'FRA'}],
    'Konyaspor': [{n:'Demirbag',pos:'POR',ovr:60,nat:'TUR'},{n:'Bardhi',pos:'CEN',ovr:66,nat:'MKD'},{n:'Ndao',pos:'CEN',ovr:62,nat:'SEN'},{n:'Turuc',pos:'CEN',ovr:60,nat:'TUR'},{n:'Muleka',pos:'ATT',ovr:65,nat:'COD'},{n:'Bostan',pos:'ATT',ovr:59,nat:'TUR'},{n:'Yalcin',pos:'DIF',ovr:58,nat:'TUR'},{n:'Kaya',pos:'DIF',ovr:56,nat:'TUR'}],
    'Legia Varsavia': [{n:'Hindrich',pos:'POR',ovr:64,nat:'ROU'},{n:'Vinagre',pos:'DIF',ovr:67,nat:'POR'},{n:'Piatkowski',pos:'DIF',ovr:65,nat:'POL'},{n:'Reca',pos:'DIF',ovr:63,nat:'POL'},{n:'Kapustka',pos:'CEN',ovr:68,nat:'POL'},{n:'Urbanski',pos:'CEN',ovr:64,nat:'POL'},{n:'Szymanski',pos:'CEN',ovr:62,nat:'POL'},{n:'Rajovic',pos:'ATT',ovr:65,nat:'DEN'}],
    'Slovan Bratislava': [{n:'Takac',pos:'POR',ovr:62,nat:'SVK'},{n:'Wimmer',pos:'DIF',ovr:66,nat:'AUT'},{n:'Kozlovsky',pos:'DIF',ovr:60,nat:'SVK'},{n:'Marković',pos:'DIF',ovr:59,nat:'SRB'},{n:'Pokorny',pos:'CEN',ovr:63,nat:'SVK'},{n:'Ignatenko',pos:'CEN',ovr:61,nat:'UKR'},{n:'Sporar',pos:'ATT',ovr:68,nat:'SVN'},{n:'Kuharevich',pos:'ATT',ovr:60,nat:'UKR'}],
    'Cluj': [{n:'Gal',pos:'POR',ovr:60,nat:'ROU'},{n:'Camora',pos:'DIF',ovr:63,nat:'POR'},{n:'Kresic',pos:'DIF',ovr:61,nat:'CRO'},{n:'Masic',pos:'DIF',ovr:59,nat:'BIH'},{n:'Barrios',pos:'CEN',ovr:62,nat:'URU'},{n:'Fica',pos:'CEN',ovr:58,nat:'ROU'},{n:'Cordea',pos:'ATT',ovr:64,nat:'ROU'},{n:'Biliboc',pos:'ATT',ovr:57,nat:'ROU'}],
    'Ludogorets': [{n:'Padt',pos:'POR',ovr:63,nat:'NED'},{n:'Verdon',pos:'DIF',ovr:60,nat:'SUI'},{n:'Cauly',pos:'CEN',ovr:66,nat:'BRA'},{n:'Piotrowski',pos:'CEN',ovr:62,nat:'POL'},{n:'Tissera',pos:'ATT',ovr:68,nat:'ARG'},{n:'Duah',pos:'ATT',ovr:66,nat:'SUI'},{n:'Machado',pos:'ATT',ovr:61,nat:'BRA'},{n:'Tekpetey',pos:'ATT',ovr:60,nat:'GHA'}],
    'Gent': [{n:'Roef',pos:'POR',ovr:65,nat:'BEL'},{n:'Torunarigha',pos:'DIF',ovr:63,nat:'NGA'},{n:'Fofana',pos:'DIF',ovr:61,nat:'BEL'},{n:'Peersman',pos:'DIF',ovr:60,nat:'BEL'},{n:'Orban',pos:'CEN',ovr:66,nat:'NGA'},{n:'Kums',pos:'CEN',ovr:64,nat:'BEL'},{n:'Gudjohnsen',pos:'ATT',ovr:62,nat:'ISL'},{n:'Nurudeen',pos:'ATT',ovr:59,nat:'GHA'}],
    'Vitoria Guimaraes': [{n:'Bruno Varela',pos:'POR',ovr:64,nat:'POR'},{n:'Abascal',pos:'DIF',ovr:63,nat:'URU'},{n:'Alvaro Djalo',pos:'DIF',ovr:60,nat:'GNB'},{n:'Samu',pos:'CEN',ovr:65,nat:'POR'},{n:'Ohashi',pos:'CEN',ovr:61,nat:'JPN'},{n:'Oliveira',pos:'ATT',ovr:64,nat:'POR'},{n:'Camara',pos:'ATT',ovr:63,nat:'FRA'},{n:'Tiago Silva',pos:'ATT',ovr:58,nat:'POR'}],
    'Maccabi Tel Aviv': [{n:'Melika',pos:'POR',ovr:62,nat:'ISR'},{n:'Heitor',pos:'DIF',ovr:63,nat:'BRA'},{n:'Revivo',pos:'DIF',ovr:61,nat:'ISR'},{n:'Ben Harush',pos:'DIF',ovr:59,nat:'ISR'},{n:'Peretz',pos:'CEN',ovr:64,nat:'ISR'},{n:'Belic',pos:'CEN',ovr:62,nat:'SRB'},{n:'Varela',pos:'ATT',ovr:65,nat:'CPV'},{n:'Jehezkel',pos:'ATT',ovr:60,nat:'ISR'}],
    'Rakow Czestochowa': [{n:'Trelowski',pos:'POR',ovr:62,nat:'POL'},{n:'Racovitan',pos:'DIF',ovr:64,nat:'ROU'},{n:'Dawidowicz',pos:'DIF',ovr:62,nat:'POL'},{n:'Tudor',pos:'DIF',ovr:59,nat:'CRO'},{n:'Adriano',pos:'CEN',ovr:63,nat:'BRA'},{n:'Repka',pos:'CEN',ovr:60,nat:'POL'},{n:'Emreli',pos:'ATT',ovr:67,nat:'AZE'},{n:'Ojo',pos:'ATT',ovr:58,nat:'NGA'}],
    'APOEL': [{n:'Bruno Vale',pos:'POR',ovr:61,nat:'POR'},{n:'Laifis',pos:'DIF',ovr:63,nat:'CYP'},{n:'Degenek',pos:'DIF',ovr:64,nat:'AUS'},{n:'Stafylidis',pos:'DIF',ovr:60,nat:'GRE'},{n:'Rosa',pos:'CEN',ovr:62,nat:'BRA'},{n:'Limnios',pos:'CEN',ovr:64,nat:'GRE'},{n:'Djuricic',pos:'ATT',ovr:66,nat:'SRB'},{n:'Sotiriou',pos:'ATT',ovr:62,nat:'CYP'}],
    'Zorya Luhansk': [{n:'Rybak',pos:'POR',ovr:58,nat:'UKR'},{n:'Eskinja',pos:'DIF',ovr:59,nat:'AUT'},{n:'Henrique',pos:'DIF',ovr:58,nat:'BRA'},{n:'Jordan',pos:'DIF',ovr:57,nat:'BRA'},{n:'Andjusic',pos:'CEN',ovr:60,nat:'BIH'},{n:'Basic',pos:'CEN',ovr:58,nat:'CRO'},{n:'Glushchenko',pos:'ATT',ovr:59,nat:'UKR'},{n:'Zadorozhnyi',pos:'ATT',ovr:57,nat:'UKR'}],
    'Apollon Limassol': [{n:'Leeuwenburgh',pos:'POR',ovr:63,nat:'NED'},{n:'Goldson',pos:'DIF',ovr:66,nat:'ENG'},{n:'Aiwu',pos:'DIF',ovr:62,nat:'AUT'},{n:'Bruno Gaspar',pos:'DIF',ovr:60,nat:'ANG'},{n:'Rodrigues',pos:'CEN',ovr:64,nat:'CPV'},{n:'Assuncao',pos:'CEN',ovr:61,nat:'BRA'},{n:'Ugbo',pos:'ATT',ovr:65,nat:'CAN'},{n:'Asoro',pos:'ATT',ovr:62,nat:'SWE'}],
    'Silkeborg': [{n:'Larsen',pos:'POR',ovr:60,nat:'DEN'},{n:'Ostrom',pos:'DIF',ovr:59,nat:'NOR'},{n:'Poulsen',pos:'DIF',ovr:58,nat:'DEN'},{n:'Ganchas',pos:'DIF',ovr:57,nat:'POR'},{n:'Oxenberg',pos:'CEN',ovr:61,nat:'DEN'},{n:'Kirk',pos:'CEN',ovr:59,nat:'DEN'},{n:'Ross',pos:'ATT',ovr:62,nat:'DEN'},{n:'McCowatt',pos:'ATT',ovr:60,nat:'NZL'}],
    'Vikingur Reykjavik': [{n:'Jonsson',pos:'POR',ovr:56,nat:'ISL'},{n:'Stefansson',pos:'DIF',ovr:55,nat:'ISL'},{n:'Thorkelsson',pos:'DIF',ovr:54,nat:'ISL'},{n:'Finnbogason',pos:'CEN',ovr:55,nat:'ISL'},{n:'Sigurdsson',pos:'CEN',ovr:57,nat:'ISL'},{n:'Omarsson',pos:'ATT',ovr:60,nat:'ISL'},{n:'Borgthorsson',pos:'ATT',ovr:58,nat:'ISL'},{n:'Ingolfsson',pos:'ATT',ovr:55,nat:'ISL'}],
    'Lincoln Red Imps': [{n:'Nauzet Garcia',pos:'POR',ovr:52,nat:'ESP'},{n:'Mandi',pos:'DIF',ovr:51,nat:'ESP'},{n:'Rutjens',pos:'DIF',ovr:50,nat:'ESP'},{n:'Nano',pos:'CEN',ovr:52,nat:'ESP'},{n:'Alvaro Romero',pos:'CEN',ovr:51,nat:'ESP'},{n:'Casciaro',pos:'ATT',ovr:54,nat:'GIB'},{n:'Kike Gomez',pos:'ATT',ovr:52,nat:'ESP'},{n:'Sciortino',pos:'ATT',ovr:50,nat:'GIB'}],
  };


  // Squadra Icone: leggende del calcio già ritirate, compilate a memoria (nomi, ruoli,
  // nazionalità e un overall 85-97 assegnato a occhio in base alla caratura storica — non
  // sono statistiche prese da una fonte, solo la nostra stima). Non è legata a un club: è
  // un unico grande pool da cui pescare con gli spin (vedi iconPlayer in sim.js), separato
  // dalle rose reali contemporanee di SERIE_A_ROSTERS/EURO_ROSTERS qui sopra.
  const ICON_PLAYERS = [
    // --- Brasile ---
    {n:'Pelé',pos:'ATT',ovr:97,nat:'BRA'},{n:'Ronaldo Nazário',pos:'ATT',ovr:95,nat:'BRA'},{n:'Garrincha',pos:'ATT',ovr:94,nat:'BRA'},
    {n:'Zico',pos:'CEN',ovr:93,nat:'BRA'},{n:'Romário',pos:'ATT',ovr:93,nat:'BRA'},{n:'Ronaldinho',pos:'ATT',ovr:93,nat:'BRA'},
    {n:'Rivaldo',pos:'ATT',ovr:91,nat:'BRA'},{n:'Sócrates',pos:'CEN',ovr:90,nat:'BRA'},{n:'Careca',pos:'ATT',ovr:89,nat:'BRA'},
    {n:'Falcão',pos:'CEN',ovr:89,nat:'BRA'},{n:'Cafu',pos:'DIF',ovr:89,nat:'BRA'},{n:'Roberto Carlos',pos:'DIF',ovr:90,nat:'BRA'},
    {n:'Kaká',pos:'CEN',ovr:90,nat:'BRA'},{n:'Bebeto',pos:'ATT',ovr:88,nat:'BRA'},{n:'Djalma Santos',pos:'DIF',ovr:87,nat:'BRA'},
    {n:'Nilton Santos',pos:'DIF',ovr:87,nat:'BRA'},{n:'Jairzinho',pos:'ATT',ovr:89,nat:'BRA'},{n:'Tostão',pos:'ATT',ovr:87,nat:'BRA'},
    {n:'Gérson',pos:'CEN',ovr:86,nat:'BRA'},{n:'Rivelino',pos:'CEN',ovr:88,nat:'BRA'},
    {n:'Taffarel',pos:'POR',ovr:86,nat:'BRA'},{n:'Aldair',pos:'DIF',ovr:86,nat:'BRA'},
    {n:'Lúcio',pos:'DIF',ovr:87,nat:'BRA'},
    {n:'Edmundo',pos:'ATT',ovr:86,nat:'BRA'},
    {n:'Leônidas',pos:'ATT',ovr:88,nat:'BRA'},{n:'Zizinho',pos:'CEN',ovr:88,nat:'BRA'},{n:'Vavá',pos:'ATT',ovr:86,nat:'BRA'},

    // --- Argentina ---
    {n:'Diego Maradona',pos:'ATT',ovr:97,nat:'ARG'},{n:'Alfredo Di Stéfano',pos:'ATT',ovr:96,nat:'ARG'},{n:'Gabriel Batistuta',pos:'ATT',ovr:92,nat:'ARG'},
    {n:'Mario Kempes',pos:'ATT',ovr:90,nat:'ARG'},{n:'Daniel Passarella',pos:'DIF',ovr:88,nat:'ARG'},{n:'Juan Román Riquelme',pos:'CEN',ovr:90,nat:'ARG'},
    {n:'Fernando Redondo',pos:'CEN',ovr:89,nat:'ARG'},{n:'Diego Simeone',pos:'CEN',ovr:87,nat:'ARG'},{n:'Hernán Crespo',pos:'ATT',ovr:88,nat:'ARG'},
    {n:'Gonzalo Higuaín',pos:'ATT',ovr:87,nat:'ARG'},{n:'Javier Zanetti',pos:'DIF',ovr:87,nat:'ARG'},{n:'Roberto Ayala',pos:'DIF',ovr:86,nat:'ARG'},
    {n:'Ariel Ortega',pos:'CEN',ovr:86,nat:'ARG'},
    {n:'Claudio Caniggia',pos:'ATT',ovr:87,nat:'ARG'},{n:'Jorge Valdano',pos:'ATT',ovr:86,nat:'ARG'},{n:'Ubaldo Fillol',pos:'POR',ovr:86,nat:'ARG'},
    {n:'Esteban Cambiasso',pos:'CEN',ovr:86,nat:'ARG'},{n:'Juan Sebastián Verón',pos:'CEN',ovr:88,nat:'ARG'},
    {n:'Walter Samuel',pos:'DIF',ovr:87,nat:'ARG'},{n:'Carlos Tevez',pos:'ATT',ovr:87,nat:'ARG'},

    // --- Italia ---
    {n:'Franco Baresi',pos:'DIF',ovr:93,nat:'ITA'},{n:'Paolo Maldini',pos:'DIF',ovr:95,nat:'ITA'},{n:'Roberto Baggio',pos:'ATT',ovr:93,nat:'ITA'},
    {n:'Gianluigi Buffon',pos:'POR',ovr:93,nat:'ITA'},{n:'Alessandro Del Piero',pos:'ATT',ovr:91,nat:'ITA'},{n:'Francesco Totti',pos:'ATT',ovr:91,nat:'ITA'},
    {n:'Fabio Cannavaro',pos:'DIF',ovr:91,nat:'ITA'},{n:'Andrea Pirlo',pos:'CEN',ovr:91,nat:'ITA'},{n:'Gianfranco Zola',pos:'ATT',ovr:88,nat:'ITA'},
    {n:'Dino Zoff',pos:'POR',ovr:90,nat:'ITA'},{n:'Giacinto Facchetti',pos:'DIF',ovr:88,nat:'ITA'},{n:'Gigi Riva',pos:'ATT',ovr:90,nat:'ITA'},
    {n:'Sandro Mazzola',pos:'ATT',ovr:88,nat:'ITA'},{n:'Gianni Rivera',pos:'CEN',ovr:89,nat:'ITA'},{n:'Alessandro Nesta',pos:'DIF',ovr:90,nat:'ITA'},
    {n:'Filippo Inzaghi',pos:'ATT',ovr:87,nat:'ITA'},{n:'Christian Vieri',pos:'ATT',ovr:88,nat:'ITA'},{n:'Demetrio Albertini',pos:'CEN',ovr:86,nat:'ITA'},
    {n:'Antonio Cabrini',pos:'DIF',ovr:86,nat:'ITA'},{n:'Marco Tardelli',pos:'CEN',ovr:86,nat:'ITA'},{n:'Bruno Conti',pos:'CEN',ovr:86,nat:'ITA'},
    {n:'Roberto Mancini',pos:'ATT',ovr:86,nat:'ITA'},{n:'Gianluca Vialli',pos:'ATT',ovr:87,nat:'ITA'},
    {n:'Giuseppe Bergomi',pos:'DIF',ovr:87,nat:'ITA'},{n:'Beppe Signori',pos:'ATT',ovr:86,nat:'ITA'},{n:'Angelo Peruzzi',pos:'POR',ovr:86,nat:'ITA'},
    {n:'Ciro Ferrara',pos:'DIF',ovr:86,nat:'ITA'},{n:'Alessandro Costacurta',pos:'DIF',ovr:87,nat:'ITA'},
    {n:'Marco Materazzi',pos:'DIF',ovr:86,nat:'ITA'},{n:'Gennaro Gattuso',pos:'CEN',ovr:86,nat:'ITA'},{n:'Claudio Gentile',pos:'DIF',ovr:86,nat:'ITA'},
    // --- Germania ---
    {n:'Franz Beckenbauer',pos:'DIF',ovr:96,nat:'GER'},{n:'Gerd Müller',pos:'ATT',ovr:95,nat:'GER'},{n:'Lothar Matthäus',pos:'CEN',ovr:93,nat:'GER'},
    {n:'Karl-Heinz Rummenigge',pos:'ATT',ovr:91,nat:'GER'},{n:'Jürgen Klinsmann',pos:'ATT',ovr:90,nat:'GER'},{n:'Michael Ballack',pos:'CEN',ovr:89,nat:'GER'},
    {n:'Oliver Kahn',pos:'POR',ovr:91,nat:'GER'},{n:'Uwe Seeler',pos:'ATT',ovr:89,nat:'GER'},{n:'Paul Breitner',pos:'DIF',ovr:88,nat:'GER'},
    {n:'Sepp Maier',pos:'POR',ovr:88,nat:'GER'},{n:'Rudi Völler',pos:'ATT',ovr:88,nat:'GER'},{n:'Andreas Brehme',pos:'DIF',ovr:87,nat:'GER'},
    {n:'Jürgen Kohler',pos:'DIF',ovr:86,nat:'GER'},{n:'Matthias Sammer',pos:'DIF',ovr:88,nat:'GER'},{n:'Thomas Häßler',pos:'CEN',ovr:86,nat:'GER'},
    {n:'Stefan Effenberg',pos:'CEN',ovr:87,nat:'GER'},{n:'Bastian Schweinsteiger',pos:'CEN',ovr:88,nat:'GER'},{n:'Miroslav Klose',pos:'ATT',ovr:88,nat:'GER'},
    {n:'Philipp Lahm',pos:'DIF',ovr:89,nat:'GER'},{n:'Bernd Schuster',pos:'CEN',ovr:88,nat:'GER'},

    // --- Francia ---
    {n:'Zinedine Zidane',pos:'CEN',ovr:96,nat:'FRA'},{n:'Michel Platini',pos:'CEN',ovr:94,nat:'FRA'},{n:'Thierry Henry',pos:'ATT',ovr:92,nat:'FRA'},
    {n:'Just Fontaine',pos:'ATT',ovr:90,nat:'FRA'},{n:'Raymond Kopa',pos:'CEN',ovr:90,nat:'FRA'},{n:'Marcel Desailly',pos:'DIF',ovr:89,nat:'FRA'},
    {n:'Laurent Blanc',pos:'DIF',ovr:88,nat:'FRA'},{n:'Didier Deschamps',pos:'CEN',ovr:87,nat:'FRA'},{n:'Patrick Vieira',pos:'CEN',ovr:89,nat:'FRA'},
    {n:'Youri Djorkaeff',pos:'CEN',ovr:88,nat:'FRA'},{n:'David Trezeguet',pos:'ATT',ovr:88,nat:'FRA'},{n:'Lilian Thuram',pos:'DIF',ovr:89,nat:'FRA'},
    {n:'Bixente Lizarazu',pos:'DIF',ovr:87,nat:'FRA'},{n:'Emmanuel Petit',pos:'CEN',ovr:86,nat:'FRA'},{n:'Claude Makélélé',pos:'CEN',ovr:88,nat:'FRA'},
    {n:'Eric Cantona',pos:'ATT',ovr:88,nat:'FRA'},{n:'Jean-Pierre Papin',pos:'ATT',ovr:89,nat:'FRA'},{n:'David Ginola',pos:'CEN',ovr:86,nat:'FRA'},
    {n:'Robert Pirès',pos:'CEN',ovr:87,nat:'FRA'},{n:'Fabien Barthez',pos:'POR',ovr:87,nat:'FRA'},
    {n:'Alain Giresse',pos:'CEN',ovr:87,nat:'FRA'},{n:'Jean Tigana',pos:'CEN',ovr:87,nat:'FRA'},
    {n:'Luis Fernández',pos:'CEN',ovr:86,nat:'FRA'},{n:'Nicolas Anelka',pos:'ATT',ovr:87,nat:'FRA'},
    // --- Spagna ---
    {n:'Xavi Hernández',pos:'CEN',ovr:93,nat:'ESP'},{n:'Andrés Iniesta',pos:'CEN',ovr:93,nat:'ESP'},
    {n:'Raúl González',pos:'ATT',ovr:91,nat:'ESP'},{n:'Iker Casillas',pos:'POR',ovr:91,nat:'ESP'},{n:'Carles Puyol',pos:'DIF',ovr:89,nat:'ESP'},
    {n:'Emilio Butragueño',pos:'ATT',ovr:88,nat:'ESP'},{n:'Michel González',pos:'CEN',ovr:87,nat:'ESP'},
    {n:'Fernando Hierro',pos:'DIF',ovr:89,nat:'ESP'},{n:'Andoni Zubizarreta',pos:'POR',ovr:87,nat:'ESP'},{n:'Luis Enrique Martínez',pos:'CEN',ovr:87,nat:'ESP'},
    {n:'Pep Guardiola',pos:'CEN',ovr:87,nat:'ESP'},{n:'David Villa',pos:'ATT',ovr:89,nat:'ESP'},{n:'Fernando Torres',pos:'ATT',ovr:88,nat:'ESP'},
    {n:'Xabi Alonso',pos:'CEN',ovr:89,nat:'ESP'},

    {n:'José Antonio Camacho',pos:'DIF',ovr:86,nat:'ESP'},{n:'Cesc Fàbregas',pos:'CEN',ovr:87,nat:'ESP'},

    // --- Inghilterra ---
    {n:'Bobby Moore',pos:'DIF',ovr:92,nat:'ENG'},{n:'Bobby Charlton',pos:'CEN',ovr:92,nat:'ENG'},{n:'Gary Lineker',pos:'ATT',ovr:89,nat:'ENG'},
    {n:'Alan Shearer',pos:'ATT',ovr:89,nat:'ENG'},{n:'Paul Gascoigne',pos:'CEN',ovr:89,nat:'ENG'},{n:'David Beckham',pos:'CEN',ovr:89,nat:'ENG'},
    {n:'Steven Gerrard',pos:'CEN',ovr:90,nat:'ENG'},{n:'Frank Lampard',pos:'CEN',ovr:89,nat:'ENG'},{n:'Paul Scholes',pos:'CEN',ovr:88,nat:'ENG'},
    {n:'Ryan Giggs',pos:'CEN',ovr:88,nat:'ENG'},{n:'Rio Ferdinand',pos:'DIF',ovr:87,nat:'ENG'},{n:'John Terry',pos:'DIF',ovr:87,nat:'ENG'},
    {n:'Ashley Cole',pos:'DIF',ovr:87,nat:'ENG'},{n:'Michael Owen',pos:'ATT',ovr:87,nat:'ENG'},
    {n:'Peter Shilton',pos:'POR',ovr:88,nat:'ENG'},{n:'David Seaman',pos:'POR',ovr:86,nat:'ENG'},{n:'Kevin Keegan',pos:'ATT',ovr:88,nat:'ENG'},
    {n:'Gordon Banks',pos:'POR',ovr:89,nat:'ENG'},{n:'Geoff Hurst',pos:'ATT',ovr:87,nat:'ENG'},
    {n:'Glenn Hoddle',pos:'CEN',ovr:86,nat:'ENG'},{n:'Teddy Sheringham',pos:'ATT',ovr:86,nat:'ENG'},
    {n:'Sol Campbell',pos:'DIF',ovr:86,nat:'ENG'},{n:'Wayne Rooney',pos:'ATT',ovr:89,nat:'ENG'},
    {n:'Robbie Fowler',pos:'ATT',ovr:86,nat:'ENG'},
    {n:'Ian Wright',pos:'ATT',ovr:86,nat:'ENG'},
    // --- Olanda ---
    {n:'Johan Cruijff',pos:'ATT',ovr:96,nat:'NED'},{n:'Marco van Basten',pos:'ATT',ovr:93,nat:'NED'},{n:'Ruud Gullit',pos:'CEN',ovr:92,nat:'NED'},
    {n:'Frank Rijkaard',pos:'CEN',ovr:90,nat:'NED'},{n:'Dennis Bergkamp',pos:'ATT',ovr:91,nat:'NED'},{n:'Ruud van Nistelrooy',pos:'ATT',ovr:89,nat:'NED'},
    {n:'Clarence Seedorf',pos:'CEN',ovr:88,nat:'NED'},{n:'Edgar Davids',pos:'CEN',ovr:87,nat:'NED'},{n:'Patrick Kluivert',pos:'ATT',ovr:87,nat:'NED'},
    {n:'Edwin van der Sar',pos:'POR',ovr:89,nat:'NED'},{n:'Johan Neeskens',pos:'CEN',ovr:88,nat:'NED'},{n:'Ronald Koeman',pos:'DIF',ovr:88,nat:'NED'},
    {n:'Frank de Boer',pos:'DIF',ovr:86,nat:'NED'},{n:'Robin van Persie',pos:'ATT',ovr:87,nat:'NED'},{n:'Wesley Sneijder',pos:'CEN',ovr:88,nat:'NED'},
    {n:'Rafael van der Vaart',pos:'CEN',ovr:86,nat:'NED'},{n:'Arjen Robben',pos:'ATT',ovr:87,nat:'NED'},
    {n:'Jaap Stam',pos:'DIF',ovr:87,nat:'NED'},
    // --- Portogallo ---
    {n:'Eusébio',pos:'ATT',ovr:94,nat:'POR'},{n:'Luís Figo',pos:'CEN',ovr:91,nat:'POR'},{n:'Rui Costa',pos:'CEN',ovr:89,nat:'POR'},
    {n:'Paulo Futre',pos:'ATT',ovr:88,nat:'POR'},{n:'Fernando Couto',pos:'DIF',ovr:86,nat:'POR'},{n:'Vítor Baía',pos:'POR',ovr:86,nat:'POR'},
    {n:'Deco',pos:'CEN',ovr:88,nat:'POR'},{n:'Pauleta',pos:'ATT',ovr:86,nat:'POR'},

    // --- Uruguay ---
    {n:'Enzo Francescoli',pos:'ATT',ovr:90,nat:'URU'},{n:'Diego Forlán',pos:'ATT',ovr:88,nat:'URU'},{n:'Álvaro Recoba',pos:'ATT',ovr:87,nat:'URU'},
    {n:'Óbdulio Varela',pos:'DIF',ovr:87,nat:'URU'},
    {n:'Héctor Scarone',pos:'ATT',ovr:86,nat:'URU'},

    // --- Colombia ---
    {n:'Carlos Valderrama',pos:'CEN',ovr:90,nat:'COL'},{n:'René Higuita',pos:'POR',ovr:86,nat:'COL'},{n:'Faustino Asprilla',pos:'ATT',ovr:86,nat:'COL'},
    {n:'Freddy Rincón',pos:'CEN',ovr:86,nat:'COL'},{n:'Iván Córdoba',pos:'DIF',ovr:86,nat:'COL'},

    // --- Cile / Paraguay / Perù / Ecuador / Bolivia / Venezuela ---
    {n:'Iván Zamorano',pos:'ATT',ovr:87,nat:'CHI'},{n:'Marcelo Salas',pos:'ATT',ovr:87,nat:'CHI'},{n:'Elías Figueroa',pos:'DIF',ovr:87,nat:'CHI'},
    {n:'José Luis Chilavert',pos:'POR',ovr:88,nat:'PAR'},
    {n:'Teófilo Cubillas',pos:'ATT',ovr:89,nat:'PER'},

    // --- Messico / USA / Costa Rica / Honduras ---
    {n:'Hugo Sánchez',pos:'ATT',ovr:91,nat:'MEX'},{n:'Rafael Márquez',pos:'DIF',ovr:87,nat:'MEX'},{n:'Cuauhtémoc Blanco',pos:'ATT',ovr:86,nat:'MEX'},
    {n:'Landon Donovan',pos:'ATT',ovr:86,nat:'USA'},


    // --- Belgio ---
    {n:'Enzo Scifo',pos:'CEN',ovr:88,nat:'BEL'},{n:'Jean-Marie Pfaff',pos:'POR',ovr:87,nat:'BEL'},{n:'Jan Ceulemans',pos:'CEN',ovr:86,nat:'BEL'},
    {n:'Éric Gerets',pos:'DIF',ovr:86,nat:'BEL'},
    // --- Croazia / ex Jugoslavia ---
    {n:'Davor Šuker',pos:'ATT',ovr:89,nat:'CRO'},{n:'Zvonimir Boban',pos:'CEN',ovr:88,nat:'CRO'},{n:'Robert Prosinečki',pos:'CEN',ovr:87,nat:'CRO'},
    {n:'Dragan Džajić',pos:'ATT',ovr:88,nat:'SRB'},{n:'Dejan Savićević',pos:'ATT',ovr:88,nat:'MNE'},{n:'Predrag Mijatović',pos:'ATT',ovr:87,nat:'MNE'},
    {n:'Siniša Mihajlović',pos:'DIF',ovr:86,nat:'SRB'},{n:'Dragan Stojković',pos:'CEN',ovr:88,nat:'SRB'},{n:'Safet Sušić',pos:'CEN',ovr:87,nat:'BIH'},
    {n:'Darko Pančev',pos:'ATT',ovr:86,nat:'MKD'},
    // --- Repubblica Ceca / Slovacchia / Polonia / Ungheria / Romania / Bulgaria ---
    {n:'Pavel Nedvěd',pos:'CEN',ovr:90,nat:'CZE'},{n:'Antonín Panenka',pos:'CEN',ovr:86,nat:'CZE'},{n:'Tomáš Rosický',pos:'CEN',ovr:87,nat:'CZE'},
    {n:'Petr Čech',pos:'POR',ovr:88,nat:'CZE'},
    {n:'Zbigniew Boniek',pos:'ATT',ovr:90,nat:'POL'},{n:'Grzegorz Lato',pos:'ATT',ovr:88,nat:'POL'},{n:'Kazimierz Deyna',pos:'CEN',ovr:88,nat:'POL'},
    {n:'Włodzimierz Lubański',pos:'ATT',ovr:87,nat:'POL'},{n:'Ferenc Puskás',pos:'ATT',ovr:96,nat:'HUN'},{n:'Sándor Kocsis',pos:'ATT',ovr:90,nat:'HUN'},
    {n:'Nándor Hidegkuti',pos:'ATT',ovr:88,nat:'HUN'},{n:'József Bozsik',pos:'CEN',ovr:87,nat:'HUN'},{n:'Gheorghe Hagi',pos:'CEN',ovr:91,nat:'ROU'},
    {n:'Gheorghe Popescu',pos:'DIF',ovr:86,nat:'ROU'},
    {n:'Hristo Stoichkov',pos:'ATT',ovr:91,nat:'BUL'},{n:'Krasimir Balakov',pos:'CEN',ovr:86,nat:'BUL'},
    // --- Svezia / Danimarca / Norvegia ---
    {n:'Zlatan Ibrahimović',pos:'ATT',ovr:90,nat:'SWE'},{n:'Henrik Larsson',pos:'ATT',ovr:89,nat:'SWE'},{n:'Tomas Brolin',pos:'ATT',ovr:86,nat:'SWE'},
    {n:'Gunnar Nordahl',pos:'ATT',ovr:88,nat:'SWE'},{n:'Nils Liedholm',pos:'CEN',ovr:88,nat:'SWE'},
    {n:'Michael Laudrup',pos:'CEN',ovr:92,nat:'DEN'},{n:'Brian Laudrup',pos:'ATT',ovr:89,nat:'DEN'},{n:'Peter Schmeichel',pos:'POR',ovr:90,nat:'DEN'},
    {n:'Preben Elkjær',pos:'ATT',ovr:87,nat:'DEN'},{n:'Allan Simonsen',pos:'ATT',ovr:87,nat:'DEN'},

    // --- Russia / URSS / Ucraina / Georgia / Armenia ---
    {n:'Lev Yashin',pos:'POR',ovr:93,nat:'RUS'},{n:'Oleg Blokhin',pos:'ATT',ovr:90,nat:'UKR'},{n:'Igor Belanov',pos:'ATT',ovr:87,nat:'UKR'},
    {n:'Andriy Shevchenko',pos:'ATT',ovr:91,nat:'UKR'},{n:'Rinat Dasayev',pos:'POR',ovr:87,nat:'RUS'},{n:'Igor Netto',pos:'CEN',ovr:86,nat:'RUS'},

    // --- Turchia / Grecia ---
    {n:'Hakan Şükür',pos:'ATT',ovr:87,nat:'TUR'},{n:'Rüştü Reçber',pos:'POR',ovr:87,nat:'TUR'},
    {n:'Theodoros Zagorakis',pos:'CEN',ovr:86,nat:'GRE'},
    // --- Scozia / Galles / Irlanda ---
    {n:'Kenny Dalglish',pos:'ATT',ovr:90,nat:'SCO'},{n:'Denis Law',pos:'ATT',ovr:89,nat:'SCO'},{n:'Graeme Souness',pos:'CEN',ovr:87,nat:'SCO'},
    {n:'Ian Rush',pos:'ATT',ovr:88,nat:'WAL'},{n:'John Charles',pos:'ATT',ovr:88,nat:'WAL'},
    {n:'Roy Keane',pos:'CEN',ovr:88,nat:'IRL'},{n:'Paul McGrath',pos:'DIF',ovr:86,nat:'IRL'},
    // --- Austria / Svizzera ---
    {n:'Herbert Prohaska',pos:'CEN',ovr:86,nat:'AUT'},{n:'Hans Krankl',pos:'ATT',ovr:87,nat:'AUT'},

    // --- Ghana / Nigeria / Camerun / Senegal / Costa d'Avorio / Egitto / Marocco / Algeria ---
    {n:'Abédi Pelé',pos:'CEN',ovr:89,nat:'GHA'},{n:'Tony Yeboah',pos:'ATT',ovr:86,nat:'GHA'},{n:'Jay-Jay Okocha',pos:'CEN',ovr:88,nat:'NGA'},
    {n:'Nwankwo Kanu',pos:'ATT',ovr:86,nat:'NGA'},{n:'Samuel Eto\'o',pos:'ATT',ovr:90,nat:'CMR'},
    {n:'Roger Milla',pos:'ATT',ovr:88,nat:'CMR'},
    {n:'Didier Drogba',pos:'ATT',ovr:90,nat:'CIV'},{n:'Yaya Touré',pos:'CEN',ovr:89,nat:'CIV'},
    {n:'Mohamed Aboutrika',pos:'CEN',ovr:86,nat:'EGY'},
    {n:'Mustapha Hadji',pos:'CEN',ovr:86,nat:'MAR'},
    {n:'Rabah Madjer',pos:'ATT',ovr:87,nat:'ALG'},
    // --- Sudafrica / Arabia Saudita / Giappone / Corea del Sud / Australia ---

    {n:'Hidetoshi Nakata',pos:'CEN',ovr:87,nat:'JPN'},{n:'Hong Myung-bo',pos:'DIF',ovr:86,nat:'KOR'},
    {n:'Cha Bum-kun',pos:'ATT',ovr:87,nat:'KOR'},{n:'Harry Kewell',pos:'ATT',ovr:86,nat:'AUS'}
  ];
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

  // Un pool più ampio per fascia (era 6-7 nomi, ora 12-13): su 20 stagioni di negoziazioni
  // sponsor, il pool piccolo era il più a rischio ripetizione di tutto il gioco.
  const SPONSOR_BRANDS = {
    community: ['Panetteria del Borgo', 'Assicurazioni del Porto', 'Latteria Locale', 'Birrificio Vecchio Mulino', 'Autofficina Collina', 'Pasticceria Reale', 'Ferramenta Centrale', 'Macelleria San Rocco', 'Farmacia Comunale', 'Vivaio Fioranova', 'Cartoleria Progresso', 'Gelateria Artigiana', 'Tabaccheria Stazione'],
    regional: ['Gruppo Adriatica', 'Edilizia del Nord', 'Distretto Energia', 'Cantine Riunite Sud', 'Trasporti Peninsulare', 'Confidi Regionale', 'Agroalimentare Vallata', 'Consorzio Termale', 'Metalmeccanica Valdarno', 'Ceramiche Colline', 'Ittica Tirrenica', 'Cooperativa Lattiero-Casearia'],
    standard: ['NordGate Energia', 'Corona Telecom', 'Vetro Vertice', 'Redline Logistica', 'Ancora Finanza', 'Orizzonte Assicurazioni', 'Ampere Utilities', 'Portale Immobiliare', 'Cargo Adriatico', 'Rete Sanitaria Plus', 'Fibra Nazionale', 'Mercurio Leasing'],
    betting: ['ScommettiBene', 'FortunaKick', 'GoalRush Casinò', 'BetNazione', 'SpinWin', 'JackpotArena', 'PuntaFacile', 'RedDice Bet', 'AllInSport', 'VittoriaLive', 'BetOlimpo', 'CashGoal'],
    global: ['Atlas Global', 'Vantage Air', 'Nimbus Tech', 'Meridian Bank', 'Solaris Motori', 'Zenith Capital', 'Orbit Dynamics', 'Helios Group', 'Titan Aerospace', 'Quantum Financial', 'Continental Shipping', 'Apex Semiconductors'],
  };

  // Allenatori reali: si aggiungono ai candidati generati (non li sostituiscono), pescati
  // solo quando il loro rating è vicino a quello richiesto dal club che offre il posto.
  // `spec` non è casuale come per i generati: è scelta in base alla reputazione pubblica
  // reale di ciascuno (stile di gioco, fama come motivatore/costruttore di giovani/
  // negoziatore...), così un allenatore vero "si comporta" in modo coerente con la sua
  // fama — es. Guardiola/Conte tattici, Klopp/Ancelotti motivatori, Gasperini costruttore
  // di giovani (il suo vivaio all'Atalanta è leggendario). Fonti: reputazione sportiva
  // ampiamente documentata di ciascuno (stile tattico, gestione dello spogliatoio,
  // valorizzazione dei giovani), non un singolo dato statistico.
  const REAL_MANAGERS = [
    { n: 'Pep Guardiola', rating: 93, nat: 'ESP', spec: 'tactician' },
    { n: 'Carlo Ancelotti', rating: 91, nat: 'ITA', spec: 'motivator' },
    { n: 'Jurgen Klopp', rating: 90, nat: 'GER', spec: 'motivator' },
    { n: 'Antonio Conte', rating: 88, nat: 'ITA', spec: 'tactician' },
    { n: 'Luciano Spalletti', rating: 81, nat: 'ITA', spec: 'tactician' },
    { n: 'Simone Inzaghi', rating: 85, nat: 'ITA', spec: 'motivator' },
    { n: 'Massimiliano Allegri', rating: 84, nat: 'ITA', spec: 'negotiator' },
    { n: 'Gian Piero Gasperini', rating: 82, nat: 'ITA', spec: 'builder' },
    { n: 'Thiago Motta', rating: 78, nat: 'ITA', spec: 'builder' },
    { n: 'Stefano Pioli', rating: 77, nat: 'ITA', spec: 'motivator' },
    { n: 'Roberto Mancini', rating: 76, nat: 'ITA', spec: 'motivator' },
    { n: 'Claudio Ranieri', rating: 75, nat: 'ITA', spec: 'motivator' },
    { n: 'Vincenzo Italiano', rating: 76, nat: 'ITA', spec: 'tactician' },
    { n: 'Gennaro Gattuso', rating: 73, nat: 'ITA', spec: 'motivator' },
    { n: 'Ivan Juric', rating: 69, nat: 'CRO', spec: 'tactician' },
    { n: 'Walter Mazzarri', rating: 70, nat: 'ITA', spec: 'tactician' },
    { n: 'Marco Baroni', rating: 67, nat: 'ITA', spec: 'motivator' },
    { n: 'Raffaele Palladino', rating: 71, nat: 'ITA', spec: 'builder' },
    { n: 'Eusebio Di Francesco', rating: 65, nat: 'ITA', spec: 'tactician' },
    { n: 'Alberto Gilardino', rating: 64, nat: 'ITA', spec: 'builder' },
    { n: 'Davide Nicola', rating: 63, nat: 'ITA', spec: 'motivator' },
    { n: 'Paolo Zanetti', rating: 66, nat: 'ITA', spec: 'builder' },
    { n: 'Fabio Pecchia', rating: 61, nat: 'ITA', spec: 'builder' },
    { n: 'Rolando Maran', rating: 60, nat: 'ITA', spec: 'negotiator' },
    { n: 'Fabio Liverani', rating: 58, nat: 'ITA', spec: 'motivator' },
    { n: 'Fabio Cannavaro', rating: 59, nat: 'ITA', spec: 'motivator' },
    { n: 'Cristian Bucchi', rating: 56, nat: 'ITA', spec: 'builder' },
    // ---- allenatori internazionali (aggiunti) ----
    { n: 'Mikel Arteta', rating: 86, nat: 'ESP', spec: 'tactician' },
    { n: 'Xabi Alonso', rating: 85, nat: 'ESP', spec: 'tactician' },
    { n: 'Unai Emery', rating: 82, nat: 'ESP', spec: 'tactician' },
    { n: 'Thomas Tuchel', rating: 86, nat: 'GER', spec: 'tactician' },
    { n: 'Julian Nagelsmann', rating: 84, nat: 'GER', spec: 'builder' },
    { n: 'Hansi Flick', rating: 85, nat: 'GER', spec: 'tactician' },
    { n: 'Domenico Tedesco', rating: 73, nat: 'GER', spec: 'tactician' },
    { n: 'Roberto De Zerbi', rating: 80, nat: 'ITA', spec: 'tactician' },
    { n: 'Erik ten Hag', rating: 78, nat: 'NED', spec: 'tactician' },
    { n: 'Arne Slot', rating: 83, nat: 'NED', spec: 'tactician' },
    { n: 'Ronald Koeman', rating: 74, nat: 'NED', spec: 'motivator' },
    { n: 'Zinedine Zidane', rating: 87, nat: 'FRA', spec: 'motivator' },
    { n: 'Didier Deschamps', rating: 83, nat: 'FRA', spec: 'motivator' },
    { n: 'Christophe Galtier', rating: 72, nat: 'FRA', spec: 'tactician' },
    { n: 'José Mourinho', rating: 87, nat: 'POR', spec: 'motivator' },
    { n: 'Fernando Santos', rating: 70, nat: 'POR', spec: 'negotiator' },
    { n: 'Nuno Espirito Santo', rating: 75, nat: 'POR', spec: 'tactician' },
    { n: 'Ruben Amorim', rating: 79, nat: 'POR', spec: 'builder' },
    { n: 'Diego Simeone', rating: 86, nat: 'ARG', spec: 'motivator' },
    { n: 'Marcelo Gallardo', rating: 80, nat: 'ARG', spec: 'motivator' },
    { n: 'Lionel Scaloni', rating: 82, nat: 'ARG', spec: 'motivator' },
    { n: 'Fernando Diniz', rating: 73, nat: 'BRA', spec: 'tactician' },
    { n: 'Abel Ferreira', rating: 78, nat: 'POR', spec: 'motivator' },
    { n: 'David Moyes', rating: 74, nat: 'SCO', spec: 'negotiator' },
    { n: 'Sean Dyche', rating: 71, nat: 'ENG', spec: 'tactician' },
    { n: 'Eddie Howe', rating: 79, nat: 'ENG', spec: 'builder' },
    { n: 'Graham Potter', rating: 73, nat: 'ENG', spec: 'tactician' },
    { n: 'Gareth Southgate', rating: 76, nat: 'ENG', spec: 'motivator' },
    { n: 'Igor Tudor', rating: 74, nat: 'CRO', spec: 'tactician' },
    { n: 'Zlatko Dalic', rating: 72, nat: 'CRO', spec: 'motivator' },
    { n: 'Marco Rossi', rating: 70, nat: 'ITA', spec: 'motivator' },
    // ---- altri 20 (almeno 10 italiani: leggende + nuova generazione di tecnici) ----
    { n: 'Marcello Lippi', rating: 88, nat: 'ITA', spec: 'motivator' },
    { n: 'Giovanni Trapattoni', rating: 85, nat: 'ITA', spec: 'tactician' },
    { n: 'Fabio Capello', rating: 86, nat: 'ITA', spec: 'medic' },
    { n: 'Arrigo Sacchi', rating: 87, nat: 'ITA', spec: 'tactician' },
    { n: 'Daniele De Rossi', rating: 62, nat: 'ITA', spec: 'motivator' },
    { n: 'Paolo Vanoli', rating: 68, nat: 'ITA', spec: 'tactician' },
    { n: 'Fabio Grosso', rating: 60, nat: 'ITA', spec: 'builder' },
    { n: 'Alessio Dionisi', rating: 61, nat: 'ITA', spec: 'tactician' },
    { n: 'Roberto D\'Aversa', rating: 64, nat: 'ITA', spec: 'negotiator' },
    { n: 'Eugenio Corini', rating: 62, nat: 'ITA', spec: 'motivator' },
    { n: 'Leonardo Semplici', rating: 58, nat: 'ITA', spec: 'builder' },
    { n: 'Michele Mignani', rating: 59, nat: 'ITA', spec: 'tactician' },
    { n: 'Luis Enrique', rating: 85, nat: 'ESP', spec: 'tactician' },
    { n: 'Rafael Benitez', rating: 78, nat: 'ESP', spec: 'tactician' },
    { n: 'Marcelo Bielsa', rating: 84, nat: 'ARG', spec: 'tactician' },
    { n: 'Jorge Sampaoli', rating: 76, nat: 'ARG', spec: 'motivator' },
    { n: 'Patrick Vieira', rating: 68, nat: 'FRA', spec: 'builder' },
    { n: 'Frank Lampard', rating: 66, nat: 'ENG', spec: 'motivator' },
    { n: 'Steven Gerrard', rating: 65, nat: 'ENG', spec: 'motivator' },
    { n: 'Michael Carrick', rating: 63, nat: 'ENG', spec: 'tactician' },
  ];

  /* ---------------- stato ---------------- */
  const MAX_SEASONS = 20;

  /* ---------------- settore giovanile / scouting ---------------- */
  // Un investimento persistente (4 livelli) che rende ogni spin migliore in media e più
  // affidabile (meno varianza), e alza la chance del "colpo" da titoli di giornale. Dal
  // livello 2 in su può anche regalare un giovane di prospettiva gratis a inizio stagione.
  const SCOUT_TIERS = [
    { name: 'Nessuno', bonus: 0, varDelta: 0, gem: 0, prospectChance: 0 },
    { name: 'Base', bonus: 2, varDelta: -0.6, gem: 0.02, prospectChance: 0.28 },
    { name: 'Avanzato', bonus: 4, varDelta: -1.1, gem: 0.05, prospectChance: 0.48 },
    { name: 'Elite', bonus: 7, varDelta: -1.6, gem: 0.09, prospectChance: 0.72 },
  ];

  const MIN_SQUAD = 16;

  // Il capitano deve avere più di questa età: uno spogliatoio non affida la fascia a un
  // ragazzino, per quanto forte. In cambio, indossarla vale +1 OVR effettivo (captainBonus,
  // sim.js) sulla forza della squadra in campo.
  const CAPTAIN_MIN_AGE = 22;

  // Traguardi di carriera (diversi dai trofei di club, già nella Bacheca trofei): puramente
  // di prestigio personale, sbloccati una volta sola e per sempre (checkAchievements, sim.js),
  // mostrati come seconda scheda della stessa bacheca (showTrophyCase, ui.js).
  const ACHIEVEMENTS = [
    { key: 'first_promo', icon: '⬆️', title: 'Si comincia a salire', desc: 'Ottieni la tua prima promozione di categoria.' },
    { key: 'from_bottom', icon: '🌱', title: 'Dal fondo alla vetta', desc: 'Parti dalla Promozione e arriva in Serie A con lo stesso club.' },
    { key: 'serie_a', icon: '🇮🇹', title: 'Sei arrivato', desc: 'Porta il tuo club in Serie A.' },
    { key: 'scudetto', icon: '🥇', title: 'Scudetto', desc: 'Vinci il campionato di Serie A.' },
    { key: 'coppa_italia', icon: '🏆', title: 'Coppa nazionale', desc: 'Vinci la Coppa Italia.' },
    { key: 'coppa_europea', icon: '🌍', title: 'Notti europee', desc: 'Vinci una coppa europea.' },
    { key: 'treble', icon: '👑', title: 'Tripletta', desc: 'Vinci scudetto, Coppa Italia e Champions League nella stessa stagione.' },
    { key: 'no_releg_10', icon: '🧱', title: 'Un decennio di stabilità', desc: '10 stagioni di fila senza mai retrocedere.' },
    { key: 'legend_squad', icon: '⭐', title: 'Squadra di fenomeni', desc: 'Metti insieme 3 giocatori reali o leggende in rosa nella stessa stagione.' },
    { key: 'dynasty_complete', icon: '🏁', title: 'Fine di un\'era', desc: 'Porta a termine tutte le 20 stagioni della dynasty.' },
  ];

  // Difficoltà scelta all'avvio della carriera (vedi startDynasty in sim.js): ogni voce
  // ritocca budget di partenza, forza effettiva percepita in campo (teamEffDelta, positivo
  // aiuta noi/penalizza gli avversari, negativo il contrario), quanto pesano gli imprevisti
  // (infortuni/squalifiche più o meno frequenti, partite più o meno imprevedibili) e gli
  // stipendi richiesti dai giocatori. "Medio" è il bilanciamento di base del gioco.
  const DIFFICULTIES = [
    {
      key: 'facile', label: 'Facile', blurb: 'Più margine economico, avversari più abbordabili, meno imprevisti.',
      budgetMult: 1.35, teamEffDelta: 4, injuryMult: 0.7, varianceMult: 0.85, wageMult: 0.92,
      scoutCostMult: 0.85, sponsorMult: 1.15, mgrCostMult: 0.9, prospectMult: 1.2, promoStreakMalusMult: 0.6,
      patienceMult: 0.6, eventMult: 0.7,
    },
    {
      key: 'medio', label: 'Medio', blurb: 'Il bilanciamento classico del gioco, senza sconti né penalità.',
      budgetMult: 1.0, teamEffDelta: 0, injuryMult: 1.0, varianceMult: 1.0, wageMult: 1.0,
      scoutCostMult: 1.0, sponsorMult: 1.0, mgrCostMult: 1.0, prospectMult: 1.0, promoStreakMalusMult: 1.0,
      patienceMult: 1.0, eventMult: 1.0,
    },
    {
      key: 'difficile', label: 'Difficile', blurb: 'Budget più risicato, avversari più ostici, qualche imprevisto di troppo.',
      budgetMult: 0.75, teamEffDelta: -4, injuryMult: 1.35, varianceMult: 1.2, wageMult: 1.12,
      scoutCostMult: 1.2, sponsorMult: 0.88, mgrCostMult: 1.12, prospectMult: 0.85, promoStreakMalusMult: 1.3,
      patienceMult: 1.3, eventMult: 1.25,
    },
    {
      key: 'estremo', label: 'Estremo', blurb: 'Si parte con pochissimo, ogni partita è in salita e gli imprevisti sono la norma.',
      budgetMult: 0.55, teamEffDelta: -8, injuryMult: 1.7, varianceMult: 1.4, wageMult: 1.25,
      scoutCostMult: 1.45, sponsorMult: 0.75, mgrCostMult: 1.3, prospectMult: 0.65, promoStreakMalusMult: 1.7,
      patienceMult: 1.6, eventMult: 1.6,
    },
  ];

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
      key: 'gigante', strRange: [46, 54], budgetRange: [1.1e6, 1.6e6], stadiumTier: 1, stadiumChance: 0.7, fanbaseRange: [1.15, 1.35],
      variants: {
        low: { title: 'Gigante in declino', blurb: 'Una piazza che sogna ancora la Serie A: tanta tifoseria, casse quasi vuote.' },
        mid: { title: 'Nobile decaduta', blurb: 'Una big retrocessa che non si è ancora ripresa: tanta tifoseria, conti in affanno.' },
        high: { title: 'Big in crisi', blurb: 'Un nome che pesa in Europa ma le ultime stagioni sono state dure: tifoseria enorme, casse in rosso.' },
      },
    },
    {
      key: 'piccola', strRange: [42, 50], budgetRange: [2.0e6, 2.8e6], stadiumTier: 0, stadiumChance: 0, fanbaseRange: [0.85, 1.0],
      variants: {
        low: { title: 'Piccola realtà solida', blurb: 'Pochi tifosi ma conti sempre in ordine: un progetto costruito con pazienza.' },
        mid: { title: 'Matricola tranquilla', blurb: 'Pochi clamori ma bilanci sani: una salvezza onesta come obiettivo minimo.' },
        high: { title: 'Provinciale di lusso', blurb: 'Una piazza raccolta ma organizzata: bilanci in ordine anche nella categoria più cara d\'Europa.' },
      },
    },
    {
      key: 'matricola', strRange: [44, 52], budgetRange: [2.5e6, 3.3e6], stadiumTier: 0, stadiumChance: 0.2, fanbaseRange: [0.9, 1.05],
      variants: {
        low: { title: 'Matricola ambiziosa', blurb: 'Presidente facoltoso, fame di categoria superiore: il budget più alto sul tavolo.' },
        mid: { title: 'Progetto ambizioso', blurb: 'Un fondo con soldi veri punta dritto alla Serie A: il budget più alto sul tavolo.' },
        high: { title: 'Nuova proprietà facoltosa', blurb: 'Un fondo straniero ha appena rilevato il club con ambizioni europee: il budget più alto sul tavolo.' },
      },
    },
    {
      key: 'provincia', strRange: [43, 51], budgetRange: [1.6e6, 2.1e6], stadiumTier: 0, stadiumChance: 0, fanbaseRange: [0.95, 1.1],
      variants: {
        low: { title: 'Club di provincia stabile', blurb: 'Nessun lusso, ma né debiti né sorprese: si parte alla pari con tutti.' },
        mid: { title: 'Onesta realtà di categoria', blurb: 'Nessun lusso, ma né debiti né sorprese: una stagione tranquilla è già un successo.' },
        high: { title: 'Piazza storica in equilibrio', blurb: 'Nessun lusso, ma né debiti né sorprese: la permanenza tranquilla è l\'obiettivo.' },
      },
    },
  ];
