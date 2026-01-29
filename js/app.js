/* =========================================
   Antimicrobial Navigator - app.js (FINAL)
   ========================================= */

/* ---------- cache & state ---------- */
const cache = {};
const state = {
  currentPart: null,
  currentDoc: null
};

/* ---------- bootstrap ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  const handled = await loadGuidesFromURL();
  if (!handled) {
    await loadGuides();
  }
});

/* ---------- utilities ---------- */
async function loadJSON(path) {
  if (cache[path]) return cache[path];

  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  const json = await res.json();
  cache[path] = json;
  return json;
}

function getParams() {
  return new URLSearchParams(window.location.search);
}

function updateURL(params = {}) {
  const url = new URL(window.location);
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined) {
      url.searchParams.delete(k);
    } else {
      url.searchParams.set(k, v);
    }
  });
  history.pushState({}, "", url);
}

function clearContent() {
  document.getElementById("content").innerHTML = "";
}

function renderError(message) {
  const content = document.getElementById("content");
  content.innerHTML = `<div class="note">${escapeHtml(message)}</div>`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------- load guides ---------- */
async function loadGuides() {
  const root = await loadJSON("data/meta/guides.json");

  /* app info */
  const app = root.app || {};
  document.getElementById("app-title").textContent =
    app.title || "Antimicrobial Navigator";
  document.getElementById("app-description").textContent =
    app.description || "";

  const disclaimer = Array.isArray(app.disclaimer)
    ? app.disclaimer.join(" ")
    : (app.disclaimer || "");
  document.getElementById("disclaimer").textContent = disclaimer;

  /* guides / parts */
  const guide = root.guides || {};
  const parts = Array.isArray(guide.parts) ? guide.parts : [];

  if (parts.length === 0) {
    renderError("guides.json に parts が見つかりません。");
    return;
  }

  renderParts(parts);
  /* ===== 初期画面本文（about + disclaimer）===== */
  clearContent();
  const content = document.getElementById("content");

  // about（作成の経緯）
  if (Array.isArray(app.about)) {
    const h2 = document.createElement("h2");
    h2.textContent = "本ナビゲーションについて";
    content.appendChild(h2);

    app.about.forEach(line => {
      const p = document.createElement("p");
      p.textContent = line;
      content.appendChild(p);
    });
  }

  // disclaimer（免責事項）
  if (Array.isArray(app.disclaimer)) {
    const h2 = document.createElement("h2");
    h2.textContent = "免責事項";
    content.appendChild(h2);

    app.disclaimer.forEach(line => {
      const p = document.createElement("p");
      p.textContent = line;
      p.style.color = "#555";
      content.appendChild(p);
    });
  }

}

async function loadGuidesFromURL() {
  const params = getParams();
  if (!params.has("part") && !params.has("doc")) return false;

  await loadGuides();


  if (params.has("doc")) {
    await loadDocument(params.get("doc"));
  }
  return true;
}

/* ---------- navigation ---------- */
function renderParts(parts) {
  const nav = document.getElementById("nav");
  nav.innerHTML = "";

  const ul = document.createElement("ul");
  ul.className = "nav-parts";

  parts.forEach(part => {
    const li = document.createElement("li");
    li.className = "nav-part";
    li.textContent = part.title;

    li.addEventListener("click", async () => {
      await loadPart(part.path);
      updateURL({ part: part.path, doc: null });
    });

    ul.appendChild(li);
  });

  nav.appendChild(ul);
}

async function loadPart(path) {
  state.currentPart = path;

  let part;
  try {
    part = await loadJSON(path);
  } catch (e) {
    renderError(`パートを読み込めませんでした：${path}`);
    return;
  }

  const nav = document.getElementById("nav");

  let box = document.getElementById("nav-sections");
  if (!box) {
    box = document.createElement("div");
    box.id = "nav-sections";
    nav.appendChild(box);
  }
  box.innerHTML = "";

  const h = document.createElement("h3");
  h.textContent = part.title;
  box.appendChild(h);

  const ul = document.createElement("ul");
  ul.className = "nav-sections";

  (part.sections || []).forEach(sec => {
    const li = document.createElement("li");
    li.className = "nav-section";
    li.textContent = sec.title;

    if (sec.path) {
      li.addEventListener("click", async () => {
        await loadDocument(sec.path);
        updateURL({ doc: sec.path });
      });
    } else {
      li.classList.add("disabled");
    }
    ul.appendChild(li);
  });

  box.appendChild(ul);

  renderGeneric(part);
}

/* ---------- document ---------- */
async function loadDocument(path) {
  state.currentDoc = path;

  let doc;
  try {
    doc = await loadJSON(path);
  } catch (e) {
    renderError(`ドキュメントを読み込めませんでした：${path}`);
    return;
  }

  if (doc.chapters) {
    renderChapters(doc);
  } else {
    renderGeneric(doc);
  }
}

/* ---------- renderers ---------- */
function renderGeneric(obj) {
  clearContent();
  const content = document.getElementById("content");

  if (obj.title) {
    const h1 = document.createElement("h1");
    h1.textContent = obj.title;
    content.appendChild(h1);
  }

  if (obj.description) {
    const p = document.createElement("p");
    p.textContent = obj.description;
    content.appendChild(p);
  }

    if (obj.summary) {
    const p = document.createElement("p");
    p.textContent = obj.summary;
    content.appendChild(p);
  }
}

function renderChapters(doc) {
  clearContent();
  const content = document.getElementById("content");

  const h1 = document.createElement("h1");
  h1.textContent = doc.title;
  content.appendChild(h1);

  doc.chapters.forEach(chapter => {
    const h2 = document.createElement("h2");
    h2.textContent = chapter.title;
    content.appendChild(h2);

    (chapter.sections || []).forEach(section => {
      const h3 = document.createElement("h3");
      h3.textContent = section.title;
      content.appendChild(h3);

      if (section.summary) {
        const s = document.createElement("div");
        s.className = "summary";
        s.textContent = section.summary;
        content.appendChild(s);
      }

      if (section.note) {
        const n = document.createElement("div");
        n.className = "note";
        n.textContent = section.note;
        content.appendChild(n);
      }

if (section.items) {
  section.items.forEach(item => {

    // 疾患タイトル
    const h4 = document.createElement("h4");
    h4.textContent = item.title;
    content.appendChild(h4);

    // 概要
    if (Array.isArray(item.summary)) {
      item.summary.forEach(line => {
        const p = document.createElement("p");
        p.textContent = line;
        content.appendChild(p);
      });
    }

    // 備考（あれば）
    if (Array.isArray(item.note)) {
      item.note.forEach(line => {
        const p = document.createElement("p");
        p.textContent = line;
        p.style.color = "#555"; // 控えめ
        content.appendChild(p);
      });
    }
  });
}

    });
  });
}

function renderItemDetail(item, sectionTitle, chapterTitle) {
  const content = document.getElementById("content");
  content.innerHTML = "";

  // 戻るリンク
  const back = document.createElement("p");
  back.innerHTML = "← 戻る";
  back.style.cursor = "pointer";
  back.style.color = "#2563eb";
  back.addEventListener("click", () => {
    loadDocument(state.currentDoc);
  });
  content.appendChild(back);

  // 見出し
  const h1 = document.createElement("h1");
  h1.textContent = item.title;
  content.appendChild(h1);

  const meta = document.createElement("p");
  meta.style.color = "#6b7280";
  meta.textContent = `${chapterTitle} ＞ ${sectionTitle}`;
  content.appendChild(meta);

// 概要
if (Array.isArray(item.summary)) {
  const h2 = document.createElement("h2");
  h2.textContent = "概要";
  content.appendChild(h2);

  item.summary.forEach(line => {
    const p = document.createElement("p");
    p.textContent = line;
    content.appendChild(p);
  });
}

// 備考
if (Array.isArray(item.note)) {
  const h2 = document.createElement("h2");
  h2.textContent = "備考";
  content.appendChild(h2);

  item.note.forEach(line => {
    const p = document.createElement("p");
    p.textContent = line;
    content.appendChild(p);
  });
}

}
