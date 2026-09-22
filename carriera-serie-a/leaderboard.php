<?php
/**
 * Presidente · Serie A — classifica presidenti (hall of fame), condivisa.
 *
 * Endpoint minimale, senza account/login: un file JSON come "database" (va benissimo
 * per un gioco hobby su hosting condiviso), con le uniche protezioni che ha senso avere
 * senza una vera autenticazione — validazione stretta dei campi, nessun testo libero
 * salvato, un tetto alle voci salvate e un rate-limit per IP. Non è a prova di un
 * attaccante motivato (nessun endpoint pubblico scrivibile lo è, senza login reale),
 * ma è sufficiente contro spam/abuso occasionale.
 *
 * GET  leaderboard.php            -> le migliori 50 carriere (JSON)
 * POST leaderboard.php {body JSON}-> invia una carriera (rifiutata se invalida o troppo
 *                                    frequente dallo stesso IP)
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$DATA_FILE = __DIR__ . '/leaderboard_data.json';
$RATE_FILE = __DIR__ . '/leaderboard_rate.json';
$MAX_ENTRIES = 100;      // quante carriere restano salvate (le migliori per punteggio)
$RETURN_TOP = 50;        // quante ne restituisce la GET
$RATE_LIMIT_SECONDS = 300; // un invio ogni 5 minuti per IP

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}

function read_json_file($path, $default) {
    if (!file_exists($path)) return $default;
    $raw = @file_get_contents($path);
    if ($raw === false || $raw === '') return $default;
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $default;
}

// Scrittura con lock esclusivo: evita che due invii quasi simultanei si sovrascrivano a vicenda.
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

// Ripulisce un nome (club/proprietario): solo lettere (anche accentate), cifre, spazi e
// una manciata di segni comuni, lunghezza limitata. Niente HTML, niente markup.
function clean_name($v, $maxLen) {
    $v = is_string($v) ? $v : '';
    $v = trim($v);
    $v = preg_replace('/[^\p{L}\p{N} .\'\-]/u', '', $v);
    $v = preg_replace('/\s+/', ' ', $v);
    if (function_exists('mb_substr')) $v = mb_substr($v, 0, $maxLen);
    else $v = substr($v, 0, $maxLen);
    return $v;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $entries = read_json_file($DATA_FILE, []);
    usort($entries, function ($a, $b) { return ($b['score'] ?? 0) <=> ($a['score'] ?? 0); });
    echo json_encode(['ok' => true, 'entries' => array_slice($entries, 0, $RETURN_TOP)]);
    exit;
}

if ($method !== 'POST') fail('Metodo non supportato.', 405);

// ---- rate limit per IP ----
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$ipHash = substr(hash('sha256', $ip), 0, 24); // non salviamo l'IP in chiaro
$rates = read_json_file($RATE_FILE, []);
$now = time();
// pulizia voci vecchie, altrimenti il file cresce all'infinito
foreach ($rates as $k => $t) { if ($now - $t > $RATE_LIMIT_SECONDS) unset($rates[$k]); }
if (isset($rates[$ipHash]) && ($now - $rates[$ipHash]) < $RATE_LIMIT_SECONDS) {
    fail('Puoi inviare una carriera ogni pochi minuti. Riprova più tardi.', 429);
}

// ---- validazione stretta del corpo ----
$raw = file_get_contents('php://input');
if (strlen($raw) > 4096) fail('Corpo della richiesta troppo grande.');
$body = json_decode($raw, true);
if (!is_array($body)) fail('JSON non valido.');

$club = clean_name($body['club'] ?? '', 24);
$owner = clean_name($body['owner'] ?? '', 18);
$div = isset($body['div']) ? (int) $body['div'] : -1;
$season = isset($body['season']) ? (int) $body['season'] : -1;
$trophies = isset($body['trophies']) ? (int) $body['trophies'] : 0;
$worth = isset($body['worth']) ? (float) $body['worth'] : 0;
$difficulty = clean_name($body['difficulty'] ?? '', 12);

if ($club === '' || $owner === '') fail('Nome club/proprietario mancante.');
if ($div < 0 || $div > 5) fail('Categoria non valida.');
if ($season < 1 || $season > 60) fail('Stagione non valida.');
if ($trophies < 0 || $trophies > 500) fail('Trofei non validi.');
if ($worth < 0 || $worth > 1e13) fail('Valore club non valido.');
if (!in_array($difficulty, ['facile', 'medio', 'difficile', 'estremo'], true)) $difficulty = 'medio';

// Punteggio semplice e difficile da "barare" gonfiando un solo numero: pesa soprattutto i
// trofei (il vero traguardo di una carriera), poi la categoria raggiunta, poi il valore
// del club come spareggio.
$diffMult = ['facile' => 0.85, 'medio' => 1.0, 'difficile' => 1.2, 'estremo' => 1.4][$difficulty];
$score = (int) round(($trophies * 5000 + $div * 800 + min($worth, 2e9) / 1e6) * $diffMult);

$entry = [
    'club' => $club,
    'owner' => $owner,
    'div' => $div,
    'season' => $season,
    'trophies' => $trophies,
    'worth' => $worth,
    'difficulty' => $difficulty,
    'score' => $score,
    'ts' => $now,
];

$entries = read_json_file($DATA_FILE, []);
$entries[] = $entry;
usort($entries, function ($a, $b) { return ($b['score'] ?? 0) <=> ($a['score'] ?? 0); });
$entries = array_slice($entries, 0, $MAX_ENTRIES);

if (!write_json_file_locked($DATA_FILE, $entries)) fail('Impossibile salvare al momento.', 500);

$rates[$ipHash] = $now;
write_json_file_locked($RATE_FILE, $rates);

echo json_encode(['ok' => true, 'entry' => $entry]);
