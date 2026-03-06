# Environment

- PHP and JS are edited in VSCodium; debugging happens in VSCodium.
- Firefox is the used browser.
- Build/compile tasks are defined in `.vscode/tasks.json`:
  - `compile js`: `esbuild --bundle src/app.ts --outdir=${workspaceFolder} --sourcemap --watch`
  - `watch-scss`: `sass -w src/main.scss:main.css`

# Backend

- `db.php` — opens/initializes the SQLite3 database (`tasks.db` in workspace root); called via `db()` singleton.
- `api.php` — REST API; routes on HTTP method + `?id=` query param.
  - Runs auto-cleanup on every request before handling it.
  - `status_changed_at` is set whenever `status` is written; used to time auto-deletes.
- Database file: `tasks.db` (created automatically on first request).

# Frontend

- `index.html` — shell page; loads `main.css` and `app.js`.
- `src/app.ts` — all app logic (compiled to `app.js` via esbuild).
  - Fetches tasks from `/api.php` on load and re-renders after every mutation.
  - All interactions (date picker, title editor, status cycling, removed dropdown, long-press delete) are handled in-process; no page reloads.
  - Long-press (500 ms) on any task row fires a delete confirmation; a capture-phase click suppressor prevents the normal tap action from also firing.
- `src/main.scss` — all styles (compiled to `main.css` via sass).
- Compiled outputs (`app.js`, `main.css`) are written to the workspace root.
