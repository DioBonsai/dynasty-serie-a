<?php
/**
 * Presidente · Serie A — storage.php
 *
 * Backend di persistenza condiviso da leaderboard.php ed errors.php: se l'hosting ha
 * l'estensione pdo_sqlite (rilevata a runtime, mai assunta) tiene l'intera lista in una tabella
 * SQLite invece che in un file JSON con flock — stesso spirito "zero dipendenze pesanti" del
 * resto del progetto, ma senza il rischio di corruzione di un file JSON scritto a metà se due
 * richieste arrivano nello stesso istante (flock protegge dalle scritture concorrenti fra loro,
 * ma non da un processo che muore a metà scrittura). Se pdo_sqlite non è disponibile, ricade in
 * automatico e in silenzio sul vecchio file JSON + flock: nessuna differenza di comportamento
 * per chi non ha l'estensione, zero rischio di rottura.
 *
 * Deliberatamente "dumb": storage_read_all/storage_write_all trattano la lista intera come un
 * unico blob JSON, esattamente come read_json_file/write_json_file_locked di prima — tutta la
 * logica di dominio (ordinamento per punteggio, quali voci tenere, quante tenerne) resta in
 * leaderboard.php/errors.php esattamente com'era, invariata. Questo file NON decide nulla sui
 * dati, solo COME vengono salvati.
 *
 * Non usato da room.php: lo stato di una stanza vive dentro decine di punti di lock/unlock
 * intrecciati con la validazione di ogni singola azione (create/join/ready/pushMatchday/...),
 * non un semplice "leggi tutta la lista, mutala, riscrivi tutta la lista" come qui — una
 * conversione là richiederebbe riscrivere quella logica blocco per blocco senza alcun modo di
 * testarla prima del deploy. Resta quindi sul suo file JSON + flock per stanza, invariato.
 */

function storage_pdo($dbFile) {
    static $cache = [];
    if (array_key_exists($dbFile, $cache)) return $cache[$dbFile];
    if (!extension_loaded('pdo_sqlite')) { $cache[$dbFile] = false; return false; }
    try {
        $pdo = new PDO('sqlite:' . $dbFile);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec('PRAGMA journal_mode = WAL;');
        $pdo->exec('PRAGMA busy_timeout = 5000;');
        $pdo->exec('CREATE TABLE IF NOT EXISTS blob_store (name TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)');
        $cache[$dbFile] = $pdo;
        return $pdo;
    } catch (Exception $e) {
        $cache[$dbFile] = false;
        return false;
    }
}

// Legge l'intera lista salvata sotto `$name` (es. 'leaderboard', 'errors'): un array PHP, mai
// la stringa JSON grezza — stesso contratto di read_json_file.
function storage_read_all($dbFile, $jsonFallbackFile, $name, $default) {
    $pdo = storage_pdo($dbFile);
    if ($pdo) {
        $stmt = $pdo->prepare('SELECT value FROM blob_store WHERE name = :n');
        $stmt->execute([':n' => $name]);
        $raw = $stmt->fetchColumn();
        if ($raw === false) return $default;
        $data = json_decode($raw, true);
        return is_array($data) ? $data : $default;
    }
    return read_json_file($jsonFallbackFile, $default);
}

// Sovrascrive l'intera lista sotto `$name` con `$data` (già ordinata/limitata da chi chiama,
// esattamente come prima) — dentro una transazione immediata su SQLite (stesso ruolo del
// flock esclusivo sul file), o con lock esclusivo sul file JSON nel fallback.
function storage_write_all($dbFile, $jsonFallbackFile, $name, $data) {
    $pdo = storage_pdo($dbFile);
    if ($pdo) {
        try {
            $pdo->exec('BEGIN IMMEDIATE');
            $stmt = $pdo->prepare('INSERT INTO blob_store (name, value, updated_at) VALUES (:n, :v, :t) ON CONFLICT(name) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at');
            $stmt->execute([':n' => $name, ':v' => json_encode($data), ':t' => time()]);
            $pdo->exec('COMMIT');
            return true;
        } catch (Exception $e) {
            try { $pdo->exec('ROLLBACK'); } catch (Exception $e2) {}
            return false;
        }
    }
    return write_json_file_locked($jsonFallbackFile, $data);
}
