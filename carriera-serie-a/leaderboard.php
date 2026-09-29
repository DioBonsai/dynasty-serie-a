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
 * GET  leaderboard.php            -> le migliori carriere (JSON), ciascuna con `boardSeason`
 *                                    (vedi get_leaderboard_season sotto), più `currentSeason`
 *                                    a parte per sapere qual è quella "in corso"
 * POST leaderboard.php {body JSON}-> invia una carriera (rifiutata se invalida o troppo
 *                                    frequente dallo stesso IP), etichettata in automatico con
 *                                    la stagione di classifica corrente
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/storage.php';

// Se pdo_sqlite è disponibile, la lista vive in questo unico file SQLite (tabella blob_store,
// chiave 'leaderboard') invece che nel .json qui sotto — che resta comunque il fallback
// automatico (mai eliminato) se l'estensione non c'è. Vedi storage.php per i dettagli.
$SQLITE_FILE = __DIR__ . '/data.sqlite';
$DATA_FILE = __DIR__ . '/leaderboard_data.json';
$SEASON_FILE = __DIR__ . '/leaderboard_season_data.json';
$RATE_FILE = __DIR__ . '/leaderboard_rate.json';
$MAX_ENTRIES = 100;      // quante carriere restano salvate (le migliori per punteggio)
$RETURN_TOP = 50;        // quante ne restituisce la GET (il client filtra per difficoltà/categoria
                         // lato suo, vedi showGlobalLeaderboard in ui.js — deve avere abbastanza
                         // scelta oltre alla sola top 10 assoluta, non solo le migliori in assoluto)
$RATE_LIMIT_SECONDS = 300; // un invio ogni 5 minuti per IP

// Stagione della CLASSIFICA (boardSeason): un concetto diverso da `season` sull'entry (quella
// è la stagione IN carriera, S.season, a cui la dynasty inviata era arrivata). boardSeason
// esiste per poter "chiudere" ogni tanto la classifica e farne ripartire una nuova, senza
// perdere lo storico: tenuto come contatore condiviso via lo stesso storage_read_all/write_all
// generico già usato per le voci. La primissima volta che questo endpoint gira con questo
// concetto (il contatore non esiste ancora da nessuna parte) si parte da 2, non da 1: tutto
// quello già salvato finora non ha un boardSeason esplicito e viene trattato come Stagione 1
// (vedi il fallback qui sotto), le carriere inviate da questo momento in poi sono Stagione 2.
function get_leaderboard_season($sqliteFile, $seasonFile) {
    $data = storage_read_all($sqliteFile, $seasonFile, 'leaderboard_season', null);
    if (is_array($data) && isset($data['current'])) return (int) $data['current'];
    storage_write_all($sqliteFile, $seasonFile, 'leaderboard_season', ['current' => 2]);
    return 2;
}

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
    $entries = storage_read_all($SQLITE_FILE, $DATA_FILE, 'leaderboard', []);
    // Le voci inviate prima che boardSeason esistesse non hanno il campo: sono per
    // definizione Stagione 1 (tutto quello che c'era "prima" del concetto di stagioni).
    foreach ($entries as &$e) { if (!isset($e['boardSeason'])) $e['boardSeason'] = 1; }
    unset($e);
    usort($entries, function ($a, $b) { return ($b['score'] ?? 0) <=> ($a['score'] ?? 0); });
    echo json_encode(['ok' => true, 'entries' => array_slice($entries, 0, $RETURN_TOP), 'currentSeason' => get_leaderboard_season($SQLITE_FILE, $SEASON_FILE)]);
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
// Da dove si è partiti (S.startDiv, già tracciato lato client per l'achievement "from_bottom"):
// facoltativo per compatibilità con client vecchi che non lo mandano ancora, in quel caso non
// si assume alcuna scalata (stesso comportamento di prima, nessun bonus/penalità).
$startDiv = isset($body['startDiv']) ? (int) $body['startDiv'] : $div;
$season = isset($body['season']) ? (int) $body['season'] : -1;
$trophies = isset($body['trophies']) ? (int) $body['trophies'] : 0;
$worth = isset($body['worth']) ? (float) $body['worth'] : 0;
$difficulty = clean_name($body['difficulty'] ?? '', 12);

