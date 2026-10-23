#!/usr/bin/env node
/**
 * 玄炉 XUANFORGE · 仓库自检
 * - JS 数据层结构与数量
 * - 页面引用资源是否存在
 * - README 图片链接
 * - 敏感信息 / 个人绝对路径扫描
 *
 * 用法：node tools/check.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const errors = [];
const warnings = [];
let checks = 0;

function ok(cond, message) {
  checks++;
  if (!cond) errors.push(message);
}
function warn(cond, message) {
  checks++;
  if (!cond) warnings.push(message);
}
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}
function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/* ---------- 1. 数据层 ---------- */
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(read("js/data.js"), sandbox, { filename: "js/data.js" });
const XF = sandbox.window.XF;
ok(!!XF, "js/data.js 未导出 window.XF");

const REQUIRED_MODEL_FIELDS = [
  "id", "name", "org", "mod", "params", "license", "rank", "vram",
  "trainers", "badge", "note", "ratings", "tags", "trigger"
];
const mods = Object.keys(XF.MODS);
ok(XF.MODELS.length >= 40, `模型数量过少：${XF.MODELS.length}`);
ok(new Set(XF.MODELS.map(m => m.id)).size === XF.MODELS.length, "模型 id 存在重复");

for (const m of XF.MODELS) {
  for (const f of REQUIRED_MODEL_FIELDS) {
    ok(m[f] !== undefined && m[f] !== "", `模型 ${m.id} 缺少字段 ${f}`);
  }
  ok(mods.includes(m.mod), `模型 ${m.id} 的模态非法：${m.mod}`);
  ok(Array.isArray(m.trainers) && m.trainers.length > 0, `模型 ${m.id} 缺少训练器`);
  ok(Array.isArray(m.ratings) && m.ratings.length === 4, `模型 ${m.id} ratings 应为 4 项`);
  ok(Array.isArray(m.tags) && m.tags.length > 0, `模型 ${m.id} 缺少 tags`);
}

ok(XF.RECIPES.length >= 12, `丹方数量过少：${XF.RECIPES.length}`);
const modelIds = new Set(XF.MODELS.map(m => m.id));
for (const r of XF.RECIPES) {
  ok(modelIds.has(r.modelId), `丹方 ${r.id} 引用了不存在的模型 ${r.modelId}`);
  ok(r.params && r.params.rank && r.params.lr, `丹方 ${r.id} 缺少关键参数`);
  ok(mods.includes(r.mod), `丹方 ${r.id} 的模态非法：${r.mod}`);
}
ok(XF.TOOLS.length >= 12, `训练器数量过少：${XF.TOOLS.length}`);
ok(XF.PLATFORMS.length >= 10, `平台数量过少：${XF.PLATFORMS.length}`);
ok(XF.SOURCES.length >= 12, `来源数量过少：${XF.SOURCES.length}`);
for (const s of XF.SOURCES) {
  ok(/^https?:\/\//.test(s.u), `来源 URL 非法：${s.u}`);
}

/* ---------- 2. 资源引用 ---------- */
const html = read("index.html");
for (const match of html.matchAll(/(?:src|href)="((?:css|js)\/[^"]+)"/g)) {
  ok(exists(match[1]), `index.html 引用的资源不存在：${match[1]}`);
}
for (const f of ["css/base.css", "css/furnace.css", "css/views.css",
                 "js/data.js", "js/furnace.js", "js/sound.js", "js/train.js", "js/app.js"]) {
  ok(exists(f), `缺少资源：${f}`);
}

/* ---------- 3. README 图片 ---------- */
for (const file of ["README.md", "README.en.md", "desktop/README.md"]) {
  if (!exists(file)) continue;
  const text = read(file);
  const base = path.dirname(path.join(ROOT, file));
  for (const match of text.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const target = match[1];
    if (/^https?:\/\//.test(target)) continue;
    const resolved = path.resolve(base, target);
    ok(fs.existsSync(resolved), `${file} 中的图片不存在：${target}`);
  }
}

/* ---------- 4. 敏感信息 / 绝对路径 ---------- */
const TEXT_EXT = /\.(md|html|css|js|json|yml|yaml|sh|swift|plist|txt)$/;
const secretPatterns = [
  [/gh[pousr]_[A-Za-z0-9]{20,}/, "GitHub token"],
  [/sk-[A-Za-z0-9]{20,}/, "API key"],
  [/AKIA[0-9A-Z]{16}/, "AWS key"],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "私钥"]
];
for (const file of walk(ROOT)) {
  if (!TEXT_EXT.test(file)) continue;
  const rel = path.relative(ROOT, file);
  const text = fs.readFileSync(file, "utf8");
  for (const [re, label] of secretPatterns) {
    ok(!re.test(text), `${rel} 疑似包含 ${label}`);
  }
  if (rel !== path.join("tools", "check.js")) {
    ok(!/\/Users\/[A-Za-z0-9._-]+\//.test(text), `${rel} 包含本机绝对路径`);
  }
}

/* ---------- 5. 桌面壳 ---------- */
for (const f of ["desktop/macos/main.swift", "desktop/macos/Info.plist",
                 "desktop/macos/build.sh", "desktop/macos/icon.html"]) {
  ok(exists(f), `缺少桌面端文件：${f}`);
}
warn(/CFBundleIdentifier/.test(read("desktop/macos/Info.plist")), "Info.plist 缺少 CFBundleIdentifier");

/* ---------- 汇总 ---------- */
if (warnings.length) {
  console.log(`⚠ ${warnings.length} 个警告：`);
  warnings.forEach(w => console.log("  - " + w));
}
if (errors.length) {
  console.error(`✗ 自检失败：${errors.length} 个问题`);
  errors.forEach(e => console.error("  - " + e));
  process.exit(1);
}
console.log(`✓ 自检通过 · ${checks} 项检查`);
console.log(`  模型 ${XF.MODELS.length} · 丹方 ${XF.RECIPES.length} · 训练器 ${XF.TOOLS.length} · 平台 ${XF.PLATFORMS.length} · 来源 ${XF.SOURCES.length}`);
