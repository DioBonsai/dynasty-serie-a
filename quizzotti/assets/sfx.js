/* ==========================================================================
   QUIZZOTTI — Effetti sonori sintetizzati (Web Audio API)
   Nessun file audio esterno, nessuna dipendenza da CDN di terze parti:
   ogni suono è generato al volo, quindi non può mai restare rotto o offline.
   Espone QZSound.<effetto>() e QZSound.makeAudioLike(fn, loop) per sostituire
   un elemento <audio> con un oggetto che ha la stessa interfaccia
   (play/pause/currentTime/volume) senza toccare il codice chiamante.
   ========================================================================== */
(function (global) {
    'use strict';

    var AudioCtx = global.AudioContext || global.webkitAudioContext;
    var ctx = null;

    function getCtx() {
        if (!AudioCtx) return null;
        if (!ctx) ctx = new AudioCtx();
        return ctx;
    }

    /**
     * Safari/iOS e i browser in-app (Instagram, WhatsApp, ecc.) creano
     * l'AudioContext sospeso e ignorano resume() se non viene aspettato
     * per davvero, oppure lo sospendono di nuovo quando la pagina perde il
     * focus (cambio app, notifica) senza risvegliarsi da sola. Il vecchio
     * codice chiamava resume() senza aspettarlo e schedulava il suono
     * subito dopo: sul contesto ancora sospeso il suono restava muto,
     * silenziosamente. Qui si aspetta davvero che il contesto sia
     * "running" prima di creare qualunque nodo audio.
     */
    function withRunningContext(fn) {
        var c = getCtx();
        if (!c) return;
        if (c.state === 'running') {
            fn(c);
            return;
        }
        c.resume().then(function () {
            fn(c);
        }).catch(function () {
            /* alcuni browser in-app bloccano Web Audio del tutto: niente da fare */
        });
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

    function noiseBurst(duration, gainPeak, lowpassFreq, delay) {
        withRunningContext(function (c) {
            var t0 = c.currentTime + (delay || 0);
            var bufferSize = Math.floor(c.sampleRate * duration);
            var buffer = c.createBuffer(1, bufferSize, c.sampleRate);
            var data = buffer.getChannelData(0);
            for (var i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
            }
            var src = c.createBufferSource();
            src.buffer = buffer;
            var filter = c.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = lowpassFreq || 400;
            var gain = c.createGain();
            gain.gain.setValueAtTime(gainPeak || 0.5, t0);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
            src.connect(filter).connect(gain).connect(c.destination);
            src.start(t0);
        });
    }

    var QZSound = {};

    QZSound.tick = function () { tone(1800, 0.05, 'square', 0.12); };

    QZSound.boom = function () {
        noiseBurst(0.55, 0.55, 220);
        tone(55, 0.45, 'sine', 0.45);
    };

    QZSound.correct = function () {
        tone(523.25, 0.12, 'sine', 0.22, 0);
        tone(659.25, 0.12, 'sine', 0.22, 0.1);
        tone(783.99, 0.2, 'sine', 0.22, 0.2);
    };

    QZSound.wrong = function () {
        tone(220, 0.25, 'sawtooth', 0.18, 0);
        tone(180, 0.3, 'sawtooth', 0.18, 0.12);
    };

    QZSound.coin = function () {
        tone(988, 0.08, 'square', 0.18, 0);
        tone(1319, 0.12, 'square', 0.18, 0.06);
    };

    QZSound.lifeline = function () {
        tone(880, 0.15, 'sine', 0.18, 0);
        tone(1046.5, 0.15, 'sine', 0.18, 0.1);
    };

    QZSound.levelUp = function () {
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
            tone(f, 0.15, 'triangle', 0.2, i * 0.09);
        });
    };

    QZSound.win = function () {
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(function (f, i) {
            tone(f, 0.25, 'triangle', 0.22, i * 0.12);
        });
    };

    QZSound.lose = function () {
        [392, 349.23, 311.13, 261.63].forEach(function (f, i) {
            tone(f, 0.3, 'sawtooth', 0.16, i * 0.15);
        });
    };

    QZSound.start = function () {
        tone(440, 0.1, 'square', 0.18, 0);
        tone(660, 0.15, 'square', 0.18, 0.08);
    };

    /* ---- musica di sottofondo ambient generativa, in loop leggero ---- */
    var musicOn = false;
    var musicTimer = null;
    QZSound.startMusic = function () {
        if (musicOn) return;
        musicOn = true;
        var notes = [220, 261.63, 329.63, 392, 329.63, 261.63];
        var i = 0;
        (function step() {
            if (!musicOn) return;
            tone(notes[i % notes.length], 1.1, 'sine', 0.045);
            tone(notes[i % notes.length] / 2, 1.4, 'sine', 0.03);
            i++;
            musicTimer = setTimeout(step, 900);
        })();
    };
    QZSound.stopMusic = function () {
        musicOn = false;
        if (musicTimer) clearTimeout(musicTimer);
    };

    /**
     * Crea un oggetto con la stessa interfaccia minima di un elemento <audio>
     * (play/pause/currentTime/volume) sostenuto da un effetto sintetizzato,
     * cosi' il codice chiamante esistente non richiede modifiche.
     * @param {Function} fn effetto da riprodurre (una delle funzioni sopra)
     * @param {boolean} [loop] se true, .play() ripete l'effetto finche' non arriva .pause()
     */
    QZSound.makeAudioLike = function (fn, loop) {
        var looping = false;
        var loopTimer = null;
        var vol = 1;
        return {
            get currentTime() { return 0; },
            set currentTime(v) { /* no-op: suono generato, nessun offset da gestire */ },
            get volume() { return vol; },
            set volume(v) { vol = v; },
            play: function () {
                if (loop) {
                    if (looping) return Promise.resolve();
                    looping = true;
                    (function step() {
                        if (!looping) return;
                        fn();
                        loopTimer = setTimeout(step, 500);
                    })();
                } else {
                    fn();
                }
                return Promise.resolve();
            },
            pause: function () {
                looping = false;
                if (loopTimer) clearTimeout(loopTimer);
            }
        };
    };

    /* ---- sblocco precoce su mobile + ripresa dopo cambio focus ---- */
    // Alla prima interazione qualunque sulla pagina proviamo subito ad
    // avviare/risvegliare l'AudioContext, cosi' quando il gioco chiama
    // davvero un suono (es. il primo tick della Bomba) il contesto e'
    // gia' "running" invece di doverlo aspettare in quel momento.
    function unlock() {
        withRunningContext(function () {});
    }
    if (global.document) {
        document.addEventListener('pointerdown', unlock, { once: true });
        document.addEventListener('touchstart', unlock, { once: true });
        document.addEventListener('keydown', unlock, { once: true });

        // Molti browser mobili sospendono l'AudioContext quando l'app va
        // in background (notifica, cambio app) e non lo risvegliano da
        // soli al ritorno: senza questo, tutti i suoni restavano muti per
        // il resto della sessione dopo il primo cambio di focus.
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) unlock();
        });
    }

    global.QZSound = QZSound;
})(window);
