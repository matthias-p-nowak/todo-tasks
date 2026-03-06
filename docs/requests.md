# Accepted requirement decisions

## Storage
- Backend uses SQLite3 for persistence.

## Target device
- Primary target: mobile, 1080 × 2340 px, DPR 3.

## Task click behavior for tasks without a due date
- Clicking the title of a task that has no due date opens the **date picker** (not the title editor).
- Title editing is only available for tasks that already have a due date.

## Status cycle
- Clicking status advances linearly: `todo → doing → done → removed`.
- Clicking `removed` opens a **dropdown** to choose the next status (no automatic wrap-back to `todo`).
