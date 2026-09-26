<?php
/**
 * Presidente · Serie A — raccolta errori client (errors.js).
 *
 * Stesso identico schema di leaderboard.php (nessun account, un file JSON come
 * "database", validazione stretta, rate-limit per IP): qui l'unica azione è POST,
 * non c'è nulla da restituire in GET (i log non sono pubblici, a differenza della
 * classifica). Pensato per essere ignorato in tranquillità se il PHP non gira
 * (es. sviluppo locale): errors.js fallisce in silenzio in quel caso.
 *
 * POST errors.php {body JSON} -> registra un errore client (rifiutato se invalido
 *                                 o troppo frequente dallo stesso IP)
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/storage.php';

// Stesso backend condiviso di leaderboard.php: SQLite se pdo_sqlite c'è, altrimenti il .json
// qui sotto come sempre. Vedi storage.php.
$SQLITE_FILE = __DIR__ . '/data.sqlite';
$DATA_FILE = __DIR__ . '/errors_log.json';
$RATE_FILE = __DIR__ . '/errors_rate.json';
$MAX_ENTRIES = 300;        // quanti errori restano salvati (i più recenti)
$RATE_LIMIT_SECONDS = 10;  // un invio ogni 10 secondi per IP: basta a non farsi sommergere
                           // da un loop di errori dello stesso client, senza perdere segnale
                           // da client diversi che incontrano lo stesso bug nello stesso minuto

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

// Testo libero (messaggio/stack): niente HTML/markup, solo caratteri stampabili, lunghezza
// limitata — a differenza di clean_name (leaderboard.php) qui serve testo tecnico (stack
// trace, path di file), quindi si accettano più simboli ma sempre niente tag.
function clean_text($v, $maxLen) {
    $v = is_string($v) ? $v : '';
    $v = strip_tags($v);
    $v = preg_replace('/[\x00-\x09\x0B\x0C\x0E-\x1F]/', '', $v);   // niente caratteri di controllo (tab/newline ok)
    if (function_exists('mb_substr')) $v = mb_substr($v, 0, $maxLen);
    else $v = substr($v, 0, $maxLen);
    return $v;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Metodo non supportato.', 405);

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$ipHash = substr(hash('sha256', $ip), 0, 24);
$rates = read_json_file($RATE_FILE, []);
$now = time();
foreach ($rates as $k => $t) { if ($now - $t > $RATE_LIMIT_SECONDS) unset($rates[$k]); }
if (isset($rates[$ipHash]) && ($now - $rates[$ipHash]) < $RATE_LIMIT_SECONDS) {
    fail('Troppi invii ravvicinati.', 429);
}

$raw = file_get_contents('php://input');
if (strlen($raw) > 4096) fail('Corpo della richiesta troppo grande.');
$body = json_decode($raw, true);
if (!is_array($body)) fail('JSON non valido.');

$entry = [
    'message' => clean_text($body['message'] ?? '', 500),
    'stack' => clean_text($body['stack'] ?? '', 2000),
    'url' => clean_text($body['url'] ?? '', 300),
    'source' => clean_text($body['source'] ?? '', 200),
    'ts' => $now,
];
if ($entry['message'] === '') fail('Messaggio mancante.');

$entries = storage_read_all($SQLITE_FILE, $DATA_FILE, 'errors', []);
$entries[] = $entry;
// Solo i più RECENTI: a differenza della leaderboard (ordinata per punteggio), qui l'ordine
// utile è cronologico — un bug nuovo conta quanto uno vecchio, anzi di più.
if (count($entries) > $MAX_ENTRIES) $entries = array_slice($entries, -$MAX_ENTRIES);

if (!storage_write_all($SQLITE_FILE, $DATA_FILE, 'errors', $entries)) fail('Impossibile salvare al momento.', 500);

$rates[$ipHash] = $now;
write_json_file_locked($RATE_FILE, $rates);

echo json_encode(['ok' => true]);
