/* ============================================================
   玄炉 XUANFORGE · train.js
   训练模拟状态机：阶段、火候、丹压、loss、日志、结丹
   ============================================================ */
window.XFTrain = (function () {
  "use strict";

  const C = 2 * Math.PI * 243; // progress arc circumference

  const PHASES = [
    { hasta: .05, tag: "起炉 · IGNITION", main: "火起于微", sub: "预热显存 · 校验灵材与炉鼎" },
    { hasta: .16, tag: "筑基 · PREPARE", main: "筑基炼形", sub: "缓存潜变量与文本嵌入" },
    { hasta: .52, tag: "文火 · GENTLE FIRE", main: "文火温养", sub: "低火慢炼 · 守住丹性不散" },
    { hasta: .86, tag: "武火 · INTENSE FIRE", main: "武火催丹", sub: "全功率运转 · 丹气渐凝" },
    { hasta: .997, tag: "结丹 · CONDENSE", main: "结丹在即", sub: "退火降温 · 封存丹纹" },
    { hasta: 1.01, tag: "丹成 · FORGED", main: "丹成九转", sub: "一炉已毕 · 可收入丹房" }
  ];

  const LOG_PREP = [
    "炉鼎锁定：{model}",
    "灵材入炉：{n} 张 · {res} 分桶完成",
    "缓存灵韵（文本嵌入）… 100%",
    "校验炉温与丹压 … 通过",
    "启火 · 灵气开始灌注丹炉"
  ];
  const LOG_TRAIN = [
    "周天 {step}/{total} · loss {loss} · lr {lr} · {ips} it/s",
    "丹压 {vram}G · 炉温 {temp}°C · 丹纹收敛中",
    "第 {epoch} 转 · 丹气凝 {pct}% · 余火未歇",
    "留影（验证采样）· 已存 3 张样图"
  ];
  const LOG_WARN = [
    "丹压逼近 {vram}G，自动启用换块卸载",
    "火候微有反扑，回退至上一稳定点",
    "灵材中有疑似重复影像，已按哈希跳过 1 张"
  ];
  const LOG_END = [
    "退火 · 封炉 · 丹纹固化",
    "丹成！体积 {size} · 触发词「{trigger}」",
    "已收入丹房 · 可导出 safetensors"
  ];

  let S = {
    phase: "idle",        // idle | running | paused | done
    progress: 0,
    duration: 96,         // seconds at 1×, full run
    speed: 4,
    totalSteps: 2400,
    epochs: 8,
    trial: false,
    loss: 0,
    history: [],
    logs: [],
    lastTs: 0,
    raf: 0,
    tick: 0,
    lastLogAt: 0,
    lastRender: 0,
    estimate: { vram: 17, timeMin: 48, size: 172 },
    config: {
      modelId: "flux3-klein", rank: 32, alpha: 32, lr: 1e-4, steps: 2400, batch: 1,
      technique: "LoRA", fp8: true, ckpt: true, blockswap: false, sample: true,
      datasetCount: 24, res: "1024px"
    },
    onComplete: null
  };

  /* ---------------- utils ---------------- */
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const fmt = (n, d) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : n.toFixed(d || 0));

  function model() {
    return (window.XF.MODELS.find(m => m.id === S.config.modelId)) || window.XF.MODELS[0];
  }

  function pickToStr(p) {
    return Math.round(p * 100) + "%";
  }

  function phaseFor(p) {
    for (const ph of PHASES) if (p < ph.hasta) return ph;
    return PHASES[PHASES.length - 1];
  }

  function intensityFor(p) {
    if (p < .05) return .16 + p * 4;
    if (p < .16) return .34;
    if (p < .52) return lerp(.5, .72, (p - .16) / .36);
    if (p < .86) return lerp(.86, 1.18, (p - .52) / .34);
    if (p < .997) return lerp(1.05, .55, (p - .86) / .137);
    return .3;
  }

  function scheduleLR(p) {
    const base = S.config.lr;
    if (p < .04) return base * (p / .04);
    const t = (p - .04) / .96;
    return base * (.1 + .9 * .5 * (1 + Math.cos(Math.PI * t)));
  }

  function lossAt(p) {
    const base = .92 * Math.exp(-2.55 * p) + .052;
    const noise = (Math.random() - .5) * .03 * (1 - p * .55);
    const spike = Math.random() < .012 ? Math.random() * .12 : 0;
    return Math.max(.021, base + noise + spike);
  }

  /* ---------------- estimate ---------------- */
  function parseVramBase(m) {
    const s = (m.vram || "");
    const n = s.match(/(\d+(\.\d+)?)/);
    if (n) return parseFloat(n[1]);
    if (m.mod === "video") return 24;
    if (m.mod === "audio") return 10;
    if (m.mod === "llm") return 16;
    return 16;
  }

  function computeEstimate(cfg) {
    const m = window.XF.MODELS.find(x => x.id === cfg.modelId) || model();
    let vram = parseVramBase(m) * (0.72 + (cfg.rank / 128) * 0.55) * Math.pow(cfg.batch, .72);
    if (m.mod === "llm") vram = 6 + cfg.rank * 0.16 + Math.pow(cfg.batch, .5) * 1.2 + (cfg.fp8 ? 0 : 4);
    if (cfg.fp8) vram *= .64;
    if (cfg.ckpt) vram *= .8;
    if (cfg.blockswap) vram *= .58;
    vram = clamp(vram, 4.5, 23.4);

    const perStep = m.mod === "video" ? 6.5 : m.mod === "audio" ? .55 : m.mod === "llm" ? 1.35 : 1.15;
    const timeMin = Math.max(2, Math.round(cfg.steps * perStep * Math.pow(cfg.batch, .85) / 60));

    const techK = { LoRA: 1, LoHa: .62, LoKr: .38, DoRA: 1.16, PiSSA: 1.02 }[cfg.technique] || 1;
    const baseMb = m.mod === "llm" ? cfg.rank * 2.6 + 12 : cfg.rank * 5.1 + 12;
    const size = Math.round(baseMb * techK);

    return { vram, timeMin, size };
  }

  /* ---------------- logs ---------------- */
  function log(level, msg) {
    const d = new Date();
    const t = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") + ":" + String(d.getSeconds()).padStart(2, "0");
    S.logs.push({ t, level, msg });
    if (S.logs.length > 400) S.logs.shift();
    const ticker = $("ticker-line");
    if (ticker) {
      ticker.textContent = msg;
      ticker.classList.remove("is-new");
      void ticker.offsetWidth;
      ticker.classList.add("is-new");
    }
    const sl = $("status-left");
    if (sl && S.phase === "running") sl.textContent = msg;
    document.dispatchEvent(new CustomEvent("xf:log", { detail: { t, level, msg } }));
  }

  function tpl(str, extra) {
    const m = model();
    const est = S.estimate;
    const p = S.progress;
    const epoch = Math.min(S.epochs, Math.floor(p * S.epochs) + 1);
    return str
      .replace("{model}", m.name)
      .replace("{n}", S.config.datasetCount)
      .replace("{res}", S.config.res)
      .replace("{step}", Math.floor(p * S.totalSteps))
      .replace("{total}", S.totalSteps)
      .replace("{loss}", S.loss ? S.loss.toFixed(4) : "0.9120")
      .replace("{lr}", scheduleLR(p).toExponential(1))
      .replace("{ips}", (10 + Math.random() * 4).toFixed(1))
      .replace("{vram}", est.vram.toFixed(1))
      .replace("{temp}", Math.round(36 + intensityFor(p) * 620))
      .replace("{epoch}", epoch)
      .replace("{pct}", pickToStr(p))
      .replace("{size}", est.size + " MB")
      .replace("{trigger}", m.trigger || "xu_style")
      .replace(extra || "", "");
  }

  /* ---------------- DOM ---------------- */
  function setText(id, v) { const el = $(id); if (el) el.textContent = v; }
  function setWidth(id, pct) { const el = $(id); if (el) el.style.width = clamp(pct, 0, 100) + "%"; }

  function renderPhase() {
    if (S.phase === "idle") {
      setText("phase-tag", "天机未动");
      setText("phase-main", "炉火自温 · 待开炉");
      setText("phase-sub", "选择炉鼎与丹方，投下灵材");
      setText("crumb", "丹房 / Furnace");
      return;
    }
    if (S.phase === "paused") {
      setText("phase-tag", "封炉 · PAUSED");
      setText("phase-main", "火种封存");
      setText("phase-sub", "续火即接续前一周天");
      return;
    }
    const ph = phaseFor(S.progress);
    setText("phase-tag", ph.tag);
    setText("phase-main", S.phase === "done" ? "丹成九转" : ph.main);
    setText("phase-sub", ph.sub);
    setText("crumb", "丹房 / " + ph.tag.split(" · ")[0]);
  }

  function renderHUD(intensity) {
    const est = S.estimate;
    const idle = S.phase === "idle";
    const temp = idle ? 36 : Math.round(36 + intensity * 620 + (Math.random() - .5) * 6);
    const vram = clamp(est.vram + intensity * .9 + (Math.random() - .5) * .25, 0, 23.9);
    const lr = scheduleLR(S.progress) * (S.phase === "idle" ? 0 : 1);

    setText("v-temp", temp);
    setWidth("b-temp", idle ? 5 : temp / 7);
    setText("v-vram", idle ? "0.0" : vram.toFixed(1));
    setWidth("b-vram", (vram / 24) * 100);
    setText("v-lr", idle ? "—" : lr.toExponential(1));
    setWidth("b-lr", idle ? 4 : clamp((lr / (S.config.lr || 1e-4)) * 100, 6, 100));
    setText("v-prog", Math.floor(S.progress * 100));
    setWidth("b-prog", S.progress * 100);

    const arc = $("pa-fill");
    if (arc) arc.style.strokeDashoffset = String(C * (1 - S.progress));

    const gpu = $("rail-gpu");
    if (gpu) gpu.style.height = clamp(12 + (S.phase === "idle" ? 6 : (vram / 24) * 88), 8, 100) + "%";
    setText("rail-gpu-num", Math.round(S.phase === "idle" ? 18 : (vram / 24) * 100) + "%");
  }

  function renderLoss() {
    const cv = $("loss-chart");
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth || 300, h = cv.clientHeight || 52;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    // grid
    g.strokeStyle = "rgba(255,255,255,.055)";
    g.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (h / 4) * i;
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    }

    const hist = S.history;
    if (hist.length < 2) {
      g.fillStyle = "rgba(140,160,165,.35)";
      g.font = "9px ui-monospace,monospace";
      g.fillText("待开炉 · 丹纹未生", 8, h / 2 + 3);
      return;
    }

    const maxL = Math.max(...hist.map(p => p.l)) * 1.06;
    const minL = Math.min(...hist.map(p => p.l)) * .82;
    const span = Math.max(.01, maxL - minL);
    const X = i => (i / (hist.length - 1)) * (w - 8) + 4;
    const Y = l => h - 5 - ((l - minL) / span) * (h - 12);

    // fill
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(245,201,107,.22)");
    grad.addColorStop(1, "rgba(245,201,107,0)");
    g.beginPath();
    g.moveTo(X(0), h);
    hist.forEach((p, i) => g.lineTo(X(i), Y(p.l)));
    g.lineTo(X(hist.length - 1), h);
    g.closePath();
    g.fillStyle = grad;
    g.fill();

    // line
    g.beginPath();
    hist.forEach((p, i) => { i ? g.lineTo(X(i), Y(p.l)) : g.moveTo(X(i), Y(p.l)); });
    g.strokeStyle = "#f5c96b";
    g.lineWidth = 1.4;
    g.shadowColor = "rgba(245,201,107,.8)";
    g.shadowBlur = 6;
    g.stroke();
    g.shadowBlur = 0;

    // last dot
    const lastP = hist[hist.length - 1];
    g.beginPath();
    g.arc(X(hist.length - 1), Y(lastP.l), 2.4, 0, Math.PI * 2);
    g.fillStyle = "#fff3d0";
    g.fill();
  }

  function renderActions() {
    const btn = $("btn-ignite");
    const label = $("btn-ignite-label");
    const hint = $("action-hint");
    const cap = document.querySelector("#btn-ignite .btn__text i");
    if (!btn || !label) return;
    const running = S.phase === "running";
    btn.classList.toggle("is-burning", running);
    label.textContent = running ? "停火" : S.phase === "paused" ? "续火" : S.phase === "done" ? "再炼" : "开炉";
    if (cap) cap.textContent = running ? "PAUSE FIRE" : S.phase === "paused" ? "RESUME" : S.phase === "done" ? "AGAIN" : "IGNITE";
    if (hint) hint.textContent = running ? "炉火正盛 · 可停火观丹" : S.phase === "paused" ? "火种未熄 · 可续火" : S.phase === "done" ? "丹已成 · 可再炼一炉" : "投材 → 开炉";
  }

  /* ---------------- state machine ---------------- */
  function setPhase(p) {
    S.phase = p;
    document.body.dataset.state = p === "running" ? "burning" : p === "done" ? "done" : p === "paused" ? "burning" : "idle";
    renderActions();
  }

  function startTrial() { start(true); }

  function start(trial) {
    if (S.phase === "running") { pause(); return; }
    if (S.phase === "paused") { resume(); return; }

    S.trial = !!trial;
    S.progress = 0;
    S.history = [{ p: 0, l: lossAt(0) }];
    S.logs = [];
    S.totalSteps = trial ? Math.min(300, S.config.steps) : S.config.steps;
    S.epochs = trial ? 1 : 8;
    S.duration = trial ? 30 : 96;
    S.lastPhaseTag = "";

    document.body.dataset.flash = "1";
    setTimeout(() => { document.body.dataset.flash = "0"; }, 1000);

    setPhase("running");
    document.body.dataset.state = "burning";
    if (window.FX) { window.FX.setState("burning"); window.FX.setIntensity(.55); }
    if (window.XFSound) { window.XFSound.ensure(); window.XFSound.setState("burning"); window.XFSound.ignite(); }

    log("sys", trial ? "试炼起炉 · 小周天快跑" : "开炉 · 一炉将起");
    LOG_PREP.forEach((l, i) => setTimeout(() => log(i === 0 ? "ok" : "sys", tpl(l)), 260 + i * 420));
    log("ok", "启火 · 灵气开始灌注丹炉");
    S.lastTs = 0;
    S.tick = 0;
    if (!S.raf) S.raf = requestAnimationFrame(loop);
  }

  function pause() {
    if (S.phase !== "running") return;
    setPhase("paused");
    if (window.FX) window.FX.setIntensity(.32);
    if (window.XFSound) window.XFSound.setState("paused");
    log("warn", "停火 · 炉温缓降，丹气封存");
    renderPhase();
    renderActions();
  }

  function resume() {
    setPhase("running");
    if (window.FX) window.FX.setState("burning");
    if (window.XFSound) window.XFSound.setState("burning");
    log("ok", "续火 · 接续前一周天");
    renderPhase();
    renderActions();
  }

  function reset() {
    cancelAnimationFrame(S.raf); S.raf = 0;
    S.progress = 0; S.history = []; S.loss = 0; S.lastPhaseTag = "";
    S.totalSteps = S.config.steps; S.trial = false;
    setPhase("idle");
    document.body.dataset.state = "idle";
    if (window.FX) { window.FX.setState("idle"); window.FX.setIntensity(.18); }
    setText("phase-tag", "天机未动");
    setText("phase-main", "炉火自温 · 待开炉");
    setText("phase-sub", "选择炉鼎与丹方，投下灵材");
    setText("v-prog", "0"); setWidth("b-prog", 0);
    setText("v-loss", "—"); setText("v-step", "0"); setText("v-total", S.config.steps);
    const arc = $("pa-fill"); if (arc) arc.style.strokeDashoffset = String(C);
    renderLoss(); renderActions();
    log("sys", "撤炉 · 炉灰已清，静待下一炉");
    if (window.XFSound) window.XFSound.setState("idle");
  }

  function finish() {
    S.phase = "done";
    S.progress = 1;
    setPhase("done");
    document.body.dataset.state = "done";
    if (window.FX) { window.FX.setState("done"); window.FX.setIntensity(.42); }
    LOG_END.forEach((l, i) => setTimeout(() => log("ok", tpl(l)), 200 + i * 380));
    setText("phase-tag", "丹成 · FORGED");
    setText("phase-main", "丹成九转");
    const m = model();
    const sum = {
      model: m, trial: S.trial, steps: S.totalSteps,
      rank: S.config.rank, size: S.estimate.size,
      loss: S.loss.toFixed(3), trigger: m.trigger,
      elapsed: S.trial ? "试炼" : Math.round(S.duration / S.speed) + " 秒（模拟）"
    };
    if (S.onComplete) S.onComplete(sum);
    if (window.XFSound) { window.XFSound.setState("done"); window.XFSound.finish(); }
  }

  function loop(ts) {
    S.raf = requestAnimationFrame(loop);
    if (!S.lastTs) S.lastTs = ts;
    const dt = Math.min(.08, (ts - S.lastTs) / 1000);
    S.lastTs = ts;
    if (S.phase !== "running") return;

    S.progress = clamp(S.progress + (dt * S.speed) / S.duration, 0, 1);
    S.tick += dt;

    // loss history & values
    if (S.progress < 1) {
      const l = lossAt(S.progress);
      S.loss = l;
      const last = S.history[S.history.length - 1];
      if (!last || S.progress - last.p > .0022) S.history.push({ p: S.progress, l });
      if (S.history.length > 520) S.history.shift();
    }

    const intensity = intensityFor(S.progress);
    if (window.FX) window.FX.setIntensity(intensity);

    // logs on a timer
    const interval = S.progress < .16 ? .9 : 1.5;
    if (S.tick - S.lastLogAt > interval) {
      S.lastLogAt = S.tick;
      const roll = Math.random();
      if (roll < .1) log("warn", tpl(LOG_WARN[Math.floor(Math.random() * LOG_WARN.length)]));
      else if (roll < .2 && S.config.sample) log("sys", tpl(LOG_TRAIN[3]));
      else log("sys", tpl(LOG_TRAIN[Math.floor(Math.random() * 3)]));
    }

    // DOM at ~12fps
    if (ts - S.lastRender > 80) {
      S.lastRender = ts;
      renderPhase();
      renderHUD(intensity);
      renderLoss();
      const tag = phaseFor(S.progress).tag;
      if (tag !== S.lastPhaseTag) {
        if (S.lastPhaseTag && tag.indexOf("武火") === 0 && window.XFSound) window.XFSound.surge();
        S.lastPhaseTag = tag;
      }
      setText("v-loss", S.loss ? S.loss.toFixed(4) : "—");
      setText("v-step", Math.floor(S.progress * S.totalSteps));
      setText("v-total", S.totalSteps);
      renderActions();
      if (window.XFSound) XFSound.level(intensity);
    }

    if (S.progress >= 1) finish();
  }

  /* ---------------- config ---------------- */
  function setConfig(patch) {
    Object.assign(S.config, patch);
    S.totalSteps = S.phase === "idle" ? S.config.steps : S.totalSteps;
    S.estimate = computeEstimate(S.config);
    if (S.phase === "idle") {
      setText("v-total", S.config.steps);
      setText("v-lr", "—");
    }
    const ev = $("est-vram"), et = $("est-time"), es = $("est-size"), eb = $("est-bar");
    if (ev) ev.textContent = S.estimate.vram.toFixed(1) + " G";
    if (et) et.textContent = S.estimate.timeMin >= 60 ? (S.estimate.timeMin / 60).toFixed(1) + " 小时" : S.estimate.timeMin + " 分钟";
    if (es) es.textContent = S.estimate.size >= 1024 ? (S.estimate.size / 1024).toFixed(2) + " GB" : S.estimate.size + " MB";
    if (eb) eb.style.width = clamp((S.estimate.vram / 24) * 100, 4, 100) + "%";
    if (S.phase === "idle") { renderPhase(); renderHUD(.2); renderLoss(); }
  }

  function setSpeed(n) {
    S.speed = n;
    document.querySelectorAll("[data-speed]").forEach(b => b.classList.toggle("is-on", +b.dataset.speed === n));
    log("sys", "演示速度 " + n + "×（仅影响模拟，不影响真实训练）");
  }

  function init(opts) {
    S.onComplete = opts && opts.onComplete;
    S.estimate = computeEstimate(S.config);
    setConfig({});
    renderPhase();
    renderHUD(.18);
    renderLoss();
    renderActions();
    setText("v-total", S.config.steps);
    log("sys", "炉已温养 · 灵材未投 · 等待丹主开炉");
  }

  function jump(p) {
    if (S.phase === "idle" || S.phase === "done") start(false);
    S.phase = p >= 1 ? "done" : "running";
    document.body.dataset.state = p >= 1 ? "done" : "burning";
    S.progress = clamp(p, 0, 1);
    S.history = [];
    const n = 90;
    for (let i = 0; i <= n; i++) {
      const pp = S.progress * i / n;
      S.history.push({ p: pp, l: lossAt(pp) });
    }
    S.loss = lossAt(S.progress);
    S.trial = false;
    S.totalSteps = S.config.steps;
    if (window.FX) { window.FX.setState(p >= 1 ? "done" : "burning"); window.FX.setIntensity(intensityFor(S.progress)); }
    if (window.XFSound) { window.XFSound.ensure(); window.XFSound.setState(p >= 1 ? "done" : "burning"); }
    renderPhase(); renderHUD(intensityFor(S.progress)); renderLoss(); renderActions();
    setText("v-loss", S.loss.toFixed(4));
    setText("v-step", Math.floor(S.progress * S.totalSteps));
    setText("v-total", S.totalSteps);
    const arc = $("pa-fill");
    if (arc) arc.style.strokeDashoffset = String(C * (1 - S.progress));
  }

  return {
    init, start, startTrial, pause, resume, reset, setConfig, setSpeed, jump,
    get state() { return S; },
    getLogs: () => S.logs.slice(),
    getConfig: () => Object.assign({}, S.config),
    computeEstimate,
    intensityFor,
    phaseFor
  };
})();
