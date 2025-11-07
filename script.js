const taskInput = document.getElementById("taskInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll("[data-filter]");
const taskModal = new bootstrap.Modal(document.getElementById("taskModal"));
const modalTitle = document.getElementById("modalTitle");
const modalComment = document.getElementById("modalComment");
const saveModalBtn = document.getElementById("saveModalBtn");
const summaryBar = document.getElementById("summaryBar");

let editIndex = null;
let activeFilter = "all";
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function filteredTasks() {
  const searchText = searchInput.value.trim().toLowerCase();
  return tasks.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(searchText) ||
      (t.comment && t.comment.toLowerCase().includes(searchText));
    if (!matchSearch) return false;

    switch (activeFilter) {
      case "stashed":
        return t.stashed;
      case "committed":
        return t.committed;
      case "deployed":
        return t.deployed;
      case "pending":
        return !t.stashed && !t.committed && !t.deployed;
      case "commented":
        return !!t.comment?.trim();
      default:
        return true;
    }
  });
}

function renderTasks() {
  taskList.innerHTML = "";
  filteredTasks().forEach((task, index) => {
    const li = document.createElement("li");
    li.className = "list-group-item mb-2 task-item";
    if (task.deployed) li.classList.add("deployed");
    li.setAttribute("draggable", "true");
    li.dataset.index = index;

    li.innerHTML = `
      <div class="d-flex justify-content-between align-items-start">
        <div class="flex-grow-1">
          <span class="fw-semibold task-title">${task.title}</span>
          ${
            task.comment
              ? `<div class="task-comment d-flex justify-content-between align-items-center">
                   <small>💬 ${task.comment}</small>
                   <button class="btn btn-sm btn-outline-warning py-0 px-2" onclick="clearComment(${index})">✖</button>
                 </div>`
              : ""
          }
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-primary" onclick="openEditModal(${index})">✏️</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteTask(${index})">🗑️</button>
        </div>
      </div>
      <div class="status-line d-flex flex-wrap gap-3 mt-2">
        ${renderCheckbox("Stashed", "stashed", task.stashed, index)}
        ${renderCheckbox("Committed", "committed", task.committed, index)}
        ${renderCheckbox("Deployed", "deployed", task.deployed, index)}
      </div>
    `;

    li.addEventListener("dragstart", dragStart);
    li.addEventListener("dragover", dragOver);
    li.addEventListener("dragleave", dragLeave);
    li.addEventListener("drop", drop);
    li.addEventListener("dragend", dragEnd);

    taskList.appendChild(li);
  });
  updateSummary();
}

function renderCheckbox(label, field, checked, index) {
  const id = `${field}-${index}`;
  return `
    <div class="form-check m-0" onclick="toggleExclusive(${index}, '${field}')">
      <input id="${id}" class="form-check-input" type="checkbox" ${
    checked ? "checked" : ""
  }>
      <label class="form-check-label" for="${id}">${label}</label>
    </div>`;
}

function toggleExclusive(index, field) {
  const task = tasks[index];
  task.stashed = field === "stashed" ? !task.stashed : false;
  task.committed = field === "committed" ? !task.committed : false;
  task.deployed = field === "deployed" ? !task.deployed : false;

  if (!task[field]) {
    task.stashed = task.committed = task.deployed = false;
  }

  saveTasks();
  renderTasks();
}

function addTask() {
  const title = taskInput.value.trim();
  if (!title) return;
  tasks.unshift({
    title,
    stashed: false,
    committed: false,
    deployed: false,
    comment: "",
  });
  saveTasks();
  renderTasks();
  taskInput.value = "";
}

function clearComment(index) {
  if (confirm("Clear comment for this task?")) {
    tasks[index].comment = "";
    saveTasks();
    renderTasks();
  }
}

function deleteTask(index) {
  if (confirm("Delete this task?")) {
    tasks.splice(index, 1);
    saveTasks();
    renderTasks();
  }
}

function openEditModal(index) {
  editIndex = index;
  modalTitle.value = tasks[index].title;
  modalComment.value = tasks[index].comment || "";
  taskModal.show();
}

saveModalBtn.addEventListener("click", () => {
  if (editIndex !== null) {
    tasks[editIndex].title = modalTitle.value.trim();
    tasks[editIndex].comment = modalComment.value.trim();
    saveTasks();
    renderTasks();
    editIndex = null;
  }
  taskModal.hide();
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    renderTasks();
  });
});

searchInput.addEventListener("input", renderTasks);

// --- Drag & Drop ---
let draggedIndex = null;
function dragStart(e) {
  draggedIndex = +this.dataset.index;
  e.dataTransfer.effectAllowed = "move";
  this.classList.add("dragging");
}
function dragOver(e) {
  e.preventDefault();
  this.classList.add("drag-over");
}
function dragLeave() {
  this.classList.remove("drag-over");
}
function drop(e) {
  e.preventDefault();
  const targetIndex = +this.dataset.index;
  if (draggedIndex === targetIndex) return;
  const draggedItem = tasks.splice(draggedIndex, 1)[0];
  tasks.splice(targetIndex, 0, draggedItem);
  saveTasks();
  renderTasks();
}
function dragEnd() {
  this.classList.remove("dragging");
  document
    .querySelectorAll(".drag-over")
    .forEach((el) => el.classList.remove("drag-over"));
}

// --- Summary with color logic ---
let summaryTimeout;
function updateSummary() {
  summaryBar.classList.add("fade");
  clearTimeout(summaryTimeout);

  const total = tasks.length;
  const stashed = tasks.filter((t) => t.stashed).length;
  const committed = tasks.filter((t) => t.committed).length;
  const deployed = tasks.filter((t) => t.deployed).length;
  const pending = tasks.filter(
    (t) => !t.stashed && !t.committed && !t.deployed
  ).length;

  summaryTimeout = setTimeout(() => {
    summaryBar.textContent = `${total} Total · ${stashed} Stashed · ${committed} Committed · ${deployed} Deployed · ${pending} Pending`;

    summaryBar.classList.remove(
      "fade",
      "summary-neutral",
      "summary-partial",
      "summary-complete"
    );
    const completedCount = stashed + committed + deployed;

    if (completedCount === 0) summaryBar.classList.add("summary-neutral");
    else if (completedCount < total)
      summaryBar.classList.add("summary-partial");
    else summaryBar.classList.add("summary-complete");
  }, 150);
}

addTaskBtn.addEventListener("click", addTask);
taskInput.addEventListener("keypress", (e) => e.key === "Enter" && addTask());

renderTasks();

// --- Export / Import Tasks ---
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");

// Export all tasks as JSON file
exportBtn.addEventListener("click", () => {
  if (!tasks.length) return alert("No tasks to export.");
  const blob = new Blob([JSON.stringify(tasks, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `todo_tasks_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// Import tasks from JSON file
importInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error("Invalid file format");

      const shouldReplace = confirm(
        "Do you want to replace your current tasks with the imported ones?\n\nPress 'Cancel' to merge instead."
      );

      if (shouldReplace) {
        tasks = imported;
      } else {
        const existingTitles = tasks.map((t) => t.title);
        imported.forEach((t) => {
          if (!existingTitles.includes(t.title)) tasks.push(t);
        });
      }

      saveTasks();
      renderTasks();
      alert("✅ Tasks imported successfully!");
    } catch (err) {
      alert("❌ Invalid JSON file or corrupted data.");
    }
    importInput.value = "";
  };
  reader.readAsText(file);
});
