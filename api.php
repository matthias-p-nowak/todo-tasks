<?php

require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

// ── helpers ───────────────────────────────────────────────────────────────────

/** Sends a JSON response and exits. */
function respond(mixed $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

/** Reads and decodes the JSON request body. */
function body(): array
{
    $raw = file_get_contents('php://input');
    return $raw ? (json_decode($raw, true) ?? []) : [];
}

/** Maps a raw DB row to a clean array for the frontend. */
function row_to_task(array $row): array
{
    return [
        'id'         => (int)$row['id'],
        'title'      => $row['title'],
        'due_date'   => $row['due_date'],
        'status'     => $row['status'],
        'created_at' => (int)$row['created_at'],
    ];
}

// ── routing ───────────────────────────────────────────────────────────────────

$db     = db();
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

// Auto-cleanup: delete tasks whose lifecycle has expired.
$now = time();
$db->exec("DELETE FROM tasks WHERE status = 'removed' AND status_changed_at <= " . ($now - 3600));
$db->exec("DELETE FROM tasks WHERE status = 'done'    AND status_changed_at <= " . ($now - 86400));

// ── GET — list all tasks ──────────────────────────────────────────────────────

if ($method === 'GET') {
    $result = $db->query('SELECT id, title, due_date, status, created_at FROM tasks');
    $tasks  = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $tasks[] = row_to_task($row);
    }
    respond($tasks);
}

// ── POST — create task ────────────────────────────────────────────────────────

if ($method === 'POST') {
    $data  = body();
    $title = trim($data['title'] ?? '');
    if ($title === '') {
        respond(['error' => 'title is required'], 400);
    }

    $stmt = $db->prepare('
        INSERT INTO tasks (title, due_date, status, created_at)
        VALUES (:title, NULL, NULL, :now)
    ');
    $stmt->bindValue(':title', $title);
    $stmt->bindValue(':now',   time(), SQLITE3_INTEGER);
    $stmt->execute();

    $new = $db->query('SELECT id, title, due_date, status, created_at FROM tasks WHERE id = ' . $db->lastInsertRowID());
    respond(row_to_task($new->fetchArray(SQLITE3_ASSOC)), 201);
}

// ── PATCH — update task ───────────────────────────────────────────────────────

if ($method === 'PATCH') {
    if (!$id) respond(['error' => 'id is required'], 400);

    $data   = body();
    $fields = [];
    $params = [];

    if (array_key_exists('title', $data)) {
        $title = trim($data['title']);
        if ($title === '') respond(['error' => 'title must not be empty'], 400);
        $fields[]          = 'title = :title';
        $params[':title']  = $title;
    }

    if (array_key_exists('due_date', $data)) {
        $fields[]             = 'due_date = :due_date';
        $params[':due_date']  = $data['due_date']; // null clears the date
    }

    if (array_key_exists('status', $data)) {
        $allowed = ['todo', 'doing', 'done', 'removed', null];
        if (!in_array($data['status'], $allowed, true)) {
            respond(['error' => 'invalid status'], 400);
        }
        $fields[]                   = 'status = :status';
        $fields[]                   = 'status_changed_at = :changed';
        $params[':status']          = $data['status'];
        $params[':changed']         = time();
    }

    if (empty($fields)) respond(['error' => 'nothing to update'], 400);

    $sql  = 'UPDATE tasks SET ' . implode(', ', $fields) . ' WHERE id = :id';
    $stmt = $db->prepare($sql);
    foreach ($params as $k => $v) {
        $type = is_int($v) ? SQLITE3_INTEGER : ($v === null ? SQLITE3_NULL : SQLITE3_TEXT);
        $stmt->bindValue($k, $v, $type);
    }
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $stmt->execute();

    if ($db->changes() === 0) respond(['error' => 'task not found'], 404);

    $row = $db->query('SELECT id, title, due_date, status, created_at FROM tasks WHERE id = ' . $id);
    respond(row_to_task($row->fetchArray(SQLITE3_ASSOC)));
}

// ── DELETE — remove task ──────────────────────────────────────────────────────

if ($method === 'DELETE') {
    if (!$id) respond(['error' => 'id is required'], 400);

    $stmt = $db->prepare('DELETE FROM tasks WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $stmt->execute();

    if ($db->changes() === 0) respond(['error' => 'task not found'], 404);
    respond(['deleted' => $id]);
}

respond(['error' => 'method not allowed'], 405);
