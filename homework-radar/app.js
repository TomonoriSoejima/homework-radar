let assignments = [];

let activeFilter = "All";
let activeView = "parent";

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
  document.querySelector("#briefingText").textContent =
    activeView === "parent"
      ? "The app reads school email and pulls out due dates into one list."
      : "This view lists what's due, sorted soonest first.";
}

function renderTimeline() {
  const counts = assignments.reduce((map, assignment) => {
    map.set(assignment.due, (map.get(assignment.due) || 0) + 1);
    return map;
  }, new Map());

  timelineList.innerHTML = "";
  [...counts.entries()]
    .sort(([a], [b]) => parseDate(b) - parseDate(a))
    .forEach(([due, count]) => {
      const item = document.createElement("div");
      item.className = "timeline-item";
      item.innerHTML = `<strong>${formatDate(due)}</strong><span>${count} item${count === 1 ? "" : "s"}</span>`;
      timelineList.append(item);
    });
}

function renderAssignments() {
  assignmentList.innerHTML = "";

  visibleAssignments().forEach((assignment) => {
    const node = template.content.firstElementChild.cloneNode(true);

    node.querySelector("h3").textContent = assignment.title;
    node.querySelector("p").textContent =
      activeView === "parent" ? `${assignment.detail} Source: ${assignment.source}.` : assignment.detail;
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

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".segment").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activeView = button.dataset.view;
    render();
  });
});

document.querySelector("#scanButton").addEventListener("click", () => {
  const button = document.querySelector("#scanButton");
  button.animate(
    [
      { transform: "rotate(0deg) scale(1)" },
      { transform: "rotate(-6deg) scale(1.06)" },
      { transform: "rotate(0deg) scale(1)" },
    ],
    { duration: 420, easing: "ease-out" },
  );
});

async function init() {
  const response = await fetch("./assignments.json");
  assignments = await response.json();
  render();
}

init();
