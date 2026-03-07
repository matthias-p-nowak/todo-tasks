# Accepted requirement decisions

## Storage
- Backend uses SQLite3 for persistence.

## Target device
- Primary target: mobile, 1080 × 2340 px, DPR 3.

## Task click behavior for tasks without a due date
- Clicking the title of a task without a due date opens the **title editor** (changed from date picker).
- The **calendar emoji** is the trigger for the date picker on tasks without a due date.
- The **clock symbol** is the trigger for the time picker on tasks without a due time.
- Title editing via title click applies to all tasks regardless of due date.

## Date and time formats
- Dates: `yyyy-MM-dd`.
- Times: `hh:mm` 24-hour format.

## Due time
- Tasks may optionally have a due time (`due_time` column, `HH:MM`).
- Tasks without a time show a clock symbol; clicking it opens the time picker.
- Within the same due date, tasks with a time sort before tasks without a time, then ascending by time.

## Status cycle
- Clicking status advances linearly: `todo → doing → done → removed`.
- Clicking `removed` opens a **dropdown** to choose the next status (no automatic wrap-back to `todo`).
