# Application

- This is a todo application that maintains todo tasks.
- Backend is a PHP server behind Apache.
- Frontend is in-browser with no big framework; separate CSS and JS files.
- User is authenticated via `.htaccess`.
- Backend stores tasks in SQLite3.

# Target device

- Primarily used on mobile devices (1080 × 2340, DPR 3).

# Visual design

- The page background (outside the central card) is `darkgreen`.
- Status background colors:
  - `todo`: light blue
  - `doing`: light green
  - `done`: dark green
  - `removed`: light brown

# Layout

- Intentionally minimal; no static labels.
- Two sections, top to bottom:
  1. Tasks without a due date — show title only, in creation order.
  2. Tasks with a due date — show `<title> <status> <due date>`, sorted by due date ascending (creation order as tiebreaker).
- Below all tasks: an empty input field with placeholder `new task`.

# Task interactions

- **Input field**: typing and submitting creates a new task (no due date, no status yet).
- **Task without a due date (title click)**: opens the date picker; assigning a date sets status to `todo`.
- **Task with a due date — title click**: opens a text editor for the title.
- **Task with a due date — status click**: advances status `todo → doing → done → removed`; clicking `removed` opens a dropdown to choose the next status.
- **Task with a due date — due date click**: opens the date picker to change the due date.
- **Any task — long-press (500 ms)**: opens a confirmation dialog ("Delete [title]?" with Cancel / Delete); confirming permanently deletes the task immediately.

# Task lifecycle

- `removed` tasks are auto-deleted 1 hour after the status was set to `removed`.
- `done` tasks are auto-deleted 1 day after the status was set to `done`.

# Backend API

Single endpoint file `api.php`; method + `?id=` query param for routing.

| Method | Params  | Action |
|--------|---------|--------|
| GET    | —       | Return all tasks (runs auto-cleanup first) |
| POST   | —       | Create task from JSON body `{title}` |
| PATCH  | `?id=N` | Update task fields from JSON body `{title?, due_date?, status?}` |
| DELETE | `?id=N` | Delete task |

## SQLite3 schema

```sql
CREATE TABLE tasks (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    title             TEXT    NOT NULL,
    due_date          TEXT    DEFAULT NULL,       -- YYYY-MM-DD or NULL
    status            TEXT    DEFAULT NULL,       -- todo|doing|done|removed|NULL
    created_at        INTEGER NOT NULL,           -- Unix timestamp
    status_changed_at INTEGER DEFAULT NULL        -- Unix timestamp; set when status changes
);
```