if ($club === '' || $owner === '') fail('Nome club/proprietario mancante.');
if ($div < 0 || $div > 5) fail('Categoria non valida.');
if ($startDiv < 0 || $startDiv > 5) $startDiv = $div;
if ($season < 1 || $season > 60) fail('Stagione non valida.');
if ($trophies < 0 || $trophies > 500) fail('Trofei non validi.');
if ($worth < 0 || $worth > 1e13) fail('Valore club non valido.');
if (!in_array($difficulty, ['facile', 'medio', 'difficile', 'estremo'], true)) $difficulty = 'medio';

// Dettaglio trofei (S.trophies lato client): facoltativo, solo per la card di dettaglio del
// podio nella classifica globale — mai usato per il punteggio (resta $trophies, il totale già
// validato sopra), quindi un valore assente o incoerente qui non blocca comunque l'invio.
$tbIn = isset($body['trophyBreakdown']) && is_array($body['trophyBreakdown']) ? $body['trophyBreakdown'] : null;
$trophyBreakdown = null;
if ($tbIn) {
    $capInt = function ($v) { return max(0, min(60, (int) $v)); };
    $titles = isset($tbIn['titles']) && is_array($tbIn['titles']) ? array_values($tbIn['titles']) : [];
    $titles = array_map($capInt, $titles);
    $titles = array_pad(array_slice($titles, 0, 6), 6, 0);
    $trophyBreakdown = [
        'titles' => $titles,
        'nat' => $capInt($tbIn['nat'] ?? 0),
        'ucl' => $capInt($tbIn['ucl'] ?? 0),
        'uel' => $capInt($tbIn['uel'] ?? 0),
        'conf' => $capInt($tbIn['conf'] ?? 0),
    ];
}

// Punteggio semplice e difficile da "barare" gonfiando un solo numero: pesa soprattutto i
// trofei (il vero traguardo di una carriera), poi la categoria raggiunta, poi quanto si è
// scalata la piramide dal punto di partenza (climb: chi parte già in Serie A e ci resta non
// deve valere quanto chi ci arriva dalla Promozione), poi il valore del club come spareggio.
$diffMult = ['facile' => 0.8, 'medio' => 1.0, 'difficile' => 1.35, 'estremo' => 1.7][$difficulty];
$climb = max(0, $div - $startDiv);
$score = (int) round(($trophies * 5000 + $div * 500 + $climb * 500 + min($worth, 2e9) / 1e6) * $diffMult);

$entry = [
    'club' => $club,
    'owner' => $owner,
    'div' => $div,
    'startDiv' => $startDiv,
    'season' => $season,
    'boardSeason' => get_leaderboard_season($SQLITE_FILE, $SEASON_FILE),
    'trophies' => $trophies,
    'worth' => $worth,
    'difficulty' => $difficulty,
    'score' => $score,
    'ts' => $now,
    'trophyBreakdown' => $trophyBreakdown,
];

$entries = storage_read_all($SQLITE_FILE, $DATA_FILE, 'leaderboard', []);
$entries[] = $entry;
usort($entries, function ($a, $b) { return ($b['score'] ?? 0) <=> ($a['score'] ?? 0); });
$entries = array_slice($entries, 0, $MAX_ENTRIES);

if (!storage_write_all($SQLITE_FILE, $DATA_FILE, 'leaderboard', $entries)) fail('Impossibile salvare al momento.', 500);

$rates[$ipHash] = $now;
write_json_file_locked($RATE_FILE, $rates);

echo json_encode(['ok' => true, 'entry' => $entry]);
