/* ============================================================
   玄炉 XUANFORGE · app.js
   Router / views / panel wiring / dataset / logs / sound
   ============================================================ */
(function () {
  "use strict";

  const X = window.XF;
  const { MODELS, RECIPES, METHODS, TOOLS, PLATFORMS, PITFALLS, DATASET_TIPS, SOURCES, FACTS, MODS } = X;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const app = {
    view: "furnace",
    filter: "all",
    search: "",
    pickerMod: "all",
    pickerSearch: "",
    rendered: {},
    materials: [],
    runs: [
      { name: "青绿山水 · 风格", model: "Z-Image Base", rank: 32, steps: 1800, loss: .041, size: 168, time: "2026-10-19 22:14", tag: "示例" },
      { name: "丹主音色 · v2", model: "GPT-SoVITS", rank: "—", steps: 12, loss: .083, size: 74, time: "2026-10-17 01:02", tag: "示例" }
    ]
  };

  /* ============================================================
     helpers
     ============================================================ */
  function toast(msg) {
    const host = $(".toast-host") || (() => { const d = document.createElement("div"); d.className = "toast-host"; document.body.appendChild(d); return d; })();
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  const NAMES = {
    furnace: ["丹房", "Furnace"], codex: ["模型谱", "Codex"], recipes: ["丹方", "Recipes"],
    materials: ["灵材", "Materials"], methods: ["功法", "Methods"], market: ["丹市", "Market"], logs: ["天机录", "Logs"]
  };

  function modelById(id) { return MODELS.find(m => m.id === id) || MODELS[0]; }

  function badgeClass(b) {
    if (b === "新晋" || b === "主力" || b === "官方") return "badge--jade";
    if (b === "旗舰" || b === "高性价比" || b === "热门") return "badge--hot";
    if (b === "实验") return "badge--vio";
    return "";
  }

  /* ============================================================
     seed dataset (demo)
     ============================================================ */
  function seedMaterials() {
    const palettes = [
      ["#0a2c2b", "#2fe0b4", "#ffe1a8"], ["#1a1030", "#8b7cff", "#63d8ff"],
      ["#2a1608", "#ff8a4a", "#ffd27a"], ["#062028", "#63d8ff", "#a8fff0"],
      ["#241026", "#ff6b9d", "#ffd6a8"], ["#0d1f10", "#7df0a0", "#e6ffb0"]
    ];
    const caps = [
      "青绿山水，云雾，远山，工笔设色", "夜山，飞檐，灯火，赛博国风", "人物半身，侧光，素色背景，细节清晰",
      "远景，空镜，薄雾，留白构图", "材质特写，布料，金线，暗背景", "光效，丁达尔，尘埃，电影感"
    ];
    const angles = ["正面", "侧面 45°", "背面", "俯视", "仰视", "特写", "中景", "全景"];
    for (let i = 0; i < 24; i++) {
      const p = palettes[i % palettes.length];
      const a1 = 20 + ((i * 37) % 300);
      app.materials.push({
        id: "demo-" + i,
        demo: true,
        bg: `radial-gradient(circle at ${30 + (i * 13) % 50}% ${28 + (i * 7) % 45}%, ${p[2]} 0%, ${p[1]} 26%, ${p[0]} 72%)`,
        caption: "xu_style，" + caps[i % caps.length] + "，" + angles[i % angles.length],
        label: String(i + 1).padStart(2, "0")
      });
    }
  }

  function datasetSummary() {
    return { count: app.materials.length, h: 1024, w: 1024 };
  }

  /* ============================================================
     render: codex
     ============================================================ */
  function renderCodex() {
    const el = $("#view-codex");
    if (!el) return;
    const mods = [["all", "全部", MODELS.length], ["image", "图像", MODELS.filter(m => m.mod === "image").length],
      ["edit", "编辑", MODELS.filter(m => m.mod === "edit").length], ["video", "视频", MODELS.filter(m => m.mod === "video").length],
      ["audio", "音频", MODELS.filter(m => m.mod === "audio").length], ["llm", "语言", MODELS.filter(m => m.mod === "llm").length]];

    el.innerHTML = `
      <div class="view-head">
        <div class="view-head__left">
          <span class="eyebrow">CODEX / 万模一炉</span>
          <h1>模型谱 · 可训 LoRA 的炉鼎</h1>
          <p>从 <b>${FACTS.models}</b> 个可二次训练的模型里挑一尊炉鼎。图像、编辑、视频、音频、语言，五类丹炉各有火性：<b>SDXL 最稳、FLUX 最像、Qwen 最懂中文、Z-Image 最省、Wan 最能动</b>。评分是社区口碑的编辑化总结，不是基准测试。</p>
        </div>
        <div class="view-head__aside"><b>${FACTS.models}</b><span>MODELS · 2026-10</span></div>
      </div>
      <div class="filter-bar">
        ${mods.map(([k, label, n]) => `<button class="tab ${app.filter === k ? "is-on" : ""}" data-filter="${k}">${label}<i>${n}</i></button>`).join("")}
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>
          <input id="codex-search" placeholder="搜模型 / 厂商 / 关键词…" value="${esc(app.search)}" />
        </div>
      </div>
      <div class="grid" id="codex-grid"></div>
      <div class="callout">
        <div class="callout__icon">※</div>
        <p><b>选炉鼎的三个硬约束：</b>① 必须下「可训练的原版权重」（Base / RAW / dev），推理量化版别拿来训；② 同一世代的 LoRA 才能通用；③ 先确认训练器支持这一族（见「功法」页的工具矩阵），<b>加载不报错不代表训对了</b>。</p>
      </div>
    `;
    renderCodexGrid();
    el.querySelectorAll("[data-filter]").forEach(b => b.addEventListener("click", () => {
      app.filter = b.dataset.filter;
      el.querySelectorAll("[data-filter]").forEach(x => x.classList.toggle("is-on", x === b));
      renderCodexGrid();
    }));
    const search = el.querySelector("#codex-search");
    search.addEventListener("input", () => { app.search = search.value.trim(); renderCodexGrid(); });
  }

  function renderCodexGrid() {
    const grid = $("#codex-grid");
    if (!grid) return;
    const q = app.search.toLowerCase();
    const list = MODELS.filter(m => {
      const okMod = app.filter === "all" || m.mod === app.filter;
      const hay = (m.name + m.org + m.params + m.tags.join("") + m.trainers.join("") + m.note).toLowerCase();
      return okMod && (!q || hay.includes(q));
    });
    grid.innerHTML = list.map(m => {
      const md = MODS[m.mod] || MODS.image;
      const ratings = m.ratings.map(([k, v]) => `
        <div class="meter__item"><span>${k}</span>
          <div class="meter__dots">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= v ? "on" : ""}"></i>`).join("")}</div>
        </div>`).join("");
      return `
      <article class="model-card ${m.hot ? "is-hot" : ""}" data-mod="${m.mod}" data-id="${m.id}">
        <div class="model-card__head">
          <div class="model-card__sigil">${md.sigil}</div>
          <div class="model-card__title"><h3 title="${esc(m.name)}">${m.name}</h3><span title="${esc(m.org + " · " + m.params)}">${m.org} · ${m.params}</span></div>
        </div>
        <div class="model-card__chips">
          <span class="badge ${badgeClass(m.badge)}">${m.badge || "可训"}</span>
          ${m.hot ? '<span class="badge badge--hot">热门</span>' : ""}
          <span class="chip">灵阶 <b>${m.rank}</b></span>
          <span class="chip chip--vram">显存 <b>${m.vram}</b></span>
          <span class="chip">${m.trainers[0]}</span>
        </div>
        <p class="model-card__note">${m.note}</p>
        <div class="meter">${ratings}</div>
        <div class="model-card__foot">
          <span class="model-card__trainer"><b>${m.trainers.slice(0, 3).join(" · ")}</b></span>
          <button class="mini-btn" data-pick="${m.id}">入炉 →</button>
        </div>
      </article>`;
    }).join("") || `<div class="empty" style="grid-column:1/-1">没有匹配的炉鼎。换个关键词，或切到「全部」。</div>`;

    grid.querySelectorAll("[data-pick]").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      selectModel(b.dataset.pick, true);
    }));
    grid.querySelectorAll(".model-card").forEach(card => {
      card.addEventListener("mousemove", e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ============================================================
     render: recipes
     ============================================================ */
  function renderRecipes() {
    const el = $("#view-recipes");
    if (!el) return;
    el.innerHTML = `
      <div class="view-head">
        <div class="view-head__left">
          <span class="eyebrow">RECIPES / 有据可依的丹方</span>
          <h1>丹方 · 别人验证过的起手式</h1>
          <p>每一张丹方都注明出处：官方文档、训练器示例或社区实践。<b>先照方抓药跑通一次</b>，再按自己的灵材微调。注意：rank、alpha、LR、optimizer、shift 是一整套配方，单改一个数往往等于换方子。</p>
        </div>
        <div class="view-head__aside"><b>${RECIPES.length}</b><span>RECIPES</span></div>
      </div>
      <div class="filter-bar">
        <button class="tab is-on" data-rfilter="all">全部<i>${RECIPES.length}</i></button>
        ${["image", "video", "audio", "llm"].map(k => `<button class="tab" data-rfilter="${k}">${MODS[k].label}<i>${RECIPES.filter(r => r.mod === k).length}</i></button>`).join("")}
      </div>
      <div class="recipe-grid" id="recipe-grid"></div>
      <div class="callout"><div class="callout__icon">!</div><p><b>关于「效果」：</b>本页参数来自官方示例与社区公开实践，不是穷举调参的结论。不同数据集、分辨率、显卡与训练器版本都会改变结果；先跑小周天（低步数/低分辨率）验证方向，再投入整夜。</p></div>
    `;
    renderRecipeGrid("all");
    el.querySelectorAll("[data-rfilter]").forEach(b => b.addEventListener("click", () => {
      el.querySelectorAll("[data-rfilter]").forEach(x => x.classList.toggle("is-on", x === b));
      renderRecipeGrid(b.dataset.rfilter);
    }));
  }

  function renderRecipeGrid(filter) {
    const grid = $("#recipe-grid");
    if (!grid) return;
    const list = RECIPES.filter(r => filter === "all" || r.mod === filter);
    grid.innerHTML = list.map(r => {
      const m = modelById(r.modelId);
      return `
      <article class="recipe">
        <div class="recipe__head">
          <div class="recipe__glyph">${r.glyph}</div>
          <div><h3>${r.title}</h3><span>${r.sub} · 炉鼎 ${esc(m.name)}</span></div>
          <span class="badge ${badgeClass(r.badge)} recipe__tag">${r.badge}</span>
        </div>
        <div class="recipe__params">
          <div><i>RANK / ALPHA</i><b>${r.params.rank}${r.params.alpha !== "—" ? " / " + r.params.alpha : ""}</b></div>
          <div><i>LEARNING RATE</i><b>${r.params.lr}</b></div>
          <div><i>STEPS</i><b>${r.params.steps}</b></div>
          <div><i>RESOLUTION</i><b>${r.params.res}</b></div>
          <div><i>OPTIMIZER</i><b>${r.params.opt}</b></div>
          <div><i>TYPE</i><b>${MODS[r.mod].label} LoRA</b></div>
        </div>
        <p class="recipe__note">${r.note}</p>
        ${r.warn ? `<div class="recipe__warn">⚠ ${r.warn}</div>` : ""}
        <div class="recipe__foot">
          <span class="recipe__src">↗ ${esc(r.src)}</span>
          <button class="mini-btn" data-apply="${r.id}">套用此方</button>
        </div>
      </article>`;
    }).join("");
    grid.querySelectorAll("[data-apply]").forEach(b => b.addEventListener("click", () => applyRecipe(b.dataset.apply)));
  }

  function applyRecipe(id) {
    const r = RECIPES.find(x => x.id === id);
    if (!r) return;
    const num = s => { const m = String(s).replace(/[^\d.]/g, " ").trim().split(/\s+/).map(Number).filter(n => n > 0); return m.length ? m[0] : null; };
    const patch = { modelId: r.modelId };
    const rank = num(r.params.rank); if (rank) { patch.rank = Math.min(128, rank); patch.alpha = rank; }
    const lr = parseFloat(String(r.params.lr).replace(/[^\d.e-]/g, "")) || null;
    if (lr && lr > 1e-6 && lr < 1e-2) patch.lr = lr;
    const steps = num(r.params.steps); if (steps) patch.steps = Math.min(8000, Math.max(200, steps));
    selectModel(r.modelId, false, patch);
    setView("furnace");
    toast("已套用丹方：「" + r.title + "」");
  }

  /* ============================================================
     render: materials
     ============================================================ */
  function renderMaterials() {
    const el = $("#view-materials");
    if (!el) return;
    el.innerHTML = `
      <div class="view-head">
        <div class="view-head__left">
          <span class="eyebrow">MATERIALS / 灵材为基</span>
          <h1>灵材 · 数据的质地决定丹的质地</h1>
          <p>一个 LoRA 学不学得会，<b>七成在数据</b>。先定一个目标（人/风格/产品/运动），再去重、去水印、多角度，标注时把「不变的」写进 caption，把「可变的」留给提示词。下面是演示数据集，可拖入本地图片替换。</p>
        </div>
        <div class="view-head__aside"><b id="mat-head-count">${app.materials.length}</b><span>PIECES · 演示</span></div>
      </div>
      <div class="mat-layout">
        <div>
          <label class="dropzone" id="dropzone">
            <input type="file" id="mat-input" accept="image/*" multiple />
            <div class="dropzone__glyph">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.3">
                <rect x="6" y="10" width="36" height="28" rx="3"/><circle cx="16" cy="19" r="3"/>
                <path d="M8 33l10-9 7 6 5-4 10 7"/><path d="M24 4v8M20 8l4-4 4 4"/>
              </svg>
            </div>
            <div class="dropzone__text">
              <h3>投放灵材</h3>
              <p>拖入图片或点击选择 · <b>仅在本地浏览器预览，不上传任何数据</b></p>
            </div>
            <div class="dropzone__meta"><span>JPG / PNG / WEBP</span><span>建议 ≤ 4096px</span><span>去重 · 去水印</span></div>
          </label>

          <div class="mat-grid" id="mat-grid"></div>
          <div class="mat-tipbar">
            <span class="mat-tipbar__item">◇ 已按触发词自动前缀标注</span>
            <span class="mat-tipbar__item">◇ 建议再补 6–10 张特写与背面</span>
            <button class="mini-btn" data-nav="furnace">带着灵材去开炉 →</button>
          </div>
        </div>
        <aside>
          <div class="side-card">
            <h4>丹材参数 <i>SETTINGS</i></h4>
            <label>触发词 / TRIGGER</label>
            <input type="text" id="mat-trigger" value="xu_style" maxlength="40" />
            <label>目标分辨率 / RESOLUTION</label>
            <input type="text" id="mat-res" value="1024 × 1024 · 分桶" />
            <label>标注方式 / CAPTION</label>
            <input type="text" value="自然语言 + 触发词前缀" readonly />
            <div class="field__note" style="margin-top:10px">触发词要足够生僻，避免与基座已有概念冲突。改完会自动同步到丹方。</div>
          </div>
          <div class="side-card">
            <h4>丹材体检 <i>HEALTH</i></h4>
            <div class="health">
              <div class="health__row"><i></i>有效素材<b id="h-count">${app.materials.length} 张</b></div>
              <div class="health__row"><i></i>分辨率达标<b>100%</b></div>
              <div class="health__row"><i class="warn"></i>疑似重复<b class="warn" id="h-dup">2 张</b></div>
              <div class="health__row"><i></i>标注覆盖<b>100%</b></div>
              <div class="health__row"><i class="warn"></i>建议补充<b class="warn">背面 / 特写</b></div>
            </div>
          </div>
          <div class="side-card">
            <h4>标注预览 <i>CAPTIONS</i></h4>
            <div class="caption-list" id="caption-list"></div>
          </div>
        </aside>
      </div>
      <div class="section-sep"><span>DATASET PRINCIPLES</span></div>
      <div class="checklist">
        ${DATASET_TIPS.map(([k, v]) => `<li><b>${k}</b> — ${v}</li>`).join("")}
      </div>
    `;
    renderMatGrid();
    renderCaptions();

    const input = $("#mat-input");
    const dz = $("#dropzone");
    input.addEventListener("change", () => addFiles(input.files));
    ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("is-over"); }));
    ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("is-over"); }));
    dz.addEventListener("drop", e => { if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); });

    $("#mat-trigger").addEventListener("input", e => {
      const t = e.target.value.trim() || "xu_style";
      const dt = $("#ds-trigger"); if (dt) dt.innerHTML = "触发词：<b>" + esc(t) + "</b>";
      app.trigger = t;
    });
  }

  function renderMatGrid() {
    const grid = $("#mat-grid");
    if (!grid) return;
    grid.innerHTML = app.materials.map(m => `
      <div class="mat" data-mid="${m.id}" title="${esc(m.caption)}">
        ${m.src ? `<img src="${m.src}" alt="${esc(m.caption)}" loading="lazy"/>` : `<div style="position:absolute;inset:0;background:${m.bg}"></div><div class="mat__ph">${esc(m.label || "")}</div>`}
        <div class="mat__cap">${esc(m.caption)}</div>
        <button class="mat__x" data-del="${m.id}" title="移除">×</button>
      </div>`).join("");
    grid.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      const id = b.dataset.del;
      const m = app.materials.find(x => x.id === id);
      if (m && m.src) URL.revokeObjectURL(m.src);
      app.materials = app.materials.filter(x => x.id !== id);
      renderMatGrid(); renderCaptions(); syncDatasetCount();
      const hc = $("#h-count"); if (hc) hc.textContent = app.materials.length + " 张";
      const mh = $("#mat-head-count"); if (mh) mh.textContent = app.materials.length;
    }));
  }

  function renderCaptions() {
    const list = $("#caption-list");
    if (!list) return;
    list.innerHTML = app.materials.slice(0, 14).map((m, i) =>
      `<div><span>${String(i + 1).padStart(2, "0")}</span><span>${esc(m.caption)}</span></div>`).join("") ||
      `<div class="empty">尚未投放灵材</div>`;
  }

  function addFiles(files) {
    const arr = Array.from(files || []).filter(f => f.type.startsWith("image/"));
    if (!arr.length) { toast("请选择图片文件"); return; }
    arr.slice(0, 48 - app.materials.length).forEach((f, i) => {
      const url = URL.createObjectURL(f);
      app.materials.push({
        id: "up-" + Date.now() + "-" + i,
        src: url,
        caption: "xu_style，" + f.name.replace(/\.[^.]+$/, ""),
        label: ""
      });
    });
    renderMatGrid(); renderCaptions(); syncDatasetCount();
    const hc = $("#h-count"); if (hc) hc.textContent = app.materials.length + " 张";
    const mh = $("#mat-head-count"); if (mh) mh.textContent = app.materials.length;
    toast("已入炉 " + arr.length + " 张灵材（本地预览）");
  }

  function syncDatasetCount() {
    const d = $("#ds-count"); if (d) d.textContent = app.materials.length;
    const c = $("#ds-note");
    if (c && app.materials.length < 8) c.innerHTML = "灵材偏少，建议至少 <b>20 张</b>；少于 8 张容易只记住单张的脸/背景。";
  }

  /* ============================================================
     render: methods
     ============================================================ */
  function renderMethods() {
    const el = $("#view-methods");
    if (!el) return;
    el.innerHTML = `
      <div class="view-head">
        <div class="view-head__left">
          <span class="eyebrow">METHODS / 心法与器</span>
          <h1>功法 · 从 LoRA 到工具链</h1>
          <p>训练范式决定「怎么学」，工具链决定「能不能学」。这一页把主流低秩方法与 <b>${TOOLS.length}</b> 个训练器放在一起，并附上最容易踩的坑。真实训练时，让你的模型族去选工具，而不是让工具勉强支持模型。</p>
        </div>
        <div class="view-head__aside"><b>${TOOLS.length}</b><span>TRAINERS</span></div>
      </div>

      <div class="section-sep"><span>低秩心法 · LOW-RANK METHODS</span></div>
      <div class="method-grid">
        ${METHODS.map(m => `
          <article class="method-card">
            <div class="method-card__top"><b>${m.name}</b><i>${m.en}</i></div>
            <p>${m.desc}</p>
            <div class="method-card__meta">${m.meta.map(t => `<span class="chip">${t}</span>`).join("")}</div>
          </article>`).join("")}
      </div>

      <div class="section-sep"><span>工具链 · TRAINER MATRIX</span></div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>训练器</th><th>形态</th><th>擅长</th><th>局限</th><th>仓库</th></tr></thead>
          <tbody>
            ${TOOLS.map(t => `
              <tr>
                <td><b>${t.name}</b><small>${t.by} · ${t.tag}</small></td>
                <td><span class="pill ${/GUI/i.test(t.type) ? "pill--gui" : "pill--cli"}">${t.type}</span></td>
                <td>${t.strength}</td>
                <td>${t.limit}</td>
                <td><a class="market-card__link" href="https://${esc(t.url)}" target="_blank" rel="noopener">↗ ${esc(t.url.split("/").slice(-2).join("/"))}</a></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>

      <div class="section-sep"><span>避坑 · PITFALLS</span></div>
      <div class="checklist">
        ${PITFALLS.map(([k, v]) => `<li><b>${k}</b> — ${v}</li>`).join("")}
      </div>

      <div class="section-sep"><span>资料来源 · SOURCES</span></div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>资料</th><th>发布方</th><th>要点</th></tr></thead>
          <tbody>
            ${SOURCES.map(s => `
              <tr>
                <td><a class="market-card__link" href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a></td>
                <td>${esc(s.p)}</td>
                <td>${esc(s.note)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <p class="modal__fine" style="text-align:left;margin-top:14px">调研快照：${FACTS.date}。平台数据为第三方估计，模型许可与可训性请以官方模型卡为准。</p>
    `;
  }

  /* ============================================================
     render: market
     ============================================================ */
  function renderMarket() {
    const el = $("#view-market");
    if (!el) return;
    el.innerHTML = `
      <div class="view-head">
        <div class="view-head__left">
          <span class="eyebrow">MARKET / 丹市</span>
          <h1>丹市 · 去哪儿下模型、发丹纹</h1>
          <p>模型社区是 LoRA 的流通市场：找基座、找参考 LoRA、发自己的丹纹，或者在云端租一炉火。国内与海外的生态各有深浅。国风素材看国内站，前沿基座看官方仓库。</p>
        </div>
        <div class="view-head__aside"><b>${PLATFORMS.length}</b><span>PLATFORMS</span></div>
      </div>
      <div class="market-grid">
        ${PLATFORMS.map(p => `
          <article class="market-card">
            <div class="market-card__top">
              <div class="market-card__logo">${esc(p.sigil)}</div>
              <div><h3>${esc(p.name)}</h3><span>${esc(p.kind)}</span></div>
            </div>
            <div class="market-card__metric"><b>${esc(p.metric)}</b> ${esc(p.metricLabel)}</div>
            <p>${p.desc}</p>
            <div class="market-card__foot">
              <div class="market-card__tags">${p.tags.map(t => `<span class="chip">${esc(t)}</span>`).join("")}</div>
              <a class="market-card__link" href="https://${esc(p.url)}" target="_blank" rel="noopener">↗ ${esc(p.url)}</a>
            </div>
          </article>`).join("")}
      </div>
      <div class="callout">
        <div class="callout__icon">!</div>
        <p><b>三个提醒：</b>① 平台上的模型可能带商用限制或内容分级，下载前看许可；② 云端训练的隐私条款与「是否可用于商用」是两件事；③ 真人形象/音色需要授权——基座许可只解决「模型能不能用」，不解决「这张脸/这把声音能不能用」。</p>
      </div>
      <div class="section-sep"><span>HOW TO CHOOSE · 怎么选</span></div>
      <div class="checklist">
        <li><b>只想快速试效果</b> —— 先用 LiblibAI / TensorArt 的云端训练跑一炉，10–50 张图即可。</li>
        <li><b>想长期炼丹、控成本</b> —— 本地装 ai-toolkit 或 musubi-tuner，模型去 Hugging Face / ModelScope 下官方权重。</li>
        <li><b>要商用</b> —— 优先 Apache-2.0 / MIT 的基座（如 SDXL、Chroma、Wan、ACE-Step），并核对导出 Adapter 的许可。</li>
        <li><b>找参考 LoRA</b> —— Civitai 存量最大、Liblib 国风最深；下载后先看作者推荐的权重区间与触发词。</li>
      </div>
    `;
  }

  /* ============================================================
     render: logs
     ============================================================ */
  function renderLogs() {
    const el = $("#view-logs");
    if (!el) return;
    el.innerHTML = `
      <div class="view-head">
        <div class="view-head__left">
          <span class="eyebrow">LOGS / 天机录</span>
          <h1>天机录 · 每一炉都留痕</h1>
          <p>真实炼丹最重要的一步不是开炉，是<b>记录</b>：模型 revision、训练器 commit、标注规范、超参、loss 曲线。下面是本炉的实时日志与历史丹纹。</p>
        </div>
        <div class="view-head__aside"><b id="log-count">0</b><span>LINES</span></div>
      </div>
      <div class="logs-layout">
        <div class="terminal">
          <div class="terminal__bar"><i></i><i></i><i></i><span>xuanforge://furnace/log</span>
            <button class="mini-btn" id="log-export" style="margin-left:auto">导出日志</button>
          </div>
          <div class="terminal__body" id="terminal-body"></div>
        </div>
        <aside>
          <div class="side-card">
            <h4>丹纹档案 <i>RUNS</i></h4>
            <div class="run-list" id="run-list"></div>
          </div>
          <div class="side-card">
            <h4>炉况 <i>STATUS</i></h4>
            <div class="health">
              <div class="health__row"><i></i>状态<b id="log-status">待开炉</b></div>
              <div class="health__row"><i></i>已记录行数<b id="log-count-2">0</b></div>
              <div class="health__row"><i></i>模拟速度<b id="log-speed">4×</b></div>
            </div>
          </div>
        </aside>
      </div>
    `;
    renderTerminal();
    renderRuns();
    const btn = $("#log-export");
    if (btn) btn.addEventListener("click", exportLogs);
  }

  function renderTerminal() {
    const body = $("#terminal-body");
    if (!body) return;
    const logs = window.XFTrain ? window.XFTrain.getLogs() : [];
    body.innerHTML = logs.length
      ? logs.map(l => `<div class="log-line log-line--${l.level === "ok" ? "ok" : l.level === "warn" ? "warn" : l.level === "err" ? "err" : "sys"}">
          <time>${esc(l.t)}</time><span class="lv">[${l.level.toUpperCase()}]</span><span class="msg">${esc(l.msg)}</span></div>`).join("")
      : `<div class="empty">天机未启。<br/>回到丹房，开一炉火。</div>`;
    body.scrollTop = body.scrollHeight;
    const c = $("#log-count"); if (c) c.textContent = logs.length;
    const c2 = $("#log-count-2"); if (c2) c2.textContent = logs.length;
    const st = $("#log-status");
    if (st && window.XFTrain) {
      const ph = window.XFTrain.state.phase;
      st.textContent = { idle: "待开炉", running: "炉火正盛", paused: "火种封存", done: "丹成" }[ph] || ph;
    }
  }

  function renderRuns() {
    const list = $("#run-list");
    if (!list) return;
    list.innerHTML = app.runs.map(r => `
      <div class="run-item">
        <div class="run-item__top"><b>${esc(r.name)}</b><span>${esc(r.time)}</span></div>
        <div class="run-item__meta"><span>${esc(r.model)}</span><span>rank <em>${esc(String(r.rank))}</em></span><span>${r.steps} 步</span><span>loss ${r.loss}</span></div>
      </div>`).join("");
  }

  function exportLogs() {
    const logs = window.XFTrain ? window.XFTrain.getLogs() : [];
    const txt = logs.map(l => `${l.t} [${l.level}] ${l.msg}`).join("\n") || "(empty)";
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "xuanforge-log-" + Date.now() + ".txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast("日志已导出");
  }

  /* ============================================================
     router
     ============================================================ */
  function setView(name) {
    if (!NAMES[name]) name = "furnace";
    app.view = name;
    document.body.dataset.view = name;
    $$(".view").forEach(v => { v.hidden = v.id !== "view-" + name; });
    $$(".rail__item").forEach(b => b.classList.toggle("is-active", b.dataset.nav === name));
    const crumb = $("#crumb");
    if (crumb) crumb.textContent = NAMES[name][0] + " / " + NAMES[name][1];

    if (!app.rendered[name]) {
      app.rendered[name] = true;
      if (name === "codex") renderCodex();
      if (name === "recipes") renderRecipes();
      if (name === "materials") renderMaterials();
      if (name === "methods") renderMethods();
      if (name === "market") renderMarket();
      if (name === "logs") renderLogs();
    }
    if (name === "logs") { renderTerminal(); renderRuns(); }
    if (name === "materials") { renderMatGrid(); renderCaptions(); }
    if (name === "furnace" && window.FX) setTimeout(() => window.FX.resize(), 60);
    try { history.replaceState(null, "", "#" + name); } catch (e) {}
  }

  /* ============================================================
     model selection & panel
     ============================================================ */
  function selectModel(id, goFurnace, extraPatch) {
    const m = modelById(id);
    const rankNum = (String(m.rank).match(/\d+/) || [32])[0];
    const rank = Math.min(128, Math.max(4, parseInt(rankNum, 10)));
    const stepsByMod = { image: 2400, edit: 2000, video: 1200, audio: 800, llm: 600 };
    const patch = Object.assign({
      modelId: id, rank, alpha: rank,
      steps: stepsByMod[m.mod] || 2000
    }, extraPatch || {});

    const cfg = window.XFTrain.getConfig();
    window.XFTrain.setConfig(Object.assign({}, cfg, patch));

    // panel picker
    $("#pick-name").textContent = m.name;
    $("#pick-meta").textContent = m.org + " · 可训 LoRA · " + m.vram;
    $("#pick-modality").textContent = (MODS[m.mod] || MODS.image).sigil;
    $("#pick-modality").style.color = m.mod === "video" ? "#c3b4ff" : m.mod === "audio" ? "#f5c96b" : m.mod === "llm" ? "#63d8ff" : "#3ef0c0";

    // dataset guidance
    const note = {
      image: "建议 20–50 张主体清晰、去重、多角度的素材。",
      edit: "需要「原图 + 指令 + 目标图」三元组；只放人像学不会编辑。",
      video: "按镜头边界切 3–10 秒片段，保留连贯运动与帧率信息。",
      audio: "音乐 30 秒–4 分钟成段；人声 ≥1 分钟干净录音。",
      llm: "500–5000 条高质量指令/对话样本，留同分布验证集。"
    }[m.mod] || "";
    const dn = $("#ds-note"); if (dn) dn.textContent = note;

    const res = { image: "1024px · 分桶", edit: "1024px · 指令对", video: "480p · 81 帧", audio: "44.1kHz · 成段", llm: "4k tokens · packing" }[m.mod];
    const dr = $("#ds-res"); if (dr) dr.textContent = res;
    const dt = $("#ds-trigger"); if (dt) dt.innerHTML = "触发词：<b>" + esc(m.trigger || "xu_style") + "</b>";
    window.XFTrain.setConfig(Object.assign({}, window.XFTrain.getConfig(), { res }));

    // sync controls
    syncControls();
    if (goFurnace) { setView("furnace"); toast("炉鼎已换：" + m.name); }
    try { localStorage.setItem("xf.model", id); } catch (e) {}
  }

  function syncControls() {
    const cfg = window.XFTrain.getConfig();
    const set = (id, v) => { const el = $("#" + id); if (el) el.value = v; };
    set("in-rank", cfg.rank);
    set("in-alpha", cfg.alpha);
    set("in-steps", cfg.steps);
    set("in-batch", cfg.batch);
    const lrSlider = $("#in-lr");
    if (lrSlider) lrSlider.value = String(clamp((Math.log10(cfg.lr) + 6) / 3.3 * 100, 0, 100));
    $$("input[type=range]").forEach(updateSliderFill);
    updateOutputs();
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function updateSliderFill(el) {
    if (!el || el.type !== "range") return;
    const min = +el.min, max = +el.max, v = +el.value;
    el.style.setProperty("--p", ((v - min) / (max - min) * 100) + "%");
  }

  function lrFromSlider(v) {
    return Math.pow(10, -6 + (v / 100) * 3.3);
  }
  function fmtLR(v) {
    return v >= 1e-3 ? v.toExponential(1) : v.toExponential(1);
  }

  function updateOutputs() {
    const cfg = window.XFTrain.getConfig();
    const rk = $("#in-rank"), al = $("#in-alpha"), lr = $("#in-lr"), st = $("#in-steps"), ba = $("#in-batch");
    const val = (id) => ($("#" + id) ? +$("#" + id).value : null);
    const patch = {
      rank: val("in-rank"), alpha: val("in-alpha"),
      lr: lrFromSlider(val("in-lr")),
      steps: val("in-steps"), batch: val("in-batch")
    };
    // keep alpha/rank sanity display
    const out = (k, v) => { const el = document.querySelector(`[data-out="${k}"]`); if (el) el.textContent = v; };
    out("rank", patch.rank);
    out("alpha", patch.alpha);
    out("lr", fmtLR(patch.lr));
    out("steps", patch.steps);
    out("batch", patch.batch);
    window.XFTrain.setConfig(Object.assign({}, cfg, patch));
  }

  /* ---------------- picker ---------------- */
  function renderPicker() {
    const list = $("#picker-list");
    if (!list) return;
    const q = app.pickerSearch.toLowerCase();
    const items = MODELS.filter(m => {
      const okMod = app.pickerMod === "all" || m.mod === app.pickerMod;
      return okMod && (!q || (m.name + m.org + m.tags.join("")).toLowerCase().includes(q));
    });
    const cfg = window.XFTrain.getConfig();
    list.innerHTML = items.map(m => `
      <button class="picker-item ${m.id === cfg.modelId ? "is-on" : ""}" data-pick="${m.id}" role="option">
        <span class="picker-item__mod">${MODS[m.mod].sigil}</span>
        <span class="picker-item__main"><b>${esc(m.name)}</b><i>${esc(m.org)} · ${esc(m.params)}</i></span>
        <span class="picker-item__tag">${esc(m.vram)}</span>
      </button>`).join("") || `<div class="empty">没有匹配的炉鼎</div>`;
    list.querySelectorAll("[data-pick]").forEach(b => b.addEventListener("click", () => {
      selectModel(b.dataset.pick, false);
      closePicker();
      toast("炉鼎已换：" + modelById(b.dataset.pick).name);
    }));
  }

  function openPicker() {
    const pop = $("#picker-pop");
    if (!pop) return;
    pop.hidden = false;
    renderPicker();
    const s = $("#model-search"); if (s) { s.value = ""; app.pickerSearch = ""; setTimeout(() => s.focus(), 30); }
  }
  function closePicker() { const pop = $("#picker-pop"); if (pop) pop.hidden = true; }

  /* ============================================================
     panel wiring
     ============================================================ */
  function bindPanel() {
    $$("input[type=range]").forEach(el => {
      if (el.id === "vol") return;
      updateSliderFill(el);
      el.addEventListener("input", () => { updateSliderFill(el); updateOutputs(); });
    });
    $("#technique-seg").addEventListener("click", e => {
      const b = e.target.closest("[data-tech]");
      if (!b) return;
      $$("#technique-seg button").forEach(x => x.classList.toggle("is-on", x === b));
      window.XFTrain.setConfig(Object.assign({}, window.XFTrain.getConfig(), { technique: b.dataset.tech }));
    });
    ["fp8", "ckpt", "blockswap", "sample"].forEach(k => {
      const el = $("#sw-" + k);
      if (!el) return;
      el.addEventListener("change", () => {
        window.XFTrain.setConfig(Object.assign({}, window.XFTrain.getConfig(), { [k]: el.checked }));
      });
    });
    $("#model-picker").addEventListener("click", e => { e.stopPropagation(); const pop = $("#picker-pop"); pop.hidden ? openPicker() : closePicker(); });
    $("#picker-pop").addEventListener("click", e => e.stopPropagation());
    $("#model-search").addEventListener("input", e => { app.pickerSearch = e.target.value.trim(); renderPicker(); });
    $$("#picker-tabs button").forEach(b => b.addEventListener("click", () => {
      app.pickerMod = b.dataset.mod;
      $$("#picker-tabs button").forEach(x => x.classList.toggle("is-on", x === b));
      renderPicker();
    }));
    document.addEventListener("click", () => closePicker());
    $("#btn-collapse").addEventListener("click", () => {
      const closed = document.body.dataset.panel === "closed";
      document.body.dataset.panel = closed ? "open" : "closed";
      if (window.FX) setTimeout(() => window.FX.resize(), 80);
    });
  }


  /* ============================================================
     completion modal
     ============================================================ */
  function onComplete(sum) {
    const m = sum.model;
    const badge = { image: "IMAGE LORA", edit: "EDIT LORA", video: "VIDEO LORA", audio: "AUDIO LORA", llm: "LLM ADAPTER" }[m.mod] || "LORA";
    const slug = m.id.replace(/[^a-z0-9]+/gi, "_");
    const trig = (app.trigger || m.trigger || "xu_style").replace(/\s+/g, "_");
    $("#done-sub").textContent = m.name + " · " + trig + " · rank " + sum.rank + (sum.trial ? " · 试炼" : "");
    $("#lora-badge").textContent = badge;
    $("#lora-file").textContent = (trig + "_" + slug + "_r" + sum.rank + ".safetensors").slice(0, 52);
    $("#lora-rank").textContent = sum.rank;
    $("#lora-size").textContent = sum.size + " MB";
    $("#lora-steps").textContent = sum.steps;
    $("#lora-loss").textContent = sum.loss;
    const art = document.querySelectorAll(".lora-card__art .art");
    if (art.length === 3) {
      const modHue = { image: 168, edit: 190, video: 262, audio: 42, llm: 196 }[m.mod] || 168;
      art[0].style.background = `radial-gradient(circle at 32% 28%, hsl(${modHue + 20} 90% 72%), hsl(${modHue} 70% 34%) 48%, #0a0b10)`;
      art[1].style.background = `linear-gradient(140deg, hsl(${modHue - 20} 60% 20%), hsl(${modHue + 30} 90% 62%) 55%, hsl(${modHue} 50% 8%))`;
      art[2].style.background = `conic-gradient(from 210deg, hsl(${modHue + 60} 80% 65%), hsl(${modHue - 40} 50% 22%), hsl(${modHue + 10} 90% 55%), #0a0f19)`;
    }
    $("#modal-done").hidden = false;

    app.runs.unshift({
      name: trig, model: m.name, rank: sum.rank, steps: sum.steps,
      loss: sum.loss, size: sum.size,
      time: new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-"),
      tag: sum.trial ? "试炼" : "新炼"
    });
    app.runs = app.runs.slice(0, 8);
    app.rendered.logs = false;
    if (app.view === "logs") renderLogs();
    try { localStorage.setItem("xf.runs", JSON.stringify(app.runs.slice(0, 8))); } catch (e) {}
  }

  /* ============================================================
     init
     ============================================================ */
  function init() {
    seedMaterials();

    // canvas fx
    const scene = $("#scene");
    const backCv = $("#fx-back"), frontCv = $("#fx-front"), svg = $("#furnace-svg");
    window.FX = window.FXFurnace.create(backCv, frontCv, svg, scene);
    window.FX.start();

    // ticks on outer ring
    const ticks = $("#ticks");
    if (ticks) {
      let html = "";
      for (let i = 0; i < 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        const major = i % 9 === 0;
        const r1 = 214, r2 = major ? 224 : 219;
        const x1 = 260 + Math.cos(a) * r1, y1 = 262 + Math.sin(a) * r1;
        const x2 = 260 + Math.cos(a) * r2, y2 = 262 + Math.sin(a) * r2;
        html += `<line class="${major ? "major" : ""}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
      }
      ticks.innerHTML = html;
    }

    window.XFTrain.init({ onComplete });
    bindPanel();

    // picker initial
    renderPicker();

    // nav (delegated: rail + dynamically rendered buttons)
    document.addEventListener("click", e => {
      const b = e.target.closest("[data-nav]");
      if (b) setView(b.dataset.nav);
    });

    // stage buttons
    $("#btn-ignite").addEventListener("click", () => {
      const ph = window.XFTrain.state.phase;
      if (ph === "running" || ph === "paused") { window.XFTrain.pause(); if (ph === "paused") window.XFTrain.resume(); return; }
      if (app.materials.length === 0) {
        toast("灵材为空 · 先投材再开炉");
        setView("materials");
        return;
      }
      if (ph === "done") { window.XFTrain.reset(); setTimeout(() => window.XFTrain.start(false), 200); return; }
      window.XFTrain.start(false);
    });
    $("#btn-trial").addEventListener("click", () => {
      window.XFTrain.reset();
      setTimeout(() => window.XFTrain.startTrial(), 120);
    });
    $("#btn-reset").addEventListener("click", () => {
      $("#modal-done").hidden = true;
      window.XFTrain.reset();
      toast("已撤炉");
    });
    $$("[data-speed]").forEach(b => b.addEventListener("click", () => window.XFTrain.setSpeed(+b.dataset.speed)));

    // modals
    $$("[data-close]").forEach(b => b.addEventListener("click", e => {
      const modal = e.target.closest(".modal");
      if (modal) modal.hidden = true;
    }));
    $("#btn-guide").addEventListener("click", () => {
      $("#modal-help").hidden = false;
      const v = $("#vol");
      if (v) { v.value = String(Math.round(window.XFSound.getVolume() * 100)); updateSliderFill(v); const o = $("#vol-out"); if (o) o.textContent = v.value; }
    });
    $("#btn-again").addEventListener("click", () => {
      $("#modal-done").hidden = true;
      window.XFTrain.reset();
      setTimeout(() => window.XFTrain.start(false), 260);
    });

    // sound
    const soundBtn = $("#btn-sound");
    function syncSoundBtn() {
      const on = window.XFSound.isOn();
      soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
      soundBtn.title = on ? "炉音已启 · 点击静音" : "炉音已关 · 点击开启";
    }
    // 恢复声音偏好
    try {
      if (localStorage.getItem("xf.sound") === "0") window.XFSound.setEnabled(false);
      const sv = localStorage.getItem("xf.soundVol");
      if (sv != null) window.XFSound.setVolume(Number(sv) / 100);
    } catch (e) {}

    const vol = $("#vol"), volOut = $("#vol-out");
    if (vol) {
      vol.value = String(Math.round(window.XFSound.getVolume() * 100));
      if (volOut) volOut.textContent = vol.value;
      updateSliderFill(vol);
      vol.addEventListener("input", () => {
        const v = Number(vol.value);
        window.XFSound.setVolume(v / 100);
        if (volOut) volOut.textContent = vol.value;
        updateSliderFill(vol);
        try { localStorage.setItem("xf.soundVol", String(v)); } catch (e) {}
      });
    }

    const demoBtn = $("#sound-demo");
    if (demoBtn) demoBtn.addEventListener("click", () => {
      window.XFSound.ensure();
      window.XFSound.ignite();
      const ph = window.XFTrain.state.phase;
      if (ph === "idle") {
        window.XFSound.setState("burning");
        window.XFSound.level(1.05);
        setTimeout(() => {
          if (window.XFTrain.state.phase === "idle") {
            window.XFSound.setState("idle");
            window.XFSound.level(0.2);
          }
        }, 3400);
      }
      toast("点火声 · 闷响 / 火舌 / 炭爆 / 蒸汽");
    });

    syncSoundBtn();
    soundBtn.addEventListener("click", () => {
      const on = window.XFSound.toggle();
      syncSoundBtn();
      try { localStorage.setItem("xf.sound", on ? "1" : "0"); } catch (e) {}
      toast(on ? "炉音已启 · 炉膛轰鸣 / 炭火噼啪 / 丹液沸腾" : "炉音已关");
    });
    // 首次点击/按键时解锁音频（默认开启，符合"炼丹房"的氛围）
    ["pointerdown", "keydown"].forEach(ev => {
      const unlock = () => {
        window.XFSound.ensure();
        window.removeEventListener(ev, unlock);
      };
      window.addEventListener(ev, unlock, { once: true, capture: true });
    });

    // keyboard
    document.addEventListener("keydown", e => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (window.XFTrain.state.phase === "running") window.XFTrain.pause();
        else if (window.XFTrain.state.phase === "paused") window.XFTrain.resume();
        else if (app.materials.length === 0) { toast("灵材为空 · 先投材再开炉"); setView("materials"); }
        else window.XFTrain.start(false);
      }
      if (e.key === "Escape") { $("#modal-done").hidden = true; $("#modal-help").hidden = true; closePicker(); }
      const idx = ["1", "2", "3", "4", "5", "6", "7"].indexOf(e.key);
      if (idx > -1) setView(["furnace", "codex", "recipes", "materials", "methods", "market", "logs"][idx]);
    });

    // 桌面端菜单导航
    document.addEventListener("xf:nav", e => {
      if (e.detail && NAMES[e.detail]) setView(e.detail);
    });

    // log events
    document.addEventListener("xf:log", () => {
      if (app.view === "logs") renderTerminal();
      const c = $("#log-count"); if (c) c.textContent = window.XFTrain.getLogs().length;
    });

    // progress arc init
    const arc = $("#pa-fill");
    if (arc) arc.style.strokeDashoffset = String(2 * Math.PI * 243);

    // restore
    try {
      const runs = JSON.parse(localStorage.getItem("xf.runs") || "null");
      if (Array.isArray(runs) && runs.length) app.runs = runs;
      const savedModel = localStorage.getItem("xf.model");
      if (savedModel && MODELS.some(m => m.id === savedModel)) selectModel(savedModel, false);
    } catch (e) {}

    // default model presentation
    const cfg = window.XFTrain.getConfig();
    const m = modelById(cfg.modelId);
    $("#pick-name").textContent = m.name;
    $("#pick-meta").textContent = m.org + " · 可训 LoRA · " + m.vram;
    $("#pick-modality").textContent = MODS[m.mod].sigil;
    syncControls();
    updateOutputs();
    syncDatasetCount();

    // initial view from hash / query
    const params = new URLSearchParams(location.search);
    const h = (location.hash || "").replace("#", "");
    const qv = params.get("view");
    setView(NAMES[h] ? h : (NAMES[qv] ? qv : "furnace"));

    // demo deep links: ?demo=burn&p=0.7  /  ?demo=done
    const demo = params.get("demo");
    if (demo === "burn") {
      window.XFTrain.start(false);
      setTimeout(() => window.XFTrain.jump(Math.max(.02, Math.min(.98, parseFloat(params.get("p") || "0.68")))), 350);
    } else if (demo === "done") {
      window.XFTrain.start(false);
      setTimeout(() => window.XFTrain.jump(0.9985), 300);
    } else if (demo === "trial") {
      window.XFTrain.startTrial();
    }

    // keep estimate updated on resize
    window.addEventListener("resize", () => { if (window.FX) window.FX.resize(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
