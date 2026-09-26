<?php
/**
 * Presidente · Serie A — stanze multiplayer "hotseat sincrono".
 *
 * Stesso approccio minimale di leaderboard.php: niente account/login, un file JSON per
 * stanza come "database" (va benissimo per un gioco hobby su hosting condiviso), con le
 * uniche protezioni che ha senso avere senza una vera autenticazione — validazione stretta
 * dei campi, un tetto ai giocatori per stanza, scritture con lock esclusivo, pulizia
 * automatica delle stanze vecchie.
 *
 * POST room.php {action:'create', name, club, div, difficulty, roomName?} -> crea una stanza, ti
 *   aggiunge come host+primo giocatore
 * POST room.php {action:'join', code, name, club, div?}             -> entra in una stanza
 *   esistente; `div` (opzionale) sceglie la propria categoria di partenza invece di ereditare
 *   sempre quella con cui la stanza è nata (utile a chi entra a dynasty già avviata)
 * POST room.php {action:'rename', code, playerId, roomName}         -> solo l'host: cambia il
 *   nome della stanza (il codice resta comunque l'unico modo di entrarci)
 * POST room.php {action:'announce', code, playerId, text}           -> solo l'host: fissa (o
 *   svuota, con text vuoto) un annuncio pinnato sopra la chat, visto da tutti finché non
 *   cambia — per regole/obiettivi della stanza che altrimenti si perderebbero nello scroll
 * POST room.php {action:'chat', code, playerId, text}               -> aggiunge un messaggio
 *   alla chat della stanza (log condiviso, ultimi 60 messaggi, nessuna logica di gioco)
 * POST room.php {action:'ready', code, playerId, ready, state?}     -> imposta il tuo stato
 *   "pronto" per la fase in cui si trova la stanza. In lobby (fase 'lobby'/'allReadyLobby') è
 *   solo un flag, nessuno stato richiesto. In sessione (fase 'session'/'readyForSim') quando
 *   ready=true, `state` è il JSON della carriera (dopo la dirigenza) che sottometti alla stanza
 * POST room.php {action:'startSession', code, playerId, force?}     -> solo l'host: chiude la
 *   lobby e apre la fase di dirigenza per tutti (fase 'session'); richiede che tutti abbiano
 *   premuto pronto in lobby, a meno di force=true
 * POST room.php {action:'pushMatchday', code, playerId, matchday, total, groups, force?} ->
 *   solo l'host: pubblica le classifiche aggiornate (una per categoria, `groups`) dopo aver
 *   simulato una giornata (fase -> 'simulating'); `matchday`/`total` sono il massimo fra tutte
 *   le categorie, per il progresso complessivo che vede l'host. Ogni `groups[i]` porta anche
 *   `resume` (i ctx completi di quel gruppo, non solo la classifica): se l'host sparisce a metà
 *   simulazione, chiunque prenda il suo posto può ricostruire la run da qui invece di restare
 *   bloccato sull'ultima giornata pubblicata.
 * POST room.php {action:'submitResult', code, playerId, results, force?} -> solo l'host:
 *   pubblica il risultato della stagione simulata (una voce per playerId), chiude il round
 *   (`done`); richiede che tutti abbiano premuto pronto in sessione, a meno di force=true.
 *   Aggiorna anche `hallOfFame` (uno storico sintetico per playerId: club, categoria,
 *   posizione, trofei di quella stagione) e `seasonAwards` (premi della stanza per quel
 *   round: capocannoniere, miglior mister, sorpresa della stagione), entrambi sopravvivono
 *   ai round successivi.
 * POST room.php {action:'ackResult', code, playerId}                 -> segnali di aver
 *   scaricato il tuo risultato di questo round (solo un flag, nessuna logica)
 * POST room.php {action:'nextRound', code, playerId, force?}         -> solo l'host: apre la
 *   stagione successiva nella stessa stanza (fase 'done' -> 'session'), richiede che tutti
 *   abbiano scaricato (ackResult), a meno di force=true
 * POST room.php {action:'terminate', code, playerId}                 -> solo l'host: chiude la
 *   dynasty per tutti prima delle 20 stagioni (fase -> 'terminated', per sempre); ciascuno
 *   vende il proprio club per conto suo (in locale, endDynasty in sim.js — non è mai stato
 *   compito di questo endpoint calcolare quanto vale un club)
 * POST room.php {action:'kick', code, playerId, targetId}           -> solo l'host: rimuove un
 *   altro giocatore dalla stanza (stessa logica di 'leave', avviata da un altro)
 * POST room.php {action:'adoptBot', code, playerId, targetId}       -> solo l'host: un
 *   giocatore che non risponde più (sparito a metà dynasty) viene marcato bot=true — da quel
 *   momento il suo club NON blocca più i controlli "tutti pronti"/"tutti hanno scaricato" e,
 *   lato client (hostBeginMatchdaySim, ui.js), esce dal gruppo di club umani per il resto della
 *   stanza: il suo posto in categoria lo riempie automaticamente un bot vero (setupHostSeason,
 *   sim.js, calcola già botCount = squadre - umani). Non reversibile: chi è stato adottato può
 *   solo uscire (leave) e provare a rientrare come nuovo giocatore.
 * POST room.php {action:'claimHost', code, playerId}                 -> chiunque sia nella
 *   stanza può proporsi come nuovo host SE l'host attuale sembra sparito: o non è più fra i
 *   giocatori (ha lasciato senza che il passaggio automatico di 'leave' sia scattato, caso
 *   raro), o la stanza non riceve nessun aggiornamento da più di $HOST_INACTIVE_SECONDS —
 *   un'euristica (qualunque azione di chiunque aggiorna updatedAt), non una vera rilevazione di
 *   presenza, ma sufficiente a sbloccare una stanza davvero ferma senza permettere a chi ha
 *   fretta di scippare un host ancora presente.
 * POST room.php {action:'proposeTrade', code, playerId, targetId, playerName, fee} -> propone
 *   una trattativa diretta a un altro umano della stanza per un suo giocatore (indicato per
 *   nome: non c'è modo di sfogliare la rosa altrui, il nome si scopre altrove, es. in chat) a
 *   un prezzo offerto. Crea una voce in room['trades'], stato 'pending'.
 * POST room.php {action:'respondTrade', code, playerId, tradeId, response, counterFee?,
 *   playerSnapshot?} -> risponde a una trattativa. Chi riceve una proposta 'pending' può
 *   accept (allegando playerSnapshot: il giocatore VERO preso dalla propria rosa, lato client),
 *   reject, o counter (counterFee, nuovo prezzo proposto); chi l'ha creata può accept/reject
 *   solo una trattativa 'countered' (la controproposta), o cancel una propria 'pending' ancora
 *   inevasa. Nessuna logica di gioco qui: la cessione vera (rimuovere/aggiungere il giocatore,
 *   spostare il budget) avviene in locale in ciascuno dei due browser (ui.js), leggendo questo
 *   stato al prossimo poll — stesso principio di "questo endpoint è solo il tramite" di tutto
 *   il resto del file.
 * POST room.php {action:'leave', code, playerId}                    -> esci dalla stanza
 * GET  room.php?action=state&code=XXXX                               -> stato attuale (poll)
 *
 * Struttura a quattro fasi, che si ripete un round (una stagione) alla volta nella stessa
 * stanza: (1) lobby — tutti premono pronto, poi l'host avvia la sessione; (2) sessione —
 * ognuno gestisce la propria dirigenza per conto suo e ripreme pronto quando ha finito; (3)
 * simulazione — dalla seconda stagione in poi ciascun umano può essere in una categoria
 * diversa dagli altri (promozioni/retrocessioni individuali), quindi l'host (sim.js:
 * setupHostSeason/stepHostMatchday) raggruppa i pronti per categoria e avanza tutti i gruppi
 * di una giornata alla volta nel proprio browser, pubblicando ad ogni giornata la classifica
 * di ciascuna categoria (pushMatchday) — ognuno segue in tempo reale solo quella della
 * propria; (4) round chiuso — quando tutte le categorie hanno finito, l'host preme "Vedi
 * resoconto" (finishHostSeason + submitResult, fase `done`) e ciascuno scarica il proprio
 * risultato quando vuole (ackResult); una volta che l'hanno scaricato tutti (o l'host forza),
 * l'host apre la stagione successiva (nextRound) e si torna al punto 2 — a meno che, in
 * qualunque momento di queste quattro fasi, l'host non termini la dynasty in anticipo
 * (terminate), fase finale da cui non si torna indietro. Nessuna logica di gioco qui dentro:
 * questo endpoint è solo il tramite fra i browser.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$DIR = __DIR__;
$MAX_PLAYERS = 6;
// Una stanza dura tutta la dynasty (fino a 20 stagioni, MAX_SEASONS in data.js), giocata con
// calma nel tempo libero: 24 ore sarebbero bastate solo per una singola sessione, qui serve
// margine per settimane/mesi di inattività fra una stagione e l'altra senza perdere la stanza.
$ROOM_TTL_SECONDS = 180 * 24 * 3600;
$CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // niente 0/O/1/I, meno errori a mano
// Sotto questa inattività (nessun aggiornamento alla stanza, da chiunque) si considera l'host
// verosimilmente sparito e si accetta un claimHost da un altro giocatore. 15 minuti: abbastanza
// da non scippare un host che sta solo simulando una stagione lunga senza pubblicare ancora
// nulla, abbastanza poco da non lasciare la stanza bloccata per giorni.
$HOST_INACTIVE_SECONDS = 15 * 60;

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}

function room_path($dir, $code) {
    // Il codice è già validato altrove (alfabeto ristretto), ma per sicurezza si ributta
    // via qualunque cosa non sia esattamente quell'alfabeto prima di toccare il filesystem.
    $safe = preg_replace('/[^A-Z0-9]/', '', strtoupper($code));
    return $dir . '/room_' . $safe . '.json';
}

function read_json_file($path, $default) {
    if (!file_exists($path)) return $default;
    $raw = @file_get_contents($path);
    if ($raw === false || $raw === '') return $default;
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $default;
}

function write_json_file_locked($path, $data) {
    $fp = fopen($path, 'c+');
    if (!$fp) return false;
    if (!flock($fp, LOCK_EX)) { fclose($fp); return false; }
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    return true;
}

function clean_name($v, $maxLen) {
    $v = is_string($v) ? $v : '';
    $v = trim($v);
    $v = preg_replace('/[^\p{L}\p{N} .\'\-]/u', '', $v);
    $v = preg_replace('/\s+/', ' ', $v);
    if (function_exists('mb_substr')) $v = mb_substr($v, 0, $maxLen);
    else $v = substr($v, 0, $maxLen);
    return $v;
}

// Un messaggio di chat non è un nome: clean_name toglierebbe ogni punteggiatura ed emoji
// (!,?,: e virgole comprese), rendendo la chat quasi inutilizzabile o, per un messaggio fatto
// solo di quello, un invio "riuscito" ma con testo vuoto — il motivo per cui la chat sembrava
// non funzionare. Qui si tolgono solo i caratteri di controllo (compresi i newline, per tenere
// un messaggio su una riga sola) e si limita la lunghezza: l'escaping per un rendering HTML
// sicuro è compito di chi la mostra (ui.js), non di chi la salva.
function clean_chat_text($v, $maxLen) {
    $v = is_string($v) ? $v : '';
    $v = trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $v));
    if (function_exists('mb_substr')) $v = mb_substr($v, 0, $maxLen);
    else $v = substr($v, 0, $maxLen);
    return $v;
}

function gen_player_id() {
    return 'p_' . bin2hex(random_bytes(6));
}

function gen_room_code($alphabet) {
    $code = '';
    for ($i = 0; $i < 4; $i++) $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    return $code;
}

// Pulizia opportunistica: ad ogni creazione si butta un occhio alle stanze vecchie e le
// toglie di mezzo, niente cron necessario su un hosting condiviso minimale.
function cleanup_old_rooms($dir, $ttl) {
    $files = @glob($dir . '/room_*.json');
    if (!$files) return;
    $now = time();
    foreach ($files as $f) {
        $room = read_json_file($f, null);
        $updated = is_array($room) ? ($room['updatedAt'] ?? 0) : 0;
        if (!$updated || ($now - $updated) > $ttl) @unlink($f);
    }
}

function public_room($room) {
    // Non c'è nulla di sensibile nello stato di una stanza (solo nomi club/proprietario
    // scelti apposta per essere condivisi), quindi la si restituisce per intero.
    return $room;
}

// Log minimo, append-only, best-effort (mai bloccante: se fallisce non deve rompere la
// richiesta) — utile solo per capire da fuori se una stanza è ancora viva prima che scada il
// TTL lungo (180 giorni). Non è mai letto da questo script, solo scritto.
function log_activity($dir, $code, $action) {
    @file_put_contents($dir . '/activity.log', date('c') . ' ' . $code . ' ' . $action . "\n", FILE_APPEND | LOCK_EX);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    if ($action !== 'state') fail('Azione non supportata.', 405);
    $code = strtoupper(trim($_GET['code'] ?? ''));
    if ($code === '') fail('Codice stanza mancante.');
    $room = read_json_file(room_path($DIR, $code), null);
    if (!$room) fail('Stanza non trovata.', 404);
    echo json_encode(['ok' => true, 'room' => public_room($room)]);
    exit;
}

if ($method !== 'POST') fail('Metodo non supportato.', 405);

$raw = file_get_contents('php://input');
// La lobby (create/join/leave) sta larga in pochi byte; 'ready' porta dentro una carriera
// intera (rosa, storico, ecc.), 'submitResult' porta i risultati di TUTTI i giocatori insieme,
// e 'pushMatchday' porta anche i ctx completi di ogni categoria (per poter riprendere la
// simulazione se l'host sparisce) — un tetto largo (comunque ben dentro il post_max_size
// tipico di un hosting condiviso) invece del 4KB che bastava alla sola lobby.
if (strlen($raw) > 8 * 1024 * 1024) fail('Corpo della richiesta troppo grande.');
$body = json_decode($raw, true);
if (!is_array($body)) fail('JSON non valido.');

$action = is_string($body['action'] ?? null) ? $body['action'] : '';

if ($action === 'create') {
    cleanup_old_rooms($DIR, $ROOM_TTL_SECONDS);

    $name = clean_name($body['name'] ?? '', 18);
    $club = clean_name($body['club'] ?? '', 24);
    $div = isset($body['div']) ? (int) $body['div'] : 0;
    $difficulty = clean_name($body['difficulty'] ?? '', 12);
    $roomName = clean_name($body['roomName'] ?? '', 30);
    if (!in_array($difficulty, ['facile', 'medio', 'difficile', 'estremo'], true)) $difficulty = 'medio';
    if ($name === '' || $club === '') fail('Nome proprietario/club mancante.');
    if ($div < 0 || $div > 5) fail('Categoria non valida.');

    $playerId = gen_player_id();
    $now = time();
    $code = null;
    // Praticamente mai più di un tentativo (4 lettere su un alfabeto da 33 = oltre un
    // milione di combinazioni), ma per sicurezza non si sovrascrive mai una stanza esistente.
    for ($i = 0; $i < 8; $i++) {
        $try = gen_room_code($CODE_ALPHABET);
        if (!file_exists(room_path($DIR, $try))) { $code = $try; break; }
    }
    if (!$code) fail('Impossibile creare una stanza al momento, riprova.', 500);

    $room = [
        'code' => $code,
        'name' => $roomName !== '' ? $roomName : null,
        'createdAt' => $now,
        'updatedAt' => $now,
        'div' => $div,
        'difficulty' => $difficulty,
        'hostId' => $playerId,
        'phase' => 'lobby',
        'players' => [
            ['id' => $playerId, 'name' => $name, 'club' => $club, 'ready' => false, 'joinedAt' => $now],
        ],
        'chat' => [],
        'hallOfFame' => [],
        'seasonAwards' => [],
        'trades' => [],
        'announcement' => null,
    ];
    if (!write_json_file_locked(room_path($DIR, $code), $room)) fail('Impossibile salvare la stanza.', 500);
    log_activity($DIR, $code, 'create');
    echo json_encode(['ok' => true, 'playerId' => $playerId, 'room' => public_room($room)]);
    exit;
}

if ($action === 'join') {
    // Anche l'ingresso in una stanza è un buon momento per la pulizia opportunistica: create
    // non è l'unica azione a poterla far scattare (altrimenti, se nessuno crea più stanze
    // nuove sull'hosting, le vecchie abbandonate non vengono mai più toccate).
    cleanup_old_rooms($DIR, $ROOM_TTL_SECONDS);

    $code = strtoupper(trim($body['code'] ?? ''));
    $name = clean_name($body['name'] ?? '', 18);
    $club = clean_name($body['club'] ?? '', 24);
    if ($code === '') fail('Codice stanza mancante.');
    if ($name === '' || $club === '') fail('Nome proprietario/club mancante.');

    $path = room_path($DIR, $code);
    $fp = fopen($path, 'c+');
    if (!$fp) fail('Stanza non trovata.', 404);
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $room = $raw ? json_decode($raw, true) : null;
    if (!is_array($room)) { flock($fp, LOCK_UN); fclose($fp); fail('Stanza non trovata.', 404); }
    if (($room['phase'] ?? 'lobby') === 'done') { flock($fp, LOCK_UN); fclose($fp); fail('La stanza ha già una stagione pronta, non si può più entrare.', 409); }
    if (($room['phase'] ?? 'lobby') === 'terminated') { flock($fp, LOCK_UN); fclose($fp); fail('La dynasty di questa stanza è stata conclusa, non si può più entrare.', 409); }
    if (count($room['players']) >= $MAX_PLAYERS) { flock($fp, LOCK_UN); fclose($fp); fail('Stanza piena (massimo ' . $MAX_PLAYERS . ' giocatori).', 409); }
    foreach ($room['players'] as $p) {
        if (mb_strtolower($p['club']) === mb_strtolower($club)) { flock($fp, LOCK_UN); fclose($fp); fail('C\'è già un club con questo nome nella stanza.'); }
    }
    // Chi entra a dynasty già avviata (fase 'session'/'readyForSim'/'simulating' di un round
    // successivo al primo) può scegliere la propria categoria di partenza, invece di ereditare
    // sempre quella con cui la stanza è nata — gli altri, ormai, potrebbero essere altrove.
    $div = isset($body['div']) ? (int) $body['div'] : (int) ($room['div'] ?? 0);
    if ($div < 0 || $div > 5) $div = (int) ($room['div'] ?? 0);

    $playerId = gen_player_id();
    $now = time();
    $room['players'][] = ['id' => $playerId, 'name' => $name, 'club' => $club, 'ready' => false, 'joinedAt' => $now, 'joinDiv' => $div];
    $room['updatedAt'] = $now;
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($room)); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    log_activity($DIR, $code, 'join');
    echo json_encode(['ok' => true, 'playerId' => $playerId, 'room' => public_room($room)]);
    exit;
}

if ($action === 'rename') {
    $code = strtoupper(trim($body['code'] ?? ''));
    $playerId = is_string($body['playerId'] ?? null) ? $body['playerId'] : '';
    $roomName = clean_name($body['roomName'] ?? '', 30);
    if ($code === '' || $playerId === '') fail('Richiesta non valida.');

    $path = room_path($DIR, $code);
    $fp = fopen($path, 'c+');
    if (!$fp) fail('Stanza non trovata.', 404);
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $room = $raw ? json_decode($raw, true) : null;
    if (!is_array($room)) { flock($fp, LOCK_UN); fclose($fp); fail('Stanza non trovata.', 404); }
    if ($room['hostId'] !== $playerId) { flock($fp, LOCK_UN); fclose($fp); fail('Solo l\'host può rinominare la stanza.', 403); }
    $room['name'] = $roomName !== '' ? $roomName : null;
    $room['updatedAt'] = time();
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($room)); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    echo json_encode(['ok' => true, 'room' => public_room($room)]);
    exit;
}

if ($action === 'announce') {
    $code = strtoupper(trim($body['code'] ?? ''));
    $playerId = is_string($body['playerId'] ?? null) ? $body['playerId'] : '';
    // Un annuncio non è un nome ma nemmeno un messaggio di chat "usa e getta": stesso testo
    // permissivo della chat (clean_chat_text, non clean_name — niente più punteggiatura
    // stroncata), ma un unico slot che resta fisso finché l'host non lo cambia o lo svuota.
    $text = clean_chat_text($body['text'] ?? '', 200);
    if ($code === '' || $playerId === '') fail('Richiesta non valida.');

    $path = room_path($DIR, $code);
    $fp = fopen($path, 'c+');
    if (!$fp) fail('Stanza non trovata.', 404);
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $room = $raw ? json_decode($raw, true) : null;
    if (!is_array($room)) { flock($fp, LOCK_UN); fclose($fp); fail('Stanza non trovata.', 404); }
    if ($room['hostId'] !== $playerId) { flock($fp, LOCK_UN); fclose($fp); fail('Solo l\'host può fissare un annuncio.', 403); }
    $room['announcement'] = $text !== '' ? $text : null;
    $room['updatedAt'] = time();
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($room)); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    echo json_encode(['ok' => true, 'room' => public_room($room)]);
    exit;
}

if ($action === 'chat') {
    $code = strtoupper(trim($body['code'] ?? ''));
    $playerId = is_string($body['playerId'] ?? null) ? $body['playerId'] : '';
    $text = clean_chat_text($body['text'] ?? '', 200);
    if ($code === '' || $playerId === '' || $text === '') fail('Richiesta non valida.');

    $path = room_path($DIR, $code);
    $fp = fopen($path, 'c+');
    if (!$fp) fail('Stanza non trovata.', 404);
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $room = $raw ? json_decode($raw, true) : null;
    if (!is_array($room)) { flock($fp, LOCK_UN); fclose($fp); fail('Stanza non trovata.', 404); }
    $sender = null;
    foreach ($room['players'] as $p) { if ($p['id'] === $playerId) { $sender = $p; break; } }
    if (!$sender) { flock($fp, LOCK_UN); fclose($fp); fail('Non fai parte di questa stanza.', 404); }
    if (!isset($room['chat']) || !is_array($room['chat'])) $room['chat'] = [];
    $room['chat'][] = ['id' => $playerId, 'name' => $sender['name'], 'club' => $sender['club'], 'text' => $text, 'at' => time()];
    // Solo gli ultimi 60 messaggi: una chat di stanza, non un archivio — tiene la stanza
    // leggera anche dopo mesi di dynasty.
    if (count($room['chat']) > 60) $room['chat'] = array_slice($room['chat'], -60);
    $room['updatedAt'] = time();
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($room)); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    echo json_encode(['ok' => true, 'room' => public_room($room)]);
    exit;
}

if ($action === 'ready') {
    $code = strtoupper(trim($body['code'] ?? ''));
    $playerId = is_string($body['playerId'] ?? null) ? $body['playerId'] : '';
    $ready = !empty($body['ready']);
    // Validazione tollerante, stesso criterio già usato lato client per un file di carriera
    // importato (handleImportSaveFile in ui.js): basta che abbia una rosa e un nome club.
    $state = $body['state'] ?? null;
    $stateValid = is_array($state) && isset($state['squad']) && is_array($state['squad']) && !empty($state['club']);
    if ($code === '' || $playerId === '') fail('Richiesta non valida.');

    $path = room_path($DIR, $code);
    $fp = fopen($path, 'c+');
    if (!$fp) fail('Stanza non trovata.', 404);
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $room = $raw ? json_decode($raw, true) : null;
    if (!is_array($room)) { flock($fp, LOCK_UN); fclose($fp); fail('Stanza non trovata.', 404); }
    $prevPhase = $room['phase'] ?? 'lobby';
    if ($prevPhase === 'done') { flock($fp, LOCK_UN); fclose($fp); fail('La stanza ha già una stagione pronta.', 409); }
    if ($prevPhase === 'terminated') { flock($fp, LOCK_UN); fclose($fp); fail('La dynasty di questa stanza è stata conclusa dall\'host.', 409); }
    // In lobby "pronto" è solo un flag (si aspetta di poter avviare la sessione); in sessione
    // porta con sé la carriera (dopo la dirigenza), da qui la validazione diversa per fase.
    $inSessionStage = in_array($prevPhase, ['session', 'readyForSim'], true);
    if ($ready && $inSessionStage && !$stateValid) { flock($fp, LOCK_UN); fclose($fp); fail('Carriera mancante o non valida.'); }
    // `state` è tutta la carriera del giocatore: ogni altro campo testuale che entra in una
    // stanza (nome stanza, chat, nome/club in create/join) passa da clean_name — club/owner
    // dentro `state` no, perché arrivano da un salvataggio già esistente e non da un form. Ma
    // restano comunque testo scelto dal giocatore stesso (può rinominare club/proprietario in
    // Dirigenza) e finiscono via innerHTML nella lobby/classifica di TUTTI: stessa igiene degli
    // altri campi, non fidarsi mai di una stringa solo perché non arriva da un `<input>`.
    if ($ready && $inSessionStage && $stateValid) {
        $state['club'] = clean_name($state['club'], 24);
        $state['owner'] = clean_name($state['owner'] ?? '', 18);
        if ($state['club'] === '') { flock($fp, LOCK_UN); fclose($fp); fail('Nome del club non valido.'); }
    }
    $found = false;
    foreach ($room['players'] as &$p) {
        if ($p['id'] === $playerId) {
            $p['ready'] = $ready;
            if ($ready && $inSessionStage) $p['state'] = $state;
            $found = true;
            break;
        }
    }
    unset($p);
    if (!$found) { flock($fp, LOCK_UN); fclose($fp); fail('Non fai parte di questa stanza.', 404); }
    $allReady = count($room['players']) > 1;
    foreach ($room['players'] as $p) { if (!$p['ready']) { $allReady = false; break; } }
    if ($inSessionStage) {
        $room['phase'] = $allReady ? 'readyForSim' : 'session';
    } else {
        $room['phase'] = $allReady ? 'allReadyLobby' : 'lobby';
    }
    $room['updatedAt'] = time();
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($room)); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    echo json_encode(['ok' => true, 'room' => public_room($room)]);
    exit;
}

if ($action === 'startSession') {
    $code = strtoupper(trim($body['code'] ?? ''));
    $playerId = is_string($body['playerId'] ?? null) ? $body['playerId'] : '';
    $force = !empty($body['force']);
    if ($code === '' || $playerId === '') fail('Richiesta non valida.');

    $path = room_path($DIR, $code);
    $fp = fopen($path, 'c+');
    if (!$fp) fail('Stanza non trovata.', 404);
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $room = $raw ? json_decode($raw, true) : null;
    if (!is_array($room)) { flock($fp, LOCK_UN); fclose($fp); fail('Stanza non trovata.', 404); }
    if ($room['hostId'] !== $playerId) { flock($fp, LOCK_UN); fclose($fp); fail('Solo l\'host può avviare la sessione.', 403); }
    $phase = $room['phase'] ?? 'lobby';
    if (!in_array($phase, ['lobby', 'allReadyLobby'], true)) { flock($fp, LOCK_UN); fclose($fp); fail('La sessione è già stata avviata.', 409); }
    if (count($room['players']) < 2) { flock($fp, LOCK_UN); fclose($fp); fail('Serve almeno un altro giocatore nella stanza.', 409); }
    if ($phase !== 'allReadyLobby' && !$force) { flock($fp, LOCK_UN); fclose($fp); fail('Non tutti i giocatori sono pronti.', 409); }
    $room['phase'] = 'session';
    foreach ($room['players'] as &$p) { if (empty($p['bot'])) { $p['ready'] = false; unset($p['state']); } }
    unset($p);
    $room['updatedAt'] = time();
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($room)); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    echo json_encode(['ok' => true, 'room' => public_room($room)]);
    exit;
}

if ($action === 'pushMatchday') {
    $code = strtoupper(trim($body['code'] ?? ''));
    $playerId = is_string($body['playerId'] ?? null) ? $body['playerId'] : '';
    $matchday = isset($body['matchday']) ? (int) $body['matchday'] : -1;
    $total = isset($body['total']) ? (int) $body['total'] : -1;
    $groups = $body['groups'] ?? null;
    if ($code === '' || $playerId === '' || $matchday < 0 || $total < 1 || !is_array($groups)) fail('Richiesta non valida.');

    $path = room_path($DIR, $code);
    $fp = fopen($path, 'c+');
    if (!$fp) fail('Stanza non trovata.', 404);
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $room = $raw ? json_decode($raw, true) : null;
    if (!is_array($room)) { flock($fp, LOCK_UN); fclose($fp); fail('Stanza non trovata.', 404); }
    if ($room['hostId'] !== $playerId) { flock($fp, LOCK_UN); fclose($fp); fail('Solo l\'host può avanzare la simulazione.', 403); }
    $phase = $room['phase'] ?? 'lobby';
    if ($phase === 'done') { flock($fp, LOCK_UN); fclose($fp); fail('La stanza ha già una stagione pronta.', 409); }
    if (!in_array($phase, ['readyForSim', 'simulating'], true) && !($phase === 'session' && !empty($body['force']))) {
        flock($fp, LOCK_UN); fclose($fp); fail('Non tutti i giocatori sono pronti a simulare.', 409);
    }
    // `resume` di un gruppo può mancare (ui.js: buildLiveGroups la manda solo ogni tot
    // giornate, per non riscrivere ad ogni giornata l'intero roster di ogni umano della
    // stanza): quando manca, si tiene quella dell'ultima giornata in cui c'era, invece di
    // perderla e lasciare la ripresa (resumeMatchdaySimFromLive) senza dati.
    $prevByDiv = [];
    foreach (($room['live']['groups'] ?? []) as $pg) { if (isset($pg['div'])) $prevByDiv[$pg['div']] = $pg; }
    foreach ($groups as &$g) {
        if ((!isset($g['resume']) || $g['resume'] === null) && isset($prevByDiv[$g['div']]['resume'])) {
            $g['resume'] = $prevByDiv[$g['div']]['resume'];
        }
    }
    unset($g);
    $room['phase'] = 'simulating';
    $room['live'] = ['matchday' => $matchday, 'total' => $total, 'groups' => $groups, 'updatedAt' => time()];
    $room['updatedAt'] = time();
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($room)); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    echo json_encode(['ok' => true, 'room' => public_room($room)]);
    exit;
}

if ($action === 'submitResult') {
    $code = strtoupper(trim($body['code'] ?? ''));
    $playerId = is_string($body['playerId'] ?? null) ? $body['playerId'] : '';
    $results = $body['results'] ?? null;
    if ($code === '' || $playerId === '' || !is_array($results)) fail('Richiesta non valida.');

    $path = room_path($DIR, $code);
    $fp = fopen($path, 'c+');
    if (!$fp) fail('Stanza non trovata.', 404);
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $room = $raw ? json_decode($raw, true) : null;
    if (!is_array($room)) { flock($fp, LOCK_UN); fclose($fp); fail('Stanza non trovata.', 404); }
    if ($room['hostId'] !== $playerId) { flock($fp, LOCK_UN); fclose($fp); fail('Solo l\'host può pubblicare il risultato.', 403); }
    $phase = $room['phase'] ?? 'lobby';
    if ($phase === 'done') { flock($fp, LOCK_UN); fclose($fp); fail('La stanza ha già una stagione pronta.', 409); }
    if (!in_array($phase, ['session', 'readyForSim', 'simulating'], true)) { flock($fp, LOCK_UN); fclose($fp); fail('La sessione non è ancora stata avviata.', 409); }
    if ($phase === 'session' && empty($body['force'])) { flock($fp, LOCK_UN); fclose($fp); fail('Non tutti i giocatori sono pronti a simulare.', 409); }
    $room['results'] = $results;
    $room['phase'] = 'done';
    unset($room['live']);
    // Albo d'oro della stanza: un riepilogo sintetico per playerId che sopravvive ai round
    // successivi (a differenza di `results`, che nextRound azzera) — l'unico posto dove
    // rimane traccia di TUTTA la dynasty vista dalla stanza, non solo dal salvataggio del
    // singolo giocatore. Non è mai calcolo di gioco: solo estrazione dei campi già pronti
    // dentro ctx._end che l'host ha calcolato.
    if (!isset($room['hallOfFame']) || !is_array($room['hallOfFame'])) $room['hallOfFame'] = [];
    foreach ($results as $pid => $ctx) {
        if (!is_array($ctx)) continue;
        $end = $ctx['_end'] ?? null;
        if (!is_array($end)) continue;
        if (!isset($room['hallOfFame'][$pid]) || !is_array($room['hallOfFame'][$pid])) $room['hallOfFame'][$pid] = [];
        $room['hallOfFame'][$pid][] = [
            'season' => $ctx['season'] ?? null,
            'owner' => $ctx['owner'] ?? null,
            'club' => $ctx['club'] ?? null,
            'div' => $ctx['div'] ?? null,
            'pos' => $end['pos'] ?? null,
            'promoted' => !empty($end['promoted']),
            'relegated' => !empty($end['relegated']),
            'title' => !empty($end['title']),
            'trophies' => isset($end['trophies']) && is_array($end['trophies']) ? $end['trophies'] : [],
        ];
    }
    // Premi della stagione: calcolati qui (mai lato client) perché servono TUTTI i risultati
    // della stanza insieme, gruppi/categorie diverse comprese — cosa che nessun singolo host di
    // gruppo (in multiplayer multi-categoria può essercene più di uno per round) vede da solo.
    // Confronto fra chi ha finito questo round, non fra tutta la storia della stanza.
    $topScorer = null; $bestManager = null; $surprise = null;
    foreach ($results as $pid => $ctx) {
        if (!is_array($ctx)) continue;
        $end = $ctx['_end'] ?? null;
        $owner = $ctx['owner'] ?? null; $club = $ctx['club'] ?? null;
        if (is_array($ctx['squad'] ?? null)) {
            foreach ($ctx['squad'] as $p) {
                if (!is_array($p) || ($p['pos'] ?? '') === 'POR') continue;
                $g = $p['seasonGoals'] ?? 0;
                if ($g > 0 && ($topScorer === null || $g > $topScorer['goals'])) {
                    $topScorer = ['owner' => $owner, 'club' => $club, 'player' => $p['n'] ?? '?', 'goals' => $g];
                }
            }
        }
        $mgr = $ctx['manager'] ?? null;
        if (is_array($mgr) && isset($mgr['_ovrDelta']) && ($bestManager === null || $mgr['_ovrDelta'] > $bestManager['delta'])) {
            $bestManager = ['owner' => $owner, 'club' => $club, 'mgr' => $mgr['n'] ?? '?', 'delta' => $mgr['_ovrDelta']];
        }
        if (is_array($end) && isset($end['exp'], $end['pos'])) {
            $delta = $end['exp'] - $end['pos'];
            if ($delta > 0 && ($surprise === null || $delta > $surprise['delta'])) {
                $surprise = ['owner' => $owner, 'club' => $club, 'delta' => $delta, 'pos' => $end['pos']];
            }
        }
    }
    if ($topScorer || $bestManager || $surprise) {
        if (!isset($room['seasonAwards']) || !is_array($room['seasonAwards'])) $room['seasonAwards'] = [];
        $seasonNum = null;
        foreach ($results as $ctx) { if (is_array($ctx) && isset($ctx['season'])) $seasonNum = max($seasonNum ?? 0, $ctx['season']); }
        $room['seasonAwards'][] = ['season' => $seasonNum, 'topScorer' => $topScorer, 'bestManager' => $bestManager, 'surprise' => $surprise];
        // Stesso tetto storico dell'albo d'oro: una stanza che dura 20 stagioni non deve
        // accumulare un file all'infinito.
        if (count($room['seasonAwards']) > 20) $room['seasonAwards'] = array_slice($room['seasonAwards'], -20);
    }
    $room['updatedAt'] = time();
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($room)); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    echo json_encode(['ok' => true, 'room' => public_room($room)]);
    exit;
}

if ($action === 'ackResult') {
    $code = strtoupper(trim($body['code'] ?? ''));
    $playerId = is_string($body['playerId'] ?? null) ? $body['playerId'] : '';
    if ($code === '' || $playerId === '') fail('Richiesta non valida.');

    $path = room_path($DIR, $code);
    $fp = fopen($path, 'c+');
    if (!$fp) { echo json_encode(['ok' => true]); exit; }
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $room = $raw ? json_decode($raw, true) : null;
    if (!is_array($room)) { flock($fp, LOCK_UN); fclose($fp); echo json_encode(['ok' => true]); exit; }
    foreach ($room['players'] as &$p) { if ($p['id'] === $playerId) { $p['acked'] = true; break; } }
    unset($p);
    $room['updatedAt'] = time();
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($room)); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    echo json_encode(['ok' => true, 'room' => public_room($room)]);
    exit;
}

if ($action === 'nextRound') {
    $code = strtoupper(trim($body['code'] ?? ''));
    $playerId = is_string($body['playerId'] ?? null) ? $body['playerId'] : '';
    $force = !empty($body['force']);
    if ($code === '' || $playerId === '') fail('Richiesta non valida.');

    $path = room_path($DIR, $code);
    $fp = fopen($path, 'c+');
    if (!$fp) fail('Stanza non trovata.', 404);
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $room = $raw ? json_decode($raw, true) : null;
    if (!is_array($room)) { flock($fp, LOCK_UN); fclose($fp); fail('Stanza non trovata.', 404); }
    if ($room['hostId'] !== $playerId) { flock($fp, LOCK_UN); fclose($fp); fail('Solo l\'host può avviare la prossima stagione.', 403); }
    $phase = $room['phase'] ?? 'lobby';
    if ($phase !== 'done') { flock($fp, LOCK_UN); fclose($fp); fail('Non c\'è nessun resoconto da chiudere.', 409); }
    $allAcked = true;
    foreach ($room['players'] as $p) { if (empty($p['acked'])) { $allAcked = false; break; } }
    if (!$allAcked && !$force) { flock($fp, LOCK_UN); fclose($fp); fail('Non tutti hanno ancora scaricato il resoconto.', 409); }
    $room['phase'] = 'session';
    $room['season'] = ($room['season'] ?? 1) + 1;
    unset($room['results']);
    unset($room['live']);
    foreach ($room['players'] as &$p) { if (empty($p['bot'])) { $p['ready'] = false; $p['acked'] = false; unset($p['state']); } }
    unset($p);
    $room['updatedAt'] = time();
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($room)); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    echo json_encode(['ok' => true, 'room' => public_room($room)]);
    exit;
}

if ($action === 'terminate') {
    $code = strtoupper(trim($body['code'] ?? ''));
    $playerId = is_string($body['playerId'] ?? null) ? $body['playerId'] : '';
    if ($code === '' || $playerId === '') fail('Richiesta non valida.');

    $path = room_path($DIR, $code);
    $fp = fopen($path, 'c+');
    if (!$fp) fail('Stanza non trovata.', 404);
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $room = $raw ? json_decode($raw, true) : null;
    if (!is_array($room)) { flock($fp, LOCK_UN); fclose($fp); fail('Stanza non trovata.', 404); }
    if ($room['hostId'] !== $playerId) { flock($fp, LOCK_UN); fclose($fp); fail('Solo l\'host può terminare la dynasty.', 403); }
    if (($room['phase'] ?? 'lobby') === 'terminated') { flock($fp, LOCK_UN); fclose($fp); fail('La dynasty è già stata conclusa.', 409); }
    // Fase finale, senza ritorno: nessun'altra azione di gioco cambia più questa stanza da
    // qui in poi (join/ready/startSession/pushMatchday/submitResult/nextRound la rifiutano
    // tutte controllando la fase). Ognuno vende il proprio club per conto suo, in locale.
    $room['phase'] = 'terminated';
    unset($room['results']);
    unset($room['live']);
    $room['updatedAt'] = time();
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($room)); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    log_activity($DIR, $code, 'terminate');
    echo json_encode(['ok' => true, 'room' => public_room($room)]);
    exit;
}

if ($action === 'kick') {
    $code = strtoupper(trim($body['code'] ?? ''));
    $playerId = is_string($body['playerId'] ?? null) ? $body['playerId'] : '';
    $targetId = is_string($body['targetId'] ?? null) ? $body['targetId'] : '';
    if ($code === '' || $playerId === '' || $targetId === '') fail('Richiesta non valida.');
    if ($targetId === $playerId) fail('Non puoi espellere te stesso: usa "Esci dalla stanza".');

    $path = room_path($DIR, $code);
    $fp = fopen($path, 'c+');
    if (!$fp) fail('Stanza non trovata.', 404);
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $room = $raw ? json_decode($raw, true) : null;
    if (!is_array($room)) { flock($fp, LOCK_UN); fclose($fp); fail('Stanza non trovata.', 404); }
    if ($room['hostId'] !== $playerId) { flock($fp, LOCK_UN); fclose($fp); fail('Solo l\'host può espellere un giocatore.', 403); }
    if (!in_array($targetId, array_column($room['players'], 'id'), true)) { flock($fp, LOCK_UN); fclose($fp); fail('Giocatore non trovato in questa stanza.', 404); }
    $room['players'] = array_values(array_filter($room['players'], function ($p) use ($targetId) { return $p['id'] !== $targetId; }));
    // Stessa logica di "leave" da qui in poi: la stanza si adatta come se se ne fosse uscito
    // da solo (fase invariata a simulazione/round chiuso/terminata, altrimenti si rifà pronto).
    $prevPhase = $room['phase'] ?? 'lobby';
    if (!in_array($prevPhase, ['simulating', 'done', 'terminated'], true)) {
        $room['phase'] = in_array($prevPhase, ['session', 'readyForSim'], true) ? 'session' : 'lobby';
        foreach ($room['players'] as &$p) { if (empty($p['bot'])) $p['ready'] = false; }
        unset($p);
    }
    $room['updatedAt'] = time();
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($room)); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    log_activity($DIR, $code, 'kick:' . $targetId);
    echo json_encode(['ok' => true, 'room' => public_room($room)]);
    exit;
}

if ($action === 'adoptBot') {
    $code = strtoupper(trim($body['code'] ?? ''));
    $playerId = is_string($body['playerId'] ?? null) ? $body['playerId'] : '';
    $targetId = is_string($body['targetId'] ?? null) ? $body['targetId'] : '';
    if ($code === '' || $playerId === '' || $targetId === '') fail('Richiesta non valida.');
    if ($targetId === $playerId) fail('Non puoi adottare il tuo stesso club: usa "Esci dalla stanza" se vuoi lasciare.');

    $path = room_path($DIR, $code);
    $fp = fopen($path, 'c+');
    if (!$fp) fail('Stanza non trovata.', 404);
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $room = $raw ? json_decode($raw, true) : null;
    if (!is_array($room)) { flock($fp, LOCK_UN); fclose($fp); fail('Stanza non trovata.', 404); }
    if ($room['hostId'] !== $playerId) { flock($fp, LOCK_UN); fclose($fp); fail('Solo l\'host può adottare un club rimasto senza presidente.', 403); }
    $phase = $room['phase'] ?? 'lobby';
    if (in_array($phase, ['done', 'terminated'], true)) { flock($fp, LOCK_UN); fclose($fp); fail('Non si può adottare un club in questa fase della stanza.', 409); }
    $found = false;
    foreach ($room['players'] as &$p) {
        if ($p['id'] === $targetId) {
            // bot=true da qui in poi: pronto/scaricato per costruzione (non blocca più
            // 'allReady'/'allAcked' più sotto), mai più simulato come umano — hostBeginMatchdaySim
            // (ui.js) lo esclude esplicitamente dal gruppo, lasciando il suo posto a un bot vero.
            $p['bot'] = true;
            $p['ready'] = true;
            $p['acked'] = true;
            $found = true;
            break;
        }
    }
    unset($p);
    if (!$found) { flock($fp, LOCK_UN); fclose($fp); fail('Giocatore non trovato in questa stanza.', 404); }
    $room['updatedAt'] = time();
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($room)); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    log_activity($DIR, $code, 'adoptBot:' . $targetId);
    echo json_encode(['ok' => true, 'room' => public_room($room)]);
    exit;
}

if ($action === 'claimHost') {
    $code = strtoupper(trim($body['code'] ?? ''));
    $playerId = is_string($body['playerId'] ?? null) ? $body['playerId'] : '';
    if ($code === '' || $playerId === '') fail('Richiesta non valida.');

    $path = room_path($DIR, $code);
    $fp = fopen($path, 'c+');
    if (!$fp) fail('Stanza non trovata.', 404);
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $room = $raw ? json_decode($raw, true) : null;
    if (!is_array($room)) { flock($fp, LOCK_UN); fclose($fp); fail('Stanza non trovata.', 404); }
    if (!in_array($playerId, array_column($room['players'], 'id'), true)) { flock($fp, LOCK_UN); fclose($fp); fail('Non fai parte di questa stanza.', 404); }
    if ($room['hostId'] === $playerId) { flock($fp, LOCK_UN); fclose($fp); echo json_encode(['ok' => true, 'room' => public_room($room)]); exit; }
    $hostStillHere = in_array($room['hostId'], array_column($room['players'], 'id'), true);
    $inactiveLongEnough = (time() - ($room['updatedAt'] ?? 0)) > $HOST_INACTIVE_SECONDS;
    if ($hostStillHere && !$inactiveLongEnough) {
        flock($fp, LOCK_UN); fclose($fp);
        fail('L\'host è ancora presente nella stanza: puoi proporti solo se sparisce (assente da più di ' . round($HOST_INACTIVE_SECONDS / 60) . ' minuti) o se ha già lasciato.', 409);
    }
    $room['hostId'] = $playerId;
    $room['updatedAt'] = time();
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($room)); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    log_activity($DIR, $code, 'claimHost:' . $playerId);
    echo json_encode(['ok' => true, 'room' => public_room($room)]);
    exit;
}

// Un giocatore di rosa arrivato da un'altra carriera (playerSnapshot di respondTrade): non ci
// si fida della forma esatta (arriva dal browser di un altro giocatore, mai validato lato
// server come lo è invece generato da sim.js), quindi si sanifica/limita ogni campo invece di
// fidarsi ciecamente — stesso approccio "tollerante ma con dei limiti" già usato per `state`
// nell'azione 'ready'. Ritorna null se manca l'essenziale (nome/ruolo).
function clean_player_snapshot($p) {
    if (!is_array($p)) return null;
    $n = clean_name($p['n'] ?? '', 40);
    $pos = in_array($p['pos'] ?? '', ['POR', 'DIF', 'CEN', 'ATT'], true) ? $p['pos'] : null;
    if ($n === '' || !$pos) return null;
    $ovr = isset($p['ovr']) ? (int) $p['ovr'] : 50;
    $ovr = max(1, min(115, $ovr));
    $age = isset($p['age']) ? (int) $p['age'] : 25;
    $age = max(15, min(45, $age));
    $wage = isset($p['wage']) ? (float) $p['wage'] : 0;
    $wage = max(0, min(5e6, $wage));
    $yrs = isset($p['yrs']) ? (int) $p['yrs'] : 3;
    $yrs = max(1, min(6, $yrs));
    $potential = isset($p['potential']) ? (int) $p['potential'] : $ovr;
    $potential = max($ovr, min(115, $potential));
    return [
        'n' => $n, 'pos' => $pos, 'ovr' => $ovr, 'age' => $age, 'wage' => $wage, 'yrs' => $yrs,
        'potential' => $potential,
        'nat' => is_array($p['nat'] ?? null) ? ['code' => clean_name($p['nat']['code'] ?? '', 4), 'name' => clean_name($p['nat']['name'] ?? '', 30), 'flag' => ''] : null,
        'seasonGoals' => 0, 'seasonAssists' => 0, 'seasonCleanSheets' => 0, 'seasonApps' => 0,
    ];
}

if ($action === 'proposeTrade') {
    $code = strtoupper(trim($body['code'] ?? ''));
    $playerId = is_string($body['playerId'] ?? null) ? $body['playerId'] : '';
    $targetId = is_string($body['targetId'] ?? null) ? $body['targetId'] : '';
    $playerName = clean_name($body['playerName'] ?? '', 40);
    $fee = isset($body['fee']) ? (float) $body['fee'] : -1;
    if ($code === '' || $playerId === '' || $targetId === '' || $playerName === '') fail('Richiesta non valida.');
    if ($targetId === $playerId) fail('Non puoi proporre una trattativa a te stesso.');
    if ($fee < 0 || $fee > 2e9) fail('Offerta non valida.');

    $path = room_path($DIR, $code);
    $fp = fopen($path, 'c+');
    if (!$fp) fail('Stanza non trovata.', 404);
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $room = $raw ? json_decode($raw, true) : null;
    if (!is_array($room)) { flock($fp, LOCK_UN); fclose($fp); fail('Stanza non trovata.', 404); }
    $players = array_column($room['players'], null, 'id');
    if (!isset($players[$playerId])) { flock($fp, LOCK_UN); fclose($fp); fail('Non fai parte di questa stanza.', 404); }
    if (!isset($players[$targetId]) || !empty($players[$targetId]['bot'])) { flock($fp, LOCK_UN); fclose($fp); fail('Destinatario non trovato o non più in gioco.', 404); }
    $phase = $room['phase'] ?? 'lobby';
    if (!in_array($phase, ['session', 'readyForSim', 'lobby', 'allReadyLobby'], true)) { flock($fp, LOCK_UN); fclose($fp); fail('Le trattative si fanno solo in dirigenza, non a simulazione in corso.', 409); }
    if (!isset($room['trades']) || !is_array($room['trades'])) $room['trades'] = [];
    // Un tetto alle trattative pendenti per non-coppia (stesso proponente+destinatario) evita
    // che un rifiuto ripetuto (o un giocatore molesto) faccia crescere la lista senza fine.
    $pendingSamePair = 0;
    foreach ($room['trades'] as $t) { if (($t['fromId'] ?? null) === $playerId && ($t['toId'] ?? null) === $targetId && in_array($t['status'] ?? '', ['pending', 'countered'], true)) $pendingSamePair++; }
    if ($pendingSamePair >= 3) { flock($fp, LOCK_UN); fclose($fp); fail('Hai già troppe trattative in sospeso con questo giocatore: aspetta una risposta.', 409); }
    $trade = [
        'id' => 't_' . bin2hex(random_bytes(6)),
        'fromId' => $playerId, 'fromClub' => $players[$playerId]['club'] ?? '?',
        'toId' => $targetId, 'toClub' => $players[$targetId]['club'] ?? '?',
        'playerName' => $playerName, 'fee' => $fee, 'counterFee' => null,
        'status' => 'pending', 'playerSnapshot' => null,
        'createdAt' => time(), 'updatedAt' => time(),
    ];
    $room['trades'][] = $trade;
    if (count($room['trades']) > 80) $room['trades'] = array_slice($room['trades'], -80);
    $room['updatedAt'] = time();
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($room)); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    echo json_encode(['ok' => true, 'room' => public_room($room)]);
    exit;
}

if ($action === 'respondTrade') {
    $code = strtoupper(trim($body['code'] ?? ''));
    $playerId = is_string($body['playerId'] ?? null) ? $body['playerId'] : '';
    $tradeId = is_string($body['tradeId'] ?? null) ? $body['tradeId'] : '';
    $response = is_string($body['response'] ?? null) ? $body['response'] : '';
    if ($code === '' || $playerId === '' || $tradeId === '' || !in_array($response, ['accept', 'reject', 'counter', 'cancel'], true)) fail('Richiesta non valida.');

    $path = room_path($DIR, $code);
    $fp = fopen($path, 'c+');
    if (!$fp) fail('Stanza non trovata.', 404);
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $room = $raw ? json_decode($raw, true) : null;
    if (!is_array($room)) { flock($fp, LOCK_UN); fclose($fp); fail('Stanza non trovata.', 404); }
    if (!isset($room['trades']) || !is_array($room['trades'])) $room['trades'] = [];
    $idx = null;
    foreach ($room['trades'] as $i => $t) { if (($t['id'] ?? null) === $tradeId) { $idx = $i; break; } }
    if ($idx === null) { flock($fp, LOCK_UN); fclose($fp); fail('Trattativa non trovata.', 404); }
    $t = $room['trades'][$idx];
    $isSeller = ($t['toId'] ?? null) === $playerId;
    $isBuyer = ($t['fromId'] ?? null) === $playerId;
    if (!$isSeller && !$isBuyer) { flock($fp, LOCK_UN); fclose($fp); fail('Questa trattativa non ti riguarda.', 403); }

    if ($response === 'cancel') {
        if (!$isBuyer || ($t['status'] ?? '') !== 'pending') { flock($fp, LOCK_UN); fclose($fp); fail('Puoi annullare solo una tua proposta ancora in sospeso.', 409); }
        $room['trades'][$idx]['status'] = 'cancelled';
    } elseif ($response === 'accept') {
        // 'pending' si accetta solo dal venditore (allega il giocatore vero), 'countered' solo
        // dal compratore (accetta il nuovo prezzo, il giocatore l'ha già allegato il venditore).
        if ($t['status'] === 'pending' && $isSeller) {
            $snap = clean_player_snapshot($body['playerSnapshot'] ?? null);
            if (!$snap) { flock($fp, LOCK_UN); fclose($fp); fail('Giocatore non valido: assicurati che il nome corrisponda a uno della tua rosa.'); }
            $room['trades'][$idx]['playerSnapshot'] = $snap;
            $room['trades'][$idx]['status'] = 'accepted';
        } elseif ($t['status'] === 'countered' && $isBuyer) {
            // Lo snapshot è già stato allegato dal venditore al momento della controproposta
            // (vedi 'counter' più sotto): qui il compratore chiude solo sul prezzo, non serve
            // un secondo giro dal venditore per confermare la cessione.
            if (empty($t['playerSnapshot'])) { flock($fp, LOCK_UN); fclose($fp); fail('Trattativa incompleta: manca il giocatore, chiedi al venditore di rifare la controproposta.', 409); }
            $room['trades'][$idx]['status'] = 'accepted';
            $room['trades'][$idx]['fee'] = $t['counterFee'] ?? $t['fee'];
        } else {
            flock($fp, LOCK_UN); fclose($fp); fail('Non puoi accettare questa trattativa in questo momento.', 409);
        }
    } elseif ($response === 'reject') {
        if (!in_array($t['status'], ['pending', 'countered'], true)) { flock($fp, LOCK_UN); fclose($fp); fail('Questa trattativa non è più aperta.', 409); }
        $room['trades'][$idx]['status'] = 'rejected';
    } elseif ($response === 'counter') {
        if (!$isSeller || $t['status'] !== 'pending') { flock($fp, LOCK_UN); fclose($fp); fail('Puoi controproporre solo una richiesta ricevuta e ancora in sospeso.', 409); }
        $counterFee = isset($body['counterFee']) ? (float) $body['counterFee'] : -1;
        if ($counterFee < 0 || $counterFee > 2e9) { flock($fp, LOCK_UN); fclose($fp); fail('Controproposta non valida.'); }
        // Il venditore allega già qui il giocatore vero (come per un accept diretto): se il
        // compratore accetta la controproposta, la cessione è già pronta, senza un secondo
        // giro di conferma.
        $snap = clean_player_snapshot($body['playerSnapshot'] ?? null);
        if (!$snap) { flock($fp, LOCK_UN); fclose($fp); fail('Giocatore non valido: assicurati che il nome corrisponda a uno della tua rosa.'); }
        $room['trades'][$idx]['playerSnapshot'] = $snap;
        $room['trades'][$idx]['counterFee'] = $counterFee;
        $room['trades'][$idx]['status'] = 'countered';
    }
    $room['trades'][$idx]['updatedAt'] = time();
    $room['updatedAt'] = time();
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($room)); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    echo json_encode(['ok' => true, 'room' => public_room($room)]);
    exit;
}

if ($action === 'leave') {
    $code = strtoupper(trim($body['code'] ?? ''));
    $playerId = is_string($body['playerId'] ?? null) ? $body['playerId'] : '';
    if ($code === '' || $playerId === '') fail('Richiesta non valida.');

    $path = room_path($DIR, $code);
    $fp = fopen($path, 'c+');
    if (!$fp) { echo json_encode(['ok' => true]); exit; }
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $room = $raw ? json_decode($raw, true) : null;
    if (!is_array($room)) { flock($fp, LOCK_UN); fclose($fp); echo json_encode(['ok' => true]); exit; }
    $room['players'] = array_values(array_filter($room['players'], function ($p) use ($playerId) { return $p['id'] !== $playerId; }));
    if (!count($room['players'])) {
        // L'ultimo a uscire si porta via la stanza.
        flock($fp, LOCK_UN); fclose($fp);
        @unlink($path);
        echo json_encode(['ok' => true]);
        exit;
    }
    if ($room['hostId'] === $playerId) {
        // L'host passa a chi resta da più tempo, ma mai a un club adottato come bot (nessuno
        // davanti allo schermo da quella postazione) se c'è almeno un'alternativa umana.
        $nextHost = null;
        foreach ($room['players'] as $p) { if (empty($p['bot'])) { $nextHost = $p['id']; break; } }
        $room['hostId'] = $nextHost ?? $room['players'][0]['id'];
    }
    // Chi esce durante la sessione (dirigenza) non riporta gli altri in lobby: restano nella
    // stessa fase, solo rifanno "pronto" perché la composizione della stanza è cambiata. Chi
    // esce a simulazione già avviata non la interrompe (l'host la porta avanti comunque nel
    // proprio browser): la fase resta 'simulating' com'è. Chi esce a round chiuso ('done') non
    // tocca il resoconto già pubblicato né lo stato di chi deve ancora scaricarlo. Una dynasty
    // già terminata ('terminated') resta tale per sempre, chi esce non cambia nulla.
    $prevPhase = $room['phase'] ?? 'lobby';
    if ($prevPhase === 'simulating' || $prevPhase === 'done' || $prevPhase === 'terminated') {
        // fase invariata
    } elseif (in_array($prevPhase, ['session', 'readyForSim'], true)) {
        $room['phase'] = 'session';
        foreach ($room['players'] as &$p) { if (empty($p['bot'])) $p['ready'] = false; }
        unset($p);
    } else {
        $room['phase'] = 'lobby';
        foreach ($room['players'] as &$p) { if (empty($p['bot'])) $p['ready'] = false; }
        unset($p);
    }
    $room['updatedAt'] = time();
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($room)); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    echo json_encode(['ok' => true, 'room' => public_room($room)]);
    exit;
}

fail('Azione non riconosciuta.');
