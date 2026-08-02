async function loadLibrary() {
  const res = await fetch("/api/library");
  return res.json();
}

function nodeFor(level) {
  const div = document.createElement("div");
  div.className = "node node-" + level.state;
  if (level.current) div.classList.add("current");

  if (level.state === "completed" && level.has_performance) {
    const thumb = document.createElement("video");
    thumb.src = `/video/${level.chapter}/${level.level}/performance`;
    thumb.muted = true;
    thumb.preload = "metadata";
    thumb.setAttribute("playsinline", "");
    thumb.setAttribute("aria-label", `Re-play ${level.title}`);
    div.appendChild(thumb);
    div.addEventListener("click", () => openPlayer(level, "performance"));
  } else if (level.state === "unlocked") {
    const label = document.createElement("span");
    label.className = "title";
    label.textContent = level.title;
    div.appendChild(label);
    div.addEventListener("click", () => openPlayer(level, "demo"));
  } else {
    const lock = document.createElement("span");
    lock.className = "lock";
    lock.textContent = "🔒";
    div.appendChild(lock);
  }
  return div;
}

function render(library) {
  const map = document.getElementById("map");
  map.innerHTML = "";
  for (const chapter of library) {
    const section = document.createElement("section");
    section.className = "chapter";
    const heading = document.createElement("h2");
    heading.textContent = chapter.name;
    section.appendChild(heading);
    const row = document.createElement("div");
    row.className = "levels";
    for (const level of chapter.levels) {
      row.appendChild(nodeFor(level));
    }
    section.appendChild(row);
    map.appendChild(section);
  }
}

function openPlayer(level, kind) {
  const modal = document.getElementById("player");
  const v = document.getElementById("player-video");
  v.src = `/video/${level.chapter}/${level.level}/${kind}`;
  modal.classList.add("open");
  v.play();
}

function closePlayer() {
  const modal = document.getElementById("player");
  const v = document.getElementById("player-video");
  v.pause();
  v.removeAttribute("src");
  v.load();
  modal.classList.remove("open");
}

async function init() {
  render(await loadLibrary());
  document.getElementById("player-close")
    .addEventListener("click", closePlayer);
}
init();
