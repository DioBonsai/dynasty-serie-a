/* ==========================================================================
   QUIZZOTTI — Motore query del database domande
   Richiede che assets/questions-data.js sia caricato prima (variabile
   globale QUIZ_DB) e opera come estrazione casuale bilanciata con filtri
   per categoria/difficolta/tag/anno e modalita' predefinite, evitando
   duplicati all'interno della stessa sessione di gioco.

   Schema di ogni domanda in QUIZ_DB:
   {
     id: string,               // identificativo univoco
     domanda: string,
     opzioni: string[],        // 2-4 opzioni
     risposta: number,         // indice della risposta corretta in opzioni
     difficolta: 'facile' | 'medio' | 'difficile',
     categoria: string,        // es. 'Record', 'Mondiali', 'Loghi', 'Calciomercato', 'Champions League', 'Campionati', 'Storia', 'Curiosita'
     tag: string[],            // es. ['Milan', 'Real Madrid', 'Messi']
     anno: number | null       // anno di riferimento del fatto, se applicabile
   }

   Modalita' predefinite:
     'anni90'   -> solo domande con anno tra 1990 e 1999
     'hardcore' -> solo difficolta 'difficile'
   ========================================================================== */
(function (global) {
    'use strict';

    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function QuizEngine(db) {
        this.db = db || [];
        this.usedIds = new Set();
    }

    QuizEngine.prototype.resetSession = function () {
        this.usedIds.clear();
    };

    QuizEngine.prototype.markUsed = function (ids) {
        const self = this;
        (Array.isArray(ids) ? ids : [ids]).forEach(function (id) { self.usedIds.add(id); });
    };

    QuizEngine.prototype.categories = function () {
        return Array.from(new Set(this.db.map(function (q) { return q.categoria; }))).sort();
    };

    QuizEngine.prototype.tags = function () {
        const set = new Set();
        this.db.forEach(function (q) { (q.tag || []).forEach(function (t) { set.add(t); }); });
        return Array.from(set).sort();
    };

    /**
     * Filtra il database secondo i criteri passati.
     * @param {Object} opts
     * @param {string|string[]} [opts.categoria]
     * @param {string|string[]} [opts.difficolta]
     * @param {string|string[]} [opts.tag]
     * @param {number} [opts.annoMin]
     * @param {number} [opts.annoMax]
     * @param {'anni90'|'hardcore'} [opts.modalita]
     * @param {boolean} [opts.escludiUsate=true]
     */
    QuizEngine.prototype.filter = function (opts) {
        opts = opts || {};
        let annoMin = opts.annoMin;
        let annoMax = opts.annoMax;
        let difficolta = opts.difficolta;

        if (opts.modalita === 'anni90') { annoMin = 1990; annoMax = 1999; }
        if (opts.modalita === 'hardcore') { difficolta = 'difficile'; }

        const categorie = opts.categoria ? (Array.isArray(opts.categoria) ? opts.categoria : [opts.categoria]) : null;
        const difficolte = difficolta ? (Array.isArray(difficolta) ? difficolta : [difficolta]) : null;
        const tags = opts.tag ? (Array.isArray(opts.tag) ? opts.tag : [opts.tag]) : null;
        const escludiUsate = opts.escludiUsate !== false;

        return this.db.filter((q) => {
            if (escludiUsate && this.usedIds.has(q.id)) return false;
            if (categorie && categorie.indexOf(q.categoria) === -1) return false;
            if (difficolte && difficolte.indexOf(q.difficolta) === -1) return false;
            if (tags && !(q.tag || []).some((t) => tags.indexOf(t) !== -1)) return false;
            if (annoMin != null && (q.anno == null || q.anno < annoMin)) return false;
            if (annoMax != null && (q.anno == null || q.anno > annoMax)) return false;
            return true;
        });
    };

    /**
     * Estrae `count` domande casuali, bilanciando le categorie quando
     * non ne viene richiesta una specifica, evitando duplicati di sessione.
     * Se il pool filtrato non basta, riusa (con avviso) le domande gia' viste.
     */
    QuizEngine.prototype.getRandom = function (opts) {
        opts = opts || {};
        const count = opts.count || 10;
        let pool = this.filter(opts);

        if (pool.length < count) {
            // fallback: ripesca includendo le domande gia' usate in sessione
            pool = this.filter(Object.assign({}, opts, { escludiUsate: false }));
        }

        if (!opts.categoria) {
            // bilanciamento round-robin tra categorie presenti nel pool
            const byCat = {};
            shuffle(pool).forEach((q) => {
                (byCat[q.categoria] = byCat[q.categoria] || []).push(q);
            });
            const cats = Object.keys(byCat);
            const result = [];
            let i = 0;
            while (result.length < count && cats.some((c) => byCat[c].length)) {
                const c = cats[i % cats.length];
                if (byCat[c].length) result.push(byCat[c].shift());
                i++;
            }
            this.markUsed(result.map((q) => q.id));
            return result;
        }

        const result = shuffle(pool).slice(0, count);
        this.markUsed(result.map((q) => q.id));
        return result;
    };

    global.QuizEngine = QuizEngine;
})(window);
