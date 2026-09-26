'use strict';
/* ============================================================
   Presidente · Serie A — errors.js
   Raccolta minima degli errori JS lato client: nessuna libreria di terze
   parti, solo window.onerror/unhandledrejection che salvano un log corto
   (ultimi 20) in localStorage — utile per il presidente stesso ("perché mi
   si è chiuso il gioco?") e, se il server risponde (errors.php, opzionale
   come leaderboard.php: fallisce in silenzio se il PHP non gira, es. in
   locale), un invio best-effort per farli vedere anche a chi mantiene il
   gioco. Mai un blocco per l'utente: ogni passo è avvolto in try/catch.
   Caricato per primo (vedi index.html), prima di data.js/sim.js/ui.js,
   così cattura anche eventuali errori di caricamento degli altri script.
   ============================================================ */
(function () {
  var STORE_KEY = 'dsa_error_log';
  var MAX_ENTRIES = 20;
  var REPORT_ENDPOINT = 'errors.php';
  var sentThisSession = 0, MAX_SENT_PER_SESSION = 5;   // non spammare il server per un errore che si ripete a ogni frame

  function readLog() {
    try { var raw = localStorage.getItem(STORE_KEY); var arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch (e) { return []; }
  }
  function writeLog(arr) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(arr.slice(-MAX_ENTRIES))); } catch (e) { /* storage piena o non disponibile: pazienza, il log resta solo in console */ }
  }

  function record(entry) {
    try {
      entry.ts = Date.now();
      entry.url = (typeof location !== 'undefined' && location.href) || '';
      entry.ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
      var log = readLog();
      log.push(entry);
      writeLog(log);
      maybeReport(entry);
    } catch (e) { /* il logger stesso non deve MAI far fallire altro codice */ }
  }

  // Invio best-effort al server: come submitToLeaderboard (ui.js), fallisce in silenzio se
  // il PHP non risponde (es. sviluppo locale senza server PHP) — non è mai bloccante e non
  // mostra mai un errore all'utente per un errore di rete nel logger di errori stesso.
  function maybeReport(entry) {
    if (typeof fetch !== 'function' || sentThisSession >= MAX_SENT_PER_SESSION) return;
    sentThisSession++;
    try {
      fetch(REPORT_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: String(entry.message || '').slice(0, 500), stack: String(entry.stack || '').slice(0, 2000), url: entry.url, source: entry.source || '' }),
      }).catch(function () {});
    } catch (e) {}
  }

  window.addEventListener('error', function (ev) {
    record({ message: ev.message, source: (ev.filename || '') + ':' + (ev.lineno || '') + ':' + (ev.colno || ''), stack: ev.error && ev.error.stack });
  });
  window.addEventListener('unhandledrejection', function (ev) {
    var reason = ev.reason;
    record({ message: 'Promise non gestita: ' + (reason && reason.message ? reason.message : String(reason)), stack: reason && reason.stack, source: 'unhandledrejection' });
  });

  // Esposto per debug manuale dalla console (es. supporto remoto: "apri la console e scrivi
  // DynErrorLog.dump()") e per un'eventuale futura voce "Segnala un problema" in UI.
  window.DynErrorLog = {
    dump: function () { return readLog(); },
    clear: function () { try { localStorage.removeItem(STORE_KEY); } catch (e) {} },
  };
})();
