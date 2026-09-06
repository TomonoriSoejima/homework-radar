let assignments = [];

let activeFilter = "All";

const assignmentList = document.querySelector("#assignmentList");
const timelineList = document.querySelector("#timelineList");
const template = document.querySelector("#assignmentTemplate");

function parseDate(value) {
  return new Date(`${value}T00:00:00+09:00`);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseDate(dateString));
}

function visibleAssignments() {
  return assignments
    .filter((assignment) => activeFilter === "All" || assignment.className === activeFilter)
    .sort((a, b) => parseDate(b.due) - parseDate(a.due));
}

function renderMetrics() {
  document.querySelector("#totalCount").textContent = assignments.length;
  document.querySelector("#briefingTitle").textContent = `${assignments.length} assignments`;
  document.querySelector("#briefingText").textContent = "The app reads school email and pulls out due dates into one list.";
}

function renderTimeline() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const counts = assignments.reduce((map, assignment) => {
    map.set(assignment.due, (map.get(assignment.due) || 0) + 1);
    return map;
  }, new Map());

  timelineList.innerHTML = "";
  [...counts.entries()]
    .sort(([a], [b]) => parseDate(b) - parseDate(a))
    .forEach(([due, count]) => {
      const item = document.createElement("div");
      const marker = due < todayStr ? "Past" : due === todayStr ? "Today" : "Upcoming";
      item.className = `timeline-item timeline-item--${marker.toLowerCase()}`;
      item.innerHTML = `<strong>${formatDate(due)}</strong><span class="timeline-marker">${marker}</span><span>${count} item${count === 1 ? "" : "s"}</span>`;
      timelineList.append(item);
    });
}

function renderAssignments() {
  assignmentList.innerHTML = "";

  visibleAssignments().forEach((assignment) => {
    const node = template.content.firstElementChild.cloneNode(true);

    node.querySelector("h3").textContent = assignment.title;
    node.querySelector("p").textContent = `${assignment.detail} Source: ${assignment.source}.`;
    node.querySelector(".class-chip").textContent = assignment.className;
    node.querySelector(".class-chip").dataset.subject = assignment.className;

    const dueChip = node.querySelector(".due-chip");
    dueChip.textContent = `Due ${formatDate(assignment.due)}`;

    assignmentList.append(node);
  });

  document.querySelector("#panelSubcopy").textContent =
    activeFilter === "All" ? "Sorted by due date." : `Showing ${activeFilter} assignments only.`;
}

function render() {
  renderMetrics();
  renderTimeline();
  renderAssignments();
}

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    render();
  });
});

async function init() {
  const response = await fetch("./assignments.json");
  assignments = await response.json();
  render();
}

init();
