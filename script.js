const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('[data-filter]');
const taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
const modalTitle = document.getElementById('modalTitle');
const modalComment = document.getElementById('modalComment');
const saveModalBtn = document.getElementById('saveModalBtn');
const summaryText = document.getElementById('summaryText');
const summaryBar = document.getElementById('summaryBar');
const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
const deleteAllModal = new bootstrap.Modal(document.getElementById('deleteAllModal'));
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const confirmDeleteAllBtn = document.getElementById('confirmDeleteAllBtn');
const importModal = new bootstrap.Modal(document.getElementById('importModal'));
const importInput = document.getElementById('importInput');
const exportBtn = document.getElementById('exportBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const mergeBtn = document.getElementById('mergeBtn');
const replaceBtn = document.getElementById('replaceBtn');
const summaryMenuBtn = document.getElementById('summaryMenuBtn');
const exportImportMenu = document.getElementById('exportImportMenu');

let editId = null;
let deleteId = null;
let activeFilter = 'all';
let importedData = null;

/* ---------- Helpers ---------- */
function generateId() {
	return 'tsk_' + Math.random().toString(36).slice(2, 10);
}

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
tasks = tasks.map((t) => ({
	id: generateId(),
	title: t.title ?? '',
	stashed: !!t.stashed,
	progress: !!t.progress,
	committed: !!t.committed,
	deployed: !!t.deployed,
	comment: t.comment ?? '',
}));
saveTasks();

function saveTasks() {
	localStorage.setItem('tasks', JSON.stringify(tasks));
}
function getIndexById(id) {
	return tasks.findIndex((t) => t.id === id);
}

/* ---------- Filtering ---------- */
function filteredTasks() {
	const searchText = searchInput.value.trim().toLowerCase();
	return tasks.filter((t) => {
		const matchesSearch = t.title.toLowerCase().includes(searchText) || (t.comment && t.comment.toLowerCase().includes(searchText));
		if (!matchesSearch) return false;
		switch (activeFilter) {
			case 'pending':
				return !t.stashed && !t.progress && !t.committed && !t.deployed;
			case 'progress':
				return t.progress;
			case 'stashed':
				return t.stashed;
			case 'committed':
				return t.committed;
			case 'deployed':
				return t.deployed;
			case 'commented':
				return !!t.comment?.trim();
			default:
				return true;
		}
	});
}

/* ---------- Render ---------- */
function renderTasks() {
	taskList.innerHTML = '';
	filteredTasks().forEach((task) => {
		const li = document.createElement('li');
		li.className = 'list-group-item mb-2 task-item';
		li.dataset.id = task.id;

		const statusClass = task.deployed
			? 'task-deployed'
			: task.committed
			? 'task-committed'
			: task.stashed
			? 'task-stashed'
			: task.progress
			? 'task-progress'
			: null;

		if (statusClass) li.classList.add(statusClass);
		li.setAttribute('draggable', 'true');

		li.innerHTML = `
      <div class="d-flex justify-content-between align-items-start">
        <div class="flex-grow-1">
          <span class="fw-semibold task-title">${task.title}</span>
          ${task.comment ? `<div class="task-comment"><small>💬 ${task.comment}</small></div>` : ''}
        </div>
        <div class="d-flex gap-2 align-items-start">
          <button class="btn btn-sm btn-outline-primary" onclick="openEditModal('${task.id}')">✏️</button>
          ${task.comment ? `<button class="btn btn-sm btn-outline-warning" onclick="clearComment('${task.id}')">💬❌</button>` : ''}
          <button class="btn btn-sm btn-outline-danger" onclick="openDeleteModal('${task.id}')">🗑️</button>
        </div>
      </div>
      <div class="status-line d-flex flex-wrap gap-3 mt-2">
        ${renderCheckbox('In Progress', 'progress', task.progress, task.id)}
        ${renderCheckbox('Stashed', 'stashed', task.stashed, task.id)}
        ${renderCheckbox('Committed', 'committed', task.committed, task.id)}
        ${renderCheckbox('Deployed', 'deployed', task.deployed, task.id)}
      </div>
    `;

		li.addEventListener('dragstart', dragStart);
		li.addEventListener('dragover', dragOver);
		li.addEventListener('dragleave', dragLeave);
		li.addEventListener('drop', drop);
		li.addEventListener('dragend', dragEnd);

		taskList.appendChild(li);
	});

	updateSummary();
}

function renderCheckbox(label, field, checked, id) {
	const cid = `${field}-${id}`;
	return `
    <div class="form-check m-0">
      <input id="${cid}" class="form-check-input" type="checkbox"
        ${checked ? 'checked' : ''}
        onchange="toggleExclusive('${id}', '${field}')">
      <label class="form-check-label" for="${cid}">${label}</label>
    </div>`;
}

/* ---------- Status toggle ---------- */
function toggleExclusive(id, field) {
	const idx = getIndexById(id);
	if (idx === -1) return;
	const task = tasks[idx];
	const wasActive = !!task[field];

	// reset all
	task.stashed = task.progress = task.committed = task.deployed = false;
	if (!wasActive) task[field] = true;

	saveTasks();
	renderTasks();
}

/* ---------- Task ops ---------- */
function addTask() {
	const title = taskInput.value.trim();
	if (!title) return;
	tasks.unshift({
		id: generateId(),
		title,
		stashed: false,
		progress: false,
		committed: false,
		deployed: false,
		comment: '',
	});
	saveTasks();
	renderTasks();
	taskInput.value = '';
}

function clearComment(id) {
	const i = getIndexById(id);
	if (i === -1) return;
	tasks[i].comment = '';
	saveTasks();
	renderTasks();
}

function openDeleteModal(id) {
	deleteId = id;
	deleteModal.show();
}

confirmDeleteBtn.addEventListener('click', () => {
	if (!deleteId) return;
	const i = getIndexById(deleteId);
	if (i !== -1) tasks.splice(i, 1);
	saveTasks();
	renderTasks();
	deleteModal.hide();
	deleteId = null;
});

function openEditModal(id) {
	editId = id;
	const t = tasks.find((x) => x.id === id);
	if (!t) return;
	modalTitle.value = t.title;
	modalComment.value = t.comment || '';
	taskModal.show();
}

saveModalBtn.addEventListener('click', () => {
	if (!editId) return;
	const i = getIndexById(editId);
	if (i !== -1) {
		tasks[i].title = modalTitle.value.trim();
		tasks[i].comment = modalComment.value.trim();
		saveTasks();
		renderTasks();
	}
	editId = null;
	taskModal.hide();
});

/* ---------- Filters ---------- */
filterButtons.forEach((btn) => {
	btn.addEventListener('click', () => {
		filterButtons.forEach((b) => b.classList.remove('active'));
		btn.classList.add('active');
		activeFilter = btn.dataset.filter;
		renderTasks();
	});
});

searchInput.addEventListener('input', renderTasks);

/* ---------- Drag & Drop ---------- */
let draggedId = null;
function dragStart(e) {
	draggedId = this.dataset.id;
	this.classList.add('dragging');
}
function dragOver(e) {
	e.preventDefault();
	this.classList.add('drag-over');
}
function dragLeave() {
	this.classList.remove('drag-over');
}
function drop(e) {
	e.preventDefault();
	const targetId = this.dataset.id;
	if (!draggedId || draggedId === targetId) return;
	const from = getIndexById(draggedId);
	const to = getIndexById(targetId);
	if (from === -1 || to === -1) return;
	const [item] = tasks.splice(from, 1);
	tasks.splice(to, 0, item);
	saveTasks();
	renderTasks();
}
function dragEnd() {
	this.classList.remove('dragging');
	document.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
}

/* ---------- Summary ---------- */
function updateSummary() {
	const total = tasks.length;
	const pending = tasks.filter((t) => !t.stashed && !t.progress && !t.committed && !t.deployed).length;
	const progress = tasks.filter((t) => t.progress).length;
	const stashed = tasks.filter((t) => t.stashed).length;
	const committed = tasks.filter((t) => t.committed).length;
	const deployed = tasks.filter((t) => t.deployed).length;

	summaryText.textContent = `${total} Total · ${pending} Pending · ${progress} In Progress · ${stashed} Stashed · ${committed} Committed · ${deployed} Deployed`;

	// summaryBar.classList.remove('summary-neutral', 'summary-partial', 'summary-complete');
	// const colored = progress + stashed + committed + deployed;
	// if (colored === 0) summaryBar.classList.add('summary-neutral');
	// else if (colored < total) summaryBar.classList.add('summary-partial');
	// else summaryBar.classList.add('summary-complete');
}

/* ---------- Clear All ---------- */
clearAllBtn.addEventListener('click', () => {
	deleteAllModal.show();
});

confirmDeleteAllBtn.addEventListener('click', () => {
	tasks = [];
	saveTasks();
	renderTasks();
	deleteAllModal.hide();
});

/* ---------- Export / Import ---------- */
exportBtn.addEventListener('click', () => {
	if (!tasks.length) {
		alert('No tasks to export.');
		return;
	}
	const blob = new Blob([JSON.stringify(tasks, null, 2)], {
		type: 'application/json',
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `todo_tasks_${new Date().toISOString().slice(0, 10)}.json`;
	a.click();
	URL.revokeObjectURL(url);
});

importInput.addEventListener('change', (e) => {
	const file = e.target.files[0];
	if (!file) return;
	const reader = new FileReader();
	reader.onload = (ev) => {
		try {
			const data = JSON.parse(ev.target.result);
			if (!Array.isArray(data)) throw new Error();
			importedData = data;
			importModal.show();
		} catch {
			alert('❌ Invalid or corrupted JSON file.');
			importedData = null;
		}
		importInput.value = '';
	};
	reader.readAsText(file);
});

mergeBtn.addEventListener('click', () => handleImport('merge'));
replaceBtn.addEventListener('click', () => handleImport('replace'));

function handleImport(mode) {
	if (!importedData) return;

	const normalized = importedData
		.map((t) => ({
			id: generateId(),
			title: t.title ?? '',
			stashed: !!t.stashed,
			progress: !!t.progress,
			committed: !!t.committed,
			deployed: !!t.deployed,
			comment: t.comment ?? '',
		}))
		.filter((t) => t.title);

	if (mode === 'replace') {
		tasks = normalized;
	} else {
		const existingIds = new Set(tasks.map((t) => t.id));
		normalized.forEach((t) => {
			if (!existingIds.has(t.id)) {
				tasks.push(t);
				existingIds.add(t.id);
			}
		});
	}

	saveTasks();
	renderTasks();
	importedData = null;
	importModal.hide();
}

/* ---------- Menu Hover ---------- */
summaryMenuBtn.addEventListener('mouseenter', () => {
	exportImportMenu.classList.add('show');
});
summaryBar.addEventListener('mouseleave', () => {
	exportImportMenu.classList.remove('show');
});

/* ---------- Events ---------- */
addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => e.key === 'Enter' && addTask());

/* ---------- Init ---------- */
renderTasks();
