/* ==========================================================================
   QUIZZOTTI — QZ engine condiviso
   Utility riusabili da tutti i minigiochi: counter animato, particelle,
   shake/pulse risposte, timer bar, streak "on fire", power-up, transizioni.
   Nessuna dipendenza esterna. Tutto vanilla JS.
   ========================================================================== */
(function (global) {
    'use strict';

    const QZ = {};

    /* ---------------------------------------------------------------------
       Counter animato (conteggio numerico su punteggio/stat)
       ------------------------------------------------------------------- */
    QZ.animateCounter = function (el, from, to, duration = 800, opts = {}) {
        if (!el) return;
        const prefix = opts.prefix || '';
        const suffix = opts.suffix || '';
        const decimals = opts.decimals || 0;
        const start = performance.now();
        const change = to - from;

        function tick(now) {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
            const value = from + change * eased;
            el.textContent = prefix + value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + suffix;
            if (p < 1) requestAnimationFrame(tick);
            else el.textContent = prefix + to.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + suffix;
        }
        requestAnimationFrame(tick);
    };

    /* ---------------------------------------------------------------------
       Particelle: piccolo burst attorno a un elemento (risposta corretta)
       ------------------------------------------------------------------- */
    QZ.burstParticles = function (el, count = 10) {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        for (let i = 0; i < count; i++) {
            const p = document.createElement('span');
            p.className = 'qz-particle';
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const dist = 40 + Math.random() * 40;
            p.style.setProperty('--qz-px', Math.cos(angle) * dist + 'px');
            p.style.setProperty('--qz-py', Math.sin(angle) * dist + 'px');
            p.style.left = (Math.random() * rect.width) + 'px';
            p.style.top = (Math.random() * rect.height) + 'px';
            if (Math.random() > 0.6) p.style.background = 'var(--qz-gold-bright)';
            el.appendChild(p);
            p.addEventListener('animationend', () => p.remove());
        }
    };

    /* ---------------------------------------------------------------------
       Feedback risposta corretta / errata
       ------------------------------------------------------------------- */
    QZ.markCorrect = function (el) {
        if (!el) return;
        el.classList.remove('qz-wrong');
        void el.offsetWidth; // restart animation
        el.classList.add('qz-correct');
        QZ.burstParticles(el, 12);
    };

    QZ.markWrong = function (el) {
        if (!el) return;
        el.classList.remove('qz-correct');
        void el.offsetWidth;
        el.classList.add('qz-wrong');
    };

    QZ.clearAnswerStates = function (container) {
        if (!container) return;
        container.querySelectorAll('.qz-answer').forEach(function (btn) {
            btn.classList.remove('qz-correct', 'qz-wrong', 'qz-eliminated');
            btn.disabled = false;
        });
    };

    /* ---------------------------------------------------------------------
       Timer bar — barra progressiva con soglie colore + callback scadenza
       ------------------------------------------------------------------- */
    QZ.Timer = function (fillEl, labelEl, opts) {
        opts = opts || {};
        this.fillEl = fillEl;
        this.labelEl = labelEl;
        this.duration = opts.duration || 20;
        this.onTick = opts.onTick || function () {};
        this.onExpire = opts.onExpire || function () {};
        this.warningAt = opts.warningAt || 0.5;
        this.dangerAt = opts.dangerAt || 0.25;
        this.remaining = this.duration;
        this._raf = null;
        this._lastTs = null;
        this._running = false;
        this.wrapperEl = (fillEl && fillEl.closest('.qz-timer')) || null;
    };

    QZ.Timer.prototype._render = function () {
        const ratio = Math.max(0, this.remaining / this.duration);
        if (this.fillEl) this.fillEl.style.transform = 'scaleX(' + ratio + ')';
        if (this.labelEl) this.labelEl.textContent = Math.ceil(this.remaining);
        if (this.wrapperEl) {
            this.wrapperEl.classList.toggle('qz-timer-warning', ratio <= this.warningAt && ratio > this.dangerAt);
            this.wrapperEl.classList.toggle('qz-timer-danger', ratio <= this.dangerAt);
        }
    };

    QZ.Timer.prototype.start = function () {
        this._running = true;
        this._lastTs = performance.now();
        const self = this;
        function frame(ts) {
            if (!self._running) return;
            const dt = (ts - self._lastTs) / 1000;
            self._lastTs = ts;
            self.remaining = Math.max(0, self.remaining - dt);
            self._render();
            self.onTick(self.remaining);
            if (self.remaining <= 0) {
                self._running = false;
                self.onExpire();
                return;
            }
            self._raf = requestAnimationFrame(frame);
        }
        this._render();
        this._raf = requestAnimationFrame(frame);
    };

    QZ.Timer.prototype.pause = function () {
        this._running = false;
        if (this._raf) cancelAnimationFrame(this._raf);
    };

    QZ.Timer.prototype.reset = function (duration) {
        this.pause();
        if (duration != null) this.duration = duration;
        this.remaining = this.duration;
        if (this.wrapperEl) this.wrapperEl.classList.remove('qz-timer-warning', 'qz-timer-danger');
        this._render();
    };

    QZ.Timer.prototype.addTime = function (seconds) {
        this.remaining = Math.min(this.duration, this.remaining + seconds);
        this._render();
    };

    /* ---------------------------------------------------------------------
       Streak "on fire" — attiva effetto dopo N risposte corrette di fila
       ------------------------------------------------------------------- */
    QZ.Streak = function (el, threshold) {
        this.el = el;
        this.threshold = threshold || 3;
        this.count = 0;
    };

    QZ.Streak.prototype.hit = function () {
        this.count++;
        this._render();
        return this.count >= this.threshold;
    };

    QZ.Streak.prototype.reset = function () {
        this.count = 0;
        this._render();
    };

    QZ.Streak.prototype._render = function () {
        if (!this.el) return;
        this.el.textContent = '';
        const icon = document.createElement('i');
        icon.className = 'fas fa-fire qz-flame-icon';
        this.el.appendChild(icon);
        this.el.appendChild(document.createTextNode(' x' + this.count));
        this.el.classList.toggle('qz-on-fire', this.count >= this.threshold);
    };

    /* ---------------------------------------------------------------------
       Transizioni tra schermate (mostra uno screen, nasconde gli altri)
       ------------------------------------------------------------------- */
    QZ.showScreen = function (screens, target, opts) {
        opts = opts || {};
        const slide = !!opts.slide;
        Object.keys(screens).forEach(function (key) {
            const el = screens[key];
            if (!el) return;
            if (key === target) {
                el.style.display = opts.display || 'block';
                el.classList.remove('qz-leaving');
                el.classList.add('qz-screen');
                if (slide) el.classList.add('qz-slide');
                void el.offsetWidth;
            } else {
                el.style.display = 'none';
                el.classList.remove('qz-screen', 'qz-slide');
            }
        });
    };

    /* ---------------------------------------------------------------------
       Power-up: 50:50 — nasconde due risposte errate a caso
       ------------------------------------------------------------------- */
    QZ.fiftyFifty = function (answerEls, correctIndex) {
        const wrongIndices = answerEls
            .map(function (_, i) { return i; })
            .filter(function (i) { return i !== correctIndex; });
        for (let i = wrongIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [wrongIndices[i], wrongIndices[j]] = [wrongIndices[j], wrongIndices[i]];
        }
        const toHide = wrongIndices.slice(0, 2);
        toHide.forEach(function (i) {
            if (answerEls[i]) {
                answerEls[i].classList.add('qz-eliminated');
                answerEls[i].disabled = true;
            }
        });
        return toHide;
    };

    /* ---------------------------------------------------------------------
       Shuffle generico (Fisher-Yates)
       ------------------------------------------------------------------- */
    QZ.shuffle = function (arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    /* ---------------------------------------------------------------------
       Condivisione risultato: Web Share API (mobile) con fallback a
       copia negli appunti, cosi' ogni gioco puo' offrire "condividi il
       punteggio" con una sola chiamata, senza reinventare la logica.
       ------------------------------------------------------------------- */
    QZ.shareResult = function (text, opts) {
        opts = opts || {};
        const url = opts.url || global.location.href;
        const title = opts.title || 'Quizzotti';
        const onFallback = opts.onFallback || function () {};

        if (navigator.share) {
            navigator.share({ title: title, text: text, url: url }).catch(function () {});
            return;
        }
        const full = text + '\n' + url;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(full).then(function () {
                onFallback('clipboard');
            }).catch(function () {
                onFallback('none');
            });
        } else {
            onFallback('none');
        }
    };

    global.QZ = QZ;
})(window);
