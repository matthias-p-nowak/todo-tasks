<?php

/**
 * Opens (and initializes) the SQLite3 database.
 * Returns the same instance on repeated calls.
 */
function db(): SQLite3
{
    static $db = null;
    if ($db === null) {
        $db = new SQLite3(__DIR__ . '/tasks.db');
        $db->exec('PRAGMA journal_mode=WAL');
        $db->exec('
            CREATE TABLE IF NOT EXISTS tasks (
                id                INTEGER PRIMARY KEY AUTOINCREMENT,
                title             TEXT    NOT NULL,
                due_date          TEXT    DEFAULT NULL,
                status            TEXT    DEFAULT NULL,
                created_at        INTEGER NOT NULL,
                status_changed_at INTEGER DEFAULT NULL
            )
        ');
    }
    return $db;
}
