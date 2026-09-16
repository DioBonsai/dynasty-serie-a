/* ==========================================================================
   QUIZZOTTI — Profilo condiviso tra tutti i minigiochi
   Un solo progresso (livello, XP, migliori punteggi) che attraversa i 10
   giochi, salvato in localStorage sul dispositivo del giocatore. Nessun
   dato lascia il browser: non c'e' alcun invio a server esterni.

   Come collegare un gioco (3 righe, a fine partita):
     QZProfile.recordResult('nome-gioco', {
       xp: 42,                          // punti esperienza guadagnati in questa partita
       label: 'Hai indovinato 8/10'     // riepilogo breve mostrato nel profilo
     });

   Il livello cresce con una curva a radice quadrata (progressione dolce:
   i primi livelli richiedono poca XP, quelli alti sempre di piu').
   ========================================================================== */
(function (global) {
    'use strict';

    var STORAGE_KEY = 'quizzottiProfile';
    var XP_PER_LEVEL_BASE = 60; // XP necessari per il livello 1 -> 2

    var GAME_NAMES = {
        cvem: 'Chi Vuol Essere Milionario',
        jeopardy: 'Jeopardy',
        avantiunaltro: 'Avanti un Altro',
        citazioni: "Chi l'ha detto",
        taboo: 'Taboo',
        intesavincente: 'Intesa Vincente',
        mrwhite: 'Mr.White',
        bomba: 'Bomba',
        sfidaeredita: 'Derby delle Parole',
        giocatoributget: 'Sfida dei Budget'
    };

    function emptyProfile() {
        return { totalXP: 0, gamesPlayed: {}, bestScores: {}, lastPlayed: {} };
    }

    function getProfile() {
        try {
            var raw = global.localStorage.getItem(STORAGE_KEY);
            if (!raw) return emptyProfile();
            var parsed = JSON.parse(raw);
            return Object.assign(emptyProfile(), parsed);
        } catch {
            return emptyProfile();
        }
    }

    function saveProfile(profile) {
        try {
            global.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        } catch {
            /* storage non disponibile (modalita privata, quota piena, ecc.): si degrada in silenzio */
        }
    }

    // Livello N richiede XP cumulativa = XP_PER_LEVEL_BASE * (1+2+...+N) circa,
    // usando una radice quadrata per una progressione dolce e senza tabelle fisse.
    function levelForXP(xp) {
        return Math.max(1, Math.floor(Math.sqrt(xp / XP_PER_LEVEL_BASE)) + 1);
    }

    function xpForLevel(level) {
        return Math.pow(level - 1, 2) * XP_PER_LEVEL_BASE;
    }

    function recordResult(gameId, result) {
        result = result || {};
        var xp = Math.max(0, Math.round(result.xp || 0));
        var profile = getProfile();

        profile.totalXP += xp;
        profile.gamesPlayed[gameId] = (profile.gamesPlayed[gameId] || 0) + 1;
        profile.lastPlayed[gameId] = Date.now();

        var prevBest = profile.bestScores[gameId];
        if (!prevBest || xp > prevBest.xp) {
            profile.bestScores[gameId] = { xp: xp, label: result.label || '', date: Date.now() };
        }

        saveProfile(profile);
        renderBadge();
        return profile;
    }

    function resetProfile() {
        saveProfile(emptyProfile());
        renderBadge();
    }

    /* ---------------------------------------------------------------------
       UI: badge nell'header + pannello di dettaglio
       ------------------------------------------------------------------- */
    function renderBadge() {
        var badge = global.document.getElementById('qz-profile-badge');
        if (!badge) return;
        var profile = getProfile();
        var level = levelForXP(profile.totalXP);
        badge.innerHTML = '<i class="fas fa-star" aria-hidden="true"></i><span>Lv. ' + level + '</span>';
        badge.setAttribute('aria-label', 'Profilo Quizzotti: livello ' + level + ', ' + profile.totalXP + ' punti esperienza totali');
    }

    function fmtDate(ts) {
        if (!ts) return '';
        var d = new Date(ts);
        return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function buildPanel() {
        var profile = getProfile();
        var level = levelForXP(profile.totalXP);
        var currentLevelXP = xpForLevel(level);
        var nextLevelXP = xpForLevel(level + 1);
        var progress = nextLevelXP > currentLevelXP
            ? Math.round(((profile.totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100)
            : 0;

        var gamesPlayedTotal = Object.keys(profile.gamesPlayed).reduce(function (sum, k) { return sum + profile.gamesPlayed[k]; }, 0);

        var rows = Object.keys(GAME_NAMES).map(function (id) {
            var best = profile.bestScores[id];
            var plays = profile.gamesPlayed[id] || 0;
            if (!plays) return '';
            return (
                '<div class="qz-stat-tile" style="text-align:left;">' +
                '<span class="qz-stat-label">' + GAME_NAMES[id] + '</span>' +
                '<span class="qz-stat-value" style="font-size:16px;">' + (best ? best.label : '-') + '</span>' +
                '<span style="font-size:11px;color:var(--qz-text-faint);">' + plays + ' partite &middot; ultima il ' + fmtDate(profile.lastPlayed[id]) + '</span>' +
                '</div>'
            );
        }).filter(Boolean).join('');

        return (
            '<div id="qz-profile-overlay" style="position:fixed;inset:0;z-index:2500;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;">' +
            '<div class="qz-card" role="dialog" aria-modal="true" aria-labelledby="qz-profile-title" style="max-width:480px;width:100%;max-height:85vh;overflow-y:auto;padding:28px 24px;position:relative;">' +
            '<button id="qz-profile-close" aria-label="Chiudi profilo" class="qz-btn qz-btn-ghost" style="position:absolute;top:16px;right:16px;width:40px;height:40px;padding:0;border-radius:50%;">&times;</button>' +
            '<h2 id="qz-profile-title" style="color:var(--qz-gold-bright);margin-bottom:4px;">Il tuo profilo Quizzotti</h2>' +
            '<p style="color:var(--qz-text-dim);font-size:14px;margin-bottom:18px;">Salvato solo su questo dispositivo, in nessun server.</p>' +
            '<div style="display:flex;align-items:center;gap:16px;margin-bottom:18px;">' +
            '<div style="font-size:40px;font-weight:800;color:var(--qz-gold-bright);">Lv.' + level + '</div>' +
            '<div style="flex:1;">' +
            '<div class="qz-timer" style="height:8px;"><div class="qz-timer-fill" style="transform:scaleX(' + (progress / 100) + ');background:linear-gradient(90deg,var(--qz-gold),var(--qz-gold-bright));"></div></div>' +
            '<div style="font-size:12px;color:var(--qz-text-faint);margin-top:4px;">' + profile.totalXP + ' XP totali &middot; ' + (nextLevelXP - profile.totalXP > 0 ? (nextLevelXP - profile.totalXP) + ' XP al livello ' + (level + 1) : '') + '</div>' +
            '</div></div>' +
            '<p style="color:var(--qz-text-dim);font-size:14px;margin-bottom:14px;">' + gamesPlayedTotal + ' partite giocate in totale' + (rows ? '' : '. Gioca la tua prima partita per iniziare!') + '</p>' +
            (rows ? '<div class="qz-results-stats" style="grid-template-columns:1fr;">' + rows + '</div>' : '') +
            '<button id="qz-profile-reset" class="qz-btn qz-btn-ghost" style="width:100%;margin-top:20px;font-size:13px;">Azzera il profilo</button>' +
            '</div></div>'
        );
    }

    function openPanel() {
        closePanel();
        var wrapper = global.document.createElement('div');
        wrapper.innerHTML = buildPanel();
        global.document.body.appendChild(wrapper.firstElementChild);

        var overlay = global.document.getElementById('qz-profile-overlay');
        var close = function () { closePanel(); };
        global.document.getElementById('qz-profile-close').addEventListener('click', close);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
        global.document.getElementById('qz-profile-reset').addEventListener('click', function () {
            if (global.confirm('Azzerare livello, XP e punteggi salvati su questo dispositivo? L\'azione non si puo\' annullare.')) {
                resetProfile();
                close();
            }
        });
        global.document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') { close(); global.document.removeEventListener('keydown', escHandler); }
        });
    }

    function closePanel() {
        var existing = global.document.getElementById('qz-profile-overlay');
        if (existing) existing.remove();
    }

    function initBadgeButton() {
        var badge = global.document.getElementById('qz-profile-badge');
        if (!badge) return;
        renderBadge();
        badge.addEventListener('click', openPanel);
    }

    if (global.document.readyState === 'loading') {
        global.document.addEventListener('DOMContentLoaded', initBadgeButton);
    } else {
        initBadgeButton();
    }

    global.QZProfile = {
        recordResult: recordResult,
        getProfile: getProfile,
        getLevel: function () { return levelForXP(getProfile().totalXP); },
        resetProfile: resetProfile,
        openPanel: openPanel
    };
})(window);
