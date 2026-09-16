#!/usr/bin/env node
/* ==========================================================================
   QUIZZOTTI — Imposta il dominio di produzione
   sitemap.xml e robots.txt richiedono URL assoluti con un dominio reale,
   che questo progetto non conosce finche' non viene pubblicato. Questo
   script sostituisce il placeholder con il dominio effettivo in entrambi
   i file in un solo comando.

   Uso: node scripts/set-domain.js https://iltuodominio.it
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PLACEHOLDER = 'https://SOSTITUISCI-CON-IL-TUO-DOMINIO.it';

const domain = process.argv[2];
if (!domain) {
    console.error('Uso: node scripts/set-domain.js https://iltuodominio.it');
    process.exit(1);
}
if (!/^https?:\/\/[^/]+$/.test(domain)) {
    console.error('Il dominio deve essere un URL assoluto senza percorso finale, es: https://iltuodominio.it');
    process.exit(1);
}

['sitemap.xml', 'robots.txt'].forEach((file) => {
    const filePath = path.join(ROOT, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const count = (content.match(new RegExp(PLACEHOLDER, 'g')) || []).length;
    content = content.split(PLACEHOLDER).join(domain);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(file + ': sostituite ' + count + ' occorrenze del placeholder con ' + domain);
});
