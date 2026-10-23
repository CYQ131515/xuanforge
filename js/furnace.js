/* ============================================================
   玄炉 XUANFORGE · furnace.js
   Canvas FX engine: ambient qi, flames, embers, smoke, bursts
   ============================================================ */
window.FXFurnace = (function () {
  "use strict";

  const VB = 520;            // svg viewBox size
  const CX = 260, CY = 262;  // svg content center

  function makeSprite(color, softness) {
    const s = 64, c = document.createElement("canvas");
    c.width = c.height = s;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, color);
    grad.addColorStop(Math.min(.9, softness || .35), color.replace(/[\d.]+\)$/, "0.45)"));
    grad.addColorStop(1, color.replace(/[\d.]+\)$/, "0)"));
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    return c;
  }

  function create(backCanvas, frontCanvas, svgEl, sceneEl) {
    const back = backCanvas.getContext("2d");
    const front = frontCanvas.getContext("2d");

    const COLORS = {
      white: "rgba(255,248,225,1)",
      gold: "rgba(255,208,130,1)",
      orange: "rgba(255,138,60,1)",
      red: "rgba(255,86,46,1)",
      jade: "rgba(120,255,214,1)",
      violet: "rgba(170,150,255,1)"
    };
    const sprites = {};
    Object.keys(COLORS).forEach(k => { sprites[k] = makeSprite(COLORS[k], .34); });

    let W = 0, H = 0, dpr = 1;
    let mapping = { x: 0, y: 0, s: 1 };

    let intensity = .18, target = .18;
    let state = "idle";
    let time = 0, last = 0;
    let flames = [], embers = [], smokes = [], qi = [], bursts = [], rings = [];
    let stars = [], motes = [];
    let spawnAcc = { flame: 0, ember: 0, smoke: 0 };
    let visible = true;

    /* ---------- sizing ---------- */
    function resize() {
      if (!sceneEl || !svgEl) return;
      const sr = sceneEl.getBoundingClientRect();
      const ir = svgEl.getBoundingClientRect();
      W = sr.width; H = sr.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      [backCanvas, frontCanvas].forEach(cv => {
        cv.width = Math.max(1, Math.round(W * dpr));
        cv.height = Math.max(1, Math.round(H * dpr));
      });
      back.setTransform(dpr, 0, 0, dpr, 0, 0);
      front.setTransform(dpr, 0, 0, dpr, 0, 0);
      mapping.x = ir.left - sr.left;
      mapping.y = ir.top - sr.top;
      mapping.s = ir.width / VB;

      seedAmbient();
    }

    function px(x, y) {
      return { x: mapping.x + x * mapping.s, y: mapping.y + y * mapping.s };
    }
    function scale(v) { return v * mapping.s; }

    function seedAmbient() {
      stars.length = 0;
      const n = Math.min(90, Math.round(W * H / 14000));
      for (let i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 1.2 + .2, a: Math.random() * .5 + .15,
          vx: (Math.random() - .5) * 3, vy: (Math.random() - .5) * 3,
          tw: Math.random() * Math.PI * 2
        });
      }
      motes.length = 0;
      const m = Math.min(46, Math.round(W * H / 32000));
      for (let i = 0; i < m; i++) {
        motes.push({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 1.8 + .6, a: Math.random() * .3 + .06,
          vy: -(4 + Math.random() * 10), drift: Math.random() * Math.PI * 2
        });
      }
    }

    /* ---------- particle factories ---------- */
    function addFlame() {
      // three emitters: base, mouth, rim sides — higher intensity lights the whole furnace
      const zone = Math.random();
      let x, y;
      if (zone < .58) { x = CX + (Math.random() - .5) * 170; y = 320 + Math.random() * 46; }
      else if (zone < .84) { x = CX + (Math.random() - .5) * 96; y = 190 + Math.random() * 18; }
      else { x = CX + (Math.random() < .5 ? -1 : 1) * (128 + Math.random() * 26); y = 250 + Math.random() * 60; }
      const c = px(x, y);
      const hot = Math.random() < .26 + intensity * .34;
      const col = hot ? (Math.random() < .5 ? "white" : "gold") : (Math.random() < .62 ? "orange" : "red");
      flames.push({
        x: c.x, y: c.y,
        vx: (Math.random() - .5) * 42,
        vy: -(70 + Math.random() * 150) * (.6 + intensity * .55),
        life: .45 + Math.random() * .8, age: 0,
        size: scale(13 + Math.random() * 26) * (.7 + intensity * .5),
        col, wob: Math.random() * Math.PI * 2
      });
    }

    function addEmber() {
      const c = px(CX + (Math.random() - .5) * 210, 340 + Math.random() * 50);
      embers.push({
        x: c.x + (Math.random() - .5) * scale(80), y: c.y,
        vx: (Math.random() - .5) * 30, vy: -(30 + Math.random() * 90),
        life: 1.4 + Math.random() * 1.8, age: 0,
        size: scale(1 + Math.random() * 1.8),
        col: Math.random() < .3 ? "gold" : (Math.random() < .6 ? "orange" : "jade"),
        flick: Math.random() * Math.PI * 2
      });
    }

    function addSmoke() {
      const c = px(CX + (Math.random() - .5) * 90, 160 + Math.random() * 30);
      smokes.push({
        x: c.x, y: c.y,
        vx: (Math.random() - .5) * 18, vy: -(12 + Math.random() * 22),
        life: 2.2 + Math.random() * 2.6, age: 0,
        size: scale(14 + Math.random() * 26),
        col: Math.random() < .55 ? "jade" : "white"
      });
    }

    function spawnQi() {
      const a = Math.random() * Math.PI * 2;
      const r = scale(120 + Math.random() * 130);
      qi.push({
        a, r,
        av: (Math.random() < .5 ? -1 : 1) * (.3 + Math.random() * .8),
        rr: -(2 + Math.random() * 9),
        life: 2 + Math.random() * 3, age: 0,
        size: scale(.8 + Math.random() * 1.6),
        col: Math.random() < .7 ? "jade" : "violet",
        ox: px(CX, CY).x, oy: px(CX, CY).y
      });
    }

    function burst(n, power) {
      const o = px(CX, 300);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (80 + Math.random() * 320) * (power || 1);
        bursts.push({
          x: o.x, y: o.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
          life: .9 + Math.random() * 1.4, age: 0,
          size: scale(1.2 + Math.random() * 3),
          col: Math.random() < .5 ? "gold" : (Math.random() < .6 ? "white" : "jade")
        });
      }
      rings.push({ x: o.x, y: o.y, r: scale(20), life: 1.2, age: 0, max: scale(210) });
      rings.push({ x: o.x, y: o.y, r: scale(10), life: 1.8, age: .35, max: scale(300) });
    }

    /* ---------- render ---------- */
    function renderAmbient(dt) {
      back.clearRect(0, 0, W, H);

      // nebula wisps (very subtle)
      const g = back.createRadialGradient(W * .5, H * .48, 0, W * .5, H * .48, Math.max(W, H) * .55);
      g.addColorStop(0, `rgba(30,120,110,${.05 + intensity * .035})`);
      g.addColorStop(.55, "rgba(20,40,70,.02)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      back.fillStyle = g;
      back.fillRect(0, 0, W, H);

      // stars
      for (const s of stars) {
        s.x += s.vx * dt; s.y += s.vy * dt; s.tw += dt * 1.6;
        if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
        if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;
        const a = s.a * (.55 + .45 * Math.sin(s.tw));
        back.fillStyle = `rgba(190,240,235,${a})`;
        back.fillRect(s.x, s.y, s.r, s.r);
      }

      // rising motes
      back.globalCompositeOperation = "lighter";
      for (let i = motes.length - 1; i >= 0; i--) {
        const m = motes[i];
        m.y += m.vy * dt * (.6 + intensity);
        m.drift += dt * .6;
        m.x += Math.sin(m.drift) * 6 * dt;
        if (m.y < -10) { m.y = H + 10; m.x = Math.random() * W; }
        back.globalAlpha = m.a * (.6 + intensity * .7);
        back.drawImage(sprites.jade, m.x - m.r * 2, m.y - m.r * 2, m.r * 4, m.r * 4);
      }
      back.globalAlpha = 1;
      back.globalCompositeOperation = "source-over";
    }

    function renderFire(dt) {
      front.clearRect(0, 0, W, H);
      front.globalCompositeOperation = "lighter";

      // broad warm light on the furnace body
      if (intensity > .22) {
        const base = px(CX, 330);
        const mouth = px(CX, 200);
        front.globalAlpha = Math.min(.5, .16 * intensity);
        front.drawImage(sprites.orange, base.x - scale(190), base.y - scale(150), scale(380), scale(300));
        front.globalAlpha = Math.min(.4, .12 * intensity);
        front.drawImage(sprites.gold, mouth.x - scale(130), mouth.y - scale(70), scale(260), scale(150));
        front.globalAlpha = 1;
      }

      // spawn accumulates
      const rates = {
        flame: (state === "burning" ? 150 : state === "done" ? 26 : 10) * intensity * 1.7,
        ember: (state === "burning" ? 42 : state === "done" ? 24 : 7) * intensity,
        smoke: (state === "burning" ? 11 : 2.6) * intensity
      };
      Object.keys(rates).forEach(k => {
        spawnAcc[k] += rates[k] * dt;
        while (spawnAcc[k] > 1) {
          spawnAcc[k] -= 1;
          if (k === "flame") addFlame();
          else if (k === "ember") addEmber();
          else addSmoke();
        }
      });

      // ambient qi orbit
      const qiCount = 10 + Math.round(18 * intensity);
      if (qi.length < qiCount && Math.random() < .5) spawnQi();

      /* flames */
      for (let i = flames.length - 1; i >= 0; i--) {
        const f = flames[i];
        f.age += dt;
        if (f.age >= f.life) { flames.splice(i, 1); continue; }
        f.wob += dt * 7;
        f.vy -= 24 * dt;                    // buoyancy
        f.x += (f.vx + Math.sin(f.wob) * 22) * dt;
        f.y += f.vy * dt;
        const t = f.age / f.life;
        const a = Math.min(1, (1 - t) * 1.15);
        const sz = f.size * (1 + t * .6);
        front.globalAlpha = a;
        // flame tongues are taller than wide
        const fw = sz * .78, fh = sz * 1.7;
        front.drawImage(sprites[f.col], f.x - fw / 2, f.y - fh * .62, fw, fh);
      }

      /* embers */
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.age += dt;
        if (e.age >= e.life) { embers.splice(i, 1); continue; }
        e.flick += dt * 9;
        e.x += (e.vx + Math.sin(e.flick) * 16) * dt;
        e.y += e.vy * dt;
        e.vy += 6 * dt;
        const t = e.age / e.life;
        front.globalAlpha = (1 - t) * (.5 + .5 * Math.abs(Math.sin(e.flick)));
        const s = e.size * 4;
        front.drawImage(sprites[e.col], e.x - s / 2, e.y - s / 2, s, s);
      }

      /* smoke */
      for (let i = smokes.length - 1; i >= 0; i--) {
        const s = smokes[i];
        s.age += dt;
        if (s.age >= s.life) { smokes.splice(i, 1); continue; }
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.vx += Math.sin(s.age * 1.6) * 4 * dt;
        const t = s.age / s.life;
        const size = s.size * (1 + t * 1.9);
        front.globalAlpha = (1 - t) * .09;
        front.drawImage(sprites[s.col], s.x - size / 2, s.y - size / 2, size, size);
      }

      /* qi orbiting */
      for (let i = qi.length - 1; i >= 0; i--) {
        const q = qi[i];
        q.age += dt;
        if (q.age >= q.life) { qi.splice(i, 1); continue; }
        q.a += q.av * dt;
        q.r += q.rr * dt;
        if (q.r < scale(60)) { qi.splice(i, 1); continue; }
        const t = q.age / q.life;
        const x = q.ox + Math.cos(q.a) * q.r;
        const y = q.oy + Math.sin(q.a) * q.r * .62;
        front.globalAlpha = Math.sin(Math.PI * t) * (.45 + intensity * .4);
        const s = q.size * 5;
        front.drawImage(sprites[q.col], x - s / 2, y - s / 2, s, s);
      }

      /* bursts */
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.age += dt;
        if (b.age >= b.life) { bursts.splice(i, 1); continue; }
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.vy += 180 * dt; b.vx *= .992;
        const t = b.age / b.life;
        front.globalAlpha = (1 - t) * .95;
        const s = b.size * 5;
        front.drawImage(sprites[b.col], b.x - s / 2, b.y - s / 2, s, s);
      }

      /* expanding rings */
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.age += dt;
        if (r.age >= r.life) { rings.splice(i, 1); continue; }
        const t = Math.min(1, r.age / r.life);
        const rad = r.r + (r.max - r.r) * t;
        front.globalAlpha = (1 - t) * .5;
        front.strokeStyle = "rgba(245,201,107,.9)";
        front.lineWidth = Math.max(.6, 2 * (1 - t));
        front.beginPath();
        front.arc(r.x, r.y, rad, 0, Math.PI * 2);
        front.stroke();
      }

      front.globalAlpha = 1;
      front.globalCompositeOperation = "source-over";

      // ground energy column (normal blending, subtle)
      if (intensity > .25) {
        const o = px(CX, 400);
        const h = scale(120);
        const g = front.createLinearGradient(0, o.y, 0, o.y - h);
        g.addColorStop(0, `rgba(255,150,70,${.14 * intensity})`);
        g.addColorStop(1, "rgba(255,150,70,0)");
        front.fillStyle = g;
        front.fillRect(o.x - scale(60), o.y - h, scale(120), h);
      }
    }

    /* ---------- loop ---------- */
    let raf = 0;
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      if (!last) last = ts;
      const dt = Math.min(.05, (ts - last) / 1000);
      last = ts;
      if (!visible || W < 10) return;
      time += dt;

      // ease intensity
      intensity += (target - intensity) * Math.min(1, dt * 2.2);
      // gentle breathing when idle
      if (state === "idle") intensity = Math.max(.12, intensity + Math.sin(time * 1.1) * .004);

      renderAmbient(dt);
      renderFire(dt);
    }

    /* ---------- api ---------- */
    const api = {
      resize,
      start() {
        if (!raf) raf = requestAnimationFrame(frame);
      },
      setIntensity(v) { target = Math.max(0, Math.min(1.6, v)); },
      getIntensity() { return intensity; },
      setState(s) {
        state = s;
        if (s === "done") { burst(140, 1.2); setTimeout(() => burst(70, .7), 220); }
        if (s === "burning") { target = Math.max(target, .55); }
      },
      burst,
      setVisible(v) { visible = v; },
      destroy() { cancelAnimationFrame(raf); raf = 0; }
    };

    // responsive
    if (window.ResizeObserver && sceneEl) {
      new ResizeObserver(() => resize()).observe(sceneEl);
    } else {
      window.addEventListener("resize", resize);
    }
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; });
    resize();

    return api;
  }

  return { create };
})();
