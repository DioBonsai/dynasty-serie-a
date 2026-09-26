'use strict';
/* ============================================================
   Presidente · Serie A — test/engine.test.js
   Unit test minimi sul motore (sim.js), mirati alle funzioni formula-driven
   più facili da rompere in silenzio con una modifica: economia (wageFor,
   computeWorth), risoluzione dei playoff. Non testano l'interfaccia (ui.js)
   né il rendering, solo la logica pura del motore.

   data.js/rosters.js/sim.js dichiarano le loro funzioni con `const nome = ...`
   in cima al file (non `function nome(...)`), quindi vivono nello scope
   lessicale dello script, non come proprietà dell'oggetto globale: per
   poterle chiamare, il codice di test qui sotto viene concatenato agli
   stessi tre file ed eseguito come UN UNICO script in una sandbox Node
   (vm), invece di caricarli e poi provare ad accedervi dall'esterno (non
   funzionerebbe per le `const`). I risultati escono da quello script
   tramite `window.__RESULTS__`, l'unico modo pulito di "esportare" qualcosa
   da uno script classico non a moduli.

   Uso: node test/engine.test.js — esce con codice 1 se un'asserzione fallisce.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

const TEST_BODY = `
  var __R = { passed: 0, failed: 0, failures: [] };
  function __assert(cond, msg) { if (cond) __R.passed++; else { __R.failed++; __R.failures.push(msg); } }

  /* ---------------- wageFor: monotona crescente, sempre positiva ---------------- */
  (function testWageFor() {
    S = { div: 2, difficulty: 'medio' };
    var samples = [45, 55, 65, 75, 85, 95];
    var prevCeil = -1;
    samples.forEach(function (ovr) {
      var max = 0;
      for (var i = 0; i < 40; i++) max = Math.max(max, wageFor(ovr));
      __assert(max > prevCeil, 'wageFor(' + ovr + ') dovrebbe superare il campione precedente (max=' + max + ', prevCeil=' + prevCeil + ')');
      __assert(max > 0, 'wageFor(' + ovr + ') deve essere positivo');
      prevCeil = max * 0.85;
    });
    S = null;
  })();

  /* ---------------- computeWorth: formula esatta su un ctx sintetico ---------------- */
  (function testComputeWorth() {
    var ctx = {
      div: 2,
      squad: [
        { wage: 1000, ovr: 70, age: 25 },
        { wage: 2000, ovr: 90, age: 20 },
      ],
      stadiumSpent: 1e6, prestige: 5e6, fanbase: 1.5, budget: 2e6,
    };
    var squadVal = 1000 * 52 * 5 * 1 + 2000 * 52 * 9 * 1.4;
    var brand = Math.round((1.5 - 1) * WORTH_BASE[2] * 0.6);
    var expected = Math.round(WORTH_BASE[2] + squadVal + 1e6 * 1.25 + 5e6 + brand + 2e6 * 0.8);
    var got = computeWorth(ctx);
    __assert(got === expected, 'computeWorth: atteso ' + expected + ', ottenuto ' + got);

    // Il debito non deve MAI sottrarre valore oltre a semplicemente non aggiungerne (Math.max(0, budget)
    // nella formula): il valore con budget negativo deve essere esattamente quello SENZA il
    // contributo cassa (got meno il termine budget*0.8 originale), non un numero più basso ancora.
    var ctxNegBudget = Object.assign({}, ctx, { budget: -5e6 });
    var gotNeg = computeWorth(ctxNegBudget);
    var expectedNeg = got - Math.round(ctx.budget * 0.8);
    __assert(gotNeg === expectedNeg, 'computeWorth con budget negativo: atteso ' + expectedNeg + ' (nessun contributo cassa), ottenuto ' + gotNeg);
    __assert(gotNeg < got, 'computeWorth con budget negativo deve comunque valere meno della versione con cassa positiva');
  })();

  /* ---------------- playoff: bracket valido e risoluzione fino in fondo ---------------- */
  (function testPlayoffResolution() {
    function mkPlayer(ovr, pos) { return { pid: Math.random(), n: 'P' + Math.round(Math.random() * 1e6), pos: pos, ovr: ovr, age: 25, formSeason: 1, seasonGoals: 0, seasonAssists: 0, seasonCleanSheets: 0, seasonApps: 0, outWeeks: 0, suspMatches: 0 }; }
    var squad = [];
    for (var i = 0; i < 4; i++) squad.push(mkPlayer(60, 'DIF'));
    for (var j = 0; j < 4; j++) squad.push(mkPlayer(60, 'CEN'));
    for (var k = 0; k < 3; k++) squad.push(mkPlayer(60, 'ATT'));
    squad.push(mkPlayer(60, 'POR'));
    var d = DIVS[0];
    var lo = d.promoted + 1, hi = d.promoted + d.playoff;
    var ctx = {
      div: 0, season: 1, club: '__TestClub__', squad: squad, formation: '433', manager: { rating: 60, spec: 'tactician' },
      sent: 55, form: 0, promoStreak: 0, difficulty: 'medio', cups: {}, chem: {}, _congestion: 0,
      table: [], results: [], played: 1, pts: 1, gf: 1, ga: 0, _mgrByClub: {},
    };
    // Stessa identica costruzione di ctx.opps usata da startSeason: club veri di POOLS[0],
    // ciascuno con forza effettiva/formazione/personalità/allenatore — buildPlayoffPlan ne ha
    // bisogno per stimare gli avversari ipotetici del tabellone.
    var usedMgrNames = new Set([ctx.manager.n]);
    var mgrRegistry = ctx._mgrByClub;
    ctx.opps = rivals(ctx).map(function (o) {
      return { name: o.n, s: o.s, effS: clamp(o.s + gaussInt(0, 8), 30, 99), rrPts: 0, rrGF: 0, rrGA: 0, vsPts: 0, vsGF: 0, vsGA: 0, mgr: managerForClub(o.n, 0, ctx, usedMgrNames, mgrRegistry), fmt: randomFmt(), personality: personalityFor(o) };
    });
    // Posiziona la nostra riga esattamente nella zona playoff (posizione lo, la prima
    // valida) e le altre in ordine sparso: computeTable la ricostruirebbe da sola a fine
    // stagione vera, qui basta una classifica plausibile per il test.
    ctx.played = gp(ctx); ctx.pts = 40; ctx.gf = 40; ctx.ga = 30;
    computeTable(ctx);
    var myRow = ctx.table.find(function (r) { return r.me; });
    ctx.table = ctx.table.filter(function (r) { return !r.me; });
    ctx.table.splice(lo - 1, 0, myRow);
    var plan = buildPlayoffPlan(ctx, lo, d, lo, hi);
    var queue = flattenPlayoffQueue(plan);
    __assert(Array.isArray(queue) && queue.length > 0, 'flattenPlayoffQueue deve produrre almeno una gara');

    var pf = { pos: lo, rounds: [], queue: queue.slice(), done: false, won: false, legAcc: null };
    ctx._playoffState = pf;
    var guard = 0;
    while (!pf.done && guard < 100) { playNextPlayoffStep(ctx); guard++; }
    __assert(pf.done === true, 'il playoff deve risolversi (done=true) entro un numero ragionevole di passi');
    __assert(typeof pf.won === 'boolean', 'pf.won deve essere un booleano dopo la risoluzione');
    __assert(pf.rounds.length > 0, 'il playoff deve produrre almeno un turno giocato');
    __assert(guard < 100, 'il playoff non deve entrare in loop infinito');
  })();

  window.__RESULTS__ = __R;
`;

const sandbox = {
  console,
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ classList: { toggle() {}, add() {}, remove() {} }, style: {}, addEventListener() {} }),
    addEventListener: () => {},
  },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  navigator: { onLine: true },
};
sandbox.window = sandbox;
vm.createContext(sandbox);

const combined = ['data.js', 'rosters.js', 'sim.js']
  .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8'))
  .concat([TEST_BODY])
  .join('\n;\n');

vm.runInContext(combined, sandbox, { filename: 'engine.test.combined.js' });

const R = sandbox.__RESULTS__;
if (!R) { console.error('✗ Il modulo di test non ha prodotto risultati (window.__RESULTS__ mancante).'); process.exit(1); }
R.failures.forEach((msg) => console.error('✗ FAIL: ' + msg));
console.log(`\n${R.passed} superati, ${R.failed} falliti.`);
process.exit(R.failed ? 1 : 0);
