#!/usr/bin/env node
/* ==========================================================================
   QUIZZOTTI — Cache-busting per gli asset condivisi
   Senza un bundler, il browser puo' continuare a servire una versione
   in cache di assets/*.css o assets/*.js anche dopo un aggiornamento.
   Questo script calcola un hash breve del contenuto di ogni asset e lo
   aggiunge come query string (?v=hash) a ogni riferimento nei file HTML:
   quando il contenuto di un file cambia, cambia l'hash, e il browser lo
   ri-scarica automaticamente; se non cambia, l'hash resta lo stesso e la
   cache resta valida (fingerprinting, come farebbe un bundler).

   Uso: node scripts/cache-bust.js
   Va rieseguito dopo ogni modifica ai file in assets/.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const HTML_FILES = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));

function hashOf(assetRelPath) {
    const filePath = path.join(ROOT, assetRelPath);
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
}

function main() {
    // trova tutti gli asset locali (assets/*.css, assets/*.js) referenziati
    const assetPattern = /(href|src)="(assets\/[^"?]+\.(?:css|js))(\?v=[a-f0-9]+)?"/g;
    const seenAssets = new Set();

    HTML_FILES.forEach((file) => {
        const filePath = path.join(ROOT, file);
        let html = fs.readFileSync(filePath, 'utf8');
        let changed = false;

        html = html.replace(assetPattern, (match, attr, assetPath) => {
            seenAssets.add(assetPath);
            const hash = hashOf(assetPath);
            changed = true;
            return `${attr}="${assetPath}?v=${hash}"`;
        });

        if (changed) {
            fs.writeFileSync(filePath, html, 'utf8');
        }
    });

    console.log(`Cache-busting applicato a ${seenAssets.size} asset su ${HTML_FILES.length} pagine:`);
    [...seenAssets].sort().forEach((a) => console.log('  ' + a + '?v=' + hashOf(a)));
}

main();
