# 玄炉 XUANFORGE

**A cyber-alchemy furnace for LoRA training** — an interactive product prototype that turns LoRA fine-tuning into a Chinese cultivation ("修仙") ritual, with a native macOS desktop shell.

> Train the furnace, watch the fire, wait for the elixir.  
> Image / video / audio / language — many models, one furnace.

[中文 README](README.md) · [License: MIT](LICENSE) · [Research brief (Chinese)](docs/LoRA生态调查-2026.md)

![XuanForge desktop app](screenshots/10-desktop.jpg)

## What is this

A **design + engineering prototype** for a LoRA training workbench:

- **Web prototype** — zero dependencies, zero build; open `index.html` and it runs. Canvas particles + SVG furnace + CSS light compose a cyber cauldron; starting a training run ignites the furnace, ramps from "gentle fire" to "intense fire", and ends with a "elixir forged" seal.
- **Native macOS app** — Swift + WKWebView, universal binary (Apple Silicon + Intel), native menus, full screen, window autosave, custom `xuanforge://` asset scheme. ~2 MB, no third-party dependencies.
- **Real research data** — 45 trainable models, 13 sourced recipes, 14 trainers, 12 community platforms (snapshot: 2026-10). The data lives in [`js/data.js`](js/data.js) and powers every page.

> Training is **simulated**: the prototype does not download weights, use a GPU, or produce safetensors. It validates product experience, information architecture and visual direction.

## Quick start

### Web

```bash
cd xuanforge
python3 -m http.server 8765
# open http://127.0.0.1:8765/
```

Or just double-click `index.html`.

### macOS app

```bash
bash desktop/macos/build.sh
open dist/玄炉.app
```

Requires Xcode Command Line Tools (`swiftc`, `sips`, `iconutil`, `codesign`). The build script selects a compatible SDK, compiles both architectures, generates the app icon, signs ad-hoc and produces `dist/玄炉.app` + `dist/玄炉-macOS.zip`.

The app has a built-in smoke test:

```bash
dist/玄炉.app/Contents/MacOS/XuanForge --smoke-test
```

## Seven pages

| Page | Question it answers |
|---|---|
| **丹房 Furnace** | Where is the run now? Ignite / pause / resume / trial run, live heat, VRAM, LR, progress, loss curve, logs |
| **模型谱 Codex** | Which models can be fine-tuned? Filter by image / edit / video / audio / language |
| **丹方 Recipes** | Which hyperparameters? 13 sourced recipes, one-click apply |
| **灵材 Materials** | Is my dataset good? Local drag & drop, captions, dataset health |
| **功法 Methods** | How to train, with which tool? LoRA/LoHa/LoKr/DoRA/PiSSA, 14 trainers, pitfalls |
| **丹市 Market** | Where to find models and share adapters? Civitai / LiblibAI / HF / ModelScope ... |
| **天机录 Logs** | What did each run leave behind? Live log + run archive + export |

## Visual & sound design

- **Cyber × cultivation**: ink-black base, jade qi, elixir gold, cinnabar seal; Songti display type, mono data type.
- **The furnace**: SVG body (tripod cauldron, lid, belly window, circuit inlay) + Canvas particles (flames, embers, smoke, qi) + CSS rune rings; a single `--heat` variable drives lid lift, glow, temperature and ring speed.
- **Sound**: six synthesized layers (fire roar, charcoal crackles, bubbling elixir, bellows, metal creaks, steam) plus ignition and a bronze bell at completion. No audio assets — everything is WebAudio.

## Repository layout

```
├── index.html              # app shell + furnace SVG
├── css/                    # design system, furnace, views
├── js/
│   ├── data.js             # ★ research data (models / recipes / tools / platforms / sources)
│   ├── furnace.js          # canvas particle engine
│   ├── sound.js            # WebAudio soundscape
│   ├── train.js            # training simulation state machine
│   └── app.js              # router / views / panel / dataset
├── desktop/
│   ├── macos/              # Swift + WKWebView shell, build script, icon
│   └── README.md           # install / build / verification
├── docs/
│   └── LoRA生态调查-2026.md
├── screenshots/
└── tools/                  # QA scripts + repository self-check
```

## Checks

```bash
node tools/check.js         # data integrity, assets, README links, secret scan
```

CI runs JS syntax checks, the repository self-check and `bash -n desktop/macos/build.sh` on every push.

## License

Code and original content are released under the **MIT License**. Model names and trademarks (FLUX, Qwen, Wan, Krea, Anima, ACE-Step, GPT-SoVITS, Civitai, LiblibAI, etc.) belong to their owners and are used only for factual comparison. The research snapshot is a point-in-time summary — always check the official model cards and licenses.

## Sources

Key references: [FLUX 3 Klein docs](https://docs.bfl.ml/flux_3/flux3_image_klein) · [Qwen-Image 2.1 release](https://qwenimages.com/zh/blog/qwen-image-2-1-release) · [ai-toolkit](https://github.com/ostris/ai-toolkit) · [musubi-tuner](https://github.com/kohya-ss/musubi-tuner) · [LoRA Training Guide 2026](https://airmore.ai/lora-training-guide.html) · [ACE-Step](https://github.com/ace-step/ACE-Step) · [GPT-SoVITS](https://github.com/RVC-Boss/GPT-SoVITS) · [LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory).

See the full list in [docs/LoRA生态调查-2026.md](docs/LoRA生态调查-2026.md).
