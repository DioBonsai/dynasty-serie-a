#!/usr/bin/env node
/* ==========================================================================
   QUIZZOTTI — Sincronizzazione header/overlay/footer condivisi
   Header, overlay del menu mobile e footer sono identici in tutte le pagine
   di gioco (partials/chrome-game.html) e leggermente diversi solo nella
   home page (partials/chrome-home.html). Storicamente venivano copiati a
   mano in ogni file HTML, e questo ha causato divergenze reali (link rotti,
   footer mancanti in 6 giochi) prima che venissero corrette.

   Uso:
     node scripts/sync-chrome.js          Controlla eventuali divergenze (exit 1 se trovate)
     node scripts/sync-chrome.js --fix    Corregge automaticamente ogni file HTML

   Aggiungendo un undicesimo minigioco: parti da uno dei file esistenti,
   così il chrome è già corretto, oppure copia i blocchi da
   partials/chrome-game.html e poi esegui questo script con --fix per
   verificare che il risultato coincida esattamente col resto della piattaforma.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GAME_FILES = [
    'AvantiUnAltro.html', 'Bomba.html', 'CVEM.html', 'Citazioni.html',
    'GiocatoriBudget.html', 'IntesaVincente.html', 'Jeopardy.html',
    'MrWhite.html', 'Taboo.html', 'sfidaEredita.html'
];
const HOME_FILE = 'index.html';
const fix = process.argv.includes('--fix');

function findElement(text, tagName, fromIndex) {
    const openRe = new RegExp('<' + tagName + '(\\s[^>]*)?>', 'i');
    const startMatch = openRe.exec(text.slice(fromIndex || 0));
    if (!startMatch) return null;
    const start = (fromIndex || 0) + startMatch.index;
    const tagRe = new RegExp('<(' + tagName + ')(\\s[^>]*)?>|</(' + tagName + ')>', 'gi');
    tagRe.lastIndex = start;
    let depth = 0, m;
    while ((m = tagRe.exec(text))) {
        depth += m[1] ? 1 : -1;
        if (depth === 0) return { start, end: m.index + m[0].length, text: text.slice(start, m.index + m[0].length) };
    }
    return null;
}

const SKIP_LINK = '<a href="#main-content" class="qz-skip-link">Vai al contenuto principale</a>\n';
const MAIN_ANCHOR = '\n<span id="main-content" tabindex="-1"></span>';

// Estende il blocco <header>...</header> per includere lo skip-link che lo
// precede e l'ancora #main-content che lo segue, se presenti, cosi' restano
// sincronizzati insieme al resto del chrome invece di essere trattati come
// contenuto "unico" della pagina.
function extendHeader(html, header) {
    if (!header) return header;
    let { start, end } = header;
    if (html.slice(start - SKIP_LINK.length, start) === SKIP_LINK) {
        start -= SKIP_LINK.length;
    }
    if (html.slice(end, end + MAIN_ANCHOR.length) === MAIN_ANCHOR) {
        end += MAIN_ANCHOR.length;
    }
    return { start, end, text: html.slice(start, end) };
}

function extractChrome(html) {
    let header = findElement(html, 'header');
    header = extendHeader(html, header);
    const overlayStart = html.indexOf('<div class="mobile-overlay"');
    const overlay = overlayStart !== -1 ? findElement(html, 'div', overlayStart) : null;
    const footer = findElement(html, 'footer');
    return { header, overlay, footer };
}

function extractPartial(partialText, label) {
    const marker = '<!-- ' + label + ' -->\n';
    const start = partialText.indexOf(marker);
    if (start === -1) throw new Error('Sezione "' + label + '" non trovata nel partial');
    const contentStart = start + marker.length;
    const nextMarker = partialText.indexOf('\n<!-- ', contentStart);
    return partialText.slice(contentStart, nextMarker === -1 ? undefined : nextMarker).trim();
}

const norm = (s) => s.replace(/\s+/g, ' ').trim();

function checkFile(file, canonical) {
    const filePath = path.join(ROOT, file);
    let html = fs.readFileSync(filePath, 'utf8');
    const current = extractChrome(html);
    const issues = [];

    ['header', 'overlay', 'footer'].forEach((part) => {
        const cur = current[part];
        const canon = canonical[part];
        if (!cur) { issues.push(part + ' assente'); return; }
        if (norm(cur.text) !== norm(canon)) issues.push(part + ' diverso dal canonico');
    });

    if (issues.length === 0) {
        console.log('  ' + file.padEnd(22) + 'OK');
        return { file, ok: true };
    }

    console.log('  ' + file.padEnd(22) + 'DIVERGE: ' + issues.join(', '));

    if (fix) {
        // sostituisce dal fondo verso l'inizio per non invalidare gli indici
        const replacements = ['footer', 'overlay', 'header']
            .map((part) => ({ part, el: current[part] }))
            .filter((r) => r.el)
            .sort((a, b) => b.el.start - a.el.start);
        replacements.forEach((r) => {
            html = html.slice(0, r.el.start) + canonical[r.part] + html.slice(r.el.end);
        });
        fs.writeFileSync(filePath, html, 'utf8');
        console.log('    -> corretto');
    }

    return { file, ok: false };
}

function main() {
    const gamePartial = fs.readFileSync(path.join(ROOT, 'partials/chrome-game.html'), 'utf8');
    const homePartial = fs.readFileSync(path.join(ROOT, 'partials/chrome-home.html'), 'utf8');

    const gameCanonical = {
        header: extractPartial(gamePartial, 'HEADER'),
        overlay: extractPartial(gamePartial, 'OVERLAY MENU MOBILE'),
        footer: extractPartial(gamePartial, 'FOOTER')
    };
    const homeCanonical = {
        header: extractPartial(homePartial, 'HEADER'),
        overlay: extractPartial(homePartial, 'OVERLAY MENU MOBILE'),
        footer: extractPartial(homePartial, 'FOOTER')
    };

    console.log((fix ? 'Correzione' : 'Verifica') + ' chrome condiviso su ' + (GAME_FILES.length + 1) + ' pagine...\n');

    console.log('Home:');
    const homeResult = checkFile(HOME_FILE, homeCanonical);

    console.log('\nGiochi:');
    const gameResults = GAME_FILES.map((f) => checkFile(f, gameCanonical));

    const allResults = [homeResult, ...gameResults];
    const diverging = allResults.filter((r) => !r.ok);

    console.log('');
    if (diverging.length === 0) {
        console.log('Tutte le pagine sono allineate ai partial condivisi.');
        process.exit(0);
    } else if (fix) {
        console.log(diverging.length + ' pagine corrette. Rilancia senza --fix per confermare.');
        process.exit(0);
    } else {
        console.log(diverging.length + ' pagine divergono dal chrome condiviso. Esegui con --fix per correggerle.');
        process.exit(1);
    }
}

main();
