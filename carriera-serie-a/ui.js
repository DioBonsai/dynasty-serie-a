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
    if (ovr >= 85) return { c: 'var(--gold)', bg: 'rgba(255,210,74,.16)' };
    if (ovr >= 75) return { c: 'var(--good)', bg: 'rgba(40,217,160,.14)' };
    if (ovr >= 65) return { c: '#6fb3ff', bg: 'rgba(111,179,255,.14)' };
    if (ovr >= 55) return { c: 'var(--txt)', bg: 'rgba(255,255,255,.07)' };
    return { c: 'var(--muted)', bg: 'rgba(255,255,255,.04)' };
  }

  const ovrBadge = (ovr) => { const t = ovrTier(ovr); return `background:${t.bg};color:${t.c}`; };

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

  let takeovers = null, selTakeover = -1;

  // Stato dello stemma in fase di creazione del club (prima che esista S).
  let crestShape = CREST_DEFAULT.shape, crestColors = randCrestColors();

  // Filtro/ordinamento della lista rosa in sala del consiglio: solo preferenza di vista,
  // non tocca lo stato di gioco.
  let squadRoleFilter = 'ALL', squadSortDesc = true;

  // Tab attiva in Sala del Consiglio: solo preferenza di vista, non persistita.
  let boardTab = 'finanze';

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
    takeovers = genTakeovers(); renderTakeovers();
    if (!$('owClubName').value) $('owClubName').value = pick(POOLS[0]).n;   // suggerimento a caso, modificabile
    updateCrestPreview();
    document.querySelectorAll('.ow-crest-shape').forEach((el) => el.addEventListener('click', () => { crestShape = el.dataset.shape; updateCrestPreview(); }));
    const c1 = $('crestColor1'), c2 = $('crestColor2');
    if (c1) c1.addEventListener('input', (e) => { crestColors[0] = e.target.value; updateCrestPreview(); });
    if (c2) c2.addEventListener('input', (e) => { crestColors[1] = e.target.value; updateCrestPreview(); });
    const crestReroll = $('crestRerollBtn');
    if (crestReroll) crestReroll.addEventListener('click', () => { crestColors = randCrestColors(); updateCrestPreview(); });
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

  /* ---------------- sala del consiglio ---------------- */
  function ladderHTML() {
    return `<div class="ow-ladder">${DIVS.map((d, i) => `<span class="ow-rung ${i === S.div ? 'on' : ''} ${i < S.div ? 'done' : ''}">${d.name}</span>`).join('<span class="ow-arrow">›</span>')}</div>`;
  }

  function meterHTML(label, v, warn) {
    const col = v >= 60 ? 'var(--dyn)' : v >= 35 ? 'var(--gold)' : 'var(--bad)';
    return `<div class="ow-meter"><span class="lbl">${label}</span><span class="bar"><span class="fill" style="width:${v}%;background:${col}"></span></span><span class="val" style="color:${col}">${Math.round(v)}${warn ? ' ⚠️' : ''}</span></div>`;
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
    normSquad();
    maybeScoutProspect();
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
        <span class="nm">${flagOf(p)}${p.n}<small>età ${p.age}</small></span>
        ${p.outWeeks > 0 ? `<span class="stat-tag inj" title="Infortunato">🚑 ${p.outWeeks}</span>` : p.suspMatches > 0 ? '<span class="stat-tag susp" title="Squalificato">🟥</span>' : ''}
        ${p.loan ? '<span class="yy loan" title="Torna al suo club a fine stagione">prestito</span>' : `<span class="yy${fy ? ' fy' : ''}" title="Anni di contratto rimasti">${p.yrs}a</span>`}
        <span class="wg">${fmtYr(p.wage)}</span>
        ${fy ? `<button class="ow-renew" data-renew="${p.pid}" title="Offri un nuovo contratto">Rinnova</button>` : ''}
        ${p.loan ? '' : `<button class="ow-x" data-rel="${p.pid}" title="Vendi">💷</button>`}</div>`;
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
        ${S.debtSeasons ? '<div class="ow-warn">⚠️ Hai chiuso la scorsa stagione in rosso. Un\'altra stagione in debito significa amministrazione controllata.</div>' : ''}
      </div>
      <div class="ow-sec">
        <div class="ow-sec-title">📋 Bilancio di stagione</div>
        <div class="ow-fin-row"><span>Stipendi giocatori (${S.squad.length} giocatori, pagati all'avvio)</span><b>${fmtMoney(wageBill())}</b></div>
        <div class="ow-fin-row"><span>Stipendio allenatore (pagato all'avvio)</span><b>${fmtMoney(S.manager.salary)}</b></div>
        <div class="ow-fin-row total ${broke ? 'bad' : ''}"><span>Costo d'avvio</span><b>${fmtMoney(bill)}</b></div>
        <div class="ow-fin-row"><span>Ricavi di stagione (stima)</span><b>${fmtMoney(estRevenue)}</b></div>
        ${broke ? '<div class="ow-warn">⚠️ Ti mancano <b>' + fmtMoney(bill - S.budget) + '</b> per coprire il costo d\'avvio. Ricorda: gli spin spendono cassa anche se rifiuti il giocatore. Vendi giocatori (💷), prendi il bonus investitore o assumi un allenatore più economico prima dell\'inizio.</div>' : ''}
        ${!S.investorUsed ? `<button class="dyn-btn ow-investor" id="investorBtn">💼 Bonus investitore · +${fmtMoney(d.investor)}</button>` : ''}
      </div>
      ${S.offers && S.offers.length ? `
      <div class="ow-sec">
        <div class="ow-sec-title">📨 Offerte di mercato</div>
        <div class="ow-sub">Club rivali vogliono i tuoi giocatori migliori. Incassa per una cifra, o rifiuta per tenere unita la rosa.</div>
        ${S.offers.map((o) => {
          const p = S.squad.find((x) => x.pid === o.pid); if (!p) return '';
          return `<div class="ow-bid">
            <div class="who"><span class="ovr" style="${ovrBadge(p.ovr)}">${p.ovr}</span><span class="nm">${flagOf(p)}${p.n}<small>età ${p.age} · ${o.club} si fa avanti</small></span></div>
            <div class="act"><span class="fee">${fmtMoney(o.fee)}</span>
              <button class="dyn-mini ow-accept" data-acc="${o.pid}">Accetta</button>
              <button class="dyn-mini ow-reject" data-rej="${o.pid}">Rifiuta</button></div>
          </div>`;
        }).join('')}
      </div>` : ''}`;

    const rosaHTML = `
      <div class="ow-sec">
        <div class="ow-sec-title">🧠 Allenatore</div>
        <div class="ow-mgr"><span class="ovr">${S.manager.rating}</span><span class="nm">${S.manager.n}<small>${fmtMoney(S.manager.salary)}/anno</small></span><span class="tag">In carica</span></div>
        <div class="ow-sub">Candidati (l'esonero paga il 30% di buonuscita):</div>
        ${S.mgrOpts.map((m, i) => `<div class="ow-mgr cand"><span class="ovr">${m.rating}</span><span class="nm">${m.n}<small>${fmtMoney(m.salary)}/anno</small></span><button class="dyn-mini ow-hire" data-hire="${i}">Assumi</button></div>`).join('')}
      </div>
      <div class="ow-sec">
        <div class="ow-sec-title">🔭 Settore giovanile</div>
        <div class="ow-scout-tier">
          <div><div class="lv">${scout.name}</div><div class="ds">Spin migliori in media (+${scout.bonus} OVR) e più affidabili${scoutLv ? ', più chance di un prospetto gratis a inizio stagione' : ''}</div></div>
          ${nextScoutCost != null ? `<button class="dyn-mini" id="scoutUpgBtn" ${S.budget < nextScoutCost ? 'disabled' : ''}>⬆️ ${fmtMoney(nextScoutCost)}</button>` : '<span class="tag">Max</span>'}
        </div>
        ${S.scoutProspect ? `
        <div class="ow-jan-card">
          <div class="ow-jan-head">
            <span class="ovr" style="${ovrBadge(S.scoutProspect.ovr)}">${S.scoutProspect.ovr}</span>
            <span class="postag postag-${S.scoutProspect.pos}">${S.scoutProspect.pos}</span>
            <span class="nm">${flagOf(S.scoutProspect)}${S.scoutProspect.n}<small>${POS_LABEL[S.scoutProspect.pos]} · età ${S.scoutProspect.age} · promessa del vivaio</small></span>
          </div>
          <button class="dyn-btn dyn-btn-primary" id="scoutSignBtn">Aggrega alla rosa · Gratis</button>
        </div>` : ''}
      </div>
      <div class="ow-sec">
        <div class="ow-sec-title">🎰 Rosa + spin</div>
        <div class="ow-sub">Rosa ${S.squad.length < MIN_SQUAD ? '<b style="color:var(--bad)">' + S.squad.length + ' su ' + MIN_SQUAD + ' giocatori necessari</b>' : S.squad.length + ' giocatori'} · rating <b>${squadStr()}</b> · media di categoria ${d.avg}${fyCount ? ' · <b style="color:var(--gold)">' + fyCount + ' in scadenza</b> (Rinnova o li perdi a zero)' : ''} · tocca 💷 per vendere</div>
        <div class="ow-spins">
          <button class="dyn-btn" id="spinStdBtn" ${S.budget < spinCostNow(false) ? 'disabled' : ''}>🎰 Spin giocatore · ${fmtMoney(spinCostNow(false))}</button>
          <button class="dyn-btn" id="spinPremBtn" ${S.budget < spinCostNow(true) ? 'disabled' : ''}>💎 Spin di lusso · ${fmtMoney(spinCostNow(true))}</button>
        </div>
        <div class="ow-sub" style="margin:0 0 8px">${S.spinsBought ? 'Affaticamento scout: i prezzi sono saliti perché hai già fatto ' + S.spinsBought + ' spin quest\'estate.' : 'Ogni spin di questa estate costa più del precedente.'}</div>
        <button class="dyn-btn ow-investor" id="freeAgentBtn">🖊️ Ingaggia uno svincolato · Gratis</button>
        <div class="ow-squad-filters">
          ${['ALL', 'POR', 'DIF', 'CEN', 'ATT'].map((k) => `<button class="ow-filter-pill ${squadRoleFilter === k ? 'on' : ''}" data-role="${k}">${k === 'ALL' ? 'Tutti' : k}</button>`).join('')}
          <button class="ow-filter-pill ow-filter-sort" id="squadSortBtn" title="Ordina per overall">OVR ${squadSortDesc ? '▼' : '▲'}</button>
        </div>
        ${squadRoleFilter !== 'ALL' ? `<div class="ow-sub" style="margin:-4px 0 6px">${squadFiltered.length} di ${S.squad.length} giocatori</div>` : ''}
        <div class="ow-squadlist">${squadRows}</div>
      </div>`;

    const stadioHTML = `
      <div class="ow-sec">
        <div class="ow-sec-title">🏟️ Stadio + biglietti</div>
        <div class="ow-fin-row"><span>Capienza</span><b>${capOf().toLocaleString('it-IT')} posti</b></div>
        ${next ? `<button class="dyn-btn ow-upg" id="upgradeBtn" ${S.budget < next.cost ? 'disabled' : ''}>Amplia a ${next.cap.toLocaleString('it-IT')} posti · ${fmtMoney(next.cost)}</button>` : '<div class="ow-sub">Lo stadio è alla sua dimensione massima.</div>'}
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
      { key: 'rosa', label: '👥 Rosa', html: rosaHTML, warn: S.squad.length < MIN_SQUAD || fyCount > 0 || !!S.scoutProspect },
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
      <div class="dyn-top"><div class="dyn-top-title">La Sala del Consiglio</div><div class="dyn-top-sub">${S.owner} · ${S.club} · Stagione ${S.season} di ${MAX_SEASONS}</div></div>
      ${ladderHTML()}
      <div class="ow-tabs">${TABS.map((t) => `<button class="ow-tab ${boardTab === t.key ? 'on' : ''}" data-tab="${t.key}">${t.label}${t.warn ? '<span class="dot"></span>' : ''}</button>`).join('')}</div>
      <div id="boardTabBody">${activeTab.html}</div>
      <button class="dyn-btn dyn-btn-primary" id="startSeasonBtn">Inizia Stagione ${S.season} · ${d.name}</button>
      <div class="ow-exit-row">
        <button class="dyn-btn" id="sellBtn">💷 Vendi il club · ${fmtMoney(worth)}</button>
        <button class="dyn-btn" id="resignBtn">Dimettiti</button>
      </div>`;
    // colleghiamo tutto
    body.querySelectorAll('[data-tab]').forEach((el) => el.addEventListener('click', () => { boardTab = el.dataset.tab; renderBoard(); }));
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
          <div class="nm">${flagOf(p)}${p.n}</div>
          <div class="meta">età ${p.age} · guadagna <b>${fmtYr(p.wage)}</b>, ${p.yrs} ann${p.yrs === 1 ? 'o' : 'i'} rimasti</div>
          <div class="meta">Chiede <b>${fmtYr(nw)}</b> per <b>${ny} anni</b></div>
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
          <div class="nm">${flagOf(p)}${p.n} <span class="postag postag-${p.pos}" style="vertical-align:middle">${p.pos}</span></div>
          <div class="meta">${POS_LABEL[p.pos]} · età ${p.age} · ${fmtYr(p.wage)}</div>
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
    const scoutUpg = $('scoutUpgBtn');
    if (scoutUpg) scoutUpg.addEventListener('click', () => {
      const lvl = (S.scoutLevel || 0) + 1, cost = scoutUpgradeCost(lvl); if (S.budget < cost) return;
      spendGuard(cost, 'L\'investimento nel settore giovanile', '', () => {
        S.budget -= cost; S.scoutLevel = lvl;
        toast('Settore giovanile potenziato: ' + SCOUT_TIERS[lvl].name + '.'); renderBoard(); saveGame();
      });
    });
    const scoutSign = $('scoutSignBtn');
    if (scoutSign) scoutSign.addEventListener('click', () => {
      if (!S.scoutProspect) return;
      S.squad.push(S.scoutProspect);
      toast(S.scoutProspect.n + ' entra in prima squadra dal settore giovanile.');
      S.scoutProspect = null; renderBoard(); saveGame();
    });
    body.querySelectorAll('[data-role]').forEach((el) => el.addEventListener('click', () => { squadRoleFilter = el.dataset.role; renderBoard(); }));
    const sortBtn = $('squadSortBtn');
    if (sortBtn) sortBtn.addEventListener('click', () => { squadSortDesc = !squadSortDesc; renderBoard(); });
    $('startSeasonBtn').addEventListener('click', startSeason);
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

  function doSpin(premium) {
    const cost = spinCostNow(premium);
    if (S.budget < cost) { toast('Budget non sufficiente.'); return; }
    spendGuard(cost, premium ? 'Uno spin di lusso' : 'Uno spin', 'Se rifiuti il giocatore ti torna solo il 40% dello spin.', () => runSpin(premium, cost));
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
        <div class="nm">${flagOf(p)}${p.n} <span class="postag postag-${p.pos}" style="vertical-align:middle">${p.pos}</span></div>
        <div class="meta">${POS_LABEL[p.pos]} · età ${p.age} · chiede <b>${fmtYr(p.wage)}</b></div>
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
    $('ovPass').onclick = () => {
      const refund = Math.round(cost * 0.4);
      S.budget += refund;
      S._spin = null; closeOverlay();
      toast('Passi. Lo scout ti restituisce ' + fmtMoney(refund) + ' (40% dello spin).');
      renderBoard(); saveGame();
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

  // Riscatto dei prestiti a inizio stagione: un giocatore alla volta rischia di tornare al
  // suo club, a meno che il presidente non lo trattenga pagando il cartellino. `doneCb` è
  // finishAdvance() in sim.js, richiamato solo quando non resta più nessuno da decidere.
  function renderLoanBuybackOverlay(loaned, doneCb) {
    S._loanBuyback = { loaned, doneCb };
    renderLoanBuybackModal();
  }
  function renderLoanBuybackModal() {
    const stillLoaned = S._loanBuyback.loaned.filter((p) => p.loan);
    if (!stillLoaned.length) { closeOverlay(); const cb = S._loanBuyback.doneCb; S._loanBuyback = null; cb(); return; }
    overlay(`
      <h2>🔁 Fine prestito</h2>
      <p>${stillLoaned.length} giocator${stillLoaned.length === 1 ? 'e' : 'i'} in prestito torna${stillLoaned.length === 1 ? '' : 'no'} al club di provenienza, a meno che tu non li riscatti ora a titolo definitivo.</p>
      ${stillLoaned.map((p) => `
      <div class="ow-jan-card">
        <div class="ow-jan-head">
          <span class="ovr" style="${ovrBadge(p.ovr)}">${p.ovr}</span>
          <span class="postag postag-${p.pos}">${p.pos}</span>
          <span class="nm">${flagOf(p)}${p.n}<small>${POS_LABEL[p.pos]} · età ${p.age}</small></span>
        </div>
        <button class="dyn-btn dyn-btn-primary" data-buyback="${p.pid}" ${S.budget < loanBuybackFee(p) ? 'disabled' : ''}>💰 Riscatta a titolo definitivo · ${fmtMoney(loanBuybackFee(p))}</button>
      </div>`).join('')}
      <div class="dyn-modal-actions"><button class="dyn-btn" id="ovLoanSkip">Lascia tornare gli altri</button></div>`);
    document.querySelectorAll('#owOverlayModal [data-buyback]').forEach((el) => el.addEventListener('click', () => {
      const p = S.squad.find((x) => x.pid === +el.dataset.buyback); if (!p) return;
      const fee = loanBuybackFee(p);
      if (S.budget < fee) { toast('Non hai abbastanza per riscattarlo.'); return; }
      S.budget -= fee; p.loan = false; p.yrs = 3 + rnd(2);
      toast(p.n + ' riscattato a titolo definitivo per ' + fmtMoney(fee) + '.');
      saveGame(); renderLoanBuybackModal();
    }));
    $('ovLoanSkip').onclick = () => { closeOverlay(); const cb = S._loanBuyback.doneCb; S._loanBuyback = null; cb(); };
  }

  function openWinter() {
    S._pause = true;
    if (!S._janCands) S._janCands = [spinPlayer(false), spinPlayer(false), spinPlayer(false)];
    if (S._janSwitchUsed == null) S._janSwitchUsed = false;
    if (!S._janMgrCands) S._janMgrCands = [genManager(2), genManager(5)];
    renderWinterOverlay();
  }

  function renderWinterOverlay() {
    const d = divOf();
    const cands = S._janCands || [];
    const mgrCands = S._janMgrCands || [];
    const cardHTML = (p, i) => {
      const loanCost = janLoanCost(p), buyTotal = loanCost + janTransferFee(p);
      return `
      <div class="ow-jan-card">
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
      <div class="ow-mgr"><span class="ovr" style="${ovrBadge(S.manager.rating)}">${S.manager.rating}</span><span class="nm">${S.manager.n}<small>Allenatore in carica</small></span><span class="tag">In carica</span></div>
      <div class="ow-sub" style="margin:8px 0 6px;text-align:left">Esonera (30% di buonuscita) e nomina:</div>
      ${mgrCands.map((m, i) => `<div class="ow-mgr cand"><span class="ovr" style="${ovrBadge(m.rating)}">${m.rating}</span><span class="nm">${m.n}<small>${fmtMoney(m.salary)}/anno, metà pagata subito</small></span><button class="dyn-mini" data-wh="${i}">Assumi</button></div>`).join('')}
      <div class="dyn-modal-actions"><button class="dyn-btn dyn-btn-primary" id="ovPlayOn">Continua così</button></div>`);
    $('ovPlayOn').onclick = () => { S.winterDone = true; S._pause = false; S._janCands = null; S._janSwitchUsed = false; S._janMgrCands = null; closeOverlay(); saveGame(); if (S.played >= gp()) endSeason(); };
    document.querySelectorAll('#owOverlayModal [data-jan-loan]').forEach((el) => el.addEventListener('click', () => {
      const i = +el.dataset.janLoan, p = S._janCands[i]; if (!p) return;
      const cost = janLoanCost(p);
      if (S.budget < cost) { toast('Non puoi coprire il suo stipendio.'); return; }
      S.budget -= cost; p.loan = true; S.squad.push(p);
      S._janCands.splice(i, 1);
      toast(p.n + ' arriva in prestito fino a fine stagione.');
      saveGame(); renderWinterOverlay();
    }));
    document.querySelectorAll('#owOverlayModal [data-jan-buy]').forEach((el) => el.addEventListener('click', () => {
      const i = +el.dataset.janBuy, p = S._janCands[i]; if (!p) return;
      const cost = janLoanCost(p) + janTransferFee(p);
      if (S.budget < cost) { toast('Non hai abbastanza per acquistarlo a titolo definitivo.'); return; }
      S.budget -= cost; S.squad.push(p);
      S._janCands.splice(i, 1);
      toast(p.n + ' firma a titolo definitivo.');
      saveGame(); renderWinterOverlay();
    }));
    document.querySelectorAll('#owOverlayModal [data-jan-switch]').forEach((el) => el.addEventListener('click', () => {
      if (S._janSwitchUsed) return;
      const i = +el.dataset.janSwitch; if (!S._janCands[i]) return;
      const old = S._janCands[i];
      S._janCands[i] = spinPlayer(false);
      S._janSwitchUsed = true;
      toast('Cambi ' + old.n + ' con un altro candidato.');
      saveGame(); renderWinterOverlay();
    }));
    document.querySelectorAll('#owOverlayModal [data-wh]').forEach((el) => el.addEventListener('click', () => {
      const m = S._janMgrCands[+el.dataset.wh]; if (!m) return;
      const cost = Math.round(S.manager.salary * 0.3) + Math.round(m.salary * 0.5);
      if (S.budget < cost) { toast('Non puoi permetterti il cambio (buonuscita + metà stipendio).'); return; }
      S.budget -= cost; S.manager = m; toast(m.n + ' prende il timone a stagione in corso.');
      saveGame(); renderWinterOverlay();
    }));
  }

  function renderSeasonEnd() {
    const e = S._end, d = divOf(), body = $('owSeasonEndBody');
    const banner = e.fate === 'forced' ? ['😡 I tifosi hanno parlato', 'Gradimento troppo basso. Sei costretto a dimetterti.']
      : e.fate === 'admin' ? ['🏦 Amministrazione controllata', 'Due stagioni in rosso. La banca chiede i conti.']
      : e.promoted ? ['🎉 PROMOZIONE', e.playoff && e.playoff.won ? 'Su tramite i playoff dopo un ' + ord(e.pos) + ' posto!' : e.title ? 'Campioni di ' + d.name + '!' : 'Promossi al ' + ord(e.pos) + ' posto!']
      : e.playoff && !e.playoff.won ? ['💔 Delusione playoff', 'Eliminati ' + (e.playoff.rounds[e.playoff.rounds.length - 1].stage === 'Finale' ? 'in finale' : e.playoff.rounds[e.playoff.rounds.length - 1].stage === 'Semifinale' ? 'in semifinale' : 'ai quarti') + ' playoff dopo un ' + ord(e.pos) + ' posto.']
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
    if (e.promoted || e.title || e.trophies.length) celebrate(body.querySelector('.dyn-panel'));
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
    const divShort = ['Eccellenza', 'Serie D', 'Serie C', 'Serie B', 'Serie A'];
    S.trophies.titles.forEach((n, i) => { if (n) honours.push(n + 'x Titolo ' + divShort[i]); });
    if (S.trophies.nat) honours.push(S.trophies.nat + 'x Coppa Italia');
    ['ucl', 'uel', 'conf'].forEach((k) => { if (S.trophies[k]) honours.push(S.trophies[k] + 'x ' + EURO_COMPS[k].name); });
    const topDiv = S.history.reduce((a, hh) => Math.max(a, DIVS.findIndex((x) => x.name === hh.div)), S.div);
    const promotions = S.history.filter((hh) => hh.promoted).length;
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
      <div class="pl-card" style="padding:14px 12px">
        <div class="dyn-top-sub" style="text-align:left;margin-bottom:10px">La bacheca, stagione per stagione</div>
        ${sparkRow('Posizione in classifica (su, meglio)', S.history.map((hh) => -hh.pos), 'var(--gold)')}
        ${sparkRow('Valore del club', S.history.map((hh) => hh.worth), 'var(--dyn)')}
        ${sparkRow('Budget a fine stagione', S.history.map((hh) => hh.budget != null ? hh.budget : 0), 'var(--good)')}
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
    if (S.trophies.total > 0 || how === 'retired') celebrate(body.querySelector('.dyn-panel'));
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

  function renderCups() {
    const wrap = $('owCups'); if (!S.cups) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = Object.values(S.cups).map((c) => {
      const st = c.won ? 'win' : c.out ? 'out' : '';
      let label;
      if (c.won) label = 'Vincitori';
      else if (c.out) label = c.phase === 'group' ? 'Eliminati nel girone' : (c.rounds[c.at - 1] || 'Eliminati');
      else if (c.phase === 'group') label = 'Girone: ' + (c.groupPts || 0) + 'pt';
      else label = c.at ? c.rounds[c.at - 1] : 'Iscritti';
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
    const eventsHTML = (m.events && m.events.length) ? `<div class="mrow-scorers">${m.events.map((ev) => `<div class="sc them">${ev.kind === 'inj' ? '🚑' : '🟥'} ${flagOf(ev)}${ev.n} ${ev.kind === 'inj' ? 'ko, fuori ' + ev.weeks + ' partit' + (ev.weeks === 1 ? 'a' : 'e') : 'squalificato per la prossima'}</div>`).join('')}</div>` : '';
    row.innerHTML = `<div class="mrow-mw">G${m.mw}</div>
      <div class="mrow-main"><div class="mrow-fix"><span class="ha">${m.home ? 'C' : 'T'}</span> vs ${m.opp}</div>${scorersHTML}${eventsHTML}</div>
      <div class="mrow-res ${m.res}">${m.gf}-${m.ga}</div>`;
    $('owLog').prepend(row);
  }

  // Partita di girone europeo: a differenza di logCup non è "passa/eliminato" ma un
  // risultato con punteggio di classifica, perché nella fase a gironi si può anche pareggiare.
  function logEuroGroup(name, round, res, gf, ga, goalsFor, goalsAgainst, oppName, ptsSoFar) {
    const row = document.createElement('div'); row.className = 'mrow cup';
    const usSc = fmtScorers(goalsFor), themSc = fmtScorers(goalsAgainst);
    const scorersHTML = (usSc || themSc) ? `<div class="mrow-scorers">
        ${usSc ? '<div class="sc us">⚽ ' + usSc + '</div>' : ''}
        ${themSc ? '<div class="sc them">🥅 ' + themSc + '</div>' : ''}
      </div>` : '';
    const label = res === 'W' ? 'Vittoria' : res === 'D' ? 'Pareggio' : 'Sconfitta';
    row.innerHTML = `<div class="mrow-mw">${name.split(' ')[0]}</div>
      <div class="mrow-main"><div class="mrow-fix">${name} ${round} <span class="ha">vs ${oppName}</span></div><div class="mrow-you">${label} · ${ptsSoFar} pt nel girone</div>${scorersHTML}</div>
      <div class="mrow-res ${res}">${gf}-${ga}</div>`;
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
