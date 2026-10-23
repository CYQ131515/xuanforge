# 玄炉 · 桌面端（macOS）

把「玄炉 XUANFORGE」打包成真正的桌面应用：**原生 AppKit 窗口 + WKWebView**，不是浏览器标签页，也不是套壳的假全屏。零第三方依赖，应用本体约 2 MB。

![玄炉桌面版](../screenshots/10-desktop.jpg)

---

## 产物

| 产物 | 位置 | 说明 |
|---|---|---|
| **玄炉.app** | `dist/玄炉.app` | 可直接双击运行，已 ad-hoc 签名 |
| **玄炉-macOS.zip** | `dist/玄炉-macOS.zip` | 分发用压缩包（约 1.8 MB），解压即得 .app |
| **源码 / 构建脚本** | `desktop/macos/` | `main.swift`、`Info.plist`、`build.sh`、`icon.html` |

> `dist/` 是构建产物，已被 `.gitignore` 排除；可用 `OUT_DIR=/some/path` 指定其他输出目录。

- 通用二进制：**Apple Silicon (arm64) + Intel (x86_64)**
- 最低系统：**macOS 12.0**
- 图标：1024px 手绘 SVG → `AppIcon.icns`

## 安装

1. 构建，或解压 `dist/玄炉-macOS.zip`（也可直接使用 `dist/玄炉.app`）
2. 把 `玄炉.app` 拖进「应用程序」文件夹
3. 双击打开。如果 macOS 提示「无法验证开发者」：
   - 右键 → 打开 → 再点「打开」，或
   - 终端执行：`xattr -dr com.apple.quarantine "/Applications/玄炉.app"`

> 当前是 **ad-hoc 签名**，适合本机与朋友间分发。若要公开发布，需要用 Apple Developer ID 签名并做公证（notarization）。

## 构建

```bash
bash desktop/macos/build.sh
```

脚本会：

1. 自动挑选可用的 macOS SDK（本机 Swift 6.3 与 macOS 27 SDK 不匹配，会自动回退到 26.5 SDK）
2. 编译 arm64 与 x86_64 两个架构，`lipo` 成通用二进制
3. 从 `icon-1024.png` 生成 `AppIcon.icns`
4. 打包 `index.html` / `css` / `js` 到 `Contents/Resources/web`
5. ad-hoc 签名、生成 ZIP，并尝试生成 DMG

> 若 DMG 创建失败（例如在受限的自动化环境里无法挂载磁盘镜像），ZIP 仍然可用；在普通终端里重新运行脚本即可生成 DMG。

## 原生能力

| 能力 | 实现 |
|---|---|
| 原生窗口 / 交通灯按钮 | `NSWindow`，透明标题栏 + 隐藏标题，深色背景无白闪 |
| 窗口记忆 | `setFrameAutosaveName`，下次打开恢复大小位置 |
| 全屏 | `Cmd + Ctrl + F`，`fullScreenPrimary` |
| 菜单栏 | 玄炉 / 编辑 / 显示 / 窗口 / 帮助，含重新载入、缩放、全屏、观炉须知快捷入口 |
| 外链处理 | 模型/平台链接自动用默认浏览器打开，不在应用内跳走 |
| 音频 | `mediaTypesRequiringUserActionForPlayback = []`，WebAudio 炉音正常工作 |
| 本地资源 | 自定义 `xuanforge://` scheme（而非 `file://`），`localStorage` 等来源能力正常 |
| 开发者工具 | `isInspectable = true`，可用 Safari 开发菜单检查 |
| 无障碍 | 系统深色外观、`prefers-reduced-motion` 生效 |

## 快捷键

| 快捷键 | 功能 |
|---|---|
| `Space` | 开炉 / 停火 / 续火 |
| `1–7` | 切换七个页面 |
| `Esc` | 关闭弹层 |
| `Cmd + R` | 重新载入 |
| `Cmd + Ctrl + F` | 全屏 |
| `Cmd + +` / `Cmd + -` / `Cmd + 0` | 缩放 |
| `Cmd + Q` | 退出 |

## 已验证（桌面端冒烟测试）

应用内置 `--smoke-test` 参数，启动后自动执行一遍真实交互并输出结果：

```bash
"./dist/玄炉.app/Contents/MacOS/XuanForge" --smoke-test
```

最近一次结果：

```
SMOKE_BOOT  {"inner":[1440,900],"state":"idle","rail":7,"furnace":true,
             "desktop":true,"sound":"object","train":"object",
             "protocol":"xuanforge:","storage":"ok", ...}
SMOKE_TRAIN {"state":"burning","phase":"筑基炼形","temp":"247","logs":9,
             "soundCtx":"running","soundMode":"burning"}
SMOKE_DONE  {"modal":true,"file":"xu_style_flux3_klein_r32.safetensors","view":"furnace"}
SMOKE_NAV   {"view":"codex","cards":45}
```

覆盖：页面加载 → 开炉 → 炉音上下文启动 → 丹成弹窗 → 菜单导航到模型谱（45 张卡）。

## 结构

```
desktop/macos/
├── main.swift        # 原生壳：窗口、菜单、WKWebView、自定义 scheme、外链、冒烟测试
├── Info.plist        # Bundle 信息（名称 玄炉 / com.xuanforge.desktop / v0.2.0）
├── build.sh          # 一键构建：SDK 选择 → 双架构编译 → 图标 → 打包 → 签名 → ZIP/DMG
├── icon.html         # 应用图标源文件（1024×1024 SVG）
└── icon-1024.png     # 渲染好的图标母版
```

## 跨平台说明

Windows / Linux 没有包含在本仓库里：它们需要另一套壳（Electron 或 Tauri）与对应平台的签名/安装包流程，本机无法验证，所以不做未经测试的承诺。

同一套 Web 资源（`index.html` + `css/` + `js/`）可以直接被 Electron / Tauri 复用；需要时我可以按目标平台补一版可构建的配置。
