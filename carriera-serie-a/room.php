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
 * POST room.php {action:'create', name, club, div, difficulty}      -> crea una stanza, ti
 *   aggiunge come host+primo giocatore
 * POST room.php {action:'join', code, name, club}                   -> entra in una stanza esistente
 * POST room.php {action:'ready', code, playerId, ready, state?}     -> imposta il tuo stato
 *   "pronto"; quando ready=true, `state` è il JSON della carriera che sottometti alla stanza
 * POST room.php {action:'submitResult', code, playerId, results}    -> solo l'host: pubblica
 *   il risultato della stagione simulata (una voce per playerId), chiude la stanza (`done`)
 * POST room.php {action:'leave', code, playerId}                    -> esci dalla stanza
 * GET  room.php?action=state&code=XXXX                               -> stato attuale (poll)
 *
 * Fase 2b (sim.js: runHostSeason) fa girare la simulazione multi-club lato client, nel
 * browser dell'host — questo endpoint è solo il tramite: raccoglie le carriere sottomesse,
 * pubblica il risultato che l'host ha calcolato. Nessuna logica di gioco qui dentro.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$DIR = __DIR__;
$MAX_PLAYERS = 6;
$ROOM_TTL_SECONDS = 24 * 3600;   // stanze più vecchie di così vengono ripulite al volo
$CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // niente 0/O/1/I, meno errori a mano

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
// intera (rosa, storico, ecc.) e 'submitResult' porta i risultati di TUTTI i giocatori della
// stanza insieme — un tetto largo (comunque ben dentro il post_max_size tipico di un hosting
// condiviso) invece del 4KB che bastava alla sola lobby.
if (strlen($raw) > 2 * 1024 * 1024) fail('Corpo della richiesta troppo grande.');
$body = json_decode($raw, true);
if (!is_array($body)) fail('JSON non valido.');

$action = is_string($body['action'] ?? null) ? $body['action'] : '';

if ($action === 'create') {
    cleanup_old_rooms($DIR, $ROOM_TTL_SECONDS);

    $name = clean_name($body['name'] ?? '', 18);
    $club = clean_name($body['club'] ?? '', 24);
    $div = isset($body['div']) ? (int) $body['div'] : 0;
    $difficulty = clean_name($body['difficulty'] ?? '', 12);
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
        'createdAt' => $now,
        'updatedAt' => $now,
        'div' => $div,
        'difficulty' => $difficulty,
        'hostId' => $playerId,
        'phase' => 'lobby',
        'players' => [
            ['id' => $playerId, 'name' => $name, 'club' => $club, 'ready' => false, 'joinedAt' => $now],
        ],
    ];
    if (!write_json_file_locked(room_path($DIR, $code), $room)) fail('Impossibile salvare la stanza.', 500);
    echo json_encode(['ok' => true, 'playerId' => $playerId, 'room' => public_room($room)]);
    exit;
}

if ($action === 'join') {
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
    if (count($room['players']) >= $MAX_PLAYERS) { flock($fp, LOCK_UN); fclose($fp); fail('Stanza piena (massimo ' . $MAX_PLAYERS . ' giocatori).', 409); }
    foreach ($room['players'] as $p) {
        if (mb_strtolower($p['club']) === mb_strtolower($club)) { flock($fp, LOCK_UN); fclose($fp); fail('C\'è già un club con questo nome nella stanza.'); }
    }

    $playerId = gen_player_id();
    $now = time();
    $room['players'][] = ['id' => $playerId, 'name' => $name, 'club' => $club, 'ready' => false, 'joinedAt' => $now];
    $room['updatedAt'] = $now;
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($room)); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    echo json_encode(['ok' => true, 'playerId' => $playerId, 'room' => public_room($room)]);
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
    if ($ready && !$stateValid) fail('Carriera mancante o non valida.');

    $path = room_path($DIR, $code);
    $fp = fopen($path, 'c+');
    if (!$fp) fail('Stanza non trovata.', 404);
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $room = $raw ? json_decode($raw, true) : null;
    if (!is_array($room)) { flock($fp, LOCK_UN); fclose($fp); fail('Stanza non trovata.', 404); }
    if (($room['phase'] ?? 'lobby') === 'done') { flock($fp, LOCK_UN); fclose($fp); fail('La stanza ha già una stagione pronta.', 409); }
    $found = false;
    foreach ($room['players'] as &$p) {
        if ($p['id'] === $playerId) {
            $p['ready'] = $ready;
            if ($ready) $p['state'] = $state;
            $found = true;
            break;
        }
    }
    unset($p);
    if (!$found) { flock($fp, LOCK_UN); fclose($fp); fail('Non fai parte di questa stanza.', 404); }
    $allReady = count($room['players']) > 1;
    foreach ($room['players'] as $p) { if (!$p['ready']) { $allReady = false; break; } }
    $room['phase'] = $allReady ? 'allReady' : 'lobby';
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
    if (($room['phase'] ?? 'lobby') === 'done') { flock($fp, LOCK_UN); fclose($fp); fail('La stanza ha già una stagione pronta.', 409); }
    $room['results'] = $results;
    $room['phase'] = 'done';
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
    if ($room['hostId'] === $playerId) $room['hostId'] = $room['players'][0]['id'];   // l'host passa a chi resta da più tempo
    $room['phase'] = 'lobby';
    foreach ($room['players'] as &$p) { $p['ready'] = false; }   // chi resta rifà "pronto" con la lobby cambiata
    unset($p);
    $room['updatedAt'] = time();
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($room)); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    echo json_encode(['ok' => true, 'room' => public_room($room)]);
    exit;
}

fail('Azione non riconosciuta.');
