'use strict';
/* ==========================================================================
   PRESIDENTE · SERIE A — Effetti sonori sintetizzati (Web Audio API)
   Stesso approccio del progetto gemello quizzotti/assets/sfx.js: nessun file
   audio esterno, ogni suono è generato al volo, quindi non può mai restare
   rotto o offline. Espone DynSound.<effetto>() più un mute persistito in
   localStorage (rispettato da ogni effetto).
   ========================================================================== */
(function (global) {
  var AudioCtx = global.AudioContext || global.webkitAudioContext;
  var ctx = null;
  var MKEY = 'dsa_sound_muted';

  function getCtx() {
    if (!AudioCtx) return null;
    if (!ctx) ctx = new AudioCtx();
    return ctx;
  }

  function isMuted() {
    try { return localStorage.getItem(MKEY) === '1'; } catch (e) { return false; }
  }

  function setMuted(v) {
    try { localStorage.setItem(MKEY, v ? '1' : '0'); } catch (e) {}
  }

  // Safari/iOS e i browser in-app sospendono l'AudioContext finché non lo si "sveglia"
  // davvero dentro un gesto utente: qui si aspetta che sia "running" prima di suonare.
  function withRunningContext(fn) {
    if (isMuted()) return;
    var c = getCtx();
    if (!c) return;
    if (c.state === 'running') { fn(c); return; }
    c.resume().then(function () { fn(c); }).catch(function () {});
  }

  function tone(freq, duration, type, gainPeak, delay) {
    withRunningContext(function (c) {
      var t0 = c.currentTime + (delay || 0);
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(gainPeak || 0.25, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain).connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.03);
    });
  }

  function sweep(fromFreq, toFreq, duration, type, gainPeak, delay) {
    withRunningContext(function (c) {
      var t0 = c.currentTime + (delay || 0);
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(fromFreq, t0);
      osc.frequency.linearRampToValueAtTime(toFreq, t0 + duration);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(gainPeak || 0.25, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain).connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.03);
    });
  }

  function noiseBurst(duration, gainPeak, lowpassFreq, delay) {
    withRunningContext(function (c) {
      var t0 = c.currentTime + (delay || 0);
      var bufferSize = Math.floor(c.sampleRate * duration);
      var buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.6);
      var src = c.createBufferSource();
      src.buffer = buffer;
      var filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpassFreq || 900;
      var gain = c.createGain();
      gain.gain.setValueAtTime(gainPeak || 0.4, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      src.connect(filter).connect(gain).connect(c.destination);
      src.start(t0);
    });
  }

  var DynSound = {};

  // Spin: un "tick" veloce, come una rotella che gira.
  DynSound.spinTick = function () { tone(1200 + Math.random() * 400, 0.04, 'square', 0.1); };

  // Spin normale: rivelazione con un piccolo "coin".
  DynSound.spinReveal = function () {
    tone(988, 0.08, 'square', 0.18, 0);
    tone(1319, 0.12, 'square', 0.18, 0.06);
  };

  // Spin che pesca un giocatore VERO (o un'icona): un piccolo squillo in più.
  DynSound.spinRevealReal = function () {
    [659.25, 987.77, 1318.5].forEach(function (f, i) { tone(f, 0.14, 'triangle', 0.2, i * 0.09); });
  };

  // Gol: un piccolo boato + corno da stadio.
  DynSound.goal = function () {
    noiseBurst(0.5, 0.35, 500);
    tone(220, 0.35, 'sawtooth', 0.22, 0.05);
    tone(330, 0.3, 'sawtooth', 0.16, 0.12);
  };

  // Fischio finale: un fischietto vero (sweep acuto breve, ripetuto tre volte).
  DynSound.whistle = function () {
    sweep(1800, 2400, 0.18, 'square', 0.16, 0);
    sweep(1800, 2400, 0.18, 'square', 0.16, 0.26);
    sweep(1800, 2600, 0.32, 'square', 0.18, 0.52);
  };

  // Trofeo/promozione: una fanfara ascendente.
  DynSound.trophy = function () {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(function (f, i) { tone(f, 0.26, 'triangle', 0.22, i * 0.12); });
  };

  // Retrocessione/eliminazione: discendente e cupa.
  DynSound.sadDown = function () {
    [392, 349.23, 311.13, 261.63].forEach(function (f, i) { tone(f, 0.3, 'sawtooth', 0.15, i * 0.15); });
  };

  // Un piccolo "pop" per conferme/click leggeri (toggle, cambio biglietto, ecc).
  DynSound.tap = function () { tone(700, 0.05, 'sine', 0.1); };

  // Incasso: un "cha-ching" luminoso per vendite, sponsor, bonus investitore.
  DynSound.coin = function () {
    tone(1046.5, 0.09, 'triangle', 0.22, 0);
    tone(1568, 0.15, 'triangle', 0.2, 0.07);
  };

  // Spesa: un tonfo morbido e discendente per acquisti/pagamenti (niente di negativo,
  // solo "i soldi sono usciti dalla cassa").
  DynSound.cashOut = function () {
    tone(392, 0.12, 'sine', 0.16, 0);
    tone(261.63, 0.18, 'sine', 0.13, 0.06);
  };

  // Conferma positiva generica: rinnovi, accordi sponsor, trofei minori dell'interfaccia.
  DynSound.chime = function () {
    tone(783.99, 0.1, 'triangle', 0.2, 0);
    tone(1046.5, 0.18, 'triangle', 0.18, 0.09);
  };

  // Errore/azione non valida: due note basse e secche, mai fastidiose.
  DynSound.error = function () {
    tone(220, 0.09, 'square', 0.15, 0);
    tone(174.61, 0.15, 'square', 0.15, 0.1);
  };

  // Notifica neutra e discreta: cambi di stato altrui (lobby multiplayer, poll, ecc).
  DynSound.notify = function () { tone(880, 0.08, 'sine', 0.13, 0); };

  // Fine stagione "tranquilla": né trofeo né retrocessione, un accordo pacato che chiude
  // comunque il capitolo invece di lasciare tutto in silenzio.
  DynSound.calmEnd = function () {
    [523.25, 659.25, 523.25].forEach(function (f, i) { tone(f, 0.22, 'triangle', 0.16, i * 0.14); });
  };

  // Calcio d'inizio: uno sweep ascendente breve + un piccolo tick, per "Inizia Stagione".
  DynSound.kickoff = function () {
    sweep(500, 1000, 0.12, 'square', 0.16, 0);
    tone(1200, 0.05, 'square', 0.13, 0.13);
  };

  DynSound.isMuted = isMuted;
  DynSound.setMuted = setMuted;
  DynSound.toggleMuted = function () { var m = !isMuted(); setMuted(m); return m; };

  // Sblocco precoce su mobile: alla prima interazione qualunque proviamo a "svegliare"
  // l'AudioContext, così il primo suono vero non arriva già in ritardo.
  function unlock() { withRunningContext(function () {}); }
  if (global.document) {
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) unlock(); });
  }

  global.DynSound = DynSound;
})(window);
