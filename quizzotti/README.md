# Quizzotti

Piattaforma di 10 minigiochi gratuiti a tema calcio, ispirati a format TV italiani (Chi Vuol Essere Milionario, Jeopardy, Avanti un Altro, Taboo, Mr.White, L'Eredità...). HTML/CSS/JS statico, senza framework né bundler: ogni pagina resta un file autonomo apribile direttamente nel browser.

## Avvio rapido

Non serve alcun build: apri `index.html` in un browser, oppure servi la cartella con un qualsiasi server statico (es. `npx serve`).

```bash
npm install     # solo per test/lint, non serve per giocare
npm test        # esegue la suite di test automatici
npm run check   # test + verifica chrome + lint JS/CSS, tutto insieme
```

## Struttura del progetto

```
index.html, CVEM.html, Jeopardy.html, ...   10 pagine di gioco + home, ciascuna autonoma
assets/
  theme.css            design system condiviso (colori, card, bottoni, timer, animazioni)
  theme.js              utility JS condivise (counter animato, QZ.Timer, QZ.Streak, QZ.shareResult...)
  sfx.js                 effetti sonori sintetizzati via Web Audio API (nessun file audio esterno)
  profile.js             profilo/livello condiviso tra i giochi (localStorage)
  quiz-engine.js          motore di estrazione domande (filtri, anti-duplicati, modalità)
  questions-data.js       database condiviso di trivia calcio (usato da CVEM)
  db-<gioco>.js           database dedicato di ciascun minigioco (schema diverso per gioco)
partials/
  chrome-game.html        sorgente unica di header/menu mobile/footer per le 10 pagine di gioco
  chrome-home.html        variante per index.html (link relativi, voce "Home" attiva)
scripts/
  sync-chrome.js          verifica/ripropaga il chrome condiviso su tutte le pagine
  cache-bust.js           aggiunge un hash di versione agli asset condivisi
  set-domain.js           imposta il dominio reale in sitemap.xml/robots.txt
tests/                    test automatici (node:test, nessuna dipendenza da installare)
.github/workflows/ci.yml  pipeline CI: test + verifica chrome + lint ad ogni push
```

## Il chrome condiviso (header/menu/footer)

Storicamente header, menu mobile e footer erano copiati a mano in ognuno degli 11 file HTML: col tempo sono divergiuti (link rotti su alcune pagine, footer mancante su altre). Ora la fonte di verità sono i due file in `partials/`.

**Per modificare header, menu mobile o footer:**

1. Modifica `partials/chrome-game.html` (o `chrome-home.html` per la sola index.html).
2. Esegui `node scripts/sync-chrome.js --fix` per ripropagare la modifica su tutte le pagine.
3. Esegui `node scripts/sync-chrome.js` (senza `--fix`) per verificare che tutto sia allineato — questo comando gira anche in CI ad ogni push, quindi una pagina modificata a mano senza rieseguire il fix fa fallire la build.

## Aggiungere un undicesimo minigioco

1. Parti da uno dei file di gioco esistenti (per avere già il chrome corretto), oppure crea un nuovo file HTML e incolla i blocchi da `partials/chrome-game.html`.
2. Crea `assets/db-<nomegioco>.js` con i dati del gioco (vedi schemi sotto) ed esporta con `module.exports`.
3. Aggiungi `<script src="assets/db-<nomegioco>.js"></script>` e, se serve audio o punteggio condiviso, `assets/sfx.js` e `assets/profile.js`.
4. Aggiungi il link al gioco nel dropdown/overlay di `partials/chrome-game.html` (e `chrome-home.html`) e nella griglia giochi di `index.html`, poi `node scripts/sync-chrome.js --fix`.
5. Esegui `node scripts/cache-bust.js` per applicare il fingerprint agli asset nuovi/modificati.
6. Aggiungi un test in `tests/db-integrity.test.js` per il nuovo database.

## Schema dei database (`assets/db-*.js`)

Ogni gioco ha una modalità diversa, quindi uno schema dati diverso — non esiste un formato unico:

| File | Variabile esportata | Schema voce |
|---|---|---|
| `db-cvem.js` | `questions` | `{ level: 1-15, question, options: {A,B,C,D}, correctAnswer }` |
| `db-avantiunaltro.js` | `fullDatabase` | `{ q, a, b, correct: 'A'\|'B' }` |
| `db-bomba.js` | `topics` | array di stringhe (argomenti) |
| `db-citazioni.js` | `quotes` | `{ quote, correct, options: [] }` |
| `db-giocatoributget.js` | `playersDatabase` | `{ name, role: 'ATT'\|'CEN'\|'DIF'\|'POR', team, value }` |
| `db-intesavincente.js` | `words` | array di stringhe |
| `db-jeopardy.js` | `jeopardyData` | `[{ category, questions: [{ value, question, answer }] }]` |
| `db-mrwhite.js` | `wordsList`, `playerImages` | array di nomi calciatori + mappa nome→URL immagine (opzionale) |
| `db-taboo.js` | `tabooWords` | `{ word, taboo: [] }` |
| `db-sfidaeredita.js` | `database` | `{ word, def }` |
| `questions-data.js` | (default export) `QUIZ_DB` | `{ id, domanda, opzioni: [], risposta, difficolta, categoria, tag: [], anno }`, interrogabile con `assets/quiz-engine.js` |

Tutti i database sono generati/curati con assistenza automatica: le cifre di calciomercato e alcuni record storici andrebbero riverificati contro una fonte autorevole prima di considerarli definitivi al 100%.

## Profilo condiviso (`assets/profile.js`)

Salva in `localStorage` (solo sul dispositivo del giocatore, nessun server) un livello ed esperienza (XP) condivisi tra tutti i giochi. Per collegare un gioco, a fine partita:

```js
QZProfile.recordResult('nome-gioco', {
  xp: 42,                       // XP guadagnati in questa partita
  label: 'Hai indovinato 8/10'  // riepilogo breve mostrato nel profilo
});
```

Il badge nell'header (aggiunto automaticamente a tutte le pagine tramite il chrome condiviso) mostra il livello corrente ed apre un pannello di riepilogo al click. Attualmente collegato a **CVEM** come implementazione di riferimento; gli altri 9 giochi possono essere collegati allo stesso modo con la chiamata sopra.

## Audio senza dipendenze esterne (`assets/sfx.js`)

Tutti gli effetti sonori (corretto/errato, tick, esplosione, fanfare...) sono sintetizzati al volo con la Web Audio API: nessun file `.mp3` da scaricare, nessuna dipendenza da CDN di terze parti che potrebbe rompersi o sparire. `QZSound.makeAudioLike(fn, loop)` restituisce un oggetto con l'interfaccia di un elemento `<audio>` (`play()`/`pause()`/`currentTime`/`volume`), così il codice di gioco esistente non richiede modifiche per usarlo.

## SEO

Ogni pagina ha meta tag Open Graph/Twitter Card per le anteprime social. `sitemap.xml` e `robots.txt` contengono un placeholder (`SOSTITUISCI-CON-IL-TUO-DOMINIO.it`) da sostituire col dominio reale prima di andare in produzione:

```bash
node scripts/set-domain.js https://iltuodominio.it
```

## Test e qualità

```bash
npm test          # 25 test (node:test, nessuna dipendenza da installare)
npm run lint       # ESLint su assets/, scripts/, tests/
npm run lint:css   # Stylelint su assets/theme.css
npm run chrome:check   # verifica che header/menu/footer siano allineati ovunque
npm run check      # tutto quanto sopra insieme (gira anche in CI)
```

La CI (`.github/workflows/ci.yml`) esegue automaticamente `test`, `chrome:check`, `lint` e `lint:css` ad ogni push e pull request.

## Limiti noti / prossimi passi

- Il profilo condiviso e il pulsante "condividi risultato" sono collegati solo a CVEM come riferimento: estenderli agli altri 9 giochi richiede una riga di codice per gioco (vedi sopra).
- Le immagini dei calciatori in `db-mrwhite.js` (`playerImages`) sono per lo più assenti: il gioco funziona comunque (fallback silenzioso), ma completarle migliorerebbe l'esperienza.
- Nessuna vera analytics: per rispetto della privacy non è stato aggiunto alcun tracciamento di terze parti. Se serve capire quali giochi vengono giocati di più, va scelto e configurato esplicitamente un provider (es. Plausible, che non usa cookie).
