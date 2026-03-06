interface Task {
  id: number;
  title: string;
  due_date: string | null;
  status: 'todo' | 'doing' | 'done' | 'removed' | null;
  created_at: number;
}

const STATUS_CYCLE: Task['status'][] = ['todo', 'doing', 'done', 'removed'];

// ── API ────────────────────────────────────────────────────────────────────────

async function apiFetch(method: string, params = '', body?: object): Promise<any> {
  const res = await fetch(`api.php${params}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const api = {
  list:   ():                                  Promise<Task[]> => apiFetch('GET'),
  create: (title: string):                     Promise<Task>   => apiFetch('POST', '', { title }),
  update: (id: number, patch: Partial<Task>):  Promise<Task>   => apiFetch('PATCH', `?id=${id}`, patch),
  delete: (id: number):                        Promise<void>   => apiFetch('DELETE', `?id=${id}`),
};

// ── state ──────────────────────────────────────────────────────────────────────

let tasks: Task[] = [];

// ── render ─────────────────────────────────────────────────────────────────────

function render(): void {
  const card = document.getElementById('card')!;
  card.innerHTML = '';

  const noDue = tasks
    .filter(t => !t.due_date)
    .sort((a, b) => a.created_at - b.created_at);

  const hasDue = tasks
    .filter(t => t.due_date)
    .sort((a, b) => {
      if (a.due_date! < b.due_date!) return -1;
      if (a.due_date! > b.due_date!) return 1;
      return a.created_at - b.created_at;
    });

  noDue.forEach(t => card.appendChild(makeNoDueRow(t)));

  // input row sits between the two sections
  const inputRow = document.createElement('div');
  inputRow.id = 'input-row';
  const input = document.createElement('input');
  input.id = 'new-task-input';
  input.type = 'text';
  input.placeholder = 'new task';
  input.addEventListener('keydown', async e => {
    if (e.key !== 'Enter') return;
    const title = input.value.trim();
    if (!title) return;
    input.value = '';
    try {
      const created = await api.create(title);
      tasks.push(created);
      render();
    } catch (err) { showError(err); }
  });
  inputRow.appendChild(input);
  card.appendChild(inputRow);

  hasDue.forEach(t => card.appendChild(makeHasDueRow(t)));
}

// ── row builders ───────────────────────────────────────────────────────────────

/** Row for a task that has no due date yet. Clicking the title opens the date picker. */
function makeNoDueRow(task: Task): HTMLElement {
  const row = document.createElement('div');
  row.className = 'task no-date';

  const title = document.createElement('span');
  title.className = 'task-title';
  title.textContent = task.title;
  title.addEventListener('click', () => openDatePicker(task));

  attachLongPress(row, () => openDeleteConfirm(task));

  row.appendChild(title);
  return row;
}

/** Row for a task with a due date: title | status badge | due date. */
function makeHasDueRow(task: Task): HTMLElement {
  const row = document.createElement('div');
  row.className = 'task has-date';

  const title = document.createElement('span');
  title.className = 'task-title';
  title.textContent = task.title;
  title.addEventListener('click', () => openTitleEditor(task));

  const badge = document.createElement('span');
  badge.className = `status-badge status-${task.status}`;
  badge.textContent = task.status;
  badge.addEventListener('click', async e => {
    e.stopPropagation();
    if (task.status === 'removed') {
      toggleStatusMenu(badge, task);
    } else {
      const idx = STATUS_CYCLE.indexOf(task.status);
      const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]!;
      try {
        Object.assign(task, await api.update(task.id, { status: next }));
        render();
      } catch (err) { showError(err); }
    }
  });

  const due = document.createElement('span');
  due.className = 'due-date';
  due.textContent = formatDate(task.due_date!);
  due.addEventListener('click', () => openDatePicker(task));

  attachLongPress(row, () => openDeleteConfirm(task));

  row.appendChild(title);
  row.appendChild(badge);
  row.appendChild(due);
  return row;
}

// ── overlays ───────────────────────────────────────────────────────────────────

/** Opens a date picker. Assigning a date to a dateless task also sets status to 'todo'. */
function openDatePicker(task: Task): void {
  const overlay = makeOverlay();

  const label = document.createElement('label');
  label.textContent = 'Pick a due date';

  const inp = document.createElement('input');
  inp.type = 'date';
  inp.value = task.due_date ?? '';

  const btn = makeOkButton(async () => {
    if (!inp.value) return;
    const patch: Partial<Task> = { due_date: inp.value };
    if (!task.status) patch.status = 'todo';
    try {
      Object.assign(task, await api.update(task.id, patch));
      overlay.el.remove();
      render();
    } catch (err) { showError(err); }
  });

  overlay.box.append(label, inp, btn);
  document.body.appendChild(overlay.el);
  inp.focus();
}

/** Opens a text editor for the task title. */
function openTitleEditor(task: Task): void {
  const overlay = makeOverlay();

  const label = document.createElement('label');
  label.textContent = 'Edit title';

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.value = task.title;

  const btn = makeOkButton(async () => {
    const title = inp.value.trim();
    if (!title) return;
    try {
      Object.assign(task, await api.update(task.id, { title }));
      overlay.el.remove();
      render();
    } catch (err) { showError(err); }
  });

  inp.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });

  overlay.box.append(label, inp, btn);
  document.body.appendChild(overlay.el);
  inp.select();
}

// ── status dropdown for 'removed' ──────────────────────────────────────────────

/** Toggles a dropdown on the badge to pick the next status when current status is 'removed'. */
function toggleStatusMenu(badge: HTMLElement, task: Task): void {
  const existing = badge.querySelector('.status-menu');
  if (existing) { existing.remove(); return; }

  const menu = document.createElement('div');
  menu.className = 'status-menu';

  (['todo', 'doing', 'done'] as Task['status'][]).forEach(s => {
    const item = document.createElement('div');
    item.className = 'status-menu-item';
    item.textContent = s;
    item.addEventListener('click', async e => {
      e.stopPropagation();
      try {
        Object.assign(task, await api.update(task.id, { status: s }));
        render();
      } catch (err) { showError(err); }
    });
    menu.appendChild(item);
  });

  badge.appendChild(menu);

  const close = (e: Event) => {
    if (!badge.contains(e.target as Node)) {
      menu.remove();
      document.removeEventListener('click', close);
    }
  };
  setTimeout(() => document.addEventListener('click', close), 0);
}

// ── long-press delete ──────────────────────────────────────────────────────────

/**
 * Attaches a long-press handler (500 ms) to an element.
 * Cancels on touch/mouse movement, and suppresses the subsequent click event
 * so normal tap interactions are not affected.
 */
function attachLongPress(el: HTMLElement, onLongPress: () => void): void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let fired = false;

  const start = () => {
    fired = false;
    timer = setTimeout(() => { fired = true; onLongPress(); }, 500);
  };

  const cancel = () => {
    if (timer !== null) { clearTimeout(timer); timer = null; }
  };

  el.addEventListener('mousedown',  start);
  el.addEventListener('mouseup',    cancel);
  el.addEventListener('mouseleave', cancel);
  el.addEventListener('touchstart', start,  { passive: true });
  el.addEventListener('touchend',   cancel);
  el.addEventListener('touchmove',  cancel, { passive: true });

  // Suppress the click that immediately follows a long-press (capture phase,
  // so it fires before any child click handlers).
  el.addEventListener('click', e => {
    if (fired) { fired = false; e.stopImmediatePropagation(); }
  }, true);
}

/** Opens a confirmation dialog before permanently deleting a task. */
function openDeleteConfirm(task: Task): void {
  const overlay = makeOverlay();

  const msg = document.createElement('span');
  msg.textContent = `Delete "${task.title}"?`;

  const buttons = document.createElement('div');
  buttons.className = 'overlay-buttons';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'btn-cancel';
  cancelBtn.addEventListener('click', () => overlay.el.remove());

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'btn-delete';
  deleteBtn.addEventListener('click', async () => {
    try {
      await api.delete(task.id);
      tasks = tasks.filter(t => t.id !== task.id);
      overlay.el.remove();
      render();
    } catch (err) { showError(err); }
  });

  buttons.append(cancelBtn, deleteBtn);
  overlay.box.append(msg, buttons);
  document.body.appendChild(overlay.el);
}

// ── overlay helpers ────────────────────────────────────────────────────────────

function makeOverlay(): { el: HTMLElement; box: HTMLElement } {
  const el = document.createElement('div');
  el.className = 'overlay';

  const box = document.createElement('div');
  box.className = 'overlay-box';

  el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  el.appendChild(box);
  return { el, box };
}

function makeOkButton(onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = 'OK';
  btn.addEventListener('click', onClick);
  return btn;
}

// ── utils ──────────────────────────────────────────────────────────────────────

/** Formats an ISO date string (YYYY-MM-DD) as DD/MM/YYYY. */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Shows an error dialog that closes on any click.
 * Safe to call from catch blocks; never throws.
 */
function showError(err: unknown): void {
  const msg = err instanceof Error ? err.message : 'Unknown error';
  const overlay = makeOverlay();
  const text = document.createElement('span');
  text.textContent = msg;
  overlay.box.className += ' overlay-box--error';
  overlay.box.appendChild(text);
  // Close on click anywhere (backdrop or box)
  overlay.el.addEventListener('click', () => overlay.el.remove());
  document.body.appendChild(overlay.el);
}

// ── init ───────────────────────────────────────────────────────────────────────

(async () => {
  try {
    tasks = await api.list();
  } catch (err) { showError(err); }
  render();
})();
