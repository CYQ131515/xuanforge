/* ============================================================
   玄炉 XUANFORGE · sound.js
   炼丹炉声景引擎（纯 WebAudio 合成，无外部音频资源）
   分层：炉膛轰鸣 / 木炭爆裂 / 丹液沸腾 / 风箱送风 / 蒸汽泄压 / 铜钟
   ============================================================ */
window.XFSound = (function () {
  "use strict";

  let ctx = null;
  let master, comp, reverb, reverbGain, dry;
  let beds = null;          // 连续声层
  let enabled = true;       // 默认开，但需一次用户手势才真正出声
  let started = false;
  let mode = "idle";        // idle | burning | paused | done
  let intensity = 0.2;
  let volume = 0.85;
  let loopsOn = false;
  let timers = new Set();
  let noiseBuf = null, brownBuf = null;
  let hidden = false;
  let analyser = null;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------------- 工具 ---------------- */
  function later(fn, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      if (!enabled) return;
      // 页面隐藏/音频挂起时保留事件链，稍后重试
      if (!ctx || ctx.state !== "running" || hidden) { later(fn, 500); return; }
      try { fn(); } catch (e) { /* 保持声景不中断 */ }
    }, Math.max(0, ms));
    timers.add(id);
    return id;
  }
  function startLoops() {
    if (loopsOn) return;
    loopsOn = true;
    LOOPS.forEach(f => f());
  }
  function stopTimers() {
    timers.forEach(clearTimeout);
    timers.clear();
    loopsOn = false;
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* ---------------- 噪声素材 ---------------- */
  function makeNoise(seconds, brown) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (brown) {
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.2;
        } else {
          d[i] = w * 0.6;
        }
      }
    }
    return buf;
  }

  /* 暗色混响：指数衰减 + 一阶低通，模拟石室/金属炉膛 */
  function makeIR(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const n = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
        last = last * 0.62 + n * 0.38;
        d[i] = last * 0.9;
      }
    }
    return buf;
  }

  /* ---------------- 初始化 ---------------- */
  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0;

    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 24;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.28;

    reverb = ctx.createConvolver();
    reverb.buffer = makeIR(2.4, 2.6);
    reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.32;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 28;
    hp.Q.value = 0.6;
    master.connect(hp);
    hp.connect(comp);
    comp.connect(ctx.destination);
    master.connect(reverb);
    reverb.connect(reverbGain);
    reverbGain.connect(comp);

    noiseBuf = makeNoise(4, false);
    brownBuf = makeNoise(4, true);

    beds = buildBeds();
    return true;
  }

  /* ---------------- 连续声层 ---------------- */
  function buildBeds() {
    /* 1. 炉膛低频轰鸣：棕噪 + 低通 + 缓慢呼吸 */
    const roarSrc = ctx.createBufferSource();
    roarSrc.buffer = brownBuf;
    roarSrc.loop = true;
    const roarLP = ctx.createBiquadFilter();
    roarLP.type = "lowpass";
    roarLP.frequency.value = 240;
    roarLP.Q.value = 0.8;
    const roarGain = ctx.createGain();
    roarGain.gain.value = 0.0;
    roarSrc.connect(roarLP).connect(roarGain);
    roarGain.connect(master);
    roarGain.connect(reverb);

    // 呼吸 LFO：让炉火像活的一样起伏
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.11;
    const lfoAmp = ctx.createGain();
    lfoAmp.gain.value = 55;
    lfo.connect(lfoAmp).connect(roarLP.frequency);

    const lfo2 = ctx.createOscillator();
    lfo2.type = "sine";
    lfo2.frequency.value = 0.073;
    const lfo2Amp = ctx.createGain();
    lfo2Amp.gain.value = 0.028;
    lfo2.connect(lfo2Amp).connect(roarGain.gain);

    /* 2. 火焰嘶声：白噪 + 带通 */
    const hissSrc = ctx.createBufferSource();
    hissSrc.buffer = noiseBuf;
    hissSrc.loop = true;
    const hissBP = ctx.createBiquadFilter();
    hissBP.type = "bandpass";
    hissBP.frequency.value = 1500;
    hissBP.Q.value = 0.55;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.0;
    hissSrc.connect(hissBP).connect(hissGain);
    hissGain.connect(master);
    hissGain.connect(reverb);

    /* 3. 炉体金属低鸣：两根略微失谐的低频正弦 */
    const hum1 = ctx.createOscillator();
    hum1.type = "sine"; hum1.frequency.value = 47.5;
    const hum2 = ctx.createOscillator();
    hum2.type = "sine"; hum2.frequency.value = 48.7;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.0;
    hum1.connect(humGain); hum2.connect(humGain);
    humGain.connect(master);

    /* 4. 风箱：周期性沙沙送风（由调度器触发） */

    [roarSrc, hissSrc, hum1, hum2].forEach(s => s.start());
    lfo.start(); lfo2.start();

    return { roarLP, roarGain, hissBP, hissGain, humGain, lfo, lfo2 };
  }

  /* ---------------- 单次音效 ---------------- */
  function crackle(big) {
    const t = ctx.currentTime;
    const dur = big ? rnd(0.05, 0.14) : rnd(0.015, 0.06);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = rnd(1100, big ? 2600 : 4600);
    bp.Q.value = rnd(0.9, 2.0);
    const g = ctx.createGain();
    const peak = (big ? rnd(0.12, 0.3) : rnd(0.03, 0.16)) * (0.6 + intensity * 0.8);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const pan = ctx.createStereoPanner();
    pan.pan.value = rnd(-0.85, 0.85);
    src.connect(bp).connect(g).connect(pan);
    pan.connect(master); pan.connect(reverb);
    src.start(t, rnd(0, 3), dur + 0.05);
  }

  function pop() {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sine";
    const f = rnd(160, 420);
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.06);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(rnd(0.05, 0.12), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    const pan = ctx.createStereoPanner();
    pan.pan.value = rnd(-0.7, 0.7);
    o.connect(g).connect(pan);
    pan.connect(master); pan.connect(reverb);
    o.start(t); o.stop(t + 0.1);
    crackle(false);
  }

  /* 丹液沸腾：短促上行气泡音 */
  function bubble() {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sine";
    const f = rnd(85, 190);
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * rnd(1.9, 2.8), t + rnd(0.05, 0.1));
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const g = ctx.createGain();
    const peak = rnd(0.04, 0.1) * (0.5 + intensity * 0.7);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + rnd(0.1, 0.18));
    const pan = ctx.createStereoPanner();
    pan.pan.value = rnd(-0.5, 0.5);
    o.connect(lp).connect(g).connect(pan);
    pan.connect(master); pan.connect(reverb);
    o.start(t); o.stop(t + 0.22);
  }

  /* 风箱送风：一记低沉的风声 swell */
  function bellows() {
    const t = ctx.currentTime;
    const dur = rnd(0.8, 1.3);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(rnd(250, 420), t);
    bp.frequency.linearRampToValueAtTime(rnd(650, 950), t + dur * 0.55);
    bp.frequency.linearRampToValueAtTime(rnd(260, 380), t + dur);
    bp.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(rnd(0.045, 0.09) * (0.5 + intensity * 0.6), t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const pan = ctx.createStereoPanner();
    pan.pan.value = rnd(-0.25, 0.25);
    src.connect(bp).connect(g).connect(pan);
    pan.connect(master); pan.connect(reverb);
    src.start(t, rnd(0, 2), dur + 0.1);
  }

  /* 蒸汽泄压 */
  function steam(duration, level) {
    const t = ctx.currentTime;
    const dur = duration || rnd(1.2, 2.2);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = rnd(2600, 4200);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime((level || 0.09) * (0.7 + Math.random() * 0.6), t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(hp).connect(g);
    g.connect(master); g.connect(reverb);
    src.start(t, rnd(0, 2), dur + 0.1);
  }

  /* 点火：低频闷响 + 火舌窜起 + 噼啪 */
  function ignite() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    // 闷响
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(78, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.32, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    o.connect(g); g.connect(master); g.connect(reverb);
    o.start(t); o.stop(t + 0.9);

    // 火舌窜起
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(260, t);
    lp.frequency.exponentialRampToValueAtTime(2400, t + 0.35);
    lp.frequency.exponentialRampToValueAtTime(320, t + 1.4);
    const wg = ctx.createGain();
    wg.gain.setValueAtTime(0.0001, t);
    wg.gain.linearRampToValueAtTime(0.22, t + 0.22);
    wg.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    src.connect(lp).connect(wg);
    wg.connect(master); wg.connect(reverb);
    src.start(t, rnd(0, 2), 1.6);

    // 初始爆裂
    for (let i = 0; i < 7; i++) later(() => crackle(i % 3 === 0), 60 + i * rnd(40, 120));
    steam(0.9, 0.035);
  }

  /* 结丹：铜钟 + 低频 + 蒸汽 + 余烬 */
  function finish() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const f0 = 110;
    const partials = [
      [1, 0.22, 5.2], [2.76, 0.09, 3.4], [5.4, 0.05, 2.6],
      [8.93, 0.03, 1.8], [13.3, 0.015, 1.2]
    ];
    partials.forEach(([mul, amp, dec], idx) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f0 * mul * (1 + (Math.random() - 0.5) * 0.002);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      const pan = ctx.createStereoPanner();
      pan.pan.value = (idx % 2 ? 1 : -1) * 0.25;
      o.connect(g).connect(pan);
      pan.connect(master); pan.connect(reverb);
      o.start(t); o.stop(t + dec + 0.1);
    });
    // 低频落地感
    const thump = ctx.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(58, t);
    thump.frequency.exponentialRampToValueAtTime(30, t + 0.7);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.0001, t);
    tg.gain.linearRampToValueAtTime(0.26, t + 0.02);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    thump.connect(tg); tg.connect(master); tg.connect(reverb);
    thump.start(t); thump.stop(t + 1.5);

    steam(2.4, 0.11);
    for (let i = 0; i < 12; i++) later(() => crackle(true), 80 + i * rnd(60, 180));
  }

  /* 火候跃迁：风箱猛送 + 火舌窜起 + 一串爆裂 */
  function surge() {
    if (!ensure()) return;
    bellows();
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.exponentialRampToValueAtTime(1800, t + 0.4);
    lp.frequency.exponentialRampToValueAtTime(380, t + 1.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    src.connect(lp).connect(g);
    g.connect(master); g.connect(reverb);
    src.start(t, rnd(0, 2), 1.4);
    for (let i = 0; i < 6; i++) later(() => crackle(i % 2 === 0), 40 + i * rnd(30, 90));
  }

  function puff() {
    // 停火/盖章般的一记短促泄气
    steam(0.55, 0.06);
    crackle(true);
  }

  /* 炉体受热的金属轻响：短促的金属共振 */
  function creak() {
    const t = ctx.currentTime;
    const base = rnd(980, 2300);
    [1, 1.83].forEach((mul, i) => {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(base * mul, t);
      o.frequency.exponentialRampToValueAtTime(base * mul * rnd(0.92, 0.98), t + 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime((i ? 0.014 : 0.026) * (0.5 + intensity * 0.8), t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + rnd(0.16, 0.34));
      const pan = ctx.createStereoPanner();
      pan.pan.value = rnd(-0.6, 0.6);
      o.connect(g).connect(pan);
      pan.connect(master); pan.connect(reverb);
      o.start(t); o.stop(t + 0.4);
    });
  }

  /* ---------------- 调度循环 ---------------- */
  function crackleLoop() {
    if (!enabled) return;
    const density = mode === "burning" ? 5 + intensity * 24
      : mode === "done" ? 2.2
      : mode === "paused" ? 2.2
      : 2.4;
    const delay = (-Math.log(1 - Math.random()) / Math.max(0.4, density)) * 1000;
    later(() => {
      if (Math.random() < 0.16) pop(); else crackle(Math.random() < 0.14);
      // 真实炭火是「簇状」的：一串小爆裂挤在一起
      if (Math.random() < (mode === "burning" ? 0.3 : 0.12)) {
        const n = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) later(() => crackle(false), 25 + i * rnd(18, 55));
      }
      crackleLoop();
    }, delay);
  }

  function bubbleLoop() {
    if (!enabled) return;
    const active = mode === "burning" ? clamp(intensity, 0.2, 1.3) : mode === "done" ? 0.55 : 0.12;
    const density = 1.2 + active * 6.5;
    const delay = (-Math.log(1 - Math.random()) / density) * 1000;
    later(() => { bubble(); bubbleLoop(); }, delay);
  }

  function bellowsLoop() {
    if (!enabled) return;
    const active = mode === "burning";
    const delay = active ? rnd(2400, 4200) : rnd(9000, 15000);
    later(() => { if (active || Math.random() < 0.35) bellows(); bellowsLoop(); }, delay);
  }

  function creakLoop() {
    if (!enabled) return;
    const delay = mode === "burning" ? rnd(3800, 7600) : rnd(11000, 20000);
    later(() => {
      if (mode === "burning" && intensity > 0.45) creak();
      creakLoop();
    }, delay);
  }

  function steamLoop() {
    if (!enabled) return;
    later(() => {
      if (mode === "burning" && intensity > 0.85 && Math.random() < 0.5) steam(rnd(0.5, 1.1), 0.035);
      steamLoop();
    }, rnd(5000, 11000));
  }

  const LOOPS = [crackleLoop, bubbleLoop, bellowsLoop, creakLoop, steamLoop];

  /* ---------------- 状态与音量 ---------------- */
  function applyMix() {
    if (!ctx || !beds) return;
    const t = ctx.currentTime;
    const lvl = clamp(intensity, 0, 1.5);
    let roar = 0.042, hiss = 0.007, hum = 0.02, lp = 220;
    if (mode === "burning") {
      roar = 0.1 + lvl * 0.15;
      hiss = 0.008 + lvl * 0.034;
      hum = 0.02 + lvl * 0.02;
      lp = 200 + lvl * 320;
    } else if (mode === "paused") {
      roar = 0.028; hiss = 0.005; hum = 0.014; lp = 150;
    } else if (mode === "done") {
      roar = 0.035; hiss = 0.006; hum = 0.018; lp = 260;
    }
    beds.roarGain.gain.setTargetAtTime(roar, t, 0.4);
    beds.hissGain.gain.setTargetAtTime(hiss, t, 0.4);
    beds.humGain.gain.setTargetAtTime(hum, t, 0.6);
    beds.roarLP.frequency.setTargetAtTime(lp, t, 0.5);
    beds.hissBP.frequency.setTargetAtTime(mode === "burning" ? 1200 + lvl * 1400 : 900, t, 0.6);
  }

  function ensure() {
    if (!enabled) return false;
    if (!ctx) {
      if (!build()) return false;
      startLoops();
      started = true;
    }
    if (ctx.state === "suspended") ctx.resume();
    master.gain.setTargetAtTime(0.8 * volume, ctx.currentTime, 0.5);
    startLoops();
    applyMix();
    return true;
  }

  /* ---------------- 对外 API ---------------- */
  const api = {
    /** 首次用户手势后调用：解锁音频并开始环境声 */
    ensure() { return ensure(); },
    isOn() { return enabled; },
    isReady() { return !!ctx && ctx.state === "running"; },

    toggle() {
      enabled = !enabled;
      if (enabled) {
        ensure();
        setTimeout(() => { if (enabled) api.puff(); }, 160);
      } else if (ctx) {
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
        stopTimers();
      }
      return enabled;
    },

    setEnabled(v) {
      if (v === enabled) return enabled;
      return api.toggle();
    },

    setState(s) {
      if (mode === s) { applyMix(); return; }
      mode = s;
      if (!ctx) return;
      if (mode === "paused") puff();
      applyMix();
    },

    level(v) {
      intensity = clamp(v, 0, 1.6);
      if (ctx && mode === "burning") applyMix();
    },

    ignite,
    finish,
    puff,
    surge,

    setVolume(v) {
      volume = Math.max(0, Math.min(1, Number(v)));
      if (ctx) master.gain.setTargetAtTime(enabled ? 0.8 * volume : 0, ctx.currentTime, 0.2);
      return volume;
    },

    getVolume() { return volume; },

    analyser() {
      if (!ctx) return null;
      if (!analyser) {
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.75;
        master.connect(analyser);
      }
      return analyser;
    },

    debug() {
      return {
        ctx: ctx ? ctx.state : null,
        enabled, mode,
        intensity: +intensity.toFixed(2),
        master: master ? +master.gain.value.toFixed(3) : null,
        loopsOn
      };
    },

    suspend() {
      if (ctx && ctx.state === "running") ctx.suspend();
    },
    resume() {
      if (enabled && ctx && ctx.state === "suspended") ctx.resume();
    }
  };

  /* 页面隐藏时静音，回来再续 */
  document.addEventListener("visibilitychange", () => {
    hidden = document.hidden;
    if (!ctx) return;
    if (hidden) {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    } else if (enabled) {
      ctx.resume();
      master.gain.setTargetAtTime(0.8 * volume, ctx.currentTime, 0.5);
    }
  });

  return api;
})();
