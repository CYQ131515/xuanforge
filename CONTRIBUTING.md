# 贡献指南

感谢你愿意一起炼这炉丹。

## 可以贡献什么

- **调研数据**：新的可训 LoRA 模型、新的训练器、新的社区平台、过时的参数修正。
- **丹方**：有官方文档或可复现实验支撑的超参配方。
- **交互与视觉**：炉体动画、HUD、移动端适配、无障碍改进。
- **桌面端**：macOS 壳的体验优化；Windows/Linux 壳的构建方案（需可复现）。
- **文档**：错别字、来源补充、英文翻译。

## 数据更新流程

绝大多数内容都在 [`js/data.js`](js/data.js)：

1. 修改对应数组（`MODELS` / `RECIPES` / `TOOLS` / `PLATFORMS` / `SOURCES`）。
2. 每条数据尽量注明来源（配方里的 `src`、来源里的 `u`）。
3. 跑一遍自检：

```bash
node tools/check.js
```

4. 打开页面确认数量、筛选、搜索、丹方套用没有异常。

> 如果数据来自第三方报道或估算，请在文案里标注「第三方估计」，不要把推测写成官方事实。

## 代码约定

- 前端保持 **零依赖、零构建**：原生 HTML / CSS / JS，`file://` 与静态服务器都能跑。
- 不引入会破坏离线运行的 CDN 资源。
- 新增/修改 JS 通过 `node --check js/xxx.js`；CSS 尽量复用 `css/base.css` 里的设计变量。
- 动画要尊重 `prefers-reduced-motion`；新交互要考虑移动端。

## 桌面端

```bash
bash desktop/macos/build.sh
dist/玄炉.app/Contents/MacOS/XuanForge --smoke-test
```

构建脚本会自动选择可用 SDK、编译通用二进制、生成图标、签名并产出 ZIP。
需要 macOS + Xcode Command Line Tools。改动 `main.swift` 后请在 PR 中贴出冒烟测试输出。

## 提交 PR

1. Fork 并开分支：`feat/xxx` / `fix/xxx` / `data/xxx`。
2. 保持提交信息清晰（中文或英文都可以）。
3. 在 PR 描述里说明：改了什么、为什么、怎么验证的。
4. 不要提交构建产物（`dist/`）、个人路径、密钥或未授权的素材。

## 许可

提交的代码与内容默认以 [MIT](LICENSE) 许可发布。
模型名称与第三方资料归各自所有者；引用时请保留来源链接。
