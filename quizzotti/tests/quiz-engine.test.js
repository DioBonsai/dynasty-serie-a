/* Test del motore di query condiviso (assets/quiz-engine.js) contro il
   database domande condiviso (assets/questions-data.js). Usa node:test,
   incluso in Node.js senza dipendenze da installare: `node --test tests/`. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

global.window = global;
const QUIZ_DB = require('../assets/questions-data.js');
require('../assets/quiz-engine.js');
const QuizEngine = global.QuizEngine;

test('QUIZ_DB e QuizEngine sono caricati correttamente', () => {
    assert.ok(Array.isArray(QUIZ_DB));
    assert.ok(QUIZ_DB.length > 0);
    assert.equal(typeof QuizEngine, 'function');
});

test('getRandom restituisce il numero di domande richiesto', () => {
    const engine = new QuizEngine(QUIZ_DB);
    const result = engine.getRandom({ count: 10 });
    assert.equal(result.length, 10);
});

test('getRandom senza categoria bilancia tra le categorie disponibili', () => {
    const engine = new QuizEngine(QUIZ_DB);
    const result = engine.getRandom({ count: 20 });
    const categories = new Set(result.map((q) => q.categoria));
    // con 20 domande estratte dall'intero database ci si aspettano piu categorie, non una sola
    assert.ok(categories.size > 1, 'le domande estratte dovrebbero coprire piu di una categoria');
});

test('getRandom con categoria filtra correttamente', () => {
    const engine = new QuizEngine(QUIZ_DB);
    const result = engine.getRandom({ count: 5, categoria: 'Mondiali' });
    result.forEach((q) => assert.equal(q.categoria, 'Mondiali'));
});

test('modalita "hardcore" restituisce solo domande difficili', () => {
    const engine = new QuizEngine(QUIZ_DB);
    const result = engine.getRandom({ count: 5, modalita: 'hardcore' });
    result.forEach((q) => assert.equal(q.difficolta, 'difficile'));
});

test('modalita "anni90" restituisce solo domande con anno 1990-1999', () => {
    const engine = new QuizEngine(QUIZ_DB);
    const result = engine.getRandom({ count: 5, modalita: 'anni90' });
    result.forEach((q) => {
        assert.ok(q.anno >= 1990 && q.anno <= 1999, `anno ${q.anno} fuori dal range anni90`);
    });
});

test('nessuna domanda ripetuta in sessione anche estraendo piu volte', () => {
    const engine = new QuizEngine(QUIZ_DB);
    const first = engine.getRandom({ count: 15 });
    const second = engine.getRandom({ count: 15 });
    const firstIds = new Set(first.map((q) => q.id));
    const overlap = second.filter((q) => firstIds.has(q.id));
    assert.equal(overlap.length, 0, 'le domande della seconda estrazione non dovrebbero ripetere quelle della prima');
});

test('resetSession consente di riestrarre domande gia usate', () => {
    const engine = new QuizEngine(QUIZ_DB);
    engine.getRandom({ count: QUIZ_DB.length }); // esaurisce il pool
    engine.resetSession();
    const result = engine.getRandom({ count: 5 });
    assert.equal(result.length, 5);
});

test('shuffle (interno via getRandom) produce un ordine non fisso su piu chiamate', () => {
    const engine = new QuizEngine(QUIZ_DB);
    const runs = new Set();
    for (let i = 0; i < 5; i++) {
        engine.resetSession();
        const ids = engine.getRandom({ count: 5 }).map((q) => q.id).join(',');
        runs.add(ids);
    }
    assert.ok(runs.size > 1, "l'estrazione dovrebbe variare tra chiamate diverse (non deterministica)");
});

test('categories() e tags() restituiscono elenchi non vuoti e senza duplicati', () => {
    const engine = new QuizEngine(QUIZ_DB);
    const categories = engine.categories();
    const tags = engine.tags();
    assert.ok(categories.length > 0);
    assert.ok(tags.length > 0);
    assert.equal(categories.length, new Set(categories).size);
    assert.equal(tags.length, new Set(tags).size);
});
