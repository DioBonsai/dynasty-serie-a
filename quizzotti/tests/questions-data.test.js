/* Verifica l'integrita' del database domande condiviso: schema valido,
   nessun id duplicato, indici di risposta nel range delle opzioni. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const QUIZ_DB = require('../assets/questions-data.js');

const DIFFICOLTA_VALIDE = ['facile', 'medio', 'difficile'];

test('QUIZ_DB non e vuoto', () => {
    assert.ok(QUIZ_DB.length >= 100, `Attese almeno 100 domande, trovate ${QUIZ_DB.length}`);
});

test('ogni domanda ha id univoco', () => {
    const ids = QUIZ_DB.map((q) => q.id);
    const duplicati = ids.filter((id, i) => ids.indexOf(id) !== i);
    assert.deepEqual(duplicati, [], `id duplicati trovati: ${duplicati.join(', ')}`);
});

test('ogni domanda rispetta lo schema atteso', () => {
    QUIZ_DB.forEach((q) => {
        assert.equal(typeof q.id, 'string', `id non valido per ${JSON.stringify(q)}`);
        assert.equal(typeof q.domanda, 'string');
        assert.ok(q.domanda.length > 5, `domanda troppo corta: "${q.domanda}"`);
        assert.ok(Array.isArray(q.opzioni), `opzioni non e un array in ${q.id}`);
        assert.ok(q.opzioni.length >= 2, `${q.id} ha meno di 2 opzioni`);
        assert.ok(Number.isInteger(q.risposta), `risposta non e un intero in ${q.id}`);
        assert.ok(
            q.risposta >= 0 && q.risposta < q.opzioni.length,
            `${q.id}: risposta=${q.risposta} fuori range per ${q.opzioni.length} opzioni`
        );
        assert.ok(DIFFICOLTA_VALIDE.includes(q.difficolta), `${q.id}: difficolta "${q.difficolta}" non valida`);
        assert.equal(typeof q.categoria, 'string');
        assert.ok(q.categoria.length > 0, `${q.id} ha categoria vuota`);
        assert.ok(Array.isArray(q.tag), `${q.id}: tag non e un array`);
        assert.ok(
            q.anno === null || (Number.isInteger(q.anno) && q.anno > 1800 && q.anno <= 2100),
            `${q.id}: anno "${q.anno}" non plausibile`
        );
    });
});

test('nessuna domanda duplicata per testo', () => {
    const testi = QUIZ_DB.map((q) => q.domanda.trim().toLowerCase());
    const duplicati = testi.filter((t, i) => testi.indexOf(t) !== i);
    assert.deepEqual(duplicati, [], `domande con testo duplicato: ${duplicati.join(' | ')}`);
});

test('ogni categoria ha almeno 5 domande (varieta minima per modalita filtrate)', () => {
    const perCategoria = {};
    QUIZ_DB.forEach((q) => { perCategoria[q.categoria] = (perCategoria[q.categoria] || 0) + 1; });
    Object.entries(perCategoria).forEach(([cat, n]) => {
        assert.ok(n >= 5, `categoria "${cat}" ha solo ${n} domande`);
    });
});
