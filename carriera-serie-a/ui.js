'use strict';
/* ============================================================
   Presidente · Serie A — ui.js
   Tutto ciò che tocca il DOM: le schermate (setup, sala del consiglio,
   stagione, fine stagione, fine dinastia), overlay/toast, lo stemma
   procedurale, le sparkline e le celebrazioni. Si appoggia alle funzioni
   di motore definite in sim.js (spinPlayer, startSeason, simMatch, ...) e
   alle costanti di data.js. Caricato per ultimo: avvia il gioco con la
   chiamata a boot() in fondo al file.
   ============================================================ */

  let crestUid = 0;

  // Escaping per testo libero non fidato inserito via innerHTML (es. i messaggi di chat: dal
  // lato server ora arrivano puliti solo dai caratteri di controllo, non da <, >, & o virgolette
  // — l'escaping va fatto qui, in fase di rendering, non troncando il testo a monte.
  const escapeHtml = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // I tre "disegni" disponibili: contorno + un piccolo emblema a stella interno, entrambi
  // riempiti con lo stesso gradiente a 2 colori scelto dal presidente.
  function crestInner(shape, gradId) {
    if (shape === 'round') {
      return `<circle cx="60" cy="63" r="56" fill="url(#${gradId})" fill-opacity=".18" stroke="url(#${gradId})" stroke-width="3.5"/>
        <path d="M60 33 L67 53 L88 54 L71 67 L77 88 L60 76 L43 88 L49 67 L32 54 L53 53 Z" fill="url(#${gradId})"/>`;
    }
    if (shape === 'hex') {
      return `<path d="M60 4 L108 30 V90 L60 116 L12 90 V30 Z" fill="url(#${gradId})" fill-opacity=".18" stroke="url(#${gradId})" stroke-width="3.5"/>
        <path d="M60 32 L67 52 L88 53 L71 66 L77 87 L60 75 L43 87 L49 66 L32 53 L53 52 Z" fill="url(#${gradId})"/>`;
    }
    return `<path d="M60 4 L112 26 V64 C112 96 90 120 60 134 C30 120 8 96 8 64 V26 Z" fill="url(#${gradId})" fill-opacity=".18" stroke="url(#${gradId})" stroke-width="3.5"/>
      <path d="M60 40 L67 60 L88 61 L71 74 L77 95 L60 83 L43 95 L49 74 L32 61 L53 60 Z" fill="url(#${gradId})"/>`;
  }

  function crestMarkup(shape, colors, cls) {
    const id = 'cg' + (crestUid++);
    const c = colors && colors.length === 2 ? colors : CREST_DEFAULT.colors;
    return `<svg viewBox="0 0 120 138" xmlns="http://www.w3.org/2000/svg" class="${cls || ''}" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c[0]}" /><stop offset="1" stop-color="${c[1]}" />
      </linearGradient></defs>
      ${crestInner(shape || CREST_DEFAULT.shape, id)}
    </svg>`;
  }

  // Aggiorna lo stemma nella barra home con quello del club attivo (o quello di
  // default finché non esiste ancora una carriera).
  function syncHomeCrest() {
    const wrap = $('owHomeCrestWrap'); if (!wrap) return;
    const shape = (S && S.crestShape) || CREST_DEFAULT.shape;
    const colors = (S && S.crestColors) || CREST_DEFAULT.colors;
    wrap.innerHTML = crestMarkup(shape, colors, '');
  }

  // Colore del badge overall in base a quanto è alto: scarso (grigio) → discreto
  // (bianco) → buono (azzurro) → ottimo (verde) → fuoriclasse (oro), sulla scala
  // 40-99 usata dal gioco.
  function ovrTier(ovr) {
    if (ovr > 100) return { c: 'var(--purple)', bg: 'rgba(176,111,255,.16)' };
    if (ovr >= 85) return { c: 'var(--gold)', bg: 'rgba(255,210,74,.16)' };
    if (ovr >= 75) return { c: 'var(--good)', bg: 'rgba(40,217,160,.14)' };
    if (ovr >= 65) return { c: '#6fb3ff', bg: 'rgba(111,179,255,.14)' };
    if (ovr >= 55) return { c: 'var(--txt)', bg: 'rgba(255,255,255,.07)' };
    return { c: 'var(--muted)', bg: 'rgba(255,255,255,.04)' };
  }

  const ovrBadge = (ovr) => { const t = ovrTier(ovr); return `background:${t.bg};color:${t.c}`; };
  const specOf = (spec) => MANAGER_SPECS.find((s) => s.key === spec) || MANAGER_SPECS[0];
  const dsSpecOf = (spec) => DS_SPECS.find((s) => s.key === spec) || DS_SPECS[0];

  /* ---------------- tutorial ----------------
     Un carosello di schermate (icona + titolo + testo), richiamabile dalla home prima di
     comprare il club: copre l'intero giro di una carriera, dalla piramide delle categorie
     al multiplayer. Le "immagini" sono piccole illustrazioni SVG inline nello stile del
     gioco (nessun asset esterno da caricare), non screenshot — coerenti con la palette e
     rese leggere anche su mobile.
  */
  const TUTORIAL_STEPS = [
    {
      icon: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="50" fill="none" stroke="var(--gold)" stroke-width="4" opacity=".35"/><path d="M60 24 L69 50 L97 51 L74 67 L82 94 L60 78 L38 94 L46 67 L23 51 L51 50 Z" fill="var(--gold)"/></svg>`,
      title: 'Benvenuto, presidente',
      text: 'Sei il presidente di un club che parte dal basso della piramide italiana. Ogni scelta è tua: mercato, allenatore, sponsor, stadio, tattica. L\'obiettivo? Portarlo più in alto che puoi — o venderlo quando il prezzo è giusto.',
    },
    {
      icon: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="90" width="80" height="14" rx="3" fill="var(--muted)" opacity=".5"/><rect x="28" y="72" width="64" height="14" rx="3" fill="var(--dyn)" opacity=".6"/><rect x="36" y="54" width="48" height="14" rx="3" fill="var(--dyn)" opacity=".8"/><rect x="44" y="36" width="32" height="14" rx="3" fill="var(--gold)" opacity=".9"/><rect x="50" y="18" width="20" height="14" rx="3" fill="var(--gold)"/></svg>`,
      title: 'La piramide delle categorie',
      text: 'Sei categorie, dalla Promozione alla Serie A. All\'inizio scegli da dove partire, la difficoltà e una "situazione di partenza" (budget, tifoseria e stadio diversi): ognuna racconta una storia diversa dello stesso club.',
    },
    {
      icon: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect x="18" y="28" width="84" height="64" rx="12" fill="none" stroke="var(--gold)" stroke-width="4"/><circle cx="42" cy="60" r="14" fill="var(--dyn)"/><circle cx="60" cy="60" r="14" fill="var(--good)"/><circle cx="78" cy="60" r="14" fill="var(--coppa)"/><rect x="50" y="96" width="20" height="10" rx="3" fill="var(--muted)"/></svg>`,
      title: 'Costruisci la rosa',
      text: 'Il mercato funziona a "spin": uno base e uno di lusso, sempre più cari a ogni acquisto. Ogni tanto pescano un giocatore vero (o una leggenda ritirata, una volta in Serie A) invece che generato. Il settore giovanile e lo scouting migliorano le probabilità di trovare un talento.',
    },
    {
      icon: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M14 92 C14 50 40 24 60 24 C80 24 106 50 106 92" fill="none" stroke="var(--dyn)" stroke-width="6"/><rect x="24" y="80" width="72" height="14" rx="3" fill="var(--good)" opacity=".85"/><circle cx="60" cy="52" r="9" fill="var(--gold)"/></svg>`,
      title: 'Allenatore, sponsor, stadio',
      text: 'Ogni allenatore ha una specializzazione (chi fa crescere i giovani, chi tratta meglio i rinnovi, chi motiva lo spogliatoio...). Lo sponsor porta introiti fissi a stagione. Ampliare lo stadio alza la capienza e gli incassi — ma costa, e va ripagato con i risultati.',
    },
    {
      icon: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="16" width="92" height="88" rx="6" fill="none" stroke="var(--good)" stroke-width="3"/><line x1="14" y1="60" x2="106" y2="60" stroke="var(--good)" stroke-width="3"/><circle cx="60" cy="60" r="12" fill="none" stroke="var(--good)" stroke-width="3"/><circle cx="40" cy="34" r="6" fill="var(--gold)"/><circle cx="80" cy="34" r="6" fill="var(--gold)"/><circle cx="60" cy="24" r="6" fill="var(--gold)"/><circle cx="40" cy="86" r="6" fill="var(--coppa)"/><circle cx="80" cy="86" r="6" fill="var(--coppa)"/></svg>`,
      title: 'Formazione e partite',
      text: 'Scegli il modulo e, se vuoi, la probabile formazione titolare. Le partite si simulano da sole — ma con marcatori, assist, infortuni e cartellini veri, giocatore per giocatore: le statistiche di ognuno crescono stagione dopo stagione.',
    },
    {
      icon: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M40 24 H80 V44 C80 58 70 66 60 66 C50 66 40 58 40 44 Z" fill="var(--gold)"/><path d="M40 30 C26 30 26 50 42 50" fill="none" stroke="var(--gold)" stroke-width="5"/><path d="M80 30 C94 30 94 50 78 50" fill="none" stroke="var(--gold)" stroke-width="5"/><rect x="54" y="66" width="12" height="18" fill="var(--dyn)"/><rect x="42" y="84" width="36" height="10" rx="3" fill="var(--dyn-deep)"/></svg>`,
      title: 'Coppa Italia e coppe europee',
      text: 'La Coppa Italia si gioca ogni stagione, dalla Promozione in su. Arrivato in Serie A ti giochi anche Champions, Europa o Conference League in base al piazzamento: 5° e 6° posto in Europa League, 7° in Conference, le prime 4 (o la coppa vinta) in Champions.',
    },
    {
      icon: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><polyline points="18,86 42,62 60,74 100,30" fill="none" stroke="var(--good)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="100" cy="30" r="9" fill="var(--gold)"/><circle cx="60" cy="74" r="6" fill="var(--good)"/><circle cx="42" cy="62" r="6" fill="var(--good)"/></svg>`,
      title: 'Fine stagione',
      text: 'A fine campionato contano promozione/retrocessione, i playoff, e se hai centrato l\'obiettivo dichiarato a inizio stagione. Tutto questo muove l\'umore dei tifosi e il gradimento della proprietà — troppo basso, e rischi l\'esonero o guai economici.',
    },
    {
      icon: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="26" width="80" height="72" rx="8" fill="none" stroke="var(--dyn)" stroke-width="4"/><line x1="20" y1="46" x2="100" y2="46" stroke="var(--dyn)" stroke-width="4"/><line x1="38" y1="16" x2="38" y2="34" stroke="var(--gold)" stroke-width="5" stroke-linecap="round"/><line x1="82" y1="16" x2="82" y2="34" stroke="var(--gold)" stroke-width="5" stroke-linecap="round"/><circle cx="40" cy="64" r="5" fill="var(--muted)"/><circle cx="60" cy="64" r="5" fill="var(--good)"/><circle cx="80" cy="64" r="5" fill="var(--muted)"/><circle cx="40" cy="80" r="5" fill="var(--muted)"/><circle cx="60" cy="80" r="5" fill="var(--muted)"/><circle cx="80" cy="80" r="5" fill="var(--gold)"/></svg>`,
      title: 'Fra una stagione e l\'altra',
      text: 'I contratti in scadenza vanno rinnovati o si perdono a zero. C\'è un mercato di gennaio a metà stagione, e uno estivo più ricco fra un anno e l\'altro. Ogni tanto scatta un "imprevisto" — un evento narrativo con conseguenze reali, a volte con una scelta da fare.',
    },
    {
      icon: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="42" r="16" fill="var(--gold)"/><path d="M14 96 C14 74 26 64 40 64 C54 64 66 74 66 96 Z" fill="var(--gold)" opacity=".85"/><circle cx="82" cy="46" r="13" fill="var(--coppa)"/><path d="M60 98 C60 80 70 70 82 70 C94 70 104 80 104 98 Z" fill="var(--coppa)" opacity=".85"/></svg>`,
      title: 'Gioca con gli amici',
      text: 'Due modalità: hotseat locale (più carriere sullo stesso dispositivo, a turno) o stanze online — crei o entri con un codice, ognuno gestisce il proprio club, poi l\'host avvia la stagione condivisa e i risultati arrivano a tutti insieme.',
    },
    {
      icon: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><line x1="30" y1="14" x2="30" y2="104" stroke="var(--muted)" stroke-width="4"/><path d="M30 18 L90 18 L74 34 L90 50 L30 50 Z" fill="var(--gold)"/></svg>`,
      title: 'Pronti a cominciare',
      text: 'Il resto lo scopri giocando: ogni categoria, ogni situazione di partenza, ogni carriera racconta qualcosa di diverso. Buona fortuna, presidente.',
    },
  ];
  let tutorialStep = 0;

  function openTutorial() {
    tutorialStep = 0;
    renderTutorialStep();
  }

  function renderTutorialStep() {
    const n = TUTORIAL_STEPS.length;
    const s = TUTORIAL_STEPS[tutorialStep];
    const isFirst = tutorialStep === 0, isLast = tutorialStep === n - 1;
    overlay(`
      <div class="ow-tut-illust">${s.icon}</div>
      <h2>${s.title}</h2>
      <p>${s.text}</p>
      <div class="ow-tut-dots">${TUTORIAL_STEPS.map((_, i) => `<span class="${i === tutorialStep ? 'on' : ''}"></span>`).join('')}</div>
      <div class="ow-tut-nav">
        ${!isFirst ? '<button class="dyn-btn" id="tutPrev">← Indietro</button>' : ''}
        <button class="dyn-btn dyn-btn-primary" id="tutNext">${isLast ? '🎉 Inizia!' : 'Avanti →'}</button>
      </div>
      ${!isLast ? '<button type="button" class="ow-tut-skip" id="tutSkip">Salta il tutorial</button>' : ''}
    `);
    const prevBtn = $('tutPrev'); if (prevBtn) prevBtn.onclick = () => { tutorialStep--; renderTutorialStep(); };
    $('tutNext').onclick = () => { if (isLast) closeOverlay(); else { tutorialStep++; renderTutorialStep(); } };
    const skipBtn = $('tutSkip'); if (skipBtn) skipBtn.onclick = closeOverlay;
  }

  // Riprende una carriera salvata: per id specifico (scelto dall'elenco carriere) o,
  // omesso, l'ultimo slot attivo (comportamento storico di "Continua").
  function resumeDynasty(id) {
    const s = id ? loadSaveSlot(id) : loadSave();
    if (!s) return;
    S = s;
    if (id) localStorage.setItem('dsa_active_save', id);
    loadPoolsForSlot(S._saveId || id);
    normSquad();
    const sc = S._screen || 'owBoardScreen';
    if (sc === 'owSeasonEndScreen' && S._end) { renderSeasonEnd(); }
    else if (sc === 'owSeasonScreen' && S.seasonActive) {
      show('owSeasonScreen'); $('owLog').innerHTML = '';
      (S.results || []).forEach(logMatch); renderHud(); renderCups(); renderSeasonTarget();
      if (S.played === (gp() >> 1) && !S.winterDone) openWinter();
    }
    else { renderBoard(); }
  }

  // Pannello hotseat: più proprietari (=più slot) che si passano il dispositivo a turno.
  // Non tocca l'architettura del salvataggio, orchestra solo quale slot va ripreso quando:
  // il puntatore di turno avanza appena qualcuno TOCCA "inizia il turno", non quando esce
  // dalla carriera (vedi commento su HOTSEAT_KEY in sim.js) — così qualunque via d'uscita
  // dal gioco lascia comunque pronto il turno di chi segue.
  function renderHotseatPanel() {
    const wrap = $('hotseatWrap'); if (!wrap) return;
    const idx = readSavesIndex();
    let h = readHotseat();
    if (h) {
      // Pota gli slot che nel frattempo sono spariti (carriera venduta/eliminata): una
      // sessione con meno di 2 giocatori rimasti non è più una sessione hotseat.
      h.ids = h.ids.filter((id) => idx.some((m) => m.id === id));
      if (h.ids.length < 2) { clearHotseat(); h = null; }
      else { h.turn = ((h.turn % h.ids.length) + h.ids.length) % h.ids.length; writeHotseat(h); }
    }
    if (h) {
      const metaOf = (id) => idx.find((m) => m.id === id);
      const nextMeta = metaOf(h.ids[h.turn]);
      wrap.innerHTML = `
        <div class="ow-hotseat">
          <div class="dyn-aggr-label" style="text-align:center;margin:6px 0 8px">🎮 Sessione hotseat</div>
          <button type="button" class="dyn-btn dyn-btn-primary" id="hotseatNextBtn">📱 Passa il dispositivo — tocca per il turno di ${(nextMeta && nextMeta.owner) || 'Giocatore'} (${(nextMeta && nextMeta.club) || 'Club'})</button>
          <div class="ow-hotseat-order">${h.ids.map((id, i) => { const m = metaOf(id); return `<span class="${i === h.turn ? 'on' : ''}">${(m && m.club) || '?'}</span>`; }).join(' → ')}</div>
          <button type="button" class="dyn-mini ow-danger" id="hotseatEndBtn">Termina sessione hotseat</button>
        </div>`;
      $('hotseatNextBtn').onclick = () => {
        const cur = readHotseat(); if (!cur) return;
        const id = cur.ids[cur.turn];
        cur.turn = (cur.turn + 1) % cur.ids.length;
        writeHotseat(cur);
        resumeDynasty(id);
      };
      $('hotseatEndBtn').onclick = () => { clearHotseat(); renderHotseatPanel(); };
    } else {
      wrap.innerHTML = idx.length >= 2
        ? `<button type="button" class="dyn-mini" id="hotseatCreateBtn" style="margin:8px auto 0;display:block">🎮 Crea sessione hotseat</button>`
        : '';
      const btn = $('hotseatCreateBtn');
      if (btn) btn.onclick = openHotseatPicker;
    }
  }

  // Scelta di chi partecipa (fra le carriere già salvate) e in che ordine gioca: l'ordine
  // di spunta diventa l'ordine di turno.
  function openHotseatPicker() {
    const idx = readSavesIndex().slice().sort((a, b) => b.updated - a.updated);
    const picked = [];
    overlay(`<h2>🎮 Crea sessione hotseat</h2>
      <p class="ow-sub">Spunta le carriere che si alternano sullo stesso dispositivo, nell'ordine in cui le spunti.</p>
      <div class="dyn-modal-actions" style="gap:6px">
        ${idx.map((m) => `<label class="ow-fin-row" style="cursor:pointer"><input type="checkbox" data-pick="${m.id}" style="margin-right:8px" /><span>${m.club || 'Club'}<small style="display:block;color:var(--muted)">${m.owner || ''}</small></span></label>`).join('')}
      </div>
      <div class="dyn-modal-actions">
        <button class="dyn-btn dyn-btn-primary" id="ovHotseatStart">Inizia sessione</button>
        <button class="dyn-btn" id="ovHotseatCancel">Annulla</button>
      </div>`);
    $('owOverlayModal').querySelectorAll('[data-pick]').forEach((el) => el.addEventListener('change', () => {
      const id = el.dataset.pick;
      if (el.checked) picked.push(id); else { const i = picked.indexOf(id); if (i >= 0) picked.splice(i, 1); }
    }));
    $('ovHotseatStart').onclick = () => {
      if (picked.length < 2) { toast('Scegli almeno due carriere per la sessione hotseat.'); return; }
      writeHotseat({ ids: picked.slice(), turn: 0 });
      closeOverlay();
      renderHotseatPanel();
      toast('Sessione hotseat creata: ' + picked.length + ' giocatori.');
    };
    $('ovHotseatCancel').onclick = closeOverlay;
  }

  /* ---------------- multiplayer: stanze condivise ----------------
     Identità (nome/club) e stato per persona sincronizzati via room.php (stesso pattern
     minimale di leaderboard.php — un file JSON per stanza, niente account). La stanza vive per
     più stagioni di fila (nextRound), un round alla volta, in quattro fasi:

     1) Lobby: ognuno preme "Pronto" (solo un flag). Quando lo sono tutti l'host preme "Avvia
        sessione" (fase -> 'session'), oppure forza l'avvio anche se qualcuno manca.
     2) Sessione: ognuno gestisce la propria dirigenza per conto suo (con gli strumenti
        single-player normali, Sala del Consiglio — nessuna UI di creazione club separata, si
        riusa il sistema di salvataggio multi-slot esistente: readSavesIndex/loadSaveSlot), poi
        ripreme "Pronto" sottomettendo la carriera. Quando lo sono tutti l'host preme "Inizia
        simulazione" (o forza con chi è pronto).
     3) Simulazione: dalla seconda stagione in poi ciascun umano può essere in una categoria
        diversa dagli altri (promozioni/retrocessioni individuali) — l'host raggruppa i pronti
        per categoria (hostBeginMatchdaySim) e avanza TUTTI i gruppi di una giornata alla volta
        (stepHostMatchday, sim.js — Fase 2b) pubblicando ad ogni giornata la classifica di
        ciascun gruppo (pushMatchday): ognuno vede solo quella della propria categoria mentre
        aspetta. Quando tutte le categorie hanno finito, l'host preme "Vedi resoconto"
        (finishHostSeason + submitResult) e pubblica il risultato di tutti.
     4) Round chiuso: ciascuno scarica il proprio risultato quando vuole (resta agganciato alla
        stessa stanza/salvataggio, non se ne va); quando tutti hanno scaricato (o l'host forza)
        l'host apre la prossima stagione (nextRound), si torna al punto 2 con le carriere già
        avanzate di un anno. La dynasty dura come in singolo, fino a MAX_SEASONS (20): quando
        chi ha giocato l'ultimo round era già alla stagione 20, "Avvia la prossima stagione"
        sparisce e la stanza finisce lì (room.php: TTL lungo apposta, 180 giorni, per
        sopravvivere a settimane/mesi fra una stagione e l'altra). L'host può anche terminarla
        prima, in qualunque fase (terminate, con conferma, confirmTerminateDynasty): la stanza
        passa a 'terminated' per sempre e ciascuno vende il proprio club (mpSellAndEnd) per
        conto suo, esattamente come "Vendi il club" in singolo.
  */
  const MP_SESSION_KEY = 'dsa_mp_session';
  let mpPollTimer = null;
  // Fase vista nell'ultimo render, per suonare una notifica solo quando la stanza CAMBIA
  // fase (non ad ogni poll che ridisegna la stessa fase).
  let mpLastPhase = null;
  // Le simulazioni giornata-per-giornata in corso, SOLO nella scheda dell'host (setupHostSeason
  // + stepHostMatchday, sim.js): una per ogni categoria in cui gioca almeno un umano pronto
  // questo turno (dalla seconda stagione in poi, promozioni/retrocessioni individuali possono
  // separare i giocatori su categorie diverse). Non è persistita da nessuna parte, vive finché
  // questa pagina resta aperta.
  let mpHostRuns = null;

  function readMpSession() { try { return JSON.parse(localStorage.getItem(MP_SESSION_KEY)); } catch (e) { return null; } }
  function writeMpSession(s) { try { localStorage.setItem(MP_SESSION_KEY, JSON.stringify(s)); } catch (e) {} }
  function clearMpSession() { try { localStorage.removeItem(MP_SESSION_KEY); } catch (e) {} }
  function stopMpPolling() { if (mpPollTimer) { clearTimeout(mpPollTimer); mpPollTimer = null; } }

  async function mpApi(action, payload) {
    const res = await fetch('room.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ action }, payload)) });
    const data = await res.json().catch(() => null);
    if (!data || !data.ok) throw new Error((data && data.error) || 'Errore di rete.');
    return data;
  }

  async function mpFetchState(code) {
    const res = await fetch('room.php?action=state&code=' + encodeURIComponent(code));
    const data = await res.json().catch(() => null);
    if (!data || !data.ok) throw new Error((data && data.error) || 'Stanza non trovata.');
    return data.room;
  }

  function openMultiplayerHub() {
    const sess = readMpSession();
    if (sess && sess.code && sess.playerId) { resumeLobby(sess.code, sess.playerId); return; }
    overlay(`<h2>👥 Gioca con gli amici</h2>
      <p class="ow-sub">Una stanza condivisa in due passi: prima tutti premono Pronto e l'host avvia la sessione; poi ognuno gestisce il proprio club per conto suo (con gli strumenti soliti) e ripreme Pronto quando ha finito. Appena lo sono tutti, l'host avvia la simulazione e ciascuno scarica il proprio risultato quando vuole.</p>
      <div class="dyn-modal-actions">
        <button class="dyn-btn dyn-btn-primary" id="mpCreateBtn">🆕 Crea una stanza</button>
        <button class="dyn-btn" id="mpJoinBtn">🔑 Entra con un codice</button>
        <button class="dyn-btn" id="ovClose">Chiudi</button>
      </div>`);
    $('mpCreateBtn').onclick = openMpCreateForm;
    $('mpJoinBtn').onclick = openMpJoinForm;
    $('ovClose').onclick = closeOverlay;
  }

  // Crea SUBITO una carriera vera per la stanza (categoria/difficoltà della stanza, una
  // situazione di partenza a caso, come le altre create in singolo): nessuna carriera da
  // scegliere/gestire a parte, entrare nella stanza significa avere già un club pronto da
  // rifinire (comprare giocatori, allenatore, sponsor) prima di premere Pronto.
  function createRoomCareer(name, club, div, difficulty) {
    const t = pick(genTakeovers(div));
    startDynasty(name, t, club, div, difficulty);
    saveGame();
    return S._saveId;
  }

  function openMpCreateForm() {
    overlay(`<h2>🆕 Crea una stanza</h2>
      <label class="dyn-field"><span>Nome della stanza (facoltativo)</span><input id="mpRoomName" type="text" maxlength="30" placeholder="Es. Lega degli amici" autocomplete="off" /></label>
      <label class="dyn-field"><span>Il tuo nome</span><input id="mpName" type="text" maxlength="18" placeholder="Il tuo nome" autocomplete="off" /></label>
      <label class="dyn-field"><span>Nome del tuo club</span><input id="mpClub" type="text" maxlength="24" placeholder="Nome del club" autocomplete="off" /></label>
      <label class="dyn-field"><span>Categoria di partenza (condivisa da tutti)</span>
        <select id="mpDiv">${DIVS.map((d, i) => `<option value="${i}">${d.name}</option>`).join('')}</select>
      </label>
      <label class="dyn-field"><span>Difficoltà (condivisa da tutti)</span>
        <select id="mpDiff">${DIFFICULTIES.map((d) => `<option value="${d.key}" ${d.key === 'medio' ? 'selected' : ''}>${d.label}</option>`).join('')}</select>
      </label>
      <p class="ow-sub">Appena crei la stanza ti assegniamo subito un club nuovo in questa categoria: potrai rifinirlo (giocatori, allenatore, sponsor) prima di premere Pronto.</p>
      <div class="dyn-modal-actions">
        <button class="dyn-btn dyn-btn-primary" id="mpCreateGo">Crea stanza</button>
        <button class="dyn-btn" id="mpBack">Indietro</button>
      </div>`);
    $('mpCreateGo').onclick = async () => {
      const name = ($('mpName').value || '').trim(), club = ($('mpClub').value || '').trim();
      if (!name || !club) { toast('Inserisci nome e club.'); return; }
      const div = +$('mpDiv').value, difficulty = $('mpDiff').value;
      const roomName = ($('mpRoomName').value || '').trim();
      try {
        const data = await mpApi('create', { name, club, div, difficulty, roomName });
        const saveId = createRoomCareer(name, club, div, difficulty);
        writeMpSession({ code: data.room.code, playerId: data.playerId, saveId });
        mpLastPhase = null;
        renderLobby(data.room, data.playerId);
      } catch (e) { toast(e.message || 'Impossibile creare la stanza.', 'error'); }
    };
    $('mpBack').onclick = openMultiplayerHub;
  }

  function openMpJoinForm() {
    overlay(`<h2>🔑 Entra in una stanza</h2>
      <label class="dyn-field"><span>Codice stanza</span><input id="mpCode" type="text" maxlength="4" placeholder="ABCD" style="text-transform:uppercase" autocomplete="off" /></label>
      <label class="dyn-field"><span>Il tuo nome</span><input id="mpName" type="text" maxlength="18" placeholder="Il tuo nome" autocomplete="off" /></label>
      <label class="dyn-field"><span>Nome del tuo club</span><input id="mpClub" type="text" maxlength="24" placeholder="Nome del club" autocomplete="off" /></label>
      <label class="dyn-field"><span>Categoria di partenza</span>
        <select id="mpJoinDiv"><option value="">Stessa della stanza</option>${DIVS.map((d, i) => `<option value="${i}">${d.name}</option>`).join('')}</select>
      </label>
      <p class="ow-sub">Appena entri ti assegniamo subito un club nuovo: potrai rifinirlo prima di premere Pronto. Se la dynasty è già avanti e gli altri sono ormai in categorie diverse, scegli pure la tua invece di ereditare quella con cui la stanza è nata.</p>
      <div class="dyn-modal-actions">
        <button class="dyn-btn dyn-btn-primary" id="mpJoinGo">Entra</button>
        <button class="dyn-btn" id="mpBack">Indietro</button>
      </div>`);
    $('mpJoinGo').onclick = async () => {
      const code = ($('mpCode').value || '').trim().toUpperCase();
      const name = ($('mpName').value || '').trim(), club = ($('mpClub').value || '').trim();
      const divVal = $('mpJoinDiv').value;
      if (!code || !name || !club) { toast('Compila tutti i campi.', 'error'); return; }
      try {
        const payload = { code, name, club };
        if (divVal !== '') payload.div = +divVal;
        const data = await mpApi('join', payload);
        const me = data.room.players.find((p) => p.id === data.playerId);
        const div = (me && me.joinDiv != null) ? me.joinDiv : data.room.div;
        const saveId = createRoomCareer(name, club, div, data.room.difficulty);
        writeMpSession({ code, playerId: data.playerId, saveId });
        mpLastPhase = null;
        renderLobby(data.room, data.playerId);
      } catch (e) { toast(e.message || 'Impossibile entrare nella stanza.', 'error'); }
    };
    $('mpBack').onclick = openMultiplayerHub;
  }

  async function resumeLobby(code, playerId) {
    try {
      const room = await mpFetchState(code);
      if (!room.players.some((p) => p.id === playerId)) { clearMpSession(); openMultiplayerHub(); return; }
      renderLobby(room, playerId);
    } catch (e) { clearMpSession(); openMultiplayerHub(); }
  }

  function renderLobby(room, playerId) {
    stopMpPolling();
    const me = room.players.find((p) => p.id === playerId);
    const isHost = room.hostId === playerId;
    const done = room.phase === 'done';
    const inLobbyStage = room.phase === 'lobby' || room.phase === 'allReadyLobby';
    const inSessionStage = room.phase === 'session' || room.phase === 'readyForSim';
    const inSimStage = room.phase === 'simulating';
    const allLobbyReady = room.phase === 'allReadyLobby';
    const allSessionReady = room.phase === 'readyForSim';
    const readyCount = room.players.filter((p) => p.ready).length;
    const total = room.players.length;
    const ackedCount = room.players.filter((p) => p.acked).length;
    const allAcked = total > 0 && ackedCount === total;
    const live = room.live || null;
    // "Vedi resoconto" richiede che TUTTE le categorie coinvolte abbiano finito le proprie
    // giornate: live.matchday/live.total sono già il massimo fra tutte (vedi pushMatchdaySnapshot).
    const simDone = !!(live && live.matchday >= live.total);
    // Dalla seconda stagione in poi ciascun umano può essere in una categoria diversa dagli
    // altri (promozioni/retrocessioni individuali): ognuno vede SOLO il gruppo/categoria a cui
    // appartiene lui, non un'unica classifica condivisa. L'appartenenza si legge dalla propria
    // ultima carriera sottomessa (me.state.div), ancora presente durante tutta la simulazione.
    const myDiv = me && me.state ? me.state.div : null;
    const myGroup = live && live.groups ? live.groups.find((g) => g.div === myDiv) : null;
    const myGroupDone = !!(myGroup && myGroup.matchday >= myGroup.total);
    // La dynasty dura come in singolo, fino a MAX_SEASONS: quando chi ha giocato questo round
    // era già all'ultima stagione, non ha senso offrire "Avvia la prossima stagione" — la
    // stanza si chiude qui, ognuno scarica il proprio resoconto finale.
    const participants = room.players.filter((p) => p.state);
    const dynastyOver = done && participants.length > 0 && participants.every((p) => p.state.season >= MAX_SEASONS);
    // L'host può terminare la dynasty in anticipo (prima delle 20 stagioni): fase finale, da
    // cui non si torna indietro — ognuno vende il proprio club per conto suo.
    const terminated = room.phase === 'terminated';

    let stageLabel = '';
    if (terminated) stageLabel = '🛑 L\'host ha concluso la dynasty di questa stanza in anticipo: vendi il tuo club quando vuoi per chiudere la tua carriera.';
    else if (inLobbyStage) stageLabel = '⏳ In attesa che tutti siano pronti, poi l\'host avvia la sessione.';
    else if (inSessionStage) stageLabel = '🏟️ Sessione avviata: gestisci il tuo club, poi ripremi Pronto quando hai finito.';
    else if (inSimStage) {
      if (!myGroup) stageLabel = '⚽ Simulazione in corso — non fai parte di questo turno.';
      else stageLabel = myGroupDone ? '🏁 La tua stagione è simulata: in attesa che l\'host pubblichi il resoconto di tutti.' : ('⚽ Simulazione in corso — ' + (myGroup.divName || '') + ', giornata ' + myGroup.matchday + '/' + myGroup.total + '.');
    } else if (dynastyOver) stageLabel = '🏆 Dynasty conclusa dopo ' + MAX_SEASONS + ' stagioni! Scarica il tuo resoconto finale quando vuoi.';
    else if (done) stageLabel = '🏁 Stagione pronta! Scarica il tuo risultato quando vuoi.';

    // Un suono (e, se concesso, una notifica di sistema se la scheda è in background) solo
    // quando la fase è appena cambiata rispetto all'ultimo render — non ad ogni poll che
    // ridisegna la stessa fase — così anche chi non ha appena cliccato un bottone si accorge
    // che la stanza è passata avanti anche senza tenere la pagina in primo piano.
    if (mpLastPhase !== null && mpLastPhase !== room.phase) {
      if (DynSound) {
        if (room.phase === 'session' || room.phase === 'simulating' || room.phase === 'done') DynSound.chime();
        else if (room.phase === 'allReadyLobby' || room.phase === 'readyForSim') DynSound.notify();
        else if (room.phase === 'terminated') DynSound.sadDown();
      }
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
        try { new Notification('👥 Stanza ' + room.code, { body: stageLabel || 'Qualcosa è cambiato nella stanza.' }); } catch (e) {}
      }
    }
    mpLastPhase = room.phase;

    // Durante la simulazione niente più elenco "chi è pronto": al suo posto la classifica
    // della TUA categoria, che si aggiorna ad ogni giornata che l'host manda avanti — con
    // l'ultimo risultato che hai giocato in evidenza (buildMatchdayNews), sfide fra presidenti
    // segnalate a parte invece di passare come una partita come le altre.
    const playersListHTML = `<div class="dyn-modal-actions" style="gap:6px">
        ${room.players.map((p) => `<div class="ow-fin-row"><span>${p.club}${p.id === room.hostId ? ' 👑' : ''}<small style="display:block;color:var(--muted)">${p.name}</small></span><b class="${p.ready ? 'good' : ''}">${p.ready ? '✅ Pronto' : '⏳ In attesa'}</b>${isHost && p.id !== playerId ? `<button class="ow-x" data-kick="${p.id}" title="Espelli dalla stanza">✖</button>` : ''}</div>`).join('')}
      </div>`;
    const myNews = myGroup && myGroup.news ? myGroup.news.find((n) => me && n.club === me.club) : null;
    const newsHTML = myNews ? `<div class="ow-fin-row" style="margin-bottom:6px"><span>${myNews.vsHuman ? '🤝 Sfida fra presidenti vs ' + myNews.vsHumanClub : (myNews.home ? 'In casa vs ' : 'In trasferta vs ') + myNews.opp}</span><b class="${myNews.res === 'W' ? 'good' : myNews.res === 'L' ? 'bad' : ''}">${myNews.gf}-${myNews.ga}</b></div>` : '';
    // Classifica intera della TUA categoria (tutte le squadre, non solo gli umani della
    // stanza): stesse zone colorate (promozione/playoff/retrocessione/coppe) della classifica
    // del singolo giocatore, con le righe umane in evidenza (classe "me") invece di una sola.
    const d = DIVS[myDiv] || {};
    const liveTableHTML = `${newsHTML}<div style="max-height:44vh;overflow:auto;margin:0 -6px">
      ${myGroup ? `<table class="dyn-table"><thead><tr><th>Squadra</th><th>Mister</th><th class="num">Pt</th><th class="num">DR</th></tr></thead><tbody>${myGroup.table.map((r, i) => {
        const zone = (d.euroSpots && i < d.euroSpots) ? 'ucl' : (d.uelPos && i === d.uelPos - 1) ? 'uel' : (d.confPos && i === d.confPos - 1) ? 'conf' : (d.promoted && i < d.promoted) ? 'ucl' : (d.playoff && i >= d.promoted && i < d.promoted + d.playoff) ? 'po' : (d.releg && i >= d.teams - d.releg) ? 'rel' : '';
        return `<tr class="${r.isHuman ? 'me' : ''} ${zone}"><td>${i + 1}. ${r.club}</td><td style="font-size:11px;color:var(--muted)">${r.mgr || '-'}</td><td class="num">${r.pts}</td><td class="num">${r.gd > 0 ? '+' : ''}${r.gd}</td></tr>`;
      }).join('')}</tbody></table>` : '<div class="ow-sub">In attesa che l\'host avvii la simulazione…</div>'}
      </div>`;
    // Chat semplicissima della stanza: ultimi messaggi (room.chat, room.php li tiene già
    // limitati agli ultimi 60) più un campo per scriverne uno nuovo — visibile in ogni fase,
    // per coordinarsi senza dover uscire dall'app.
    const chat = room.chat || [];
    const chatHTML = `
      <div class="ow-sec-title" style="margin-top:10px">💬 Chat della stanza</div>
      <div id="mpChatLog" style="max-height:100px;overflow:auto;font-size:12px;background:rgba(127,127,127,.08);border-radius:8px;padding:6px 8px;margin-bottom:6px">
        ${chat.length ? chat.map((m) => `<div style="margin-bottom:2px"><b>${escapeHtml(m.club || m.name)}:</b> ${escapeHtml(m.text)}</div>`).join('') : '<div class="ow-sub" style="margin:0">Nessun messaggio ancora.</div>'}
      </div>
      <div style="display:flex;gap:6px;margin-bottom:6px">
        <input id="mpChatInput" type="text" maxlength="200" placeholder="Scrivi un messaggio…" autocomplete="off" style="flex:1;min-width:0" />
        <button class="dyn-btn dyn-btn-primary" id="mpChatSend">Invia</button>
      </div>`;
    const canNotify = typeof Notification !== 'undefined';

    overlay(`
      <h2>👥 ${room.name ? room.name : ('Stanza ' + room.code)}${isHost ? ` <button class="ow-x" id="mpRenameBtn" title="Rinomina stanza" style="font-size:13px;vertical-align:middle">✏️</button>` : ''}</h2>
      <p class="ow-sub">${(DIVS[room.div] || {}).name || ''} · condividi il codice <b>${room.code}</b> con chi manca.</p>
      <p class="ow-sub" style="text-align:center">${stageLabel}</p>
      ${inSimStage ? liveTableHTML : playersListHTML}
      ${chatHTML}
      <div class="dyn-modal-actions">
        ${terminated ? `
          <button class="dyn-btn dyn-btn-primary" id="mpSellEndBtn">💷 Vendi il club e concludi la carriera</button>
        ` : done ? `
          <div class="ow-sub" style="text-align:center">${ackedCount}/${total} hanno scaricato il resoconto</div>
          <button class="dyn-btn dyn-btn-primary" id="mpDownloadBtn">📥 Scarica il tuo risultato</button>
          ${dynastyOver ? `<div class="ow-sub" style="text-align:center">🏆 Nessuna stagione successiva: la dynasty di questa stanza finisce qui.</div>` : `
            ${isHost ? `<button class="dyn-btn dyn-btn-primary" id="mpNextRoundBtn" ${allAcked ? '' : 'disabled'}>▶️ Avvia la prossima stagione${allAcked ? '' : ' (' + ackedCount + '/' + total + ')'}</button>` : ''}
            ${isHost && !allAcked ? `<button class="dyn-btn" id="mpForceNextRoundBtn">⏭️ Forza senza aspettare tutti</button>` : ''}
          `}
        ` : inSimStage ? `
          ${isHost ? (!mpHostRuns
            ? `<button class="dyn-btn dyn-btn-primary" id="mpResumeSimBtn">🔄 Riprendi la simulazione da qui</button>`
            : simDone
              ? `<button class="dyn-btn dyn-btn-primary" id="mpFinishBtn">🏁 Vedi resoconto</button>`
              : `<button class="dyn-btn dyn-btn-primary" id="mpNextDayBtn">▶️ Prossima giornata${live ? ' (' + live.matchday + '/' + live.total + ')' : ''}</button>`)
            : `<div class="ow-sub">⏳ L'host sta simulando le giornate, aggiornamento automatico.</div>`}
        ` : `
          ${inSessionStage && !(me && me.ready) ? `<button class="dyn-btn dyn-btn-primary" id="mpManageBtn">🏟️ Gestisci la tua squadra</button>` : ''}
          <button class="dyn-btn ${inSessionStage && !(me && me.ready) ? '' : (me && me.ready ? '' : 'dyn-btn-primary')}" id="mpReadyBtn">${me && me.ready ? 'Non sono più pronto' : '✅ Sono pronto'}</button>
          ${isHost && inLobbyStage ? `<button class="dyn-btn dyn-btn-primary" id="mpStartSessionBtn" ${allLobbyReady ? '' : 'disabled'}>▶️ Avvia sessione${allLobbyReady ? '' : ' (' + readyCount + '/' + total + ' pronti)'}</button>` : ''}
          ${isHost && inLobbyStage && !allLobbyReady && total > 1 ? `<button class="dyn-btn" id="mpForceSessionBtn">⏭️ Forza avvio senza aspettare tutti</button>` : ''}
          ${isHost && inSessionStage ? `<button class="dyn-btn dyn-btn-primary" id="mpStartSimBtn" ${allSessionReady ? '' : 'disabled'}>▶️ Inizia simulazione${allSessionReady ? '' : ' (' + readyCount + '/' + total + ' pronti)'}</button>` : ''}
          ${isHost && inSessionStage && !allSessionReady && readyCount > 0 ? `<button class="dyn-btn" id="mpForceSimBtn">⏭️ Forza simulazione senza aspettare tutti</button>` : ''}
        `}
        <button class="dyn-btn" id="mpHofBtn">🏆 Albo d'oro della stanza</button>
        ${canNotify && Notification.permission === 'default' ? `<button class="dyn-btn" id="mpNotifyBtn">🔔 Avvisami se cambia qualcosa</button>` : ''}
        ${isHost && !terminated ? `<button class="dyn-btn ow-danger" id="mpTerminateBtn">🛑 Termina la dynasty per tutti</button>` : ''}
        <button class="dyn-btn ow-danger" id="mpLeaveBtn">Esci dalla stanza</button>
      </div>`);
    const chatLogEl = $('mpChatLog'); if (chatLogEl) chatLogEl.scrollTop = chatLogEl.scrollHeight;
    const renameBtn = $('mpRenameBtn');
    if (renameBtn) renameBtn.onclick = () => confirmRenameRoom(room, playerId);
    document.querySelectorAll('#owOverlayModal [data-kick]').forEach((el) => el.addEventListener('click', () => confirmKickPlayer(room, playerId, el.dataset.kick)));
    const chatSendBtn = $('mpChatSend');
    const chatInput = $('mpChatInput');
    if (chatSendBtn) chatSendBtn.onclick = async () => {
      const text = (chatInput.value || '').trim();
      if (!text) return;
      chatInput.value = '';
      try { const data = await mpApi('chat', { code: room.code, playerId, text }); renderLobby(data.room, playerId); }
      catch (e) { toast(e.message || 'Messaggio non inviato.', 'error'); }
    };
    if (chatInput) chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); chatSendBtn.click(); } });
    const hofBtn = $('mpHofBtn');
    if (hofBtn) hofBtn.onclick = () => showHallOfFame(room, playerId);
    const notifyBtn = $('mpNotifyBtn');
    if (notifyBtn) notifyBtn.onclick = async () => { try { await Notification.requestPermission(); } catch (e) {} renderLobby(room, playerId); };
    const resumeSimBtn = $('mpResumeSimBtn');
    if (resumeSimBtn) resumeSimBtn.onclick = () => resumeMatchdaySimFromLive(room, playerId);
    const manageBtn = $('mpManageBtn');
    if (manageBtn) manageBtn.onclick = () => {
      const sess = readMpSession();
      if (!sess || !sess.saveId) { toast('Nessuna carriera associata a questa stanza.'); return; }
      stopMpPolling();
      closeOverlay();
      resumeDynasty(sess.saveId);
    };
    const readyBtn = $('mpReadyBtn');
    if (readyBtn) readyBtn.onclick = async () => {
      if (me && me.ready) {
        try { const data = await mpApi('ready', { code: room.code, playerId, ready: false }); if (DynSound) DynSound.tap(); renderLobby(data.room, playerId); }
        catch (e) { toast(e.message || 'Errore di rete.', 'error'); }
        return;
      }
      if (inLobbyStage) {
        try { const data = await mpApi('ready', { code: room.code, playerId, ready: true }); if (DynSound) DynSound.tap(); renderLobby(data.room, playerId); }
        catch (e) { toast(e.message || 'Errore di rete.', 'error'); }
        return;
      }
      const sess = readMpSession();
      const state = sess && sess.saveId ? loadSaveSlot(sess.saveId) : null;
      if (!state) { toast('Nessuna carriera associata a questa stanza: esci e rientra per ricrearne una.', 'error'); return; }
      if (state.seasonActive) { toast('La tua carriera per questa stanza ha già iniziato la stagione: torna in Dirigenza, non premere ancora "Inizia Stagione".', 'error'); return; }
      // Stesso controllo di startSeason() (sim.js): budget/rosa insufficienti altrimenti
      // farebbero fallire in silenzio la tua simulazione nel browser dell'host.
      if (state.squad.length < MIN_SQUAD) { toast('Ti servono almeno ' + MIN_SQUAD + ' giocatori per iniziare la prossima stagione. Ingaggia svincolati gratis se sei a corto.', 'error'); return; }
      const billCheck = kickoffBill(state);
      if (state.budget < billCheck) { toast('Ti mancano ' + fmtMoney(billCheck - state.budget) + ' per il monte ingaggi della prossima stagione: vendi giocatori o trova soldi prima di essere pronto.', 'error'); return; }
      try {
        const data = await mpApi('ready', { code: room.code, playerId, ready: true, state });
        if (DynSound) DynSound.tap();
        renderLobby(data.room, playerId);
      } catch (e) { toast(e.message || 'Impossibile sottomettere la carriera.', 'error'); }
    };
    const startSessionBtn = $('mpStartSessionBtn');
    if (startSessionBtn) startSessionBtn.onclick = async () => {
      try { const data = await mpApi('startSession', { code: room.code, playerId }); renderLobby(data.room, playerId); }
      catch (e) { toast(e.message || 'Impossibile avviare la sessione.', 'error'); }
    };
    const forceSessionBtn = $('mpForceSessionBtn');
    if (forceSessionBtn) forceSessionBtn.onclick = async () => {
      try { const data = await mpApi('startSession', { code: room.code, playerId, force: true }); renderLobby(data.room, playerId); }
      catch (e) { toast(e.message || 'Impossibile avviare la sessione.', 'error'); }
    };
    const startSimBtn = $('mpStartSimBtn');
    if (startSimBtn) startSimBtn.onclick = () => hostBeginMatchdaySim(room, playerId, false);
    const forceSimBtn = $('mpForceSimBtn');
    if (forceSimBtn) forceSimBtn.onclick = () => hostBeginMatchdaySim(room, playerId, true);
    const nextDayBtn = $('mpNextDayBtn');
    if (nextDayBtn) nextDayBtn.onclick = async () => {
      if (!mpHostRuns) { toast('Simulazione non trovata in questa scheda: riaprila dalla scheda con cui l\'hai avviata.', 'error'); return; }
      nextDayBtn.disabled = true;
      try {
        // Ogni categoria avanza di una giornata per conto suo: chi ha meno giornate totali
        // (categorie con meno squadre) semplicemente smette di avanzare prima delle altre.
        mpHostRuns.forEach((run) => { if (run.matchday < run.total) stepHostMatchday(run); });
        // Un suono diverso quando questa giornata ha visto almeno una sfida diretta fra due
        // presidenti (vsHuman, sim.js: stepHostMatchday) — il momento più bello del
        // multiplayer, non deve passare come una giornata come le altre.
        const anyHumanClash = mpHostRuns.some((run) => run.ctxs.some((c) => { const r = c.results[c.results.length - 1]; return r && r.vsHuman; }));
        if (DynSound) { if (anyHumanClash) DynSound.chime(); else DynSound.tap(); }
        await pushMatchdaySnapshot(room, playerId, mpHostRuns, true);
      } catch (e) { toast(e.message || 'Errore di rete.', 'error'); nextDayBtn.disabled = false; }
    };
    const finishBtn = $('mpFinishBtn');
    if (finishBtn) finishBtn.onclick = async () => {
      if (!mpHostRuns) { toast('Simulazione non trovata in questa scheda: riaprila dalla scheda con cui l\'hai avviata.', 'error'); return; }
      finishBtn.disabled = true;
      try {
        mpHostRuns.forEach((run) => finishHostSeason(run));
        // Coppa Italia e coppe europee non sono un bracket condiviso (ogni umano ha il suo,
        // vedi resolveMultiplayerTrophies): senza questo passaggio due presidenti di gruppi
        // diversi della stessa stanza potrebbero risultare entrambi vincitori dello stesso
        // trofeo nella stessa stagione. Va fatto QUI, con tutti i gruppi della stanza insieme
        // e PRIMA di chiudere la stagione di ciascuno (endSeason), l'unico momento in cui i
        // flag `cups.*.won` diventano trofei/soldi permanenti in carriera.
        const allHumanCtxs = mpHostRuns.reduce((a, run) => a.concat(run.ctxs), []);
        resolveMultiplayerTrophies(allHumanCtxs);
        allHumanCtxs.forEach((ctx) => { if (ctx.seasonActive && ctx.played >= gp(ctx)) endSeason(ctx); });
        const results = {};
        mpHostRuns.forEach((run) => {
          run.playerIds.forEach((pid, i) => { results[pid] = run.ctxs[i]; });
        });
        const data = await mpApi('submitResult', { code: room.code, playerId, results, force: true });
        mpHostRuns = null;
        if (DynSound) DynSound.whistle();
        renderLobby(data.room, playerId);
      } catch (e) { toast(e.message || 'Impossibile pubblicare il resoconto.', 'error'); finishBtn.disabled = false; }
    };
    const downloadBtn = $('mpDownloadBtn');
    if (downloadBtn) downloadBtn.onclick = () => downloadMyResult(room, playerId);
    const nextRoundBtn = $('mpNextRoundBtn');
    if (nextRoundBtn) nextRoundBtn.onclick = async () => {
      try { const data = await mpApi('nextRound', { code: room.code, playerId }); renderLobby(data.room, playerId); }
      catch (e) { toast(e.message || 'Impossibile avviare la prossima stagione.', 'error'); }
    };
    const forceNextRoundBtn = $('mpForceNextRoundBtn');
    if (forceNextRoundBtn) forceNextRoundBtn.onclick = async () => {
      try { const data = await mpApi('nextRound', { code: room.code, playerId, force: true }); renderLobby(data.room, playerId); }
      catch (e) { toast(e.message || 'Impossibile avviare la prossima stagione.', 'error'); }
    };
    const terminateBtn = $('mpTerminateBtn');
    if (terminateBtn) terminateBtn.onclick = () => confirmTerminateDynasty(room, playerId);
    const sellEndBtn = $('mpSellEndBtn');
    if (sellEndBtn) sellEndBtn.onclick = () => mpSellAndEnd(room, playerId);
    $('mpLeaveBtn').onclick = async () => {
      stopMpPolling();
      try { await mpApi('leave', { code: room.code, playerId }); } catch (e) {}
      clearMpSession();
      mpLastPhase = null;
      mpHostRuns = null;
      closeOverlay();
    };
    // La stanza continua a cambiare anche a stagione pubblicata (l'host può aprire la
    // prossima appena tutti hanno scaricato): niente più stop del poll su "done". Il ritmo si
    // allunga da solo (fino a un tetto di 15s) finché non cambia nulla — confrontando
    // `updatedAt`, che ogni azione che tocca la stanza aggiorna — e torna subito a 3s appena
    // succede qualcosa: niente più un poll fisso a raffica per ore su una lobby ferma.
    const schedulePoll = (lastUpdatedAt, delay) => {
      mpPollTimer = setTimeout(async () => {
        try {
          const fresh = await mpFetchState(room.code);
          if (!fresh.players.some((p) => p.id === playerId)) { stopMpPolling(); clearMpSession(); toast('Sei stato rimosso dalla stanza.'); closeOverlay(); return; }
          if (fresh.updatedAt !== lastUpdatedAt) { renderLobby(fresh, playerId); return; }
          schedulePoll(lastUpdatedAt, Math.min(Math.round(delay * 1.6), 15000));
        } catch (e) { schedulePoll(lastUpdatedAt, delay); }   // rete assente per un giro: si riprova senza rallentare
      }, delay);
    };
    schedulePoll(room.updatedAt, 3000);
  }

  // Conferma per l'host: chiude la dynasty di questa stanza per sempre, prima delle 20
  // stagioni (MAX_SEASONS) — stesso stile di conferma di confirmSell/confirmResign, ma qui
  // vale per tutta la stanza, non solo per chi la preme.
  function confirmTerminateDynasty(room, playerId) {
    overlay(`
      <h2>🛑 Termina la dynasty per tutti</h2>
      <p>Chiude la stanza <b>${room.code}</b> per sempre, prima delle ${MAX_SEASONS} stagioni: ogni giocatore dovrà vendere il proprio club per chiudere la carriera. Non si può annullare.</p>
      <div class="dyn-modal-actions">
        <button class="dyn-btn ow-danger" id="ovTerminateGo">Termina per tutti</button>
        <button class="dyn-btn" id="ovTerminateNo">Annulla</button>
      </div>`);
    $('ovTerminateGo').onclick = async () => {
      try {
        const data = await mpApi('terminate', { code: room.code, playerId });
        mpHostRuns = null;
        renderLobby(data.room, playerId);
      } catch (e) { toast(e.message || 'Impossibile terminare la dynasty.', 'error'); renderLobby(room, playerId); }
    };
    $('ovTerminateNo').onclick = () => renderLobby(room, playerId);
  }

  // Quando l'host ha terminato la dynasty in anticipo: ognuno vende il PROPRIO club (dalla
  // propria carriera salvata, l'ultima gestita in locale) per chiudere la carriera — stesso
  // esito/schermata finale (renderEnd, sim.js: endDynasty) di "Vendi il club" in singolo,
  // semplice riusata qui invece di duplicarla.
  function mpSellAndEnd(room, playerId) {
    const sess = readMpSession();
    const state = sess && sess.saveId ? loadSaveSlot(sess.saveId) : null;
    if (!state) { toast('Nessuna carriera associata a questa stanza.', 'error'); return; }
    S = state;
    normSquad();
    const worth = computeWorth();
    overlay(`
      <h2>💷 Vendi il club</h2>
      <p>L'host ha concluso la dynasty di questa stanza. Una cordata offre <b>${fmtMoney(worth)}</b> per ${S.club}: vendere chiude qui la tua carriera, con lo storico di tutte le stagioni giocate.</p>
      <div class="dyn-modal-actions">
        <button class="dyn-btn dyn-btn-primary" id="ovMpSell">Vendi per ${fmtMoney(worth)}</button>
        <button class="dyn-btn" id="ovMpBack">Torna alla stanza</button>
      </div>`);
    $('ovMpSell').onclick = () => {
      closeOverlay();
      stopMpPolling();
      clearMpSession();
      endDynasty('sold', worth);
    };
    $('ovMpBack').onclick = () => renderLobby(room, playerId);
  }

  // Solo l'host: cambia il nome della stanza (il codice resta comunque l'unico modo di
  // entrarci — il nome è solo un'etichetta comoda al posto del codice a 4 lettere).
  function confirmRenameRoom(room, playerId) {
    overlay(`
      <h2>✏️ Rinomina stanza</h2>
      <label class="dyn-field"><span>Nome della stanza</span><input id="mpRenameInput" type="text" maxlength="30" value="${room.name || ''}" placeholder="Es. Lega degli amici" autocomplete="off" /></label>
      <div class="dyn-modal-actions">
        <button class="dyn-btn dyn-btn-primary" id="ovRenameGo">Salva</button>
        <button class="dyn-btn" id="ovRenameNo">Annulla</button>
      </div>`);
    $('ovRenameGo').onclick = async () => {
      const roomName = ($('mpRenameInput').value || '').trim();
      try { const data = await mpApi('rename', { code: room.code, playerId, roomName }); renderLobby(data.room, playerId); }
      catch (e) { toast(e.message || 'Impossibile rinominare la stanza.', 'error'); renderLobby(room, playerId); }
    };
    $('ovRenameNo').onclick = () => renderLobby(room, playerId);
  }

  // Solo l'host: espelle un altro giocatore dalla stanza (stessa richiesta di conferma delle
  // altre azioni senza ritorno di questa stanza).
  function confirmKickPlayer(room, playerId, targetId) {
    const target = room.players.find((p) => p.id === targetId);
    overlay(`
      <h2>✖ Espelli dalla stanza</h2>
      <p>Rimuove <b>${target ? target.club : 'questo giocatore'}</b>${target ? ' (' + target.name + ')' : ''} dalla stanza. Non si può annullare.</p>
      <div class="dyn-modal-actions">
        <button class="dyn-btn ow-danger" id="ovKickGo">Espelli</button>
        <button class="dyn-btn" id="ovKickNo">Annulla</button>
      </div>`);
    $('ovKickGo').onclick = async () => {
      try { const data = await mpApi('kick', { code: room.code, playerId, targetId }); renderLobby(data.room, playerId); }
      catch (e) { toast(e.message || 'Impossibile espellere il giocatore.', 'error'); renderLobby(room, playerId); }
    };
    $('ovKickNo').onclick = () => renderLobby(room, playerId);
  }

  // Albo d'oro della stanza: lo storico sintetico per playerId che room.php accumula ad ogni
  // submitResult (room.hallOfFame) — sopravvive ai round successivi, a differenza di
  // `results` che nextRound azzera, quindi è l'unico posto dove si vede l'intera dynasty
  // vista dalla stanza invece che dal solo salvataggio del singolo giocatore.
  function showHallOfFame(room, playerId) {
    const hof = room.hallOfFame || {};
    const awards = (room.seasonAwards || []).slice().reverse();
    const rows = room.players.map((p) => ({ p, seasons: hof[p.id] || [] }))
      .concat(Object.keys(hof).filter((pid) => !room.players.some((p) => p.id === pid))
        .map((pid) => ({ p: { id: pid, name: '(uscito dalla stanza)', club: (hof[pid][0] && hof[pid][0].club) || '?' }, seasons: hof[pid] })));
    const awardsHTML = awards.length ? `<div class="ow-sec" style="margin-bottom:12px">
        <div class="ow-sec-title">🏅 Premi della stagione</div>
        ${awards.map((a) => `<div class="ow-fin-row" style="align-items:flex-start"><span>Stagione ${a.season ?? '-'}</span>
            <span style="text-align:right;font-size:12px;line-height:1.5">
              ${a.topScorer ? `⚽ Capocannoniere: <b>${a.topScorer.player}</b> (${a.topScorer.club}) · ${a.topScorer.goals} gol<br>` : ''}
              ${a.bestManager ? `🧠 Miglior mister: <b>${a.bestManager.mgr}</b> (${a.bestManager.club})<br>` : ''}
              ${a.surprise ? `🎉 Sorpresa della stagione: <b>${a.surprise.club}</b> (${ord(a.surprise.pos)} posto)` : ''}
            </span></div>`).join('')}
      </div>` : '';
    overlay(`
      <h2>🏆 Albo d'oro della stanza</h2>
      <div style="max-height:62vh;overflow:auto;margin:0 -6px">
        ${awardsHTML}
        ${rows.length ? rows.map(({ p, seasons }) => {
          const titles = seasons.filter((s) => s.title).length;
          const trophyCount = seasons.reduce((a, s) => a + (s.trophies ? s.trophies.length : 0), 0);
          return `<div class="ow-sec" style="margin-bottom:12px">
            <div class="ow-sec-title">${p.club}<small style="display:block;color:var(--muted);font-weight:normal">${p.name}</small></div>
            <div class="ow-fin-row"><span>Stagioni giocate</span><b>${seasons.length}</b></div>
            <div class="ow-fin-row"><span>Titoli vinti</span><b>${titles}</b></div>
            <div class="ow-fin-row"><span>Trofei totali</span><b>${trophyCount}</b></div>
            ${seasons.length ? `<div style="overflow-x:auto"><table class="dyn-table"><thead><tr><th>S</th><th>Categoria</th><th class="num">Pos</th><th>Trofei</th></tr></thead><tbody>
              ${seasons.map((s) => `<tr><td>${s.season ?? '-'}${s.promoted ? ' ⬆️' : s.relegated ? ' ⬇️' : ''}</td><td>${(DIVS[s.div] || {}).name || s.div}</td><td class="num">${s.pos ?? '-'}</td><td style="font-size:11px">${s.trophies && s.trophies.length ? s.trophies.join(', ') : '-'}</td></tr>`).join('')}
            </tbody></table></div>` : '<div class="ow-sub">Ancora nessuna stagione conclusa.</div>'}
          </div>`;
        }).join('') : '<div class="ow-sub">Ancora nessuna stagione conclusa in questa stanza.</div>'}
      </div>
      <div class="dyn-modal-actions"><button class="dyn-btn dyn-btn-primary" id="ovHofClose">Chiudi</button></div>`);
    $('ovHofClose').onclick = () => renderLobby(room, playerId);
  }

  // Classifica di UNA categoria: la stagione intera (tutti i club, bot compresi — gli stessi
  // che ctx.table già tiene per ciascun umano di quel gruppo, con le squadre più scarse del
  // pool sostituite dagli umani in fase di setup), non solo i club umani di quel gruppo. Si
  // parte dalla ctx.table di un umano qualsiasi del gruppo (bot e "io" già corretti dentro
  // computeTable), e si sovrascrivono le righe degli ALTRI umani dello stesso gruppo coi loro
  // pts/gd reali: dentro quella ctx.table contano solo gli scontri diretti già giocati con
  // loro, non il loro punteggio vero nell'intero campionato (la correzione completa arriva
  // solo a fine stagione in finishHostSeason, qui va rifatta ad ogni giornata per lo stesso
  // motivo).
  function buildLiveTable(run) {
    const base = (run.ctxs[0] && run.ctxs[0].table) || [];
    const humanByClub = new Map(run.ctxs.map((c) => [c.club, c]));
    return base.map((row) => {
      const h = humanByClub.get(row.name);
      if (h) return { club: h.club, pts: h.pts, gd: h.gf - h.ga, mgr: h.manager ? h.manager.n : '', isHuman: true };
      return { club: row.name, pts: row.pts, gd: row.gd, mgr: row.mgr ? row.mgr.n : '', isHuman: false };
    }).sort((a, b) => b.pts - a.pts || b.gd - a.gd);
  }

  // L'ultima giornata giocata da ciascun umano del gruppo, per il piccolo "notiziario" che
  // ognuno vede sopra la propria classifica — con le sfide dirette fra presidenti (vsHuman,
  // sim.js: stepHostMatchday) segnalate a parte invece di passare come una partita come le altre.
  function buildMatchdayNews(run) {
    return run.ctxs.map((c) => {
      const row = (c.results || [])[c.results.length - 1];
      if (!row) return null;
      return { club: c.club, opp: row.opp, home: row.home, gf: row.gf, ga: row.ga, res: row.res, vsHuman: !!row.vsHuman, vsHumanClub: row.vsHumanClub || null };
    }).filter(Boolean);
  }

  // Una "run" per categoria (`runs`, array): ognuna col proprio numero di giornate totali
  // (categorie con meno squadre finiscono prima). Il progresso complessivo che l'host vede sul
  // suo bottone è il massimo fra tutte — "fatto" scatta solo quando lo sono TUTTE. `resume`
  // porta anche i ctx completi del gruppo (non solo la classifica): se l'host sparisce a metà
  // simulazione, chiunque prenda il suo posto può ricostruire la run da lì (resumeMatchdaySimFromLive)
  // invece di restare bloccato sull'ultima giornata pubblicata.
  // `resume` (i ctx completi, roster compresi) è l'unica parte pesante di ogni giornata: con
  // più categorie/umani nella stanza, mandarlo per intero ad OGNI giornata è quello che rende
  // "Prossima giornata" lento (JSON enorme da serializzare, spedire, riscrivere su disco con
  // lock, e che ogni scheda in poll deve poi riscaricare). Serve solo per ricostruire la run se
  // l'host sparisce a metà simulazione, quindi basta rinfrescarlo ogni tot giornate (e sempre
  // alla prima e all'ultima): room.php tiene quello precedente per le giornate di mezzo invece
  // di perderlo, si perde al più qualche giornata di "ripresa" in un caso già raro.
  const LIVE_RESUME_EVERY = 3;
  function buildLiveGroups(runs) {
    return runs.map((run) => ({
      div: run.div,
      divName: (DIVS[run.div] || {}).name || ('Categoria ' + run.div),
      matchday: run.matchday,
      total: run.total,
      table: buildLiveTable(run),
      news: buildMatchdayNews(run),
      resume: (run.matchday <= 1 || run.matchday >= run.total || run.matchday % LIVE_RESUME_EVERY === 0)
        ? { ctxs: run.ctxs, bots: run.bots, playerIds: run.playerIds }
        : null,
    }));
  }

  async function pushMatchdaySnapshot(room, playerId, runs, force) {
    const groups = buildLiveGroups(runs);
    const matchday = Math.max(...groups.map((g) => g.matchday));
    const total = Math.max(...groups.map((g) => g.total));
    const data = await mpApi('pushMatchday', { code: room.code, playerId, matchday, total, groups, force: !!force });
    renderLobby(data.room, playerId);
  }

  // Se l'host di questa scheda non ha (più) la simulazione in memoria — perché l'ha aperta di
  // nuovo dopo un ricaricamento, o perché il ruolo di host è appena passato a lei/lui dopo che
  // l'host originale è uscito a metà simulazione (room.php: leave) — la ricostruisce dall'ultimo
  // `resume` pubblicato, invece di restare bloccati per sempre sull'ultima giornata vista.
  function resumeMatchdaySimFromLive(room, playerId) {
    const groups = (room.live && room.live.groups) || [];
    const runs = groups.map((g) => {
      if (!g.resume || !Array.isArray(g.resume.ctxs) || !g.resume.ctxs.length) return null;
      const ctxs = g.resume.ctxs;
      return {
        ctxs,
        bots: g.resume.bots || [],
        playerIds: g.resume.playerIds || [],
        fixtures: ctxs.map((c) => c.fixtures),
        div: g.div,
        matchday: g.matchday,
        total: g.total,
      };
    }).filter(Boolean);
    if (!runs.length) { toast('Nessun dato di ripresa disponibile: bisognerà aspettare il prossimo "Vedi resoconto" forzato o ricominciare da un nuovo round.', 'error'); return; }
    mpHostRuns = runs;
    toast('Simulazione ripresa dall\'ultima giornata pubblicata.', 'success');
    renderLobby(room, playerId);
  }

  // L'host: raggruppa i giocatori pronti per categoria (dalla seconda stagione in poi possono
  // essere in categorie diverse: promozioni/retrocessioni individuali), prepara una stagione
  // condivisa per gruppo (setupHostSeason, sim.js — Fase 2b) e simula subito la prima giornata
  // di ciascuna, poi mostra il pannello di controllo (renderLobby, fase 'simulating') con cui
  // avanzare una giornata alla volta su TUTTE le categorie insieme, ognuno vedendo solo la
  // classifica della propria. Le "run" vivono solo nella scheda dell'host: se la ricarica, deve
  // riaprire la stanza da lì per continuare (limite noto, accettabile per un gioco hobby senza
  // backend con stato persistente).
  async function hostBeginMatchdaySim(room, playerId, force) {
    // Chi non ha ancora ripremuto Pronto in sessione resta fuori da questa stagione — se
    // l'host forza l'avvio, si procede solo con chi ha davvero sottomesso una carriera.
    const readyPlayers = room.players.filter((p) => p.ready && p.state);
    if (readyPlayers.length < 1) { toast('Nessuno è ancora pronto.', 'error'); return; }
    const btn = $('mpStartSimBtn') || $('mpForceSimBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Avvio in corso…'; }
    try {
      const byDiv = new Map();
      readyPlayers.forEach((p) => {
        const div = p.state.div;
        if (!byDiv.has(div)) byDiv.set(div, []);
        byDiv.get(div).push(p);
      });
      const runs = [];
      byDiv.forEach((players, div) => {
        const ctxs = players.map((p) => JSON.parse(JSON.stringify(p.state)));
        const run = setupHostSeason(ctxs, div, room.difficulty);
        run.div = div;
        run.playerIds = players.map((p) => p.id);
        stepHostMatchday(run);
        runs.push(run);
      });
      mpHostRuns = runs;
      await pushMatchdaySnapshot(room, playerId, runs, !!force);
    } catch (e) {
      toast(e.message || 'Impossibile avviare la simulazione.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = '▶️ Inizia simulazione'; }
    }
  }

  // Applica il proprio "pezzo" del risultato condiviso al salvataggio locale — stesso slot
  // (_saveId) della carriera sottomessa, quindi lo sovrascrive. La sessione multiplayer NON si
  // chiude: la stanza continua per la prossima stagione (nextRound), quindi si segnala solo di
  // aver scaricato (ackResult) e si resta agganciati alla stessa stanza/salvataggio.
  function downloadMyResult(room, playerId) {
    const result = room.results && room.results[playerId];
    if (!result) { toast('Risultato non trovato.', 'error'); return; }
    stopMpPolling();
    mpLastPhase = null;
    closeOverlay();
    if (DynSound) DynSound.kickoff();
    S = result;
    normSquad();
    saveGame();
    mpApi('ackResult', { code: room.code, playerId }).catch(() => {});
    if (S._end) renderSeasonEnd(); else renderBoard();
  }

  // Elenco "Le tue carriere" nella schermata di setup: una card per slot salvato, con
  // ripresa/esportazione/eliminazione — sostituisce il vecchio, unico bottone "Continua"
  // che con un solo slot cancellava le altre carriere iniziandone una nuova.
  function renderSaveSlots() {
    const wrap = $('saveSlotsWrap'); if (!wrap) return;
    const idx = readSavesIndex().slice().sort((a, b) => b.updated - a.updated);
    wrap.innerHTML = !idx.length ? '' : `
      <div class="dyn-aggr-label" style="text-align:center;margin:6px 0 8px">Le tue carriere</div>
      <div class="ow-saveslots">
        ${idx.map((m) => `
          <div class="ow-saveslot">
            <div class="info">
              <b>${m.club || 'Club'}</b>
              <small>${(DIVS[m.div] || {}).name || ''} · Stagione ${m.season || 1}${m.owner ? ' · ' + m.owner : ''}</small>
            </div>
            <div class="act">
              <button type="button" class="dyn-mini" data-resume="${m.id}">▶️ Continua</button>
              <button type="button" class="dyn-mini" data-exportslot="${m.id}" title="Scarica un file di backup">⬇️</button>
              <button type="button" class="dyn-mini ow-danger" data-delslot="${m.id}" title="Elimina questa carriera">🗑️</button>
            </div>
          </div>`).join('')}
      </div>
      <label class="dyn-mini ow-import-label">⬆️ Importa carriera da file<input type="file" id="importSaveInput" accept="application/json" hidden /></label>`;
    wrap.querySelectorAll('[data-resume]').forEach((el) => el.addEventListener('click', () => resumeDynasty(el.dataset.resume)));
    wrap.querySelectorAll('[data-exportslot]').forEach((el) => el.addEventListener('click', () => exportSaveSlot(el.dataset.exportslot)));
    wrap.querySelectorAll('[data-delslot]').forEach((el) => el.addEventListener('click', () => {
      const id = el.dataset.delslot;
      overlay(`<h2>Eliminare questa carriera?</h2><p>Non si può annullare — valuta di esportarla prima.</p>
        <div class="dyn-modal-actions">
          <button class="dyn-btn dyn-btn-primary" id="ovConfirmDelSlot">Sì, elimina</button>
          <button class="dyn-btn" id="ovCancelDelSlot">Annulla</button>
        </div>`);
      $('ovConfirmDelSlot').onclick = () => { deleteSaveSlot(id); closeOverlay(); renderSaveSlots(); };
      $('ovCancelDelSlot').onclick = closeOverlay;
    }));
    const imp = $('importSaveInput');
    if (imp) imp.addEventListener('change', handleImportSaveFile);
    renderHotseatPanel();
  }

  // Card riassuntiva della stagione appena chiusa, disegnata su un canvas e scaricata come
  // PNG: niente libreria esterna (jsPDF/html2canvas), solo Canvas 2D nativo — pensata per
  // essere condivisa fuori dal gioco (storia social, chat), non solo per uso interno.
  function exportSeasonCard() {
    const e = S._end, d = divOf();
    const W = 1080, H = 1350;
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1c1610'); grad.addColorStop(1, '#0b0906');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(201,144,47,.55)'; ctx.lineWidth = 6; ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c9902f'; ctx.font = '700 28px Inter, Arial, sans-serif'; ctx.fillText('PRESIDENTE · SERIE A', W / 2, 108);
    ctx.fillStyle = '#ffd24a'; ctx.font = '900 60px Georgia, serif'; ctx.fillText(S.club, W / 2, 186);
    ctx.fillStyle = '#a89680'; ctx.font = '600 26px Inter, Arial, sans-serif'; ctx.fillText('Stagione ' + S.season + ' · ' + d.name, W / 2, 226);
    const headline = e.treble ? 'TRIPLETE!' : e.title ? (S.div === 5 ? 'SCUDETTO!' : ('CAMPIONI DI ' + d.name.toUpperCase()) + '!') : e.promoted ? 'PROMOZIONE!' : e.relegated ? 'RETROCESSIONE' : (ord(e.pos) + ' POSTO');
    ctx.fillStyle = '#ffffff'; ctx.font = '900 78px Georgia, serif'; ctx.fillText(headline, W / 2, 336);
    ctx.fillStyle = '#e8ddcf'; ctx.font = '700 32px Inter, Arial, sans-serif'; ctx.fillText(ord(e.pos) + ' posto · ' + S.pts + ' punti', W / 2, 400);
    let y = 470;
    if (e.trophies.length) {
      ctx.fillStyle = '#ffd24a'; ctx.font = '800 30px Inter, Arial, sans-serif';
      e.trophies.forEach((t) => { ctx.fillText('🏆 ' + t, W / 2, y); y += 46; });
    } else {
      ctx.fillStyle = '#a89680'; ctx.font = '600 26px Inter, Arial, sans-serif';
      ctx.fillText('Nessun trofeo questa stagione', W / 2, y); y += 46;
    }
    const topScorer = S.squad.filter((p) => p.pos !== 'POR').sort((a, b) => (b.seasonGoals || 0) - (a.seasonGoals || 0))[0];
    if (topScorer && topScorer.seasonGoals > 0) {
      y += 20;
      ctx.fillStyle = '#6fb3ff'; ctx.font = '700 28px Inter, Arial, sans-serif';
      ctx.fillText('⚽ Capocannoniere: ' + topScorer.n + ' (' + topScorer.seasonGoals + ')', W / 2, y);
      y += 50;
    }
    if (e.newAchievements && e.newAchievements.length) {
      y += 10;
      ctx.fillStyle = '#ff9f43'; ctx.font = '700 26px Inter, Arial, sans-serif';
      e.newAchievements.forEach((key) => {
        const a = ACHIEVEMENTS.find((x) => x.key === key);
        if (a) { ctx.fillText('🏅 ' + a.title, W / 2, y); y += 40; }
      });
    }
    y += 10;
    ctx.fillStyle = '#28d9a0'; ctx.font = '800 30px Inter, Arial, sans-serif';
    ctx.fillText('Valore del club: ' + fmtMoney(e.worth), W / 2, y);

    const finish = () => {
      ctx.fillStyle = '#6b5a44'; ctx.font = '600 20px Inter, Arial, sans-serif';
      ctx.fillText('presidente-serie-a', W / 2, H - 40);
      canvas.toBlob((blob) => {
        if (!blob) { toast('Impossibile generare l\'immagine.'); return; }
        const file = new File([blob], 'presidente-' + S.club.replace(/[^a-z0-9]+/gi, '_') + '-stagione' + S.season + '.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: 'Presidente · Serie A', text: headline + ' — ' + S.club }).catch(() => {});
          return;
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }, 'image/png');
    };
    try {
      const svgBlob = new Blob([crestMarkup(S.crestShape, S.crestColors, '')], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => { const cw = 150, ch = 172; ctx.drawImage(img, W / 2 - cw / 2, H - ch - 94, cw, ch); URL.revokeObjectURL(url); finish(); };
      img.onerror = finish;
      img.src = url;
    } catch (e2) { finish(); }
  }

  // Card riassuntiva dell'INTERA carriera (non la singola stagione), disegnata allo stesso
  // modo di exportSeasonCard: richiamabile solo a fine dinastia (venduto/pensione/dimesso/
  // cacciato/amministrazione controllata), quando la storia è ormai chiusa e S.history
  // contiene tutte le stagioni giocate.
  function exportCareerCard() {
    const how = S._how;
    const worth = computeWorth();
    const honours = [];
    S.trophies.titles.forEach((n, i) => { if (n) honours.push(n + 'x Titolo ' + (DIVS[i] ? DIVS[i].name : '')); });
    if (S.trophies.nat) honours.push(S.trophies.nat + 'x Coppa Italia');
    ['ucl', 'uel', 'conf'].forEach((k) => { if (S.trophies[k]) honours.push(S.trophies[k] + 'x ' + EURO_COMPS[k].name); });
    const topDiv = S.history.reduce((a, hh) => Math.max(a, DIVS.findIndex((x) => x.name === hh.div)), S.div);
    const heads = {
      sold: 'CLUB VENDUTO', retired: 'FINE CARRIERA', resigned: 'DIMISSIONI', forced: 'CACCIATO DAI TIFOSI', admin: 'AMMINISTRAZIONE CONTROLLATA',
    };
    const headline = heads[how] || 'FINE CARRIERA';

    const W = 1080, H = 1350;
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1c1610'); grad.addColorStop(1, '#0b0906');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(201,144,47,.55)'; ctx.lineWidth = 6; ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c9902f'; ctx.font = '700 28px Inter, Arial, sans-serif'; ctx.fillText('PRESIDENTE · SERIE A', W / 2, 108);
    ctx.fillStyle = '#ffd24a'; ctx.font = '900 58px Georgia, serif'; ctx.fillText(S.club, W / 2, 186);
    ctx.fillStyle = '#a89680'; ctx.font = '600 26px Inter, Arial, sans-serif'; ctx.fillText(S.owner + ' · ' + S.history.length + ' stagion' + (S.history.length === 1 ? 'e' : 'i'), W / 2, 226);
    ctx.fillStyle = '#ffffff'; ctx.font = '900 66px Georgia, serif'; ctx.fillText(headline, W / 2, 320);
    ctx.fillStyle = '#e8ddcf'; ctx.font = '700 30px Inter, Arial, sans-serif';
    ctx.fillText(how === 'sold' ? 'Venduto per ' + fmtMoney(S._sale) : 'Valore finale ' + fmtMoney(worth), W / 2, 372);

    let y = 440;
    ctx.fillStyle = '#6fb3ff'; ctx.font = '700 28px Inter, Arial, sans-serif';
    ctx.fillText('Livello massimo: ' + DIVS[Math.max(0, topDiv)].name, W / 2, y); y += 44;
    ctx.fillText('Valore massimo: ' + fmtMoney(S.peakWorth), W / 2, y); y += 60;

    if (honours.length) {
      ctx.fillStyle = '#ffd24a'; ctx.font = '800 30px Inter, Arial, sans-serif';
      honours.forEach((t) => { ctx.fillText('🏆 ' + t, W / 2, y); y += 46; });
    } else {
      ctx.fillStyle = '#a89680'; ctx.font = '600 26px Inter, Arial, sans-serif';
      ctx.fillText('Nessun trofeo in bacheca', W / 2, y); y += 46;
    }
    y += 20;
    ctx.fillStyle = '#28d9a0'; ctx.font = '800 30px Inter, Arial, sans-serif';
    ctx.fillText(S.history.filter((hh) => hh.promoted).length + ' promozioni conquistate', W / 2, y);
    y += 44;
    if (S.achievements && S.achievements.length) {
      ctx.fillStyle = '#ff9f43'; ctx.font = '700 26px Inter, Arial, sans-serif';
      ctx.fillText('🏅 ' + S.achievements.length + '/' + ACHIEVEMENTS.length + ' traguardi sbloccati', W / 2, y);
    }

    const finish = () => {
      ctx.fillStyle = '#6b5a44'; ctx.font = '600 20px Inter, Arial, sans-serif';
      ctx.fillText('presidente-serie-a', W / 2, H - 40);
      canvas.toBlob((blob) => {
        if (!blob) { toast('Impossibile generare l\'immagine.'); return; }
        const file = new File([blob], 'presidente-' + S.club.replace(/[^a-z0-9]+/gi, '_') + '-carriera.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: 'Presidente · Serie A', text: headline + ' — ' + S.club }).catch(() => {});
          return;
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }, 'image/png');
    };
    try {
      const svgBlob = new Blob([crestMarkup(S.crestShape, S.crestColors, '')], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => { const cw = 150, ch = 172; ctx.drawImage(img, W / 2 - cw / 2, H - ch - 94, cw, ch); URL.revokeObjectURL(url); finish(); };
      img.onerror = finish;
      img.src = url;
    } catch (e2) { finish(); }
  }

  // Versione del formato del file di backup esportato (diversa da SAVE_FORMAT_VERSION in
  // sim.js, che riguarda lo slot in localStorage): finora mai controllata in import, quindi un
  // futuro cambio di forma del bundle avrebbe rotto in silenzio l'importazione di file vecchi
  // (o prodotto uno stato incompleto con quelli nuovi). Da qui in poi almeno un avviso.
  const EXPORT_BUNDLE_VERSION = 1;

  // Backup di uno slot: un unico file .json con salvataggio + piramide, scaricabile e
  // ri-importabile (anche su un altro dispositivo/browser).
  function exportSaveSlot(id) {
    try {
      const raw = localStorage.getItem(saveSlotKey(id)); if (!raw) return;
      const save = JSON.parse(raw);
      const poolsRaw = localStorage.getItem(savePoolsKey(id));
      const bundle = JSON.stringify({ v: EXPORT_BUNDLE_VERSION, exportedAt: Date.now(), save, pools: poolsRaw ? JSON.parse(poolsRaw) : null });
      const blob = new Blob([bundle], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'presidente-' + String(save.club || 'club').replace(/[^a-z0-9]+/gi, '_') + '-s' + (save.season || 1) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e) { toast('Impossibile esportare questa carriera.'); }
  }

  function handleImportSaveFile(ev) {
    const file = ev.target.files && ev.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const bundle = JSON.parse(reader.result);
        const save = bundle && bundle.save ? bundle.save : bundle;   // tollerante a un vecchio export "nudo"
        if (!save || !save.squad || !save.club) { toast('File non riconosciuto.', 'error'); return; }
        if (bundle && bundle.v && bundle.v > EXPORT_BUNDLE_VERSION) { toast('⚠️ Questo file è stato esportato da una versione più recente del gioco: l\'importazione prosegue, ma alcuni dati potrebbero non essere compatibili.', 'error'); }
        const id = 'sv_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        save._saveId = id;
        localStorage.setItem(saveSlotKey(id), JSON.stringify(save));
        if (bundle && bundle.pools) localStorage.setItem(savePoolsKey(id), JSON.stringify(bundle.pools));
        const idx = readSavesIndex();
        idx.push({ id, owner: save.owner, club: save.club, div: save.div, season: save.season, updated: Date.now() });
        writeSavesIndex(idx);
        toast('Carriera importata: ' + save.club + '.');
        renderSaveSlots();
      } catch (e) { toast('File non valido.'); }
    };
    reader.readAsText(file);
    ev.target.value = '';
  }

  let takeovers = null, selTakeover = -1;

  // Categoria di partenza scelta in fase di creazione (indice in DIVS, 0=Eccellenza).
  let startDiv = 0;
  let startDifficulty = 'medio';

  // Stato dello stemma in fase di creazione del club (prima che esista S).
  let crestShape = CREST_DEFAULT.shape, crestColors = randCrestColors();

  // Filtro/ordinamento della lista rosa in sala del consiglio: solo preferenza di vista,
  // non tocca lo stato di gioco.
  let squadRoleFilter = 'ALL', squadSortDesc = true;

  // Tab attiva in Dirigenza: solo preferenza di vista, non persistita.
  let boardTab = 'finanze';

  function renderDivPicker() {
    const grid = $('divPicker'); if (!grid) return;
    grid.innerHTML = DIVS.map((d, i) => `<button type="button" class="ow-div-pick ${startDiv === i ? 'on' : ''}" data-startdiv="${i}">${d.name}</button>`).join('');
    grid.querySelectorAll('.ow-div-pick').forEach((el) => el.addEventListener('click', () => {
      startDiv = +el.dataset.startdiv;
      grid.querySelectorAll('.ow-div-pick').forEach((x) => x.classList.toggle('on', +x.dataset.startdiv === startDiv));
      takeovers = genTakeovers(startDiv); selTakeover = -1; renderTakeovers();
    }));
  }

  function renderDiffPicker() {
    const grid = $('diffPicker'); if (!grid) return;
    // Il testo di sapore da solo non dice quanto pesa davvero ogni livello: il tooltip mette
    // i numeri concreti dietro "più margine economico"/"meno imprevisti" ecc.
    const diffTip = (d) => 'Budget ' + Math.round(d.budgetMult * 100) + '% · Forza propria ' + (d.teamEffDelta >= 0 ? '+' : '') + d.teamEffDelta + ' · Stipendi ' + Math.round(d.wageMult * 100) + '% · Infortuni ' + Math.round(d.injuryMult * 100) + '% · Eventi ' + Math.round(d.eventMult * 100) + '% · Pazienza proprietà ' + Math.round(d.patienceMult * 100) + '%';
    grid.innerHTML = DIFFICULTIES.map((d) => `
      <button type="button" class="ow-diff-pick ${startDifficulty === d.key ? 'on' : ''}" data-diff="${d.key}" title="${diffTip(d)}">
        <b>${d.label}</b><small>${d.blurb}</small>
      </button>`).join('');
    grid.querySelectorAll('.ow-diff-pick').forEach((el) => el.addEventListener('click', () => {
      startDifficulty = el.dataset.diff;
      grid.querySelectorAll('.ow-diff-pick').forEach((x) => x.classList.toggle('on', x.dataset.diff === startDifficulty));
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

  function updateCrestPreview() {
    const wrap = $('crestPreviewWrap'); if (wrap) wrap.innerHTML = crestMarkup(crestShape, crestColors, 'setup-crest');
    const c1 = $('crestColor1'), c2 = $('crestColor2');
    if (c1) c1.value = crestColors[0]; if (c2) c2.value = crestColors[1];
    document.querySelectorAll('.ow-crest-shape').forEach((el) => el.classList.toggle('on', el.dataset.shape === crestShape));
  }

  function boot() {
    renderDivPicker();
    renderDiffPicker();
    takeovers = genTakeovers(startDiv); renderTakeovers();
    if (!$('owClubName').value) $('owClubName').value = pick(POOLS[startDiv]).n;   // suggerimento a caso, modificabile
    updateCrestPreview();
    document.querySelectorAll('.ow-crest-shape').forEach((el) => el.addEventListener('click', () => { crestShape = el.dataset.shape; updateCrestPreview(); }));
    const c1 = $('crestColor1'), c2 = $('crestColor2');
    if (c1) c1.addEventListener('input', (e) => { crestColors[0] = e.target.value; updateCrestPreview(); });
    if (c2) c2.addEventListener('input', (e) => { crestColors[1] = e.target.value; updateCrestPreview(); });
    const crestReroll = $('crestRerollBtn');
    if (crestReroll) crestReroll.addEventListener('click', () => { crestColors = randCrestColors(); updateCrestPreview(); });
    $('owRerollBtn').addEventListener('click', () => { takeovers = genTakeovers(startDiv); selTakeover = -1; renderTakeovers(); toast('Nuove condizioni di partenza sul tavolo.'); });
    // Con gli slot multipli, comprare un nuovo club non minaccia mai le carriere già
    // salvate (restano nell'elenco "Le tue carriere" qui sotto): nessuna conferma di
    // sovrascrittura da chiedere.
    $('owStartBtn').addEventListener('click', () => {
      if (selTakeover < 0) { toast('Scegli prima una situazione di partenza.'); return; }
      startDynasty(($('owName').value || '').trim() || 'Il Presidente', takeovers[selTakeover], ($('owClubName').value || '').trim(), startDiv, startDifficulty);
    });
    $('owHomeBtn').addEventListener('click', () => { saveGame(); location.href = 'index.html'; });
    renderSaveSlots();
    window.addEventListener('pagehide', saveGame);
    const soundBtn = $('owSoundBtn');
    if (soundBtn) {
      const syncSoundBtn = () => { const muted = DynSound && DynSound.isMuted(); soundBtn.textContent = muted ? '🔇' : '🔊'; soundBtn.classList.toggle('muted', !!muted); };
      syncSoundBtn();
      soundBtn.addEventListener('click', () => { if (DynSound) DynSound.toggleMuted(); syncSoundBtn(); });
    }
    const trophyCaseBtn = $('owTrophyCaseBtn');
    if (trophyCaseBtn) trophyCaseBtn.addEventListener('click', showTrophyCase);
    const leaderboardBtn = $('owGlobalLeaderboardBtn');
    if (leaderboardBtn) leaderboardBtn.addEventListener('click', showGlobalLeaderboard);
    const mpBtn = $('owMultiplayerBtn');
    if (mpBtn) mpBtn.addEventListener('click', openMultiplayerHub);
    const tutBtn = $('owTutorialBtn');
    if (tutBtn) tutBtn.addEventListener('click', openTutorial);
    $('owNextBtn').addEventListener('click', () => simMatch());
    $('owSimBtn').addEventListener('click', () => simToEnd());
    $('owTableBtn').addEventListener('click', showTable);
    $('owClubBtn').addEventListener('click', showClub);
  }

  /* ---------------- sala del consiglio ---------------- */
  function ladderHTML() {
    return `<div class="ow-ladder">${DIVS.map((d, i) => `<span class="ow-rung ${i === S.div ? 'on' : ''} ${i < S.div ? 'done' : ''}">${d.name}</span>`).join('<span class="ow-arrow">›</span>')}</div>`;
  }

  function meterHTML(label, v, warn) {
    const col = v >= 60 ? 'var(--dyn)' : v >= 35 ? 'var(--gold)' : 'var(--bad)';
    return `<div class="ow-meter"><span class="lbl">${label}</span><span class="bar"><span class="fill" style="width:${v}%;background:${col}"></span></span><span class="val" style="color:${col}">${Math.round(v)}${warn ? ' ⚠️' : ''}</span></div>`;
  }

  // Moduli disponibili per l'anteprima formazione: ogni riga è [ruolo, quanti, ruoloFlex,
  // quantiFlex], dall'attacco (in alto) al portiere (in basso). `quantiFlex` sono gli slot
  // "esterni" di quella riga (ai lati, i primi che finiscono nella visuale) che possono
  // essere presi anche da `ruoloFlex` se il migliore disponibile lì è più forte di un
  // centrocampista puro: un esterno può benissimo essere un attaccante di ruolo. Un ruolo
  // che compare in due righe (es. i due mediani vs i tre trequartisti nel 4-2-3-1) si
  // "divide" prendendo i migliori per la riga più avanzata e i successivi per quella più
  // arretrata: una semplificazione ragionevole dato che il gioco non distingue
  // centrocampisti offensivi/difensivi come ruoli separati.
  const FORMATIONS = {
    '433': { label: '4-3-3', rows: [['ATT', 3], ['CEN', 3], ['DIF', 4], ['POR', 1]] },
    '442': { label: '4-4-2', rows: [['ATT', 2], ['CEN', 4, 'ATT', 2], ['DIF', 4], ['POR', 1]] },
    '352': { label: '3-5-2', rows: [['ATT', 2], ['CEN', 5, 'ATT', 2], ['DIF', 3], ['POR', 1]] },
    '4231': { label: '4-2-3-1', rows: [['ATT', 1], ['CEN', 3, 'ATT', 2], ['CEN', 2], ['DIF', 4], ['POR', 1]] },
    '343': { label: '3-4-3', rows: [['ATT', 3], ['CEN', 4, 'ATT', 2], ['DIF', 3], ['POR', 1]] },
    '532': { label: '5-3-2', rows: [['ATT', 2], ['CEN', 3], ['DIF', 5], ['POR', 1]] },
    '424': { label: '4-2-4', rows: [['ATT', 4], ['CEN', 2], ['DIF', 4], ['POR', 1]] },
  };
  // Modulo scelto per l'anteprima: solo preferenza di vista, non persistito.
  let previewFormation = '433';
  // Chi hai selezionato per uno scambio titolare/panchina (pid), o null se non stai
  // scambiando nessuno. Anche questo solo stato di vista, non persistito.
  let selectedPreviewPid = null;

  // Probabile formazione: solo un'anteprima (i migliori per overall in ciascun ruolo, gli
  // stessi criteri di pickMatchLineup ma senza il margine di casualità a partita). Non
  // incide sulle presenze/statistiche: è solo una vista d'insieme.
  function previewLineup() {
    const byPos = { POR: [], DIF: [], CEN: [], ATT: [] };
    S.squad.forEach((p) => { if (byPos[p.pos]) byPos[p.pos].push(p); });
    Object.keys(byPos).forEach((k) => byPos[k].sort((a, b) => b.ovr - a.ovr));
    return byPos;
  }
  // Stessi colori per ruolo dei tag POR/DIF/CEN/ATT già usati nella rosa (verde, azzurro,
  // bronzo, arancione), non quelli di qualità dell'overall: sul campo il colore identifica
  // subito il reparto, a colpo d'occhio.
  // Anello colorato + alone scuro (li stacca dal verde del campo) + ombra portata più
  // marcata, per farli risaltare bene anche su un campo scuro.
  const ROLE_BADGE = {
    POR: 'color:#0a3d2a;box-shadow:0 0 0 2px var(--good),0 0 0 5px rgba(0,0,0,.4),0 5px 12px rgba(0,0,0,.7)',
    DIF: 'color:#0a3350;box-shadow:0 0 0 2px #6fb3ff,0 0 0 5px rgba(0,0,0,.4),0 5px 12px rgba(0,0,0,.7)',
    CEN: 'color:#3a2405;box-shadow:0 0 0 2px var(--dyn),0 0 0 5px rgba(0,0,0,.4),0 5px 12px rgba(0,0,0,.7)',
    ATT: 'color:#4a0505;box-shadow:0 0 0 2px var(--bad),0 0 0 5px rgba(0,0,0,.4),0 5px 12px rgba(0,0,0,.7)',
  };
  function pitchRowHTML(list, count) {
    const chips = [];
    for (let i = 0; i < count; i++) {
      const p = list[i];
      chips.push(p
        ? `<div class="ow-pitch-chip${p.pid === selectedPreviewPid ? ' sel' : ''}" data-pid="${p.pid}" title="${p.n} · ${p.ovr} · tocca per scambiare">
            <span class="ovr" style="${ROLE_BADGE[p.pos] || ''}">${p.ovr}</span><span class="nm">${flagOf(p)}${p.n.split(' ').slice(-1)[0]}</span></div>`
        : '<div class="ow-pitch-chip empty"><span class="ovr">–</span><span class="nm">—</span></div>');
    }
    return `<div class="ow-pitch-row">${chips.join('')}</div>`;
  }
  // Costruisce una riga con slot flessibili: `pureN` (n - flexN) posti restano di `role`
  // (i centrali), i restanti `flexN` posti (gli esterni, ai lati della riga) vanno ai
  // migliori disponibili fra chi è rimasto di `role` e di `flexRole`, chiunque dei due
  // abbia l'overall più alto. Ogni giocatore usato avanza il cursore del SUO ruolo reale,
  // così non viene ripescato in una riga successiva.
  function buildFlexRow(byPos, cursor, role, n, flexRole, flexN) {
    const pureN = n - flexN;
    const pure = byPos[role].slice(cursor[role], cursor[role] + pureN);
    cursor[role] += pure.length;
    const pool = byPos[role].slice(cursor[role]).map((p) => ({ p, src: role }))
      .concat(byPos[flexRole].slice(cursor[flexRole]).map((p) => ({ p, src: flexRole })))
      .sort((a, b) => b.p.ovr - a.p.ovr)
      .slice(0, flexN);
    pool.forEach((m) => { cursor[m.src]++; });
    const flexPlayers = pool.map((m) => m.p);
    const half = Math.ceil(flexPlayers.length / 2);
    return flexPlayers.slice(0, half).concat(pure, flexPlayers.slice(half));
  }
  // Undici (o meno, a seconda del modulo) migliori disponibili per il modulo dato, in
  // ordine di riga: solo pid, null dove il ruolo non ha abbastanza giocatori.
  function computeAutoXI(key) {
    const f = FORMATIONS[key] || FORMATIONS['433'];
    const byPos = previewLineup();
    const cursor = { POR: 0, DIF: 0, CEN: 0, ATT: 0 };
    const pids = [];
    f.rows.forEach(([role, n, flexRole, flexN]) => {
      const list = flexN ? buildFlexRow(byPos, cursor, role, n, flexRole, flexN) : byPos[role].slice(cursor[role], cursor[role] + n);
      if (!flexN) cursor[role] += n;
      for (let i = 0; i < n; i++) pids.push(list[i] ? list[i].pid : null);
    });
    return pids;
  }
  // La formazione mostrata è quella scelta a mano (S.previewXI), finché resta valida per
  // il modulo attuale e tutti i pid sono ancora in rosa; altrimenti si ricalcola quella
  // automatica e diventa la nuova base. Così gli scambi fatti a mano restano finché non
  // cambi modulo o venda/perda uno dei titolari scelti.
  function getPreviewXI() {
    const f = FORMATIONS[previewFormation] || FORMATIONS['433'];
    const totalSlots = f.rows.reduce((a, r) => a + r[1], 0);
    const stored = S.previewXI;
    if (stored && stored.key === previewFormation && Array.isArray(stored.pids) && stored.pids.length === totalSlots) {
      if (stored.pids.every((pid) => pid == null || S.squad.some((p) => p.pid === pid))) return stored.pids;
    }
    const auto = computeAutoXI(previewFormation);
    S.previewXI = { key: previewFormation, pids: auto };
    return auto;
  }
  function pitchHTML(key, pids) {
    const f = FORMATIONS[key] || FORMATIONS['433'];
    let idx = 0;
    const rows = f.rows.map(([role, n]) => {
      const slotPids = pids.slice(idx, idx + n); idx += n;
      const players = slotPids.map((pid) => (pid != null ? S.squad.find((p) => p.pid === pid) : null));
      return pitchRowHTML(players, n);
    }).join('');
    return `<div class="ow-pitch">${rows}</div>`;
  }
  // Panchina: tutta la rosa che non è fra i titolari del modulo scelto, ordinata per ruolo
  // e overall. Ogni riga è cliccabile come i giocatori in campo, per lo scambio.
  // Panchina "vera": non tutta la rosa rimasta, solo i migliori candidati a subentrare per
  // ruolo (1 portiere, 2 difensori, 2 centrocampisti, 2 attaccanti), come una vera lista
  // convocati — altrimenti con una rosa piena si riempirebbe di 15+ giocatori.
  const BENCH_QUOTA = { POR: 1, DIF: 2, CEN: 2, ATT: 2 };
  function benchHTML(xiPids) {
    const xiSet = new Set(xiPids.filter((x) => x != null));
    const order = { POR: 0, DIF: 1, CEN: 2, ATT: 3 };
    const available = S.squad.filter((p) => !xiSet.has(p.pid)).sort((a, b) => (order[a.pos] - order[b.pos]) || (b.ovr - a.ovr));
    const bench = [];
    Object.keys(BENCH_QUOTA).forEach((role) => { bench.push(...available.filter((p) => p.pos === role).slice(0, BENCH_QUOTA[role])); });
    if (!bench.length) return '<div class="ow-sub" style="margin-top:8px">Nessun altro giocatore in panchina.</div>';
    return `
      <div class="ow-bench-title">🔁 Panchina — tocca un giocatore e poi uno in campo per scambiarli</div>
      <div class="ow-bench-list">${bench.map((p) => `
        <div class="ow-bench-chip${p.pid === selectedPreviewPid ? ' sel' : ''}" data-pid="${p.pid}">
          <span class="ovr" style="${ROLE_BADGE[p.pos] || ''}">${p.ovr}</span>
          <span class="postag postag-${p.pos}">${p.pos}</span>
          <span class="nm">${flagOf(p)}${p.n}</span>
        </div>`).join('')}</div>`;
  }
  function formationPickerHTML() {
    return `<div class="ow-formation-picker">${Object.keys(FORMATIONS).map((k) => `<button type="button" class="ow-formation-pick ${previewFormation === k ? 'on' : ''}" data-formation="${k}">${FORMATIONS[k].label}</button>`).join('')}</div>`;
  }

  // Sparkline SVG minimale (nessuna libreria): un'area + linea che mostra l'andamento
  // di una serie di valori stagione per stagione, usata nella bacheca di fine carriera.
  function sparklineSVG(values, color) {
    const w = 320, h = 54, pad = 4;
    if (!values || values.length < 2) return '<div class="ow-sub">Non ancora abbastanza stagioni per un grafico.</div>';
    const min = Math.min(...values), max = Math.max(...values), range = (max - min) || 1;
    const stepX = (w - pad * 2) / (values.length - 1);
    const pts = values.map((v, i) => [pad + i * stepX, h - pad - ((v - min) / range) * (h - pad * 2)]);
    const line = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const area = line + ` L${pts[pts.length - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z`;
    const dots = pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i === pts.length - 1 ? 3.4 : 1.8}" fill="${color}"/>`).join('');
    return `<svg viewBox="0 0 ${w} ${h}" class="ow-spark" preserveAspectRatio="none">
      <path d="${area}" fill="${color}" fill-opacity=".14" stroke="none"/>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
    </svg>`;
  }

  // Coriandoli CSS per i momenti che contano (promozione, scudetto, coppe): niente
  // canvas o librerie, solo elementi assoluti con un'animazione di caduta.
  function fireConfetti(container) {
    if (!container) return;
    const wrap = document.createElement('div'); wrap.className = 'confetti-wrap';
    const colors = ['#ffd24a', '#c9902f', '#f0c869', '#ff2d78', '#28d9a0'];
    for (let i = 0; i < 26; i++) {
      const el = document.createElement('span'); el.className = 'confetti-piece';
      el.style.left = (Math.random() * 100) + '%';
      el.style.background = pick(colors);
      el.style.animationDelay = (Math.random() * 0.5) + 's';
      el.style.animationDuration = (2 + Math.random() * 1.2) + 's';
      wrap.appendChild(el);
    }
    container.appendChild(wrap);
    setTimeout(() => wrap.remove(), 4200);
  }

  function celebrate(panelEl) {
    if (!panelEl) return;
    panelEl.classList.add('celebrate');
    fireConfetti(panelEl);
  }

  function renderBoard() {
    const d = divOf(), body = $('boardBody');
    // Carriera legata a una stanza multiplayer ancora aperta: niente "Inizia Stagione" qui
    // (la stagione la avvia l'host per tutti insieme), solo "Sono pronto" che torna alla
    // lobby con la carriera sottomessa.
    const mpSess = readMpSession();
    const mpBoard = !!(mpSess && mpSess.saveId === S._saveId);
    normSquad();
    previewFormation = S.formation;   // il modulo mostrato riflette quello persistito (ora pesa in partita)
    maybeScoutProspect();
    // QoL: chi lo desidera può evitare di ripremere manualmente "Bonus investitore" ogni
    // singola stagione (l'esito ottimale — prenderlo — non cambia mai in 20 stagioni): un
    // interruttore per carriera, non imposto a chi preferisce comunque decidere volta per volta.
    if (S.autoInvestor && !S.investorUsed) {
      const amount = Math.round(divOf().investor * diffOf().sponsorMult / 1e4) * 1e4;
      S.investorUsed = true; S.budget += amount;
      toast('Bonus investitore automatico: +' + fmtMoney(amount), 'money');
      saveGame();
    }
    const fyCount = S.squad.filter(finalYear).length;
    if (!S.sponsorOpts && !S.sponsor) S.sponsorOpts = sponsorOffers();
    if (!S.mgrOpts) {
      S.mgrOpts = [genManager(0), genManager(3), genManager(6)];
      // Una tua ex leggenda può presentarsi fra i candidati (mai al posto di tutti e tre,
      // giusto un'opzione in più): un piccolo momento di continuità con la storia del club.
      const legend = legendManagerCandidate();
      if (legend) S.mgrOpts[rnd(S.mgrOpts.length)] = legend;
    }
    if (!S.sportingDirector && !S.dsOpts) S.dsOpts = [genSportingDirector(0), genSportingDirector(4)];
    const bill = kickoffBill();
    const free = freeToSpend();
    const broke = S.budget < bill;
    // Prima del dirupo binario "due stagioni in rosso = amministrazione controllata forzata",
    // un vero meccanismo intermedio: appena chiusa la prima stagione in rosso, il mercato in
    // entrata si blocca (niente spin, niente svincolati, niente ampliamento stadio) finché il
    // budget non torna positivo — costringe a vendere/tagliare i costi subito, con qualcosa da
    // FARE oltre a sperare che il taglio automatico del debito a inizio stagione basti da solo.
    const debtEmbargo = !!S.debtSeasons;
    const worth = computeWorth(); S.peakWorth = Math.max(S.peakWorth, worth);
    const next = STADIUM[S.stadiumTier + 1];
    const squadFiltered = S.squad.slice()
      .filter((p) => squadRoleFilter === 'ALL' || p.pos === squadRoleFilter)
      .sort((a, b) => squadSortDesc ? b.ovr - a.ovr : a.ovr - b.ovr);
    const squadRows = squadFiltered.length ? squadFiltered.map((p) => {
      const fy = !p.loan && finalYear(p);
      return `
      <div class="ow-player${fy ? ' final' : ''}" data-pid="${p.pid}"><span class="ovr" style="${ovrBadge(p.ovr)}" title="${p.pid === S.captainPid ? 'Capitano: +1 OVR' : ''}">${p.pid === S.captainPid ? p.ovr + 1 : p.ovr}</span>
        <span class="postag postag-${p.pos}">${p.pos}</span>
        <span class="nm">${flagOf(p)}${p.n}${p.pid === S.captainPid ? ' <span title="Capitano">©</span>' : ''}<small>età ${p.age}</small></span>
        ${p.outWeeks > 0 ? `<span class="stat-tag inj" title="Infortunato">🚑 ${p.outWeeks}</span>` : p.suspMatches > 0 ? '<span class="stat-tag susp" title="Squalificato">🟥</span>' : ''}
        ${p.loan ? '<span class="yy loan" title="Torna al suo club se non riscattato">prestito</span>' : `<span class="yy${fy ? ' fy' : ''}" title="Anni di contratto rimasti">${p.yrs}a</span>`}
        <span class="wg">${fmtYr(p.wage)}</span>
        ${fy ? `<button class="ow-renew" data-renew="${p.pid}" title="Offri un nuovo contratto">Rinnova</button>` : ''}
        ${p.loan ? `<button class="ow-renew" data-buyback="${p.pid}" title="Riscatta a titolo definitivo, altrimenti torna al suo club a inizio stagione">💰 Riscatta · ${fmtMoney(loanBuybackFee(p))}</button>` : `<button class="ow-x" data-rel="${p.pid}" title="Vendi">💷</button>`}</div>`;
    }).join('') : '<div class="ow-sub" style="margin:10px 0">Nessun giocatore in questo ruolo.</div>';
    const estRevenue = estSeasonRevenue();
    const scout = scoutTier(), scoutLv = S.scoutLevel || 0, nextScoutCost = scoutLv < SCOUT_TIERS.length - 1 ? scoutUpgradeCost(scoutLv + 1) : null;

    const financeHTML = `
      <div class="ow-sec ow-status">
        <div class="ow-bigmoney"><span>Valore del club</span><b>${fmtMoney(worth)}</b></div>
        <div class="ow-fin-row" style="padding:2px 0 6px"><span>Indice tifoseria (cresce con successo e prezzi equi)</span><b>${S.fanbase.toFixed(2)}</b></div>
        ${S.euro ? '<div class="ow-euroflag">' + EURO_COMPS[S.euroComp].flag + ' ' + EURO_COMPS[S.euroComp].name + ' questa stagione · grandi notti, grandi soldi</div>' : ''}
        ${meterHTML('Umore tifosi', S.sent, S.sent < 30)}
        ${meterHTML('Gradimento proprietario', S.ownerRating, S.ownerRating < 35)}
        ${S.ownerRating < 35 ? '<div class="ow-warn">⚠️ I tifosi ti vogliono fuori. Sotto 25 a fine stagione sarai costretto a dimetterti.</div>' : ''}
        ${S.debtSeasons ? '<div class="ow-warn">⚠️ Hai chiuso la scorsa stagione in rosso: mercato in entrata bloccato finché il budget non torna positivo (vedi Rosa). Un\'altra stagione in debito significa amministrazione controllata.</div>' : ''}
      </div>
      <div class="ow-sec">
        <div class="ow-sec-title">📋 Bilancio di stagione</div>
        <div class="ow-fin-row"><span>Stipendi giocatori (${S.squad.length} giocatori, pagati all'avvio)</span><b>${fmtMoney(wageBill())}</b></div>
        <div class="ow-fin-row"><span>Stipendio allenatore (pagato all'avvio)</span><b>${fmtMoney(S.manager.salary)}</b></div>
        ${S.sportingDirector ? `<div class="ow-fin-row"><span>Stipendio direttore sportivo (pagato all'avvio)</span><b>${fmtMoney(S.sportingDirector.salary)}</b></div>` : ''}
        <div class="ow-fin-row total ${broke ? 'bad' : ''}"><span>Costo d'avvio</span><b>${fmtMoney(bill)}</b></div>
        <div class="ow-fin-row"><span>Ricavi di stagione (stima)</span><b>${fmtMoney(estRevenue)}</b></div>
        ${broke ? '<div class="ow-warn">⚠️ Ti mancano <b>' + fmtMoney(bill - S.budget) + '</b> per coprire il costo d\'avvio. Ricorda: gli spin spendono cassa anche se rifiuti il giocatore. Vendi giocatori (💷), prendi il bonus investitore o assumi un allenatore più economico prima dell\'inizio.</div>' : ''}
        ${!S.investorUsed ? `<button class="dyn-btn ow-investor" id="investorBtn">💼 Bonus investitore · +${fmtMoney(Math.round(d.investor * diffOf().sponsorMult / 1e4) * 1e4)}</button>` : ''}
        <label class="ow-sub" style="display:flex;align-items:center;gap:6px;margin-top:4px;cursor:pointer"><input type="checkbox" id="autoInvestorChk" ${S.autoInvestor ? 'checked' : ''} /> Prendilo sempre in automatico a inizio stagione, da qui in poi</label>
      </div>
      ${S.offers && S.offers.length ? `
      <div class="ow-sec">
        <div class="ow-sec-title">📨 Offerte di mercato</div>
        <div class="ow-sub">Club rivali vogliono i tuoi giocatori migliori. Incassa per una cifra, rilanciane una più alta (una sola volta, rischi che si ritirino), o rifiuta per tenere unita la rosa.</div>
        ${S.offers.map((o) => {
          const p = S.squad.find((x) => x.pid === o.pid); if (!p) return '';
          return `<div class="ow-bid">
            <div class="who"><span class="ovr" style="${ovrBadge(p.ovr)}">${p.ovr}</span><span class="nm">${flagOf(p)}${p.n}<small>età ${p.age} · ${o.club} si fa avanti</small></span></div>
            <div class="act"><span class="fee">${fmtMoney(o.fee)}</span>
              <button class="dyn-mini ow-accept" data-acc="${o.pid}">Accetta</button>
              ${!o.countered ? `<button class="dyn-mini" data-counter="${o.pid}" title="Chiedi di più: potrebbero accettare o ritirarsi">🤝 Rilancia</button>` : ''}
              <button class="dyn-mini ow-reject" data-rej="${o.pid}">Rifiuta</button></div>
          </div>`;
        }).join('')}
      </div>` : ''}`;

    const xiPids = getPreviewXI();
    const rosaHTML = `
      <div class="ow-sec">
        <div class="ow-sec-title">🧠 Allenatore</div>
        <div class="ow-mgr"><span class="ovr">${S.manager.rating}</span><span class="nm">${flagOf(S.manager)}${S.manager.n}<small>${fmtMoney(S.manager.salary)}/anno · ${specOf(S.manager.spec).icon} ${specOf(S.manager.spec).label}</small></span><span class="tag">In carica</span></div>
        <div class="ow-sub" title="${specOf(S.manager.spec).desc}">${specOf(S.manager.spec).icon} ${specOf(S.manager.spec).desc}</div>
        <div class="ow-sub">Candidati (l'esonero paga il 30% di buonuscita):</div>
        ${S.mgrOpts.map((m, i) => `<div class="ow-mgr cand"><span class="ovr">${m.rating}</span><span class="nm">${flagOf(m)}${m.n}${m.exPlayer ? ' <small title="Una tua ex leggenda">🎓</small>' : ''}<small>${fmtMoney(m.salary)}/anno · ${specOf(m.spec).icon} ${specOf(m.spec).label}${m.exPlayer ? ' · Ex giocatore del club' : ''}</small></span><button class="dyn-mini ow-hire" data-hire="${i}">Assumi</button></div>`).join('')}
      </div>
      <div class="ow-sec">
        <div class="ow-sec-title">📋 Direttore sportivo</div>
        ${S.sportingDirector ? `
          <div class="ow-mgr"><span class="ovr">${S.sportingDirector.rating}</span><span class="nm">${flagOf(S.sportingDirector)}${S.sportingDirector.n}<small>${fmtMoney(S.sportingDirector.salary)}/anno · ${dsSpecOf(S.sportingDirector.spec).icon} ${dsSpecOf(S.sportingDirector.spec).label}</small></span><span class="tag">In carica</span></div>
          <div class="ow-sub" title="${dsSpecOf(S.sportingDirector.spec).desc}">${dsSpecOf(S.sportingDirector.spec).icon} ${dsSpecOf(S.sportingDirector.spec).desc}</div>
          <button class="dyn-mini ow-danger" id="dsFireBtn">Licenzia (buonuscita 30%)</button>
        ` : `
          <div class="ow-sub">Ruolo opzionale: si occupa del mercato in uscita, non tocca la squadra in campo.</div>
          ${(S.dsOpts || []).map((m, i) => `<div class="ow-mgr cand"><span class="ovr">${m.rating}</span><span class="nm">${flagOf(m)}${m.n}<small>${fmtMoney(m.salary)}/anno · ${dsSpecOf(m.spec).icon} ${dsSpecOf(m.spec).label}</small></span><button class="dyn-mini ow-hire-ds" data-hireds="${i}">Assumi</button></div>`).join('')}
        `}
      </div>
      <div class="ow-sec">
        <div class="ow-sec-title">🔭 Settore giovanile</div>
        <div class="ow-scout-tier" title="${'+' + scout.bonus + ' OVR medio sugli spin · ' + Math.round(scout.prospectChance * 100) + '% di chance a stagione di un prospetto del vivaio · ' + Math.round(scout.gem * 100) + '% di chance di un vero colpo'}${nextScoutCost != null ? ' · il livello successivo (' + SCOUT_TIERS[scoutLv + 1].name + '): +' + SCOUT_TIERS[scoutLv + 1].bonus + ' OVR, ' + Math.round(SCOUT_TIERS[scoutLv + 1].prospectChance * 100) + '% prospetto, ' + Math.round(SCOUT_TIERS[scoutLv + 1].gem * 100) + '% colpo' : ''}">
          <div><div class="lv">${scout.name}</div><div class="ds">Spin migliori in media (+${scout.bonus} OVR) e più affidabili${scoutLv ? ', più chance di un prospetto gratis a inizio stagione' : ''}</div></div>
          ${nextScoutCost != null ? `<button class="dyn-mini" id="scoutUpgBtn" ${S.budget < nextScoutCost ? 'disabled' : ''}>⬆️ ${fmtMoney(nextScoutCost)}</button>` : '<span class="tag">Max</span>'}
        </div>
        ${S.scoutProspects && S.scoutProspects.length ? `
        <div class="ow-sub" style="margin:8px 0 4px">Il vivaio presenta ${S.scoutProspects.length} promesse: scegline una da aggregare alla rosa, le altre restano altrove.</div>
        ${S.scoutProspects.map((p, i) => `
        <div class="ow-jan-card">
          <div class="ow-jan-head">
            <span class="ovr" style="${ovrBadge(p.ovr)}">${p.ovr}</span>
            <span class="postag postag-${p.pos}">${p.pos}</span>
            <span class="nm">${flagOf(p)}${p.n}<small>${POS_LABEL[p.pos]} · età ${p.age} · promessa del vivaio</small></span>
          </div>
          <button class="dyn-btn dyn-btn-primary" data-scoutsign="${i}">Aggrega alla rosa · Gratis</button>
        </div>`).join('')}` : ''}
      </div>
      <div class="ow-sec">
        <div class="ow-sec-title">🎰 Rosa + spin</div>
        <div class="ow-sub">Rosa ${S.squad.length < MIN_SQUAD ? '<b style="color:var(--bad)">' + S.squad.length + ' su ' + MIN_SQUAD + ' giocatori necessari</b>' : S.squad.length + ' giocatori'} · rating <b>${squadStr()}</b> · media di categoria ${d.avg}${fyCount ? ' · <b style="color:var(--gold)">' + fyCount + ' in scadenza</b> (Rinnova o li perdi a zero)' : ''} · tocca 💷 per vendere</div>
        ${debtEmbargo ? '<div class="ow-warn">🔒 Mercato in entrata bloccato: club in rosso, niente spin/svincolati/ampliamenti finché il budget non torna positivo. Vendi o taglia i costi.</div>' : ''}
        <div class="ow-spins${S.stdRoleUsed ? ' one' : ''}" style="margin-bottom:8px">
          <button class="dyn-btn" id="spinStdBtn" ${(debtEmbargo || S.budget < spinCostNow(false)) ? 'disabled' : ''} title="${debtEmbargo ? 'Bloccato: club in rosso' : ''}">🎰 Spin giocatore · ${fmtMoney(spinCostNow(false))}</button>
          ${!S.stdRoleUsed ? `<button class="dyn-btn ow-role-btn" id="spinStdRoleBtn" ${(debtEmbargo || S.budget < spinCostNow(false)) ? 'disabled' : ''} title="${debtEmbargo ? 'Bloccato: club in rosso' : 'Scegli il ruolo per questo spin, disponibile una sola volta a stagione'}">🎯 Scegli ruolo</button>` : ''}
        </div>
        <div class="ow-spins${S.premiumRoleUsed ? ' one' : ''}">
          <button class="dyn-btn" id="spinPremBtn" ${(debtEmbargo || S.budget < spinCostNow(true)) ? 'disabled' : ''} title="${debtEmbargo ? 'Bloccato: club in rosso' : ''}">💎 Spin di lusso · ${fmtMoney(spinCostNow(true))}</button>
          ${!S.premiumRoleUsed ? `<button class="dyn-btn ow-role-btn" id="spinPremRoleBtn" ${(debtEmbargo || S.budget < spinCostNow(true)) ? 'disabled' : ''} title="${debtEmbargo ? 'Bloccato: club in rosso' : 'Scegli il ruolo per questo spin di lusso, disponibile una sola volta a stagione'}">🎯 Scegli ruolo</button>` : ''}
        </div>
        <div class="ow-sub" style="margin:0 0 8px">${S.spinsBought ? 'Affaticamento scout: i prezzi sono saliti perché hai già fatto ' + S.spinsBought + ' spin quest\'estate.' : 'Ogni spin di questa estate costa più del precedente.'} ${S.stdRoleUsed ? 'Hai già scelto il ruolo per lo spin normale.' : 'Il prossimo spin normale ti lascia scegliere il ruolo.'} ${S.premiumRoleUsed ? 'Hai già scelto il ruolo per lo spin di lusso.' : 'Lo spin di lusso è casuale, a meno che tu non scelga tu il ruolo (una sola volta a stagione).'}</div>
        <button class="dyn-btn ow-investor" id="freeAgentBtn" ${debtEmbargo ? 'disabled title="Bloccato: club in rosso"' : ''}>🖊️ Ingaggia uno svincolato · Gratis</button>
        <div class="ow-squad-filters">
          ${['ALL', 'POR', 'DIF', 'CEN', 'ATT'].map((k) => `<button class="ow-filter-pill ${squadRoleFilter === k ? 'on' : ''}" data-role="${k}">${k === 'ALL' ? 'Tutti' : k}</button>`).join('')}
          <button class="ow-filter-pill ow-filter-sort" id="squadSortBtn" title="Ordina per overall">OVR ${squadSortDesc ? '▼' : '▲'}</button>
        </div>
        ${squadRoleFilter !== 'ALL' ? `<div class="ow-sub" style="margin:-4px 0 6px">${squadFiltered.length} di ${S.squad.length} giocatori</div>` : ''}
        <div class="ow-squadlist">${squadRows}</div>
      </div>
      <div class="ow-sec">
        <div class="ow-sec-title">⚽ Formazione e modulo (${FORMATIONS[previewFormation].label})</div>
        <div class="ow-sub">Il modulo non è solo estetico: uno più offensivo (3-4-3) segna di più ma incassa di più, uno più difensivo (5-3-2) il contrario.</div>
        ${formationPickerHTML()}
        ${pitchHTML(previewFormation, xiPids)}
        ${benchHTML(xiPids)}
        <button class="dyn-mini" id="resetXIBtn" style="margin-top:10px;width:100%">🔄 Formazione automatica</button>
      </div>`;

    const stadioHTML = `
      <div class="ow-sec">
        <div class="ow-sec-title">🏟️ Stadio + biglietti</div>
        <div class="ow-fin-row"><span>Capienza</span><b>${capOf().toLocaleString('it-IT')} posti</b></div>
        ${next ? `<button class="dyn-btn ow-upg" id="upgradeBtn" ${(debtEmbargo || S.budget < next.cost) ? 'disabled' : ''} title="${debtEmbargo ? 'Bloccato: club in rosso' : ''}">Amplia a ${next.cap.toLocaleString('it-IT')} posti · ${fmtMoney(next.cost)}</button>` : '<div class="ow-sub">Lo stadio è alla sua dimensione massima.</div>'}
        <div class="ow-sub" style="margin-top:10px">Prezzi biglietti (i tifosi reagiscono, la domanda cambia):</div>
        <div class="ow-tickets">${TICKETS.map((t, i) => `<button class="ow-ticket ${S.ticket === i ? 'on' : ''}" data-tk="${i}"><b>${t.label}</b><small>€${Math.round(d.ticket * t.mult)} medio · ${t.hint}</small></button>`).join('')}</div>
      </div>`;

    const sponsorHTML = `
      <div class="ow-sec">
        <div class="ow-sec-title">🤝 Sponsorizzazione</div>
        ${S.sponsor
          ? `<div class="ow-fin-row"><span>${S.sponsor.name} (${S.sponsor.left} ann${S.sponsor.left === 1 ? 'o' : 'i'} rimasti${S.sponsor.sent ? ', ' + (S.sponsor.sent > 0 ? 'i tifosi approvano' : 'i tifosi disapprovano') : ''})</span><b>${fmtMoney(S.sponsor.perYear)}/anno</b></div>`
          : `<div class="ow-sub">Nessuno sponsor di maglia. Scegli un accordo:</div>` + S.sponsorOpts.map((o, i) => `
            <button class="ow-offer" data-sp="${i}"><span class="info"><b>${o.name}</b><small>${o.years} anni${o.sent ? (o.sent > 0 ? ' · i tifosi approvano' : ' · i tifosi disapprovano') : ''}</small></span><span class="money">${fmtMoney(o.perYear)}/anno</span></button>`).join('')}
      </div>`;

    const TABS = [
      { key: 'finanze', label: '💰 Finanze', html: financeHTML, warn: broke || S.ownerRating < 35 || !!S.debtSeasons || !!(S.offers && S.offers.length) },
      { key: 'rosa', label: '👥 Rosa', html: rosaHTML, warn: S.squad.length < MIN_SQUAD || fyCount > 0 || !!(S.scoutProspects && S.scoutProspects.length) },
      { key: 'stadio', label: '🏟️ Stadio', html: stadioHTML, warn: false },
      { key: 'sponsor', label: '🤝 Sponsor', html: sponsorHTML, warn: !S.sponsor },
    ];
    if (!TABS.some((t) => t.key === boardTab)) boardTab = 'finanze';
    const activeTab = TABS.find((t) => t.key === boardTab);

    body.innerHTML = `
      <div class="ow-stickybar">
        <div class="cell main"><span>Budget</span><b class="${S.budget < 0 ? 'bad' : ''}">${fmtMoney(S.budget)}</b></div>
        <div class="cell"><span>Costo d'avvio</span><b>${fmtMoney(bill)}</b></div>
        <div class="cell free"><span>Libero da spendere</span><b class="${free < 0 ? 'bad' : ''}">${fmtMoney(free)}</b></div>
      </div>
      ${crestMarkup(S.crestShape, S.crestColors, 'ow-board-crest')}
      <div class="dyn-top"><div class="dyn-top-title">Dirigenza</div><div class="dyn-top-sub">${S.owner} · ${S.club} · Stagione ${S.season} di ${MAX_SEASONS}</div></div>
      ${ladderHTML()}
      <div class="ow-tabs">${TABS.map((t) => `<button class="ow-tab ${boardTab === t.key ? 'on' : ''}" data-tab="${t.key}">${t.label}${t.warn ? '<span class="dot"></span>' : ''}</button>`).join('')}</div>
      <div id="boardTabBody">${activeTab.html}</div>
      ${mpBoard ? `
        <button class="dyn-btn dyn-btn-primary" id="mpBoardReadyBtn">✅ Sono pronto</button>
        <button class="dyn-btn" id="mpBoardBackBtn">🔙 Torna alla stanza</button>
      ` : `<button class="dyn-btn dyn-btn-primary" id="startSeasonBtn">Inizia Stagione ${S.season} · ${d.name}</button>`}
      <div class="ow-exit-row">
        <button class="dyn-btn" id="sellBtn">💷 Vendi il club · ${fmtMoney(worth)}</button>
        <button class="dyn-btn" id="resignBtn">Dimettiti</button>
      </div>`;
    // colleghiamo tutto
    body.querySelectorAll('[data-tab]').forEach((el) => el.addEventListener('click', () => { boardTab = el.dataset.tab; renderBoard(); }));
    // Scheda giocatore: tocca la riga per aprirla, ma non se il tocco è su uno dei bottoni
    // di azione della riga stessa (Vendi/Rinnova/Riscatta), che hanno il loro handler.
    body.querySelectorAll('.ow-player[data-pid]').forEach((el) => el.addEventListener('click', (ev) => {
      if (ev.target.closest('button')) return;
      openPlayerDetail(+el.dataset.pid);
    }));
    // La cessione è irreversibile: prima di eseguirla chiediamo conferma con l'overlay
    // (stesso pattern di "Vendi il club"/"Dimettiti"), per evitare che un tap sbagliato sul
    // 💷 nella lista rosa costi un giocatore per sempre.
    body.querySelectorAll('.ow-x').forEach((el) => el.addEventListener('click', () => {
      const p = S.squad.find((x) => x.pid === +el.dataset.rel); if (!p) return;
      const fee = Math.round(playerValue(p) * 0.3);
      overlay(`<h2>Cedere ${p.n}?</h2>
        <div class="ow-spin-card">
          <div class="big" style="color:${ovrTier(p.ovr).c}">${p.ovr}</div>
          <div class="nm">${flagOf(p)}${p.n}</div>
          <div class="meta">età ${p.age} · ${POS_LABEL[p.pos]}</div>
          <div class="meta">Incassi <b>${fmtMoney(fee)}</b> — non si può annullare</div>
        </div>
        <div class="dyn-modal-actions">
          <button class="dyn-btn dyn-btn-primary" id="ovConfirmRel">Cedi per ${fmtMoney(fee)}</button>
          <button class="dyn-btn" id="ovCancelRel">Annulla</button>
        </div>`);
      $('ovConfirmRel').onclick = () => {
        closeOverlay();
        const i = S.squad.findIndex((x) => x.pid === p.pid); if (i < 0) return;
        pushAlumnus(p); S.squad.splice(i, 1); S.offers = (S.offers || []).filter((o) => o.pid !== p.pid); S.budget += fee;
        toast('Ceduto ' + p.n + ' per ' + fmtMoney(fee) + '.', 'money'); renderBoard(); saveGame();
      };
      $('ovCancelRel').onclick = closeOverlay;
    }));
    // Rinnova un contratto: nella lista rosa il bottone compare solo per chi è in scadenza
    // (finalYear); per tutti gli altri il rinnovo resta possibile ma solo aprendo la scheda
    // del giocatore (tocca la riga), per non affollare la lista di bottoni "Rinnova" inutili
    // su una rosa intera. Sempre un aumento, più ripido per i giovani talenti; se non
    // rinnovi in tempo lo perdi a parametro zero.
    body.querySelectorAll('.ow-renew').forEach((el) => el.addEventListener('click', () => {
      const p = S.squad.find((x) => x.pid === +el.dataset.renew); if (!p) return;
      openRenewOverlay(p);
    }));
    // Riscatta un giocatore in prestito a titolo definitivo: se non lo fai entro l'inizio
    // della stagione, torna al suo club (vedi startSeason).
    body.querySelectorAll('[data-buyback]').forEach((el) => el.addEventListener('click', () => {
      const p = S.squad.find((x) => x.pid === +el.dataset.buyback); if (!p) return;
      const fee = loanBuybackFee(p);
      if (S.budget < fee) { toast('Non hai abbastanza per riscattarlo.', 'error'); return; }
      S.budget -= fee; p.loan = false; p.yrs = 3 + rnd(2);
      toast(p.n + ' riscattato a titolo definitivo per ' + fmtMoney(fee) + '.', 'spend');
      renderBoard(); saveGame();
    }));
    // Accetta un'offerta: incassi la cifra, il giocatore parte. Vendere un vero big infastidisce l'ambiente.
    body.querySelectorAll('.ow-accept').forEach((el) => el.addEventListener('click', () => {
      const pid = +el.dataset.acc; const o = (S.offers || []).find((x) => x.pid === pid);
      const i = S.squad.findIndex((x) => x.pid === pid); if (!o || i < 0) return;
      const p = S.squad[i];
      pushAlumnus(p); S.budget += o.fee; S.squad.splice(i, 1); S.offers = S.offers.filter((x) => x.pid !== pid);
      if (p.ovr >= divOf().avg + 6) S.sent = clamp(S.sent - 3, 0, 100);
      toast('Venduto ' + p.n + ' al ' + o.club + ' per ' + fmtMoney(o.fee) + '.', 'money'); renderBoard(); saveGame();
    }));
    // Un po' di leva negoziale invece di prendere-o-lasciare: rilanciare una sola volta per
    // offerta (per non ridurla a un loop di "chiedi sempre di più senza rischio") — il
    // compratore può alzare l'offerta o ritirarsi del tutto.
    body.querySelectorAll('[data-counter]').forEach((el) => el.addEventListener('click', () => {
      const pid = +el.dataset.counter; const o = (S.offers || []).find((x) => x.pid === pid); if (!o || o.countered) return;
      const p = S.squad.find((x) => x.pid === pid);
      o.countered = true;
      if (Math.random() < 0.55) {
        const higher = Math.round(o.fee * (1.15 + Math.random() * 0.15) / 1e4) * 1e4;
        o.fee = higher;
        toast(o.club + ' alza l\'offerta a ' + fmtMoney(higher) + (p ? ' per ' + p.n : '') + '.', 'money');
      } else {
        S.offers = S.offers.filter((x) => x.pid !== pid);
        toast(o.club + ' si ritira dopo il rilancio: niente offerta' + (p ? ' per ' + p.n : '') + '.', 'error');
      }
      renderBoard(); saveGame();
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
      if (S.budget < sev) { toast('Non puoi permetterti la buonuscita.', 'error'); return; }
      S.budget -= sev; S.manager = m; S.mgrOpts = null;
      toast(m.n + ' prende in carico la squadra. Buonuscita pagata: ' + fmtMoney(sev), 'spend'); renderBoard(); saveGame();
    }));
    body.querySelectorAll('.ow-hire-ds').forEach((el) => el.addEventListener('click', () => {
      const m = (S.dsOpts || [])[+el.dataset.hireds]; if (!m) return;
      S.sportingDirector = m; S.dsOpts = null;
      toast(m.n + ' è il nuovo direttore sportivo.', 'success'); renderBoard(); saveGame();
    }));
    const dsFireBtn = $('dsFireBtn');
    if (dsFireBtn) dsFireBtn.onclick = () => {
      const sev = Math.round(S.sportingDirector.salary * 0.3);
      if (S.budget < sev) { toast('Non puoi permetterti la buonuscita.', 'error'); return; }
      S.budget -= sev; S.sportingDirector = null; S.dsOpts = null;
      toast('Direttore sportivo licenziato. Buonuscita pagata: ' + fmtMoney(sev), 'spend'); renderBoard(); saveGame();
    };
    body.querySelectorAll('.ow-offer').forEach((el) => el.addEventListener('click', () => {
      const o = S.sponsorOpts[+el.dataset.sp]; if (!o) return;
      S.sponsor = o; S.sponsorOpts = null;
      toast('Firmato con ' + o.name + ' per ' + fmtMoney(o.perYear) + ' all\'anno.', 'success'); renderBoard(); saveGame();
    }));
    const upg = $('upgradeBtn');
    if (upg) upg.addEventListener('click', () => {
      const nx = STADIUM[S.stadiumTier + 1]; if (!nx || S.budget < nx.cost) return;
      spendGuard(nx.cost, 'L\'ampliamento', '', () => {
        S.budget -= nx.cost; S.stadiumTier++; S.stadiumSpent += nx.cost; S.sent = clamp(S.sent + 3, 0, 100);
        toast('Le ruspe entrano in azione. Nuova capienza: ' + nx.cap.toLocaleString('it-IT'), 'spend'); renderBoard(); saveGame();
      });
    });
    body.querySelectorAll('.ow-ticket').forEach((el) => el.addEventListener('click', () => { S.ticket = +el.dataset.tk; renderBoard(); saveGame(); if (DynSound) DynSound.tap(); }));
    const std = $('spinStdBtn'), prem = $('spinPremBtn'), premRole = $('spinPremRoleBtn'), stdRole = $('spinStdRoleBtn');
    if (std) std.addEventListener('click', () => doSpin(false));
    if (prem) prem.addEventListener('click', () => doSpin(true));
    if (premRole) premRole.addEventListener('click', () => doSpin(true, true));
    if (stdRole) stdRole.addEventListener('click', () => doSpin(false, true));
    const fa = $('freeAgentBtn');
    if (fa) fa.addEventListener('click', pickFreeAgentRole);
    const inv = $('investorBtn');
    if (inv) inv.addEventListener('click', () => {
      const amount = Math.round(divOf().investor * diffOf().sponsorMult / 1e4) * 1e4;
      S.investorUsed = true; S.budget += amount;
      toast('Un investitore stacca un assegno: +' + fmtMoney(amount), 'money'); renderBoard(); saveGame();
    });
    const autoInvestorChk = $('autoInvestorChk');
    if (autoInvestorChk) autoInvestorChk.addEventListener('change', () => { S.autoInvestor = autoInvestorChk.checked; saveGame(); });
    const scoutUpg = $('scoutUpgBtn');
    if (scoutUpg) scoutUpg.addEventListener('click', () => {
      const lvl = (S.scoutLevel || 0) + 1, cost = scoutUpgradeCost(lvl); if (S.budget < cost) return;
      spendGuard(cost, 'L\'investimento nel settore giovanile', '', () => {
        S.budget -= cost; S.scoutLevel = lvl;
        toast('Settore giovanile potenziato: ' + SCOUT_TIERS[lvl].name + '.'); renderBoard(); saveGame();
      });
    });
    body.querySelectorAll('[data-scoutsign]').forEach((el) => el.addEventListener('click', () => {
      const i = +el.dataset.scoutsign;
      const p = S.scoutProspects && S.scoutProspects[i]; if (!p) return;
      S.squad.push(p);
      toast(p.n + ' entra in prima squadra dal settore giovanile.', 'success');
      S.scoutProspects = []; renderBoard(); saveGame();
    }));
    body.querySelectorAll('[data-role]').forEach((el) => el.addEventListener('click', () => { squadRoleFilter = el.dataset.role; renderBoard(); }));
    const sortBtn = $('squadSortBtn');
    if (sortBtn) sortBtn.addEventListener('click', () => { squadSortDesc = !squadSortDesc; renderBoard(); });
    body.querySelectorAll('[data-formation]').forEach((el) => el.addEventListener('click', () => { previewFormation = el.dataset.formation; S.formation = previewFormation; selectedPreviewPid = null; renderBoard(); saveGame(); }));
    // Scambio titolare/panchina: primo tocco seleziona, secondo tocco su un altro giocatore
    // scambia i due (stesso giocatore due volte = deseleziona). Funziona anche titolare
    // con titolare, per riordinare la formazione a piacere.
    body.querySelectorAll('[data-pid]').forEach((el) => el.addEventListener('click', () => {
      const pid = +el.dataset.pid;
      if (selectedPreviewPid == null) { selectedPreviewPid = pid; renderBoard(); return; }
      if (selectedPreviewPid === pid) { selectedPreviewPid = null; renderBoard(); return; }
      const xi = S.previewXI.pids;
      const idxA = xi.indexOf(selectedPreviewPid), idxB = xi.indexOf(pid);
      if (idxA >= 0 && idxB >= 0) { xi[idxA] = pid; xi[idxB] = selectedPreviewPid; }
      else if (idxA >= 0) { xi[idxA] = pid; }
      else if (idxB >= 0) { xi[idxB] = selectedPreviewPid; }
      selectedPreviewPid = null;
      renderBoard(); saveGame();
    }));
    const resetXI = $('resetXIBtn');
    if (resetXI) resetXI.addEventListener('click', () => { S.previewXI = null; selectedPreviewPid = null; renderBoard(); saveGame(); });
    if (mpBoard) {
      $('mpBoardReadyBtn').onclick = async () => {
        // Stesso controllo di startSeason() (sim.js) prima di lasciar partire la stagione in
        // singolo: lì un budget/rosa insufficiente blocca "Inizia Stagione" con un avviso. In
        // multiplayer "Inizia Stagione" non esiste più (la stagione la avvia l'host per tutti),
        // quindi lo stesso controllo va fatto qui, altrimenti la tua simulazione fallirebbe in
        // silenzio nel browser dell'host (startSeason si ferma senza toast per un ctx remoto).
        if (S.squad.length < MIN_SQUAD) { toast('Ti servono almeno ' + MIN_SQUAD + ' giocatori per iniziare la prossima stagione. Ingaggia svincolati gratis se sei a corto.', 'error'); return; }
        const bill = kickoffBill();
        if (S.budget < bill) { toast('Ti mancano ' + fmtMoney(bill - S.budget) + ' per il monte ingaggi della prossima stagione: vendi giocatori, prendi il bonus investitore o trova soldi prima di essere pronto.', 'error'); return; }
        saveGame();
        try {
          const data = await mpApi('ready', { code: mpSess.code, playerId: mpSess.playerId, ready: true, state: S });
          if (DynSound) DynSound.tap();
          stopMpPolling();
          renderLobby(data.room, mpSess.playerId);
        } catch (e) { toast(e.message || 'Impossibile sottomettere la carriera.', 'error'); }
      };
      $('mpBoardBackBtn').onclick = async () => {
        try {
          const room = await mpFetchState(mpSess.code);
          stopMpPolling();
          renderLobby(room, mpSess.playerId);
        } catch (e) { toast('Impossibile aggiornare lo stato della stanza.', 'error'); }
      };
    } else {
      $('startSeasonBtn').addEventListener('click', () => { if (DynSound) DynSound.kickoff(); startSeason(); });
    }
    $('sellBtn').addEventListener('click', confirmSell);
    $('resignBtn').addEventListener('click', confirmResign);
    show('owBoardScreen'); saveGame();
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

  // chooseRole=true è il percorso esplicito dal pulsante "🎯 Scegli ruolo" (presente sia per
  // lo spin normale che per quello di lusso): il bottone principale di ciascuno resta sempre
  // casuale, senza aprire nulla.
  function doSpin(premium, chooseRole) {
    const cost = spinCostNow(premium);
    if (S.budget < cost) { toast('Budget non sufficiente.'); return; }
    const roleUsed = premium ? S.premiumRoleUsed : S.stdRoleUsed;
    if (chooseRole && !roleUsed) { pickSpinRole(premium, cost); return; }
    spendGuard(cost, premium ? 'Uno spin di lusso' : 'Uno spin', 'Se rifiuti il giocatore ti torna solo il 40% dello spin.', () => runSpin(premium, cost));
  }

  // Gli spin (normale e di lusso) sono illimitati (costano sempre di più, uno per tipo) e per
  // difetto pescano un ruolo a caso: solo premendo apposta "🎯 Scegli ruolo" (una sola volta
  // a stagione PER TIPO di spin) si sceglie chi cercare.
  function pickSpinRole(premium, cost) {
    const counts = { POR: 0, DIF: 0, CEN: 0, ATT: 0 };
    S.squad.forEach((p) => { if (counts[p.pos] != null) counts[p.pos]++; });
    const ROLE_ICON = { POR: '🧤', DIF: '🛡️', CEN: '👟', ATT: '⚽' };
    const label = premium ? 'spin di lusso' : 'spin';
    overlay(`
      <h2>🎯 Scegli il ruolo</h2>
      <p>Lo scout andrà a cercare un giocatore per lo ${label} in questo ruolo. Puoi farlo una sola volta a stagione: i prossimi ${label} torneranno casuali.</p>
      <div class="ow-role-grid">
        ${['POR', 'DIF', 'CEN', 'ATT'].map((r) => `<button class="ow-role-pick postag-${r}" data-role="${r}" ${counts[r] >= POS_CAP[r] ? 'disabled' : ''}>
          <span class="ow-role-ico">${ROLE_ICON[r]}</span><span class="ow-role-lbl">${POS_LABEL[r]}</span>${counts[r] >= POS_CAP[r] ? '<small>al completo</small>' : ''}
        </button>`).join('')}
      </div>
      <div class="dyn-modal-actions"><button class="dyn-btn" id="ovRoleCancel">Annulla</button></div>`);
    $('owOverlayModal').querySelectorAll('.ow-role-pick').forEach((btn) => {
      btn.addEventListener('click', () => { const role = btn.dataset.role; closeOverlay(); spendGuard(cost, premium ? 'Uno spin di lusso' : 'Uno spin', 'Se rifiuti il giocatore ti torna solo il 40% dello spin.', () => runSpin(premium, cost, role)); });
    });
    $('ovRoleCancel').onclick = closeOverlay;
  }

  // Anche uno svincolato (gratis) lascia scegliere il ruolo, invece di uscire a caso.
  function pickFreeAgentRole() {
    const counts = { POR: 0, DIF: 0, CEN: 0, ATT: 0 };
    S.squad.forEach((p) => { if (counts[p.pos] != null) counts[p.pos]++; });
    const ROLE_ICON = { POR: '🧤', DIF: '🛡️', CEN: '👟', ATT: '⚽' };
    overlay(`
      <h2>🖊️ Ingaggia uno svincolato</h2>
      <p>Scegli il ruolo dello svincolato da tesserare gratis.</p>
      <div class="ow-role-grid">
        ${['POR', 'DIF', 'CEN', 'ATT'].map((r) => `<button class="ow-role-pick postag-${r}" data-role="${r}" ${counts[r] >= POS_CAP[r] ? 'disabled' : ''}>
          <span class="ow-role-ico">${ROLE_ICON[r]}</span><span class="ow-role-lbl">${POS_LABEL[r]}</span>${counts[r] >= POS_CAP[r] ? '<small>al completo</small>' : ''}
        </button>`).join('')}
      </div>
      <div class="dyn-modal-actions"><button class="dyn-btn" id="ovFaRoleCancel">Annulla</button></div>`);
    $('owOverlayModal').querySelectorAll('.ow-role-pick').forEach((btn) => {
      btn.addEventListener('click', () => { const role = btn.dataset.role; closeOverlay(); confirmFreeAgent(role); });
    });
    $('ovFaRoleCancel').onclick = closeOverlay;
  }

  function confirmFreeAgent(role) {
    const p = freeAgent(role);
    overlay(`
      <h2>🖊️ Svincolato tesserato</h2>
      <div class="ow-spin-card">
        <div class="big" style="color:${ovrTier(p.ovr).c}">${p.ovr}</div>
        <div class="nm">${flagOf(p)}${p.n} <span class="postag postag-${p.pos}" style="vertical-align:middle">${p.pos}</span></div>
        <div class="meta">${POS_LABEL[p.pos]} · età ${p.age} · ${fmtYr(p.wage)}</div>
      </div>
      <div class="dyn-modal-actions">
        <button class="dyn-btn dyn-btn-primary" id="ovFaOk">OK</button>
      </div>`);
    $('ovFaOk').onclick = () => {
      S.squad.push(p);
      closeOverlay();
      toast('Lo svincolato ' + p.n + ' si aggrega alla rosa.', 'success');
      renderBoard(); saveGame();
    };
  }

  function runSpin(premium, cost, role) {
    const d = divOf();
    S.budget -= cost;
    S.spinsBought = (S.spinsBought || 0) + 1;
    if (role) { if (premium) S.premiumRoleUsed = true; else S.stdRoleUsed = true; }
    const p = spinPlayer(premium, role);
    S._spin = p; saveGame();
    overlay(`
      <h2>${premium ? '💎 Lo scout torna' : '🎰 Lo scout torna'}</h2>
      <div class="ow-spin-card${p.real ? ' is-real' : ''}">
        ${p.icon ? '<div class="real-badge icon-badge">🏆 LEGGENDA</div>' : p.real && p.fromClub ? `<div class="real-badge">🌟 GIOCATORE REALE · da ${p.fromClub}</div>` : ''}
        <div class="big" style="color:${ovrTier(p.ovr).c}">${p.ovr}</div>
        <div class="nm">${flagOf(p)}${p.n} <span class="postag postag-${p.pos}" style="vertical-align:middle">${p.pos}</span></div>
        <div class="meta">${POS_LABEL[p.pos]} · età ${p.age} · chiede <b>${fmtYr(p.wage)}</b></div>
        <div class="meta">Hai <b>${fmtMoney(freeToSpend())}</b> liberi dopo gli stipendi</div>
        ${p.ovr >= d.avg + 7 ? '<div class="gem">⭐ Un colpo da titoli di giornale per questo livello</div>' : ''}
      </div>
      <div class="dyn-modal-actions">
        <button class="dyn-btn dyn-btn-primary" id="ovSign">Ingaggialo</button>
        <button class="dyn-btn" id="ovPass">Passa</button>
      </div>`);
    // Un piccolo momento in più quando lo spin pesca qualcosa di speciale: un giocatore
    // vero (o un'icona) suona diverso e si accende di coriandoli, non solo un bordo colorato.
    if (DynSound) { if (p.real) DynSound.spinRevealReal(); else DynSound.spinReveal(); }
    if (p.real || p.icon) { const card = $('owOverlayModal').querySelector('.ow-spin-card'); if (card) fireConfetti(card); }
    $('ovSign').onclick = () => {
      S.squad.push(p);
      if (p.ovr >= d.avg + 7) S.sent = clamp(S.sent + 2, 0, 100);
      S._spin = null; closeOverlay(); toast(p.n + ' firma.', 'success'); renderBoard(); saveGame();
    };
    $('ovPass').onclick = () => {
      const refund = Math.round(cost * 0.4);
      S.budget += refund;
      S._spin = null; closeOverlay();
      toast('Passi. Lo scout ti restituisce ' + fmtMoney(refund) + ' (40% dello spin).', 'money');
      renderBoard(); saveGame();
    };
  }

  // L'overlay di rinnovo vero e proprio: richiamato sia dal bottone "Rinnova" in lista (solo
  // per chi è in scadenza) sia dalla scheda giocatore (per chiunque, in ogni momento).
  function openRenewOverlay(p) {
    const nw = renewWage(p), ny = renewYears(p);
    overlay(`
      <h2>📝 Nuovo contratto</h2>
      <div class="ow-spin-card">
        <div class="big" style="color:${ovrTier(p.ovr).c}">${p.ovr}</div>
        <div class="nm">${flagOf(p)}${p.n}</div>
        <div class="meta">età ${p.age} · guadagna <b>${fmtYr(p.wage)}</b>, ${p.yrs} ann${p.yrs === 1 ? 'o' : 'i'} rimasti</div>
        <div class="meta">Chiede <b class="${nw < p.wage ? 'good' : ''}">${fmtYr(nw)}</b> per <b>${ny} anni</b>${nw < p.wage ? ' <span class="tag" title="Il suo valore di mercato è sceso: accetta di guadagnare meno per restare">📉 taglio volontario</span>' : ''}</div>
        <div class="meta">Hai <b>${fmtMoney(freeToSpend())}</b> liberi dopo gli stipendi</div>
      </div>
      <div class="dyn-modal-actions">
        <button class="dyn-btn dyn-btn-primary" id="ovRenew">Accetta l'accordo</button>
        <button class="dyn-btn" id="ovNoRenew">Non ora</button>
      </div>`);
    $('ovRenew').onclick = () => { p.wage = nw; p.yrs = ny; closeOverlay(); toast(p.n + ' firma un nuovo contratto di ' + ny + ' anni.', 'success'); renderBoard(); saveGame(); };
    $('ovNoRenew').onclick = closeOverlay;
  }

  // Scheda dettagliata di un calciatore in rosa: anagrafica, contratto e statistiche della
  // stagione in corso, richiamabile toccando la sua riga nell'elenco Rosa.
  function openPlayerDetail(pid) {
    const p = S.squad.find((x) => x.pid === pid); if (!p) return;
    if (p.joinedSeason == null) p.joinedSeason = S.season;
    const isGK = p.pos === 'POR';
    const seasons = Math.max(1, (S.season - p.joinedSeason) + 1);
    const totalApps = (p.careerApps || 0) + (p.seasonApps || 0);
    const totalGoals = (p.careerGoals || 0) + (p.seasonGoals || 0);
    const totalAssists = (p.careerAssists || 0) + (p.seasonAssists || 0);
    const totalCleanSheets = (p.careerCleanSheets || 0) + (p.seasonCleanSheets || 0);
    const tenureRow = `<div class="ow-fin-row"><span>In squadra da</span><b>${seasons} stagion${seasons === 1 ? 'e' : 'i'}</b></div>`;
    const statRows = isGK
      ? `<div class="ow-fin-row"><span>Presenze stagionali</span><b>🎽 ${p.seasonApps || 0}</b></div>
         <div class="ow-fin-row"><span>Clean sheet stagionali</span><b>🧤 ${p.seasonCleanSheets || 0}</b></div>
         ${tenureRow}
         <div class="ow-fin-row"><span>Presenze totali</span><b>🎽 ${totalApps}</b></div>
         <div class="ow-fin-row"><span>Clean sheet totali</span><b>🧤 ${totalCleanSheets}</b></div>`
      : `<div class="ow-fin-row"><span>Presenze stagionali</span><b>🎽 ${p.seasonApps || 0}</b></div>
         <div class="ow-fin-row"><span>Gol stagionali</span><b>⚽ ${p.seasonGoals || 0}</b></div>
         <div class="ow-fin-row"><span>Assist stagionali</span><b>👟 ${p.seasonAssists || 0}</b></div>
         ${tenureRow}
         <div class="ow-fin-row"><span>Presenze totali</span><b>🎽 ${totalApps}</b></div>
         <div class="ow-fin-row"><span>Gol totali</span><b>⚽ ${totalGoals}</b></div>
         <div class="ow-fin-row"><span>Assist totali</span><b>👟 ${totalAssists}</b></div>`;
    overlay(`
      <h2>Scheda giocatore</h2>
      <div class="ow-spin-card${p.real ? ' is-real' : ''}">
        ${p.icon ? '<div class="real-badge icon-badge">🏆 LEGGENDA</div>' : p.real && p.fromClub ? `<div class="real-badge">🌟 GIOCATORE REALE · da ${p.fromClub}</div>` : ''}
        <div class="big" style="color:${ovrTier(p.ovr).c}">${p.pid === S.captainPid ? p.ovr + 1 : p.ovr}${p.pid === S.captainPid ? ' <small title="Il capitano gioca con +1 OVR">© +1</small>' : ''}</div>
        <div class="nm">${flagOf(p)}${p.n}${p.pid === S.captainPid ? ' ©' : ''} <span class="postag postag-${p.pos}" style="vertical-align:middle">${p.pos}</span></div>
        <div class="meta">${POS_LABEL[p.pos]} · ${p.nat ? p.nat.name : '-'} · età ${p.age}</div>
      </div>
      <div class="ow-sec" style="margin-top:4px">
        ${statRows}
        <div class="ow-fin-row"><span>Stipendio</span><b>${fmtYr(p.wage)}</b></div>
        <div class="ow-fin-row"><span>Contratto</span><b>${p.loan ? 'In prestito' : p.yrs + ' ann' + (p.yrs === 1 ? 'o' : 'i') + ' rimast' + (p.yrs === 1 ? 'o' : 'i')}</b></div>
        <div class="ow-fin-row"><span>Valore di mercato stimato</span><b>${fmtMoney(playerValue(p))}</b></div>
        ${p.outWeeks > 0 ? `<div class="ow-fin-row bad"><span>Infortunato</span><b>🚑 fuori ${p.outWeeks} partit${p.outWeeks === 1 ? 'a' : 'e'}</b></div>` : ''}
        ${p.suspMatches > 0 ? `<div class="ow-fin-row bad"><span>Squalificato</span><b>🟥 salta la prossima</b></div>` : ''}
        <div class="ow-fin-row"><span>Fascia di capitano</span><b>${p.pid === S.captainPid ? '© È lui/lei il capitano (+1 OVR)' : p.age > CAPTAIN_MIN_AGE ? 'Non è il capitano' : `Non è il capitano (serve più di ${CAPTAIN_MIN_AGE} anni)`}</b></div>
      </div>
      <div class="dyn-modal-actions">
        ${!p.loan ? `<button class="dyn-btn dyn-btn-primary" id="ovDetailRenew">📝 Rinnova</button>` : ''}
        ${p.pid !== S.captainPid && !p.loan && p.age > CAPTAIN_MIN_AGE ? `<button class="dyn-btn" id="ovDetailCaptain">© Nomina capitano</button>` : ''}
        <button class="dyn-btn" id="ovDetailClose">Chiudi</button>
      </div>`);
    $('ovDetailClose').onclick = closeOverlay;
    const renewBtn = $('ovDetailRenew');
    if (renewBtn) renewBtn.onclick = () => openRenewOverlay(p);
    const captainBtn = $('ovDetailCaptain');
    if (captainBtn) captainBtn.onclick = () => {
      if (p.age <= CAPTAIN_MIN_AGE) { toast('Il capitano deve avere più di ' + CAPTAIN_MIN_AGE + ' anni.', 'error'); return; }
      S.captainPid = p.pid; toast(p.n + ' è il nuovo capitano.', 'success'); closeOverlay(); renderBoard(); saveGame();
    };
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

  // Popup di un evento narrativo: un modale più "pesante" del solito (icona grande, bordo
  // colorato, animazione d'ingresso), che richiede un click esplicito per proseguire — una X
  // in alto a destra per i semplici avvisi, oppure le scelte stesse quando ce ne sono (niente
  // scorciatoia per saltarle: la scelta stessa è il "premi un bottone per continuare").
  // Riassunto testuale ed esplicito del bonus/malus numerico di un evento o di una sua
  // scelta (sent/budgetPct/ownerRating/fanbaseDelta/prestige): niente più effetti "a
  // sorpresa" nascosti nel codice, l'utente vede il numero prima o subito dopo aver scelto.
  // Gli effetti con `apply(S, ctx)` custom (sponsor, infortunio) non hanno numeri fissi da
  // mostrare qui: usano un `hint` scritto a mano in NARRATIVE_EVENTS.
  function narrativeEffectSummary(eff, inline) {
    if (!eff) return '';
    if (eff.hint) return inline ? `<span class="ow-eff-hint">${eff.hint}</span>` : eff.hint;
    const parts = [];
    if (eff.sent) parts.push((eff.sent > 0 ? '+' : '') + eff.sent + ' umore');
    if (eff.budgetPct) parts.push((eff.budgetPct > 0 ? '+' : '') + (Math.round(eff.budgetPct * 1000) / 10) + '% budget');
    if (eff.ownerRating) parts.push((eff.ownerRating > 0 ? '+' : '') + eff.ownerRating + ' reputazione');
    if (eff.fanbaseDelta) parts.push((eff.fanbaseDelta > 0 ? '+' : '') + eff.fanbaseDelta + ' bacino tifosi');
    if (eff.prestige) parts.push((eff.prestige > 0 ? '+' : '') + fmtMoney(eff.prestige) + ' prestigio');
    if (!parts.length) return '';
    return inline ? `<span class="ow-eff-hint">${parts.join(' · ')}</span>` : parts.join(' · ');
  }

  function openNarrativeEventOverlay(ev) {
    const hasChoices = Array.isArray(ev.choices) && ev.choices.length > 0;
    // `build` fissa UNA volta sola (all'apertura) i dettagli concreti dell'evento — es. quale
    // giocatore è coinvolto — così il testo mostrato e l'effetto della scelta parlano dello
    // stesso identico giocatore, invece di ripescarne uno a caso in due momenti diversi.
    const ctx = typeof ev.build === 'function' ? ev.build(S) : null;
    const text = typeof ev.text === 'function' ? ev.text(S, ctx) : ev.text;
    if (!hasChoices) applyNarrativeEffect(ev, ctx);   // un solo esito: si applica subito, il popup lo racconta
    const finish = () => { closeOverlay(); S._pause = false; checkSeasonMilestones(); };
    const outcomeSummary = !hasChoices ? narrativeEffectSummary(ev) : '';
    overlay(`
      <div class="ow-event-modal">
        ${!hasChoices ? '<button type="button" class="ow-modal-x" id="ovEventX" aria-label="Chiudi">✕</button>' : ''}
        <div class="ow-event-icon">${ev.icon || '📰'}</div>
        <h2>${ev.title || 'Imprevisto'}</h2>
        <p>${text}</p>
        ${outcomeSummary ? `<p class="ow-sub">${outcomeSummary}</p>` : ''}
        <div class="dyn-modal-actions">
          ${hasChoices
            ? ev.choices.map((c, i) => `<button type="button" class="dyn-btn ${i === 0 ? 'dyn-btn-primary' : ''}" data-choice="${i}">${c.label}${narrativeEffectSummary(c, true)}</button>`).join('')
            : '<button type="button" class="dyn-btn dyn-btn-primary" id="ovEventClose">Continua</button>'}
        </div>
      </div>`);
    if (hasChoices) {
      $('owOverlayModal').querySelectorAll('[data-choice]').forEach((btn) => btn.addEventListener('click', () => {
        applyNarrativeEffect(ev.choices[+btn.dataset.choice], ctx);
        finish();
      }));
    } else {
      $('ovEventClose').onclick = finish;
      $('ovEventX').onclick = finish;
    }
  }

  // Chi ha raggiunto l'età del ritiro (36+) non se ne va più in automatico all'inizio della
  // stagione: il presidente decide, uno alla volta — un'altra stagione (il suo rendimento
  // resta comunque in calo, come già mostrato dalla freccia nelle statistiche di fine anno)
  // o una partita d'addio davanti ai tifosi. Chiamata da advance() (sim.js) al posto di
  // renderBoard() quando c'è almeno un giocatore in questa situazione; richiama se stessa
  // sul resto dell'elenco finché non ne resta nessuno, poi apre la Dirigenza normale.
  function openRetirementOverlay(players) {
    const p = players && players[0];
    if (!p) { renderBoard(); return; }
    overlay(`
      <h2>🎽 Fine carriera in vista</h2>
      <div class="ow-spin-card">
        <div class="big" style="color:${ovrTier(p.ovr).c}">${p.ovr}</div>
        <div class="nm">${flagOf(p)}${p.n} <span class="postag postag-${p.pos}" style="vertical-align:middle">${p.pos}</span></div>
        <div class="meta">${p.age} anni · ${(p.careerApps || 0) + (p.seasonApps || 0)} presenze con questa maglia</div>
      </div>
      <p class="ow-sub">Ha raggiunto l'età del ritiro. Può giocare ancora un'altra stagione (il suo rendimento continuerà comunque a calare con l'età) oppure chiudere qui, con una partita d'addio davanti ai suoi tifosi.</p>
      <div class="dyn-modal-actions">
        <button class="dyn-btn" id="ovOneMore">Un'altra stagione</button>
        <button class="dyn-btn dyn-btn-primary" id="ovFarewell">🎉 Partita d'addio e ritiro</button>
      </div>`);
    $('ovOneMore').onclick = () => {
      p._retiring = false;
      toast(p.n + ' resta un\'altra stagione.', 'success');
      openRetirementOverlay(players.slice(1));
    };
    $('ovFarewell').onclick = () => {
      const i = S.squad.findIndex((x) => x.pid === p.pid);
      if (i >= 0) { pushAlumnus(p, S, true); S.squad.splice(i, 1); }
      S.sent = clamp(S.sent + 4, 0, 100);
      toast('Una partita d\'addio per ' + p.n + ': i tifosi lo salutano con affetto.', 'success');
      if (DynSound) DynSound.trophy();
      openRetirementOverlay(players.slice(1));
    };
  }

  function openWinter() {
    S._pause = true;
    if (!S._janCands) S._janCands = [spinPlayer(false, undefined, 3), spinPlayer(false, undefined, 3), spinPlayer(false, undefined, 3)];
    if (S._janSwitchUsed == null) S._janSwitchUsed = false;
    if (!S._janMgrCands) {
      S._janMgrCands = [genManager(2), genManager(5)];
      const legend = legendManagerCandidate();
      if (legend) S._janMgrCands[rnd(S._janMgrCands.length)] = legend;
    }
    renderWinterOverlay();
  }

  function renderWinterOverlay() {
    const d = divOf();
    const cands = S._janCands || [];
    const mgrCands = S._janMgrCands || [];
    const cardHTML = (p, i) => {
      const loanCost = janLoanCost(p), buyTotal = loanCost + janTransferFee(p);
      return `
      <div class="ow-jan-card${p.real ? ' is-real' : ''}">
        ${p.real && p.fromClub ? `<div class="real-badge real-badge-inline">🌟 GIOCATORE REALE · da ${p.fromClub}</div>` : ''}
        <div class="ow-jan-head">
          <span class="ovr" style="${ovrBadge(p.ovr)}">${p.ovr}</span>
          <span class="postag postag-${p.pos}">${p.pos}</span>
          <span class="nm">${flagOf(p)}${p.n}<small>${POS_LABEL[p.pos]} · età ${p.age} · chiede ${fmtYr(p.wage)}</small></span>
          ${!S._janSwitchUsed ? `<button class="ow-jan-switch" data-jan-switch="${i}" title="Cambia questo giocatore (una sola volta)">🔄</button>` : ''}
        </div>
        <div class="ow-jan-actions">
          <button class="dyn-mini" data-jan-loan="${i}" ${S.budget < loanCost ? 'disabled' : ''}>🏷️ Prestito · ${fmtMoney(loanCost)}</button>
          <button class="dyn-mini" data-jan-buy="${i}" ${S.budget < buyTotal ? 'disabled' : ''}>💰 Acquisto · ${fmtMoney(buyTotal)}</button>
        </div>
      </div>`;
    };
    overlay(`
      <h2>❄️ Il mercato di gennaio</h2>
      <p>A metà strada. ${ord(currentPos())} in ${d.name}. Budget ${fmtMoney(S.budget)}.</p>
      ${cands.length ? cands.map(cardHTML).join('') : '<div class="ow-sub">Nessun altro candidato in questa finestra.</div>'}
      <div class="ow-mgr"><span class="ovr" style="${ovrBadge(S.manager.rating)}">${S.manager.rating}</span><span class="nm">${flagOf(S.manager)}${S.manager.n}<small>${specOf(S.manager.spec).icon} ${specOf(S.manager.spec).label} · Allenatore in carica</small></span><span class="tag">In carica</span></div>
      <div class="ow-sub" style="margin:8px 0 6px;text-align:left">Esonera (30% di buonuscita) e nomina:</div>
      ${mgrCands.map((m, i) => `<div class="ow-mgr cand"><span class="ovr" style="${ovrBadge(m.rating)}">${m.rating}</span><span class="nm">${flagOf(m)}${m.n}${m.exPlayer ? ' <small title="Una tua ex leggenda">🎓</small>' : ''}<small>${fmtMoney(m.salary)}/anno, metà pagata subito · ${specOf(m.spec).icon} ${specOf(m.spec).label}${m.exPlayer ? ' · Ex giocatore del club' : ''}</small></span><button class="dyn-mini" data-wh="${i}" title="${specOf(m.spec).desc}">Assumi</button></div>`).join('')}
      <div class="dyn-modal-actions"><button class="dyn-btn dyn-btn-primary" id="ovPlayOn">Continua così</button></div>`);
    $('ovPlayOn').onclick = () => { S.winterDone = true; S._pause = false; S._janCands = null; S._janSwitchUsed = false; S._janMgrCands = null; closeOverlay(); saveGame(); if (S.played >= gp()) endSeason(); };
    document.querySelectorAll('#owOverlayModal [data-jan-loan]').forEach((el) => el.addEventListener('click', () => {
      const i = +el.dataset.janLoan, p = S._janCands[i]; if (!p) return;
      const cost = janLoanCost(p);
      if (S.budget < cost) { toast('Non puoi coprire il suo stipendio.', 'error'); return; }
      S.budget -= cost; p.loan = true; S.squad.push(p);
      S._janCands.splice(i, 1);
      toast(p.n + ' arriva in prestito fino a fine stagione.', 'spend');
      saveGame(); renderWinterOverlay();
    }));
    document.querySelectorAll('#owOverlayModal [data-jan-buy]').forEach((el) => el.addEventListener('click', () => {
      const i = +el.dataset.janBuy, p = S._janCands[i]; if (!p) return;
      const cost = janLoanCost(p) + janTransferFee(p);
      if (S.budget < cost) { toast('Non hai abbastanza per acquistarlo a titolo definitivo.', 'error'); return; }
      S.budget -= cost; S.squad.push(p);
      S._janCands.splice(i, 1);
      toast(p.n + ' firma a titolo definitivo.', 'spend');
      saveGame(); renderWinterOverlay();
    }));
    document.querySelectorAll('#owOverlayModal [data-jan-switch]').forEach((el) => el.addEventListener('click', () => {
      if (S._janSwitchUsed) return;
      const i = +el.dataset.janSwitch; if (!S._janCands[i]) return;
      const old = S._janCands[i];
      S._janCands[i] = spinPlayer(false, undefined, 3);
      S._janSwitchUsed = true;
      if (DynSound) DynSound.tap();
      toast('Cambi ' + old.n + ' con un altro candidato.');
      saveGame(); renderWinterOverlay();
    }));
    document.querySelectorAll('#owOverlayModal [data-wh]').forEach((el) => el.addEventListener('click', () => {
      const m = S._janMgrCands[+el.dataset.wh]; if (!m) return;
      const cost = Math.round(S.manager.salary * 0.3) + Math.round(m.salary * 0.5);
      if (S.budget < cost) { toast('Non puoi permetterti il cambio (buonuscita + metà stipendio).', 'error'); return; }
      S.budget -= cost; S.manager = m;
      if (!S._seasonManagers) S._seasonManagers = [];
      S._seasonManagers.push(m.n);
      toast(m.n + ' prende il timone a stagione in corso.', 'spend');
      saveGame(); renderWinterOverlay();
    }));
  }

  // Un punteggio di rigori plausibile al posto del solo tag "(rigori)" — non decide MAI
  // l'esito (quello è già deciso altrove, qui c'è solo `r.won`), lo racconta soltanto: un
  // 5-4/4-3/ecc. coerente col vincitore, fissato la prima volta perché non cambi ad ogni
  // rirender della stessa schermata.
  function fmtPenScore(r) {
    if (r._penScore) return r._penScore;
    const loserMakes = 2 + rnd(3);
    const winnerMakes = loserMakes + 1 + (Math.random() < 0.3 ? 1 : 0);
    r._penScore = r.won ? (winnerMakes + '-' + loserMakes) : (loserMakes + '-' + winnerMakes);
    return r._penScore;
  }

  function renderSeasonEnd() {
    const e = S._end, d = divOf(), body = $('owSeasonEndBody');
    const banner = e.fate === 'forced' ? ['😡 I tifosi hanno parlato', 'Gradimento troppo basso. Sei costretto a dimetterti.']
      : e.fate === 'admin' ? ['🏦 Amministrazione controllata', 'Due stagioni in rosso. La banca chiede i conti.']
      : e.promoted ? ['🎉 PROMOZIONE', e.playoff && e.playoff.won ? 'Su tramite i playoff dopo un ' + ord(e.pos) + ' posto!' : e.title ? 'Campioni di ' + d.name + '!' : 'Promossi al ' + ord(e.pos) + ' posto!']
      : e.playoff && !e.playoff.won ? ['💔 Delusione playoff', 'Eliminati ' + (() => { const st = e.playoff.rounds[e.playoff.rounds.length - 1].stage.replace(' (aggregato)', ''); return st === 'Finale' ? 'in finale' : st === 'Semifinale' ? 'in semifinale' : 'ai quarti'; })() + ' playoff dopo un ' + ord(e.pos) + ' posto.']
      : e.relegated ? ['📉 Retrocessione', 'Giù al ' + ord(e.pos) + ' posto. I tifosi soffrono.']
      : e.title ? ['🏆 CAMPIONI', 'Vincitori di ' + d.name + '!']
      : ['Stagione ' + S.season + ' completata', ord(e.pos) + ' in ' + d.name + ' (i tifosi si aspettavano il ' + ord(e.exp) + ')'];
    const trophyChips = e.trophies.length ? e.trophies.map((t) => `<span class="trophy">🏆 ${t}</span>`).join('') : '<span class="trophy none">Nessun trofeo</span>';
    // Righe del playoff: una gamba (andata/ritorno) mostra solo il punteggio, il verdetto
    // arriva con la riga "(aggregato)" subito dopo con la ragione (differenza reti, miglior
    // piazzato, supplementari/rigori); il turno preliminare e il vecchio tabellone da 4
    // restano gara secca con l'eventuale nota su chi passa a parità.
    const playoffHTML = e.playoff ? `
        <div class="ow-sec-title" style="margin-top:12px">🏟️ I playoff</div>
        ${e.playoff.rounds.map((r) => {
          const usSc = fmtScorers(r.goalsFor), themSc = fmtScorers(r.goalsAgainst);
          if (r.leg) {
            return `<div class="ow-fin-row" style="flex-direction:column;align-items:stretch;gap:3px">
              <div style="display:flex;justify-content:space-between"><span>${r.stage} · ${r.leg} vs ${r.opp}</span><b>${r.gf}-${r.ga}</b></div>
              ${(usSc || themSc) ? `<div class="mrow-scorers">${usSc ? '<div class="sc us">⚽ ' + usSc + '</div>' : ''}${themSc ? '<div class="sc them">🥅 ' + themSc + '</div>' : ''}</div>` : ''}
            </div>`;
          }
          const note = r.aggregate ? (' (aggregato' + (r.tiebreak === 'pens' ? ', supplementari · rigori ' + fmtPenScore(r) : r.tiebreak === 'seed' ? ', meglio piazzato in classifica' : r.tiebreak === 'dr' ? ', differenza reti' : '') + ')')
            : r.seedWin ? (r.extra ? ' (supplementari, meglio piazzato)' : ' (meglio piazzato)')
            : r.pens ? ' (rigori ' + fmtPenScore(r) + ')' : '';
          return `<div class="ow-fin-row" style="flex-direction:column;align-items:stretch;gap:3px">
            <div style="display:flex;justify-content:space-between"><span>${r.stage} vs ${r.opp}</span><b class="${r.won ? 'good' : 'bad'}">${r.won ? 'V' : 'P'} ${r.gf}-${r.ga}${note}</b></div>
            ${(usSc || themSc) ? `<div class="mrow-scorers">${usSc ? '<div class="sc us">⚽ ' + usSc + '</div>' : ''}${themSc ? '<div class="sc them">🥅 ' + themSc + '</div>' : ''}</div>` : ''}
          </div>`;
        }).join('')}` : '';
    // Classifica finale del campionato appena chiuso: a colpo d'occhio, senza dover
    // riaprire il tabellone dalla sala del consiglio.
    const tableRecapHTML = `
        <div class="ow-sec-title" style="margin-top:12px">📋 Classifica finale · ${d.name}</div>
        <div style="max-height:44vh;overflow:auto;margin:0 -6px">${tableHTML()}</div>`;
    // Percorso in coppa, turno per turno: solo se ci sono stati turni da mostrare (niente
    // se il presidente non è nemmeno iscritto a una coppa europea quest'anno).
    const cupPathRow = (r) => `<div class="ow-fin-row"><span>${r.round}${r.opp ? ' vs ' + r.opp : ''}</span><b class="${r.won ? 'good' : 'bad'}">${r.gf}-${r.ga}${r.note ? ' · ' + r.note : ''}</b></div>`;
    const natPath = (e.cupPaths && e.cupPaths.nat) || [];
    const euroPath = (e.cupPaths && e.cupPaths.euro) || [];
    const cupPathHTML = (natPath.length ? `<div class="ow-sec-title" style="margin-top:12px">🇮🇹 Percorso in Coppa Italia</div>${natPath.map(cupPathRow).join('')}` : '')
      + (euroPath.length ? `<div class="ow-sec-title" style="margin-top:12px">${EURO_COMPS[e.euroCompWon].flag} Percorso in ${EURO_COMPS[e.euroCompWon].name}</div>${euroPath.map(cupPathRow).join('')}` : '');
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
    // Righe su due livelli: sopra overall+ruolo+nome COMPLETO (senza troncarlo), sotto le
    // statistiche più piccole. Coi tanti dati per riga (delta, overall, ruolo, nome, gol,
    // assist, presenze) su una riga sola il cognome finiva quasi sempre tagliato.
    const statRowHTML = (leftHTML, statsInner) => `
      <div class="ow-stat-row">
        <div class="ow-stat-row-top">${leftHTML}</div>
        <div class="ow-stat-row-bottom">${statsInner}</div>
      </div>`;
    const statsHTML = `
      <div class="ow-sec">
        <div class="ow-sec-title">📊 Statistiche giocatori</div>
        ${scorers.length ? `
          <div class="ow-sub">Marcatori e assist di ${S.club}${topScorer ? ' · capocannoniere ' + topScorer.n + ' (' + topScorer.seasonGoals + ')' : ''}</div>
          <div class="ow-squadlist" style="max-height:none">${scorers.map((p) => statRowHTML(
            `${ovrDeltaHTML(p)}<span class="ovr" style="${ovrBadge(p.ovr)}">${p.ovr}</span><span class="postag postag-${p.pos}">${p.pos}</span><span class="nm">${flagOf(p)}${p.n}</span>`,
            `<span style="color:var(--gold)">⚽ ${p.seasonGoals || 0}</span><span>👟 ${p.seasonAssists || 0}</span><span title="Presenze">🎽 ${p.seasonApps || 0}</span>`
          )).join('')}
          </div>` : '<div class="ow-sub">Nessun marcatore o assistman di rilievo questa stagione.</div>'}
        ${keepers.length ? `
          <div class="ow-sub" style="margin-top:10px">Portieri</div>
          <div class="ow-squadlist" style="max-height:none">${keepers.map((p) => statRowHTML(
            `${ovrDeltaHTML(p)}<span class="ovr" style="${ovrBadge(p.ovr)}">${p.ovr}</span><span class="nm">${flagOf(p)}${p.n}<small>${p.pid === gkStarterPid ? 'Titolare' : 'Riserva'}</small></span>`,
            `<span style="color:var(--good)">🧤 ${p.seasonCleanSheets || 0} clean sheet</span><span title="Presenze">🎽 ${p.seasonApps || 0}</span>`
          )).join('')}
          </div>` : ''}
      </div>`;
    // Un'animazione speciale per OGNI coppa/titolo vinto in questa stagione, non solo per i
    // 4 grandi momenti: scudetto (di qualunque categoria, non solo Serie A), Coppa Italia,
    // e ciascuna delle tre coppe europee ha il suo banner dedicato. Il Tripletе le sostituisce
    // tutte con un unico banner riassuntivo (altrimenti sarebbe la stessa notizia 3 volte).
    const bigMoments = [];
    if (e.treble) {
      bigMoments.push({ cls: 'treble', icon: '👑', title: 'TRIPLETE!', sub: d.name + ' + Coppa Italia + Champions League nella stessa stagione.' });
    } else {
      if (e.title) bigMoments.push({ cls: 'scudetto', icon: S.div === 5 ? '🏆' : '🥇', title: S.div === 5 ? 'SCUDETTO!' : 'CAMPIONI DI ' + d.name.toUpperCase() + '!', sub: 'Vincitori di ' + d.name + '.' });
      if (e.natWon) bigMoments.push({ cls: 'nat', icon: '🇮🇹', title: 'COPPA ITALIA', sub: 'Trofeo in bacheca, e qualificazione europea in tasca.' });
      if (e.euroWon) {
        const ec = EURO_COMPS[e.euroCompWon];
        const info = {
          ucl: { cls: 'ucl', title: 'CAMPIONI D\'EUROPA', sub: ec.name + ' alzata al cielo.' },
          uel: { cls: 'uel', title: 'EUROPA LEAGUE!', sub: ec.name + ' alzata al cielo.' },
          conf: { cls: 'conf', title: 'CONFERENCE LEAGUE!', sub: ec.name + ' alzata al cielo — e un posto in Europa League l\'anno prossimo.' },
        }[e.euroCompWon];
        if (info) bigMoments.push({ cls: info.cls, icon: ec.flag, title: info.title, sub: info.sub });
      }
    }
    const bigMomentHTML = bigMoments.map((m) => `
      <div class="ow-trophy-moment ${m.cls}">
        <div class="ow-trophy-icon">${m.icon}</div>
        <div class="ow-trophy-title">${m.title}</div>
        <div class="ow-trophy-sub">${m.sub}</div>
      </div>`).join('');
    body.innerHTML = `
      <div class="dyn-top"><div class="dyn-top-title">${banner[0]}</div><div class="dyn-top-sub">${banner[1]}</div></div>
      ${bigMomentHTML}
      <div class="dyn-panel">
        <div class="dyn-trophies">${trophyChips}</div>
        ${playoffHTML}
        ${cupPathHTML}
        ${(e.mpEvents && e.mpEvents.length) ? `
          <div class="ow-sec-title" style="margin-top:12px">📰 Cronaca della stagione</div>
          ${e.mpEvents.map((ev) => `<div class="ow-fin-row" style="align-items:flex-start"><span>${ev.icon || '📰'} <b>${ev.title || ''}</b><small style="display:block;color:var(--muted)">${ev.text || ''}</small></span></div>`).join('')}
        ` : ''}
        ${tableRecapHTML}
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
      <button class="dyn-btn" id="owShareBtn">📤 Condividi la stagione</button>
      <button class="dyn-btn dyn-btn-primary" id="owEndBtn">${e.fate ? 'Affronta le conseguenze' : S.season >= MAX_SEASONS ? 'Concludi la tua carriera' : 'Torna in sala del consiglio'}</button>`;
    $('owShareBtn').onclick = exportSeasonCard;
    if (e.promoted || e.title || e.trophies.length) celebrate(body.querySelector('.dyn-panel'));
    body.querySelectorAll('.ow-trophy-moment').forEach((bm) => { fireConfetti(bm); setTimeout(() => fireConfetti(bm), 550); });
    if (DynSound) {
      if (bigMoments.length || e.promoted) DynSound.trophy();
      else if (e.relegated || e.fate || (e.playoff && !e.playoff.won)) DynSound.sadDown();
      else DynSound.calmEnd();
    }
    $('owEndBtn').onclick = () => {
      if (e.fate === 'forced') { endDynasty('forced', 0); return; }
      if (e.fate === 'admin') { endDynasty('admin', 0); return; }
      if (S.season >= MAX_SEASONS) { endDynasty('retired', 0); return; }
      advance();
    };
    show('owSeasonEndScreen');
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
    S.trophies.titles.forEach((n, i) => { if (n) honours.push(n + 'x Titolo ' + (DIVS[i] ? DIVS[i].name : '')); });
    if (S.trophies.nat) honours.push(S.trophies.nat + 'x Coppa Italia');
    ['ucl', 'uel', 'conf'].forEach((k) => { if (S.trophies[k]) honours.push(S.trophies[k] + 'x ' + EURO_COMPS[k].name); });
    const topDiv = S.history.reduce((a, hh) => Math.max(a, DIVS.findIndex((x) => x.name === hh.div)), S.div);
    const promotions = S.history.filter((hh) => hh.promoted).length;
    // I migliori di sempre: chi è ancora in rosa (totali di carriera + stagione in corso) più
    // chi se n'è andato nel frattempo (venduto, svincolato, ritirato — vedi pushAlumnus),
    // altrimenti solo chi è rimasto fino all'ultimo giorno finirebbe in bacheca.
    const allTime = (S.squad || []).map((p) => ({
      n: p.n, pos: p.pos,
      apps: (p.careerApps || 0) + (p.seasonApps || 0),
      goals: (p.careerGoals || 0) + (p.seasonGoals || 0),
      assists: (p.careerAssists || 0) + (p.seasonAssists || 0),
      cleanSheets: (p.careerCleanSheets || 0) + (p.seasonCleanSheets || 0),
    })).concat(S.alumni || [])
      .sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists) || b.apps - a.apps)
      .slice(0, 5);
    const sparkRow = (label, values, color) => `
      <div class="ow-spark-row"><span class="lbl">${label}</span></div>
      ${sparklineSVG(values, color)}`;
    body.innerHTML = `
      <div class="dyn-top">${crestMarkup(S.crestShape, S.crestColors, 'ow-hero-crest')}<div class="dyn-top-title">${h[0]}</div><div class="dyn-top-sub">${h[1]}</div></div>
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
      ${allTime.length ? `
      <div class="pl-card" style="padding:14px 12px">
        <div class="dyn-top-sub" style="text-align:left;margin-bottom:8px">I migliori di sempre</div>
        ${allTime.map((p) => `<div class="ow-fin-row"><span>${p.n}<small style="display:block;color:var(--muted)">${POS_LABEL[p.pos] || p.pos} · 🎽 ${p.apps} presenz${p.apps === 1 ? 'a' : 'e'}</small></span><b>${p.pos === 'POR' ? '🧤 ' + p.cleanSheets : '⚽ ' + p.goals + ' · 👟 ' + p.assists}</b></div>`).join('')}
      </div>` : ''}
      <div class="pl-card" style="padding:14px 12px">
        <div class="dyn-top-sub" style="text-align:left;margin-bottom:10px">La bacheca, stagione per stagione</div>
        ${sparkRow('Posizione in classifica (su, meglio)', S.history.map((hh) => -hh.pos), 'var(--gold)')}
        ${sparkRow('Valore del club', S.history.map((hh) => hh.worth), 'var(--dyn)')}
        ${sparkRow('Budget a fine stagione', S.history.map((hh) => hh.budget != null ? hh.budget : 0), 'var(--good)')}
      </div>
      <div class="pl-card" style="padding:14px 12px">
        <div class="dyn-top-sub" style="text-align:left;margin-bottom:8px">La storia, stagione per stagione</div>
        <div style="overflow-x:auto">
          <table class="dyn-table"><thead><tr><th>S</th><th>Categoria</th><th class="num">Pos</th><th class="num">Media</th><th>Allenatore</th><th class="num">Saldo</th><th class="num">Valore</th><th>Trofei</th></tr></thead>
          <tbody>${S.history.map((hh) => `<tr><td>${hh.season}${hh.promoted ? ' ⬆️' : hh.relegated ? ' ⬇️' : ''}</td><td>${hh.div}</td><td class="num">${hh.pos}</td><td class="num">${hh.ppg != null ? hh.ppg.toFixed(2) : '-'}</td><td style="font-size:11px">${hh.mgr || '-'}</td><td class="num">${hh.net < 0 ? '-' : ''}${fmtMoney(Math.abs(hh.net))}</td><td class="num">${fmtMoney(hh.worth)}</td><td style="font-size:11px">${hh.trophies.length ? hh.trophies.join(', ') : '-'}</td></tr>`).join('')}</tbody></table>
        </div>
      </div>
      <button class="dyn-btn" id="owShareCareerBtn">📤 Condividi la carriera</button>
      <button class="dyn-btn" id="owShareLbBtn">🌍 Invia alla classifica globale</button>
      <button class="dyn-btn" id="owAgainBtn">Nuova carriera</button>
      <a class="dyn-back" href="index.html">Torna alla Dynasty</a>`;
    if (S.trophies.total > 0 || how === 'retired') celebrate(body.querySelector('.dyn-panel'));
    $('owAgainBtn').onclick = () => location.reload();
    $('owShareCareerBtn').onclick = exportCareerCard;
    $('owShareLbBtn').onclick = submitToLeaderboard;
    show('owEndScreen');
  }

  // Classifica globale condivisa (leaderboard.php lato server): un invio a fine carriera
  // (facoltativo) e una lista consultabile in ogni momento dal topbar. Fallisce in
  // silenzio-ma-avvisato se il server non risponde (es. in locale, dove il PHP non gira).
  async function submitToLeaderboard() {
    const btn = $('owShareLbBtn'); if (btn) { btn.disabled = true; btn.textContent = 'Invio…'; }
    try {
      const res = await fetch('leaderboard.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ club: S.club, owner: S.owner, div: S.div, season: S.season, trophies: S.trophies.total, worth: computeWorth(), difficulty: S.difficulty }),
      });
      const data = await res.json().catch(() => null);
      if (data && data.ok) { toast('🌍 Carriera inviata alla classifica globale!'); if (btn) btn.textContent = '✓ Inviata'; }
      else { toast((data && data.error) || 'Invio non riuscito.'); if (btn) { btn.disabled = false; btn.textContent = '🌍 Invia alla classifica globale'; } }
    } catch (err) {
      toast('Impossibile contattare la classifica globale al momento.');
      if (btn) { btn.disabled = false; btn.textContent = '🌍 Invia alla classifica globale'; }
    }
  }

  async function showGlobalLeaderboard() {
    overlay(`<h2>🌍 Classifica presidenti</h2><div class="ow-sub" style="text-align:center">Caricamento…</div><div class="dyn-modal-actions"><button class="dyn-btn dyn-btn-primary" id="ovClose">Chiudi</button></div>`);
    $('ovClose').onclick = closeOverlay;
    try {
      const res = await fetch('leaderboard.php');
      const data = await res.json();
      if (!data || !data.ok) throw new Error('bad response');
      const rows = (data.entries || []).map((e, i) => `<div class="ow-fin-row"><span>${i + 1}. ${e.club}<small style="display:block;color:var(--muted)">${e.owner} · ${(DIVS[e.div] || {}).name || ''} · ${e.trophies} trofe${e.trophies === 1 ? 'o' : 'i'}</small></span><b class="good">${Math.round(e.score).toLocaleString('it-IT')}</b></div>`).join('');
      overlay(`<h2>🌍 Classifica presidenti</h2>
        <div class="ow-sub" style="text-align:center">Le migliori carriere condivise da chi gioca</div>
        <div style="max-height:58vh;overflow:auto;margin:10px -6px 4px">${rows || '<div class="ow-sub" style="margin:14px 0">Ancora nessuna carriera condivisa: sii il primo a fine partita.</div>'}</div>
        <div class="dyn-modal-actions"><button class="dyn-btn dyn-btn-primary" id="ovClose">Chiudi</button></div>`);
      $('ovClose').onclick = closeOverlay;
    } catch (err) {
      overlay(`<h2>🌍 Classifica presidenti</h2><div class="ow-sub" style="text-align:center">Non riesco a caricarla al momento. Riprova più tardi.</div><div class="dyn-modal-actions"><button class="dyn-btn dyn-btn-primary" id="ovClose">Chiudi</button></div>`);
      $('ovClose').onclick = closeOverlay;
    }
  }

  /* ================= RENDER ================= */
  function show(id) {
    const el = $(id), wasHidden = el.classList.contains('hidden');
    document.querySelectorAll('.dyn-screen').forEach((s) => s.classList.add('hidden'));
    el.classList.remove('hidden');
    if (wasHidden) window.scrollTo(0, 0); // solo al cambio schermata: un re-render della stessa schermata non deve far saltare lo scroll in cima
    const tb = $('owTopbar'); if (tb) tb.classList.remove('hidden');
    if (S) { S._screen = id; saveGame(); }
    syncHomeCrest();
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

  // Piccolo promemoria persistente dell'obiettivo dichiarato a inizio stagione (vedi
  // seasonTarget in sim.js), visibile per tutta la durata del campionato.
  function renderSeasonTarget() {
    const el = $('owSeasonTarget'); if (!el) return;
    const t = S.seasonTargetInfo;
    el.innerHTML = t ? `<span class="ow-target-pill ${t.key}">🎯 Obiettivo: ${t.label}</span>` : '';
  }

  function renderCups() {
    const wrap = $('owCups'); if (!S.cups) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = Object.entries(S.cups).map(([key, c]) => {
      const compClass = key === 'nat' ? 'nat' : (S.euroComp || '');
      const st = (c.won ? 'win' : c.out ? 'out' : '') + (compClass ? ' ' + compClass : '');
      let label;
      if (c.won) label = 'Vincitori';
      else if (c.out) label = c.phase === 'league' ? 'Eliminati nella fase campionato' : c.phase === 'playoff' ? 'Eliminati allo spareggio' : (c.rounds[c.at - 1] || 'Eliminati');
      else if (c.phase === 'league') label = 'Fase campionato: ' + (c.leaguePts || 0) + 'pt (' + c.leagueAt + '/' + c.legLen + ')';
      else if (c.phase === 'playoff') label = 'Spareggio ottavi';
      else label = c.at ? c.rounds[c.at - 1] : 'Iscritti';
      const clickable = key === 'euro' && (c.leaguePath && c.leaguePath.length);
      return `<span class="cup-pill ${st}${clickable ? ' clickable' : ''}" ${clickable ? 'data-euro-league="1"' : ''}>${c.name}: <b>${label}</b></span>`;
    }).join('');
    if (wrap.querySelector('[data-euro-league]')) wrap.querySelector('[data-euro-league]').onclick = showEuroLeagueTable;
  }

  // "Classifica" della fase a girone unico europea: non è un vero girone da 4 squadre con
  // avversari fissi (nel formato UEFA reale ogni squadra pesca avversari diversi), quindi
  // non esiste una tabella multi-club onesta da mostrare — si mostra invece il percorso
  // partita per partita del presidente, con la sua evoluzione punti e le soglie di
  // qualificazione (ottavi diretti / spareggio / eliminazione), utile quanto una classifica.
  function showEuroLeagueTable() {
    const cup = S.cups.euro; if (!cup) return;
    const ec = EURO_COMPS[S.euroComp];
    const top8 = cup.legLen === 6 ? 12 : 15, playoffLine = cup.legLen === 6 ? 6 : 9;
    const rows = (cup.leaguePath || []).map((r) => `<tr class="${r.res === 'W' ? 'me' : ''}"><td>G${r.mw} vs ${r.opp}</td><td class="num">${r.gf}-${r.ga}</td><td class="num">${r.ptsSoFar}</td></tr>`).join('');
    overlay(`<h2>${ec.flag} ${ec.name}</h2>
      <div class="ow-sub" style="text-align:center">Fase campionato: <b>${cup.leaguePts}pt</b> su ${cup.legLen} partite · ${top8}+pt ottavi diretti, ${playoffLine}+pt spareggio</div>
      <div style="max-height:52vh;overflow:auto;margin:8px -6px 14px">
        <table class="dyn-table"><thead><tr><th>Partita</th><th class="num">Risultato</th><th class="num">Pt</th></tr></thead><tbody>${rows}</tbody></table>
      </div>
      <div class="dyn-modal-actions"><button class="dyn-btn dyn-btn-primary" id="ovClose">Chiudi</button></div>`);
    $('ovClose').onclick = closeOverlay;
  }

  function logMatch(m) {
    const row = document.createElement('div'); row.className = 'mrow res-' + m.res;
    const usSc = fmtScorers(m.goalsFor), themSc = fmtScorers(m.goalsAgainst);
    const scorersHTML = (usSc || themSc) ? `<div class="mrow-scorers">
        ${usSc ? '<div class="sc us">⚽ ' + usSc + '</div>' : ''}
        ${themSc ? '<div class="sc them">🥅 ' + themSc + '</div>' : ''}
      </div>` : '';
    const eventsHTML = (m.events && m.events.length) ? `<div class="mrow-scorers">${m.events.map((ev) => `<div class="sc them">${ev.kind === 'inj' ? '🚑' : '🟥'} ${flagOf(ev)}${ev.n} ${ev.kind === 'inj' ? 'ko, fuori ' + ev.weeks + ' partit' + (ev.weeks === 1 ? 'a' : 'e') : 'squalificato per la prossima'}</div>`).join('')}</div>` : '';
    row.innerHTML = `<div class="mrow-mw">G${m.mw}</div>
      <div class="mrow-main"><div class="mrow-fix"><span class="ha ${m.home ? 'home' : 'away'}">${m.home ? 'C' : 'T'}</span> vs ${m.opp}${m.derby ? ` <span class="mrow-derby" title="Bilancio testa a testa in questa rivalità, da quando la segui">🔥 DERBY${m.derbyRecord ? ' (' + m.derbyRecord.w + 'V ' + m.derbyRecord.d + 'N ' + m.derbyRecord.l + 'P)' : ''}</span>` : ''}</div>${scorersHTML}${eventsHTML}</div>
      <div class="mrow-res ${m.res}">${m.gf}-${m.ga}</div>`;
    $('owLog').prepend(row);
  }

  // Icona + classe colore per la competizione di una riga del log: ogni coppa ha la stessa
  // tinta usata già nei pallini sopra il log (dyn-cups), così il colpo d'occhio è coerente.
  const COMP_ICON = { nat: '🇮🇹', ucl: '🌍', uel: '🟠', conf: '🟢' };
  function compBadge(compKey) {
    if (!compKey) return '';
    const icon = COMP_ICON[compKey] || '';
    return icon ? '<span class="mrow-comp-ico">' + icon + '</span>' : '';
  }
  function compClass(compKey) { return compKey ? ' comp-' + compKey : ''; }

  // Partita di girone europeo: a differenza di logCup non è "passa/eliminato" ma un
  // risultato con punteggio di classifica, perché nella fase a gironi si può anche pareggiare.
  function logEuroGroup(name, round, res, gf, ga, goalsFor, goalsAgainst, oppName, ptsSoFar, compKey) {
    const row = document.createElement('div'); row.className = 'mrow cup' + compClass(compKey);
    const usSc = fmtScorers(goalsFor), themSc = fmtScorers(goalsAgainst);
    const scorersHTML = (usSc || themSc) ? `<div class="mrow-scorers">
        ${usSc ? '<div class="sc us">⚽ ' + usSc + '</div>' : ''}
        ${themSc ? '<div class="sc them">🥅 ' + themSc + '</div>' : ''}
      </div>` : '';
    const label = res === 'W' ? 'Vittoria' : res === 'D' ? 'Pareggio' : 'Sconfitta';
    row.innerHTML = `<div class="mrow-mw">${compBadge(compKey)}${name.split(' ')[0]}</div>
      <div class="mrow-main"><div class="mrow-fix">${name} ${round} <span class="ha">vs ${oppName}</span></div><div class="mrow-you">${label} · ${ptsSoFar} pt nel girone</div>${scorersHTML}</div>
      <div class="mrow-res ${res}">${gf}-${ga}</div>`;
    $('owLog').prepend(row);
  }

  // Una singola gara di un doppio confronto (andata/ritorno, come ottavi/quarti/semifinale
  // e lo spareggio pre-ottavi nel formato UEFA reale): solo il punteggio, senza verdetto
  // "passa/eliminato" perché quello si decide sull'aggregato, loggato subito dopo con logCup.
  function logCupLeg(name, round, legLabel, gf, ga, goalsFor, goalsAgainst, oppName, compKey) {
    const row = document.createElement('div'); row.className = 'mrow cup leg' + compClass(compKey);
    const usSc = fmtScorers(goalsFor), themSc = fmtScorers(goalsAgainst);
    const scorersHTML = (usSc || themSc) ? `<div class="mrow-scorers">
        ${usSc ? '<div class="sc us">⚽ ' + usSc + '</div>' : ''}
        ${themSc ? '<div class="sc them">🥅 ' + themSc + '</div>' : ''}
      </div>` : '';
    row.innerHTML = `<div class="mrow-mw">${compBadge(compKey)}${name.split(' ')[0]}</div>
      <div class="mrow-main"><div class="mrow-fix">${name} ${round} · ${legLabel} <span class="ha">vs ${oppName}</span></div>${scorersHTML}</div>
      <div class="mrow-res">${gf}-${ga}</div>`;
    $('owLog').prepend(row);
  }

  function logCup(name, round, won, gf, ga, goalsFor, goalsAgainst, oppName, compKey) {
    const row = document.createElement('div'); row.className = 'mrow cup' + compClass(compKey);
    const usSc = fmtScorers(goalsFor), themSc = fmtScorers(goalsAgainst);
    const scorersHTML = (usSc || themSc) ? `<div class="mrow-scorers">
        ${usSc ? '<div class="sc us">⚽ ' + usSc + '</div>' : ''}
        ${themSc ? '<div class="sc them">🥅 ' + themSc + '</div>' : ''}
      </div>` : '';
    row.innerHTML = `<div class="mrow-mw">${compBadge(compKey)}${name.split(' ')[0]}</div>
      <div class="mrow-main"><div class="mrow-fix">${name} ${round}${oppName ? ' <span class="ha">vs ' + oppName + '</span>' : ''}</div><div class="mrow-you">${won ? (gf === ga ? 'Passa ai rigori' : 'Passa il turno') : (gf === ga ? 'Eliminato ai rigori' : 'Eliminato')}</div>${scorersHTML}</div>
      <div class="mrow-res ${won ? 'W' : 'L'}">${gf}-${ga}</div>`;
    $('owLog').prepend(row);
  }

  // Niente più "Media" (punti a partita) riga per riga: con un solo divisore condiviso
  // (le partite giocate DA TE) applicato al punteggio di squadre che magari non hanno nemmeno
  // giocato lo stesso numero di gare in quel preciso istante, il numero era più fuorviante che
  // utile per gli avversari. La propria media, quella vera, si trova ora nel resoconto di fine
  // carriera (renderEnd, stagione per stagione) insieme all'allenatore di quella stagione.
  function tableHTML() {
    const d = divOf();
    return `<table class="dyn-table"><thead><tr><th>Squadra</th><th>Mister</th><th class="num">Pt</th><th class="num">DR</th></tr></thead><tbody>${S.table.map((t, i) => {
      const zone = (d.euroSpots && i < d.euroSpots) ? 'ucl' : (d.uelPos && i === d.uelPos - 1) ? 'uel' : (d.confPos && i === d.confPos - 1) ? 'conf' : (d.promoted && i < d.promoted) ? 'ucl' : (d.playoff && i >= d.promoted && i < d.promoted + d.playoff) ? 'po' : (d.releg && i >= d.teams - d.releg) ? 'rel' : '';
      return `<tr class="${t.me ? 'me' : ''} ${zone}"><td>${i + 1}. ${t.name}</td><td style="font-size:11px;color:var(--muted)">${t.mgr ? t.mgr.n : '-'}</td><td class="num">${t.pts}</td><td class="num">${t.gd > 0 ? '+' : ''}${t.gd}</td></tr>`;
    }).join('')}</tbody></table>`;
  }

  function showTable() {
    computeTable();
    const d = divOf();
    const key = [d.euroSpots ? '<span style="color:var(--dyn)">▎Champions League</span>' : '', d.uelPos ? '<span style="color:var(--gold)">▎Europa League</span>' : '', d.confPos ? '<span style="color:var(--good)">▎Conference League</span>' : '', d.promoted ? '<span style="color:var(--dyn)">▎promozione</span>' : '', d.playoff ? '<span style="color:var(--gold)">▎playoff</span>' : '', d.releg ? '<span style="color:var(--bad)">▎retrocessione</span>' : ''].filter(Boolean).join(' &nbsp; ');
    overlay(`<h2>${d.name}</h2><div class="ow-sub" style="text-align:center">${key}</div><div style="max-height:62vh;overflow:auto;margin:-6px -6px 14px">${tableHTML()}</div><div class="dyn-modal-actions"><button class="dyn-btn dyn-btn-primary" id="ovClose">Chiudi</button></div>`);
    $('ovClose').onclick = closeOverlay;
  }

  // Bacheca trofei: richiamabile in ogni momento dal topbar (non solo nel riepilogo di
  // fine carriera), con il totale per competizione e lo storico stagione per stagione.
  function showTrophyCase(tab) {
    tab = tab === 'traguardi' ? 'traguardi' : 'trofei';
    if (!S || !S.trophies) {
      overlay(`<h2>🏆 Bacheca trofei</h2><p class="ow-sub" style="text-align:center">Nessuna carriera attiva al momento.</p><div class="dyn-modal-actions"><button class="dyn-btn dyn-btn-primary" id="ovClose">Chiudi</button></div>`);
      $('ovClose').onclick = closeOverlay;
      return;
    }
    const tabsHTML = `<div class="dyn-modal-actions" style="gap:6px;margin-bottom:10px">
        <button class="dyn-btn${tab === 'trofei' ? ' dyn-btn-primary' : ''}" id="ovTabTrofei">🏆 Trofei</button>
        <button class="dyn-btn${tab === 'traguardi' ? ' dyn-btn-primary' : ''}" id="ovTabTraguardi">🏅 Traguardi</button>
      </div>`;
    let bodyHTML;
    if (tab === 'traguardi') {
      const unlocked = S.achievements || [];
      const sorted = ACHIEVEMENTS.slice().sort((a, b) => (unlocked.indexOf(b.key) !== -1) - (unlocked.indexOf(a.key) !== -1));
      bodyHTML = `<div class="ow-sub" style="text-align:center">${unlocked.length}/${ACHIEVEMENTS.length} traguardi sbloccati con ${S.club}</div>
      <div style="max-height:52vh;overflow:auto;margin:10px -6px 4px">
        ${sorted.map((a) => {
          const done = unlocked.indexOf(a.key) !== -1;
          return `<div class="ow-fin-row"${done ? '' : ' style="opacity:.5"'}><span>${done ? a.icon : '🔒'} ${a.title}<small style="display:block;color:var(--muted)">${a.desc}</small></span></div>`;
        }).join('')}
      </div>`;
    } else {
      const t = S.trophies;
      const rows = [];
      DIVS.forEach((d, i) => { if (t.titles[i]) rows.push(['🏆 ' + d.name + ' - Titolo', t.titles[i]]); });
      if (t.nat) rows.push(['🇮🇹 Coppa Italia', t.nat]);
      if (t.ucl) rows.push(['🌍 ' + EURO_COMPS.ucl.name, t.ucl]);
      if (t.uel) rows.push(['🟠 ' + EURO_COMPS.uel.name, t.uel]);
      if (t.conf) rows.push(['🟢 ' + EURO_COMPS.conf.name, t.conf]);
      const timeline = (S.history || []).filter((h) => h.trophies && h.trophies.length).slice().reverse();
      bodyHTML = `<div class="ow-sub" style="text-align:center">${t.total} trofe${t.total === 1 ? 'o' : 'i'} in ${S.season} stagion${S.season === 1 ? 'e' : 'i'} con ${S.club}</div>
      <div style="max-height:52vh;overflow:auto;margin:10px -6px 4px">
        ${rows.length ? rows.map((r) => `<div class="ow-fin-row"><span>${r[0]}</span><b class="good">${r[1]}×</b></div>`).join('') : '<div class="ow-sub" style="margin:14px 0">Ancora nessun trofeo: il momento buono arriverà.</div>'}
        ${timeline.length ? `<div class="ow-sec-title" style="margin-top:14px">Stagione per stagione</div>${timeline.map((h) => `<div class="ow-fin-row"><span>Stagione ${h.season} · ${h.div}</span><b class="good">${h.trophies.join(', ')}</b></div>`).join('')}` : ''}
      </div>`;
    }
    overlay(`<h2>${tab === 'traguardi' ? '🏅 Traguardi' : '🏆 Bacheca trofei'}</h2>
      ${tabsHTML}
      ${bodyHTML}
      <div class="dyn-modal-actions"><button class="dyn-btn dyn-btn-primary" id="ovClose">Chiudi</button></div>`);
    $('ovClose').onclick = closeOverlay;
    $('ovTabTrofei').onclick = () => showTrophyCase('trofei');
    $('ovTabTraguardi').onclick = () => showTrophyCase('traguardi');
  }

  function showClub() {
    const worth = computeWorth();
    overlay(`
      <h2>${S.club}</h2>
      <div style="display:flex;justify-content:center;margin:2px 0 10px">${crestMarkup(S.crestShape, S.crestColors, 'ow-club-crest-preview')}</div>
      <div class="ow-fin-row"><span>Budget</span><b>${fmtMoney(S.budget)}</b></div>
      <div class="ow-fin-row"><span>Valore del club</span><b>${fmtMoney(worth)}</b></div>
      <div class="ow-fin-row"><span>Stadio</span><b>${capOf().toLocaleString('it-IT')} posti</b></div>
      ${meterHTML('Umore tifosi', S.sent, S.sent < 30)}
      ${meterHTML('Gradimento proprietario', S.ownerRating, S.ownerRating < 35)}
      <div class="dyn-modal-actions" style="margin-top:12px">
        <button class="dyn-btn" id="ovEditCrest">🎨 Modifica stemma</button>
        <button class="dyn-btn" id="ovSellNow">💷 Vendi per ${fmtMoney(worth)}</button>
        <button class="dyn-btn dyn-btn-primary" id="ovClose">Chiudi</button>
      </div>`);
    $('ovClose').onclick = closeOverlay;
    $('ovSellNow').onclick = () => { closeOverlay(); confirmSell(); };
    $('ovEditCrest').onclick = showCrestEditor;
  }

  // Riapre lo stesso editor visto in fase di creazione (forma + due colori), ma per il
  // club già in carriera: prima non c'era modo di rivedere lo stemma dopo averlo scelto.
  function showCrestEditor() {
    let shape = S.crestShape, colors = S.crestColors.slice();
    const syncPreview = () => {
      const wrap = $('editCrestPreview'); if (wrap) wrap.innerHTML = crestMarkup(shape, colors, 'setup-crest');
      $('owOverlayModal').querySelectorAll('.ow-crest-shape').forEach((el) => el.classList.toggle('on', el.dataset.shape === shape));
    };
    overlay(`
      <h2>Modifica stemma</h2>
      <span id="editCrestPreview" style="display:flex;justify-content:center;margin:2px 0 14px">${crestMarkup(shape, colors, 'setup-crest')}</span>
      <div class="ow-crest-picker">
        <div class="ow-crest-shapes">
          <button type="button" class="ow-crest-shape" data-shape="shield">Scudo</button>
          <button type="button" class="ow-crest-shape" data-shape="round">Tondo</button>
          <button type="button" class="ow-crest-shape" data-shape="hex">Esagono</button>
        </div>
        <div class="ow-crest-colors">
          <label class="ow-crest-swatch"><span>Primario</span><input type="color" id="editCrestColor1" value="${colors[0]}" /></label>
          <label class="ow-crest-swatch"><span>Secondario</span><input type="color" id="editCrestColor2" value="${colors[1]}" /></label>
        </div>
        <button type="button" class="ow-crest-reroll" id="editCrestReroll">🎲 Colori casuali</button>
      </div>
      <div class="dyn-modal-actions" style="margin-top:12px">
        <button class="dyn-btn dyn-btn-primary" id="ovCrestSave">Salva</button>
        <button class="dyn-btn" id="ovCrestCancel">Annulla</button>
      </div>`);
    syncPreview();
    $('owOverlayModal').querySelectorAll('.ow-crest-shape').forEach((el) => el.addEventListener('click', () => { shape = el.dataset.shape; syncPreview(); }));
    $('editCrestColor1').addEventListener('input', (e) => { colors[0] = e.target.value; syncPreview(); });
    $('editCrestColor2').addEventListener('input', (e) => { colors[1] = e.target.value; syncPreview(); });
    $('editCrestReroll').addEventListener('click', () => { colors = randCrestColors(); $('editCrestColor1').value = colors[0]; $('editCrestColor2').value = colors[1]; syncPreview(); });
    $('ovCrestSave').onclick = () => { S.crestShape = shape; S.crestColors = colors; closeOverlay(); syncHomeCrest(); renderBoard(); saveGame(); toast('Nuovo stemma salvato.', 'success'); };
    $('ovCrestCancel').onclick = showClub;
  }

  /* ---------------- overlay / toast ---------------- */
  function overlay(html) { $('owOverlayModal').innerHTML = html; $('owOverlay').classList.remove('hidden'); }

  function closeOverlay() { $('owOverlay').classList.add('hidden'); }

  // Se arriva un nuovo toast mentre uno è ancora visibile, lo sostituisce subito (niente
  // coda che rallenta): resta comunque a schermo abbastanza a lungo da poterlo leggere.
  let toastT = null;

  // `kind` è opzionale e sceglie un suono coerente col messaggio: 'money' (incasso),
  // 'spend' (pagamento), 'success' (conferma), 'error' (azione non valida/rete). Senza
  // `kind` il toast resta silenzioso come prima, per non riempire di suoni ogni messaggio.
  function toast(msg, kind) {
    const t = $('owToast');
    t.innerHTML = msg;
    t.classList.remove('hidden');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.add('hidden'), 3800);
    if (DynSound && kind) {
      if (kind === 'money') DynSound.coin();
      else if (kind === 'spend') DynSound.cashOut();
      else if (kind === 'success') DynSound.chime();
      else if (kind === 'error') DynSound.error();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
