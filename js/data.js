/* ============================================================
   玄炉 XUANFORGE · data.js
   调研数据层（2026-10 快照）
   说明：模型/工具/平台信息来自官方文档与社区公开资料；
   “口碑”评分为综合社区反馈的编辑判断，非严格基准测试。
   ============================================================ */
window.XF = (function () {
  "use strict";

  const RESEARCH_DATE = "2026-10-23";

  /* ---------------- 炉鼎（可训 LoRA 的模型） ---------------- */
  const MODELS = [
    /* ========== 图像 · 通用/写实 ========== */
    {
      id: "flux3-klein", name: "FLUX.3 Image Klein Base", org: "Black Forest Labs",
      mod: "image", params: "紧凑开放权重 · RTX 3090 可跑", license: "BFL 非商用/开放权重",
      rank: "32", vram: "24G", trainers: ["ai-toolkit", "Diffusers", "ComfyUI"],
      badge: "新晋", hot: true,
      note: "官方明确 <em>Base 版用于 LoRA</em>：几十张图、单卡、rank 32 就能学会一种风格或编辑；训出的 LoRA 还能直接跑在蒸馏版上。必须配 prompt upsampler（约 +28G 显存，可离线跑）。",
      ratings: [["一致性", 5], ["风格", 5], ["文字", 4], ["生态", 4]],
      tags: ["文生图", "图像编辑", "多参考图", "提示词增强"],
      trigger: "xu_style"
    },
    {
      id: "flux2-klein-9b", name: "FLUX.2 [klein] 9B Base", org: "Black Forest Labs",
      mod: "image", params: "9B / 4B 两档", license: "开放权重（需接受许可）",
      rank: "16–32", vram: "24G", trainers: ["ai-toolkit", "musubi-tuner"],
      badge: "主力", hot: false,
      note: "FLUX.2 世代的小尺寸基座，角色一致性与指令编辑均衡；社区教程与 ComfyUI 工作流最厚。适合作为 <em>从 FLUX.1 迁移</em>的第一站。",
      ratings: [["一致性", 5], ["风格", 4], ["文字", 4], ["生态", 5]],
      tags: ["文生图", "编辑", "角色"],
      trigger: "xu_char"
    },
    {
      id: "flux2-dev", name: "FLUX.2 [dev]", org: "Black Forest Labs",
      mod: "image", params: "旗舰大杯", license: "非商用开放权重",
      rank: "16–32", vram: "40G+", trainers: ["ai-toolkit", "musubi-tuner", "diffusion-pipe"],
      badge: "旗舰", hot: false,
      note: "FLUX.2 系列上限最高的一档，细节与文字强，但显存与时间都不客气；多数个人炼丹师会先用 klein 试方，再上 dev 定稿。",
      ratings: [["一致性", 5], ["风格", 5], ["文字", 5], ["生态", 4]],
      tags: ["文生图", "高保真", "重显存"],
      trigger: "xu_style"
    },
    {
      id: "qwen-image-21", name: "Qwen-Image 2.1", org: "阿里通义千问",
      mod: "image", params: "7B DiT + Qwen3-VL 8B 编码器", license: "Qwen Research License",
      rank: "16", vram: "24G", trainers: ["musubi-tuner", "ai-toolkit", "Diffusers"],
      badge: "新晋", hot: true,
      note: "2026-09-20 发布：原生 RGBA 透明通道、2K 原生输出、最多 10 张参考图与涂抹/蒙版局部编辑。文生图与编辑同一条流水线，<em>电商/贴纸/游戏素材</em>的 LoRA 首选。",
      ratings: [["一致性", 5], ["风格", 4], ["文字", 5], ["生态", 4]],
      tags: ["RGBA", "2K", "多图编辑", "中文文字"],
      trigger: "xu_product"
    },
    {
      id: "qwen-image-21-turbo", name: "Qwen-Image 2.1 Turbo", org: "阿里通义千问",
      mod: "image", params: "8 步蒸馏版", license: "Qwen Research License",
      rank: "16", vram: "24G", trainers: ["ai-toolkit", "musubi-tuner"],
      badge: "高速", hot: false,
      note: "2.1 的 8 步加速权重。适合作为训练时的<em>验证采样器</em>，出图快；训练本身仍建议在非蒸馏基座或官方指定版本上做。",
      ratings: [["一致性", 4], ["风格", 4], ["文字", 4], ["生态", 3]],
      tags: ["8 步", "快速采样", "验证用"],
      trigger: "xu_product"
    },
    {
      id: "qwen-image-2512", name: "Qwen-Image 2512", org: "阿里通义千问",
      mod: "image", params: "2.1 之前的版本线", license: "Qwen License",
      rank: "16", vram: "24G", trainers: ["musubi-tuner", "ai-toolkit"],
      badge: "稳定", hot: false,
      note: "2.1 发布前的主力版本，中文文字与海报能力在同代里突出；生态工作流与 LoRA 存量最多。<em>注意与 2.1 的键名/版本差异</em>，别混用缓存。",
      ratings: [["一致性", 4], ["风格", 4], ["文字", 5], ["生态", 5]],
      tags: ["中文海报", "文字", "存量多"],
      trigger: "xu_poster"
    },
    {
      id: "z-image", name: "Z-Image Base (6B)", org: "通义 MAI",
      mod: "image", params: "6B 单流 DiT", license: "开放权重",
      rank: "32", vram: "16G", trainers: ["musubi-tuner", "ai-toolkit", "SimpleTuner"],
      badge: "性价比", hot: true,
      note: "小、快、便宜，是 2026 年<em>个人单卡</em>炼丹的性价比之王。官方 Musubi 示例 rank 32 / LR 1e-4 / shift 2.0；Turbo 蒸馏版要做 LoRA 需走 de-distill 或专用适配路线。",
      ratings: [["一致性", 4], ["风格", 4], ["文字", 3], ["生态", 4]],
      tags: ["6B", "低显存", "快速"],
      trigger: "xu_style"
    },
    {
      id: "krea-2", name: "Krea 2 RAW", org: "Krea",
      mod: "image", params: "开放权重 RAW / Turbo", license: "开放权重",
      rank: "32", vram: "24G", trainers: ["musubi-tuner", "ai-toolkit"],
      badge: "审美流", hot: true,
      note: "以审美与质感著称的一族：Musubi 示例 rank/alpha 32/32、LR 1e-4、bf16；1024 用固定 shift 2.5，变分辨率用 krea2_shift。<em>RAW 出样要开 CFG</em>，Turbo 才低步数关 CFG。",
      ratings: [["一致性", 4], ["风格", 5], ["文字", 3], ["生态", 4]],
      tags: ["审美", "质感", "RAW/Turbo"],
      trigger: "xu_aesthetic"
    },
    {
      id: "anima", name: "Anima Base v1.0", org: "CircleStone Labs",
      mod: "image", params: "二次元向 DiT + Qwen3 文本编码器", license: "开放权重",
      rank: "8", vram: "16G", trainers: ["sd-scripts", "SimpleTuner", "OneTrainer", "diffusion-pipe"],
      badge: "二次元", hot: false,
      note: "专门的二次元训练路径：sd-scripts 提供 <em>anima_train_network.py</em>，示例 rank 8 / alpha 1 / LR 1e-4 / AdamW8bit / bf16。已被主流训练器全面收编。",
      ratings: [["一致性", 4], ["风格", 5], ["文字", 2], ["生态", 3]],
      tags: ["二次元", "动漫", "专用线"],
      trigger: "xu_anime"
    },
    {
      id: "sdxl", name: "SDXL / Pony / Illustrious / NoobAI", org: "Stability + 社区",
      mod: "image", params: "SDXL 生态（Pony V6 仍属 SDXL）", license: "多许可并存",
      rank: "16–32", vram: "12–16G", trainers: ["sd-scripts (kohya_ss)", "OneTrainer", "SimpleTuner"],
      badge: "经典", hot: false,
      note: "最成熟、教程最多、显卡要求最低。建议 rank 16–32、alpha=rank、UNet LR 1e-4、<em>先冻结文本编码器</em>。NoobAI 要注意 eps/v-pred 分支别选错。",
      ratings: [["一致性", 4], ["风格", 4], ["文字", 2], ["生态", 5]],
      tags: ["低门槛", "教程多", "角色/风格"],
      trigger: "xu_sdxl"
    },
    {
      id: "hidream-o1", name: "HiDream-O1-Image", org: "HiDream.ai",
      mod: "image", params: "开放权重 DiT", license: "开放权重",
      rank: "16–32", vram: "24G", trainers: ["musubi-tuner", "ai-toolkit", "SimpleTuner"],
      badge: "实验", hot: false,
      note: "新架构支持已进 Musubi / AI Toolkit，社区样例比 FLUX 系少；适合想尝鲜、且能自己排错的人。",
      ratings: [["一致性", 3], ["风格", 4], ["文字", 4], ["生态", 3]],
      tags: ["新架构", "文生图"],
      trigger: "xu_style"
    },
    {
      id: "ideogram-4", name: "Ideogram 4 (fp8)", org: "Ideogram",
      mod: "image", params: "开放 fp8 权重", license: "需核对官方许可",
      rank: "16–32", vram: "24–40G", trainers: ["musubi-tuner", "ai-toolkit"],
      badge: "文字强", hot: false,
      note: "以排版/文字渲染见长；Musubi 有独立 timestep 采样器（ideogram4_shift），文本编码器为 Qwen3-VL。<em>fp8 权重直训</em>是这一族的常见做法。",
      ratings: [["一致性", 4], ["风格", 4], ["文字", 5], ["生态", 3]],
      tags: ["排版", "文字", "fp8"],
      trigger: "xu_type"
    },
    {
      id: "chroma", name: "Chroma1-Base", org: "lodestones",
      mod: "image", params: "FLUX.1 Schnell 衍生", license: "Apache-2.0",
      rank: "16–32", vram: "16–24G", trainers: ["ai-toolkit", "sd-scripts", "diffusion-pipe"],
      badge: "开源", hot: false,
      note: "从 FLUX.1-schnell 解蒸馏而来，Apache-2.0 许可对商用友好，社区 LoRA 兼容性不错。",
      ratings: [["一致性", 3], ["风格", 4], ["文字", 3], ["生态", 3]],
      tags: ["Apache-2.0", "商用友好"],
      trigger: "xu_style"
    },
    {
      id: "lumina2", name: "Lumina-Image 2.0", org: "Alpha-VLLM",
      mod: "image", params: "2B 级 DiT", license: "开放权重",
      rank: "16", vram: "12–16G", trainers: ["ai-toolkit", "sd-scripts"],
      badge: "轻量", hot: false,
      note: "更轻的 DiT 路线，适合低显存与快速实验；生态体量小于 FLUX/Qwen 系。",
      ratings: [["一致性", 3], ["风格", 3], ["文字", 3], ["生态", 2]],
      tags: ["轻量", "低显存"],
      trigger: "xu_style"
    },
    {
      id: "ernie-image", name: "ERNIE-Image", org: "百度",
      mod: "image", params: "开放权重", license: "需核对官方许可",
      rank: "16–32", vram: "24G", trainers: ["ai-toolkit"],
      badge: "国产", hot: false,
      note: "中文语义理解有优势的国产开放图像模型，已进入 AI Toolkit 支持列表；生态仍在成长。",
      ratings: [["一致性", 3], ["风格", 3], ["文字", 4], ["生态", 3]],
      tags: ["中文", "国产"],
      trigger: "xu_style"
    },

    /* ========== 图像 · 编辑 ========== */
    {
      id: "qwen-edit-2511", name: "Qwen-Image-Edit-2511", org: "阿里通义千问",
      mod: "edit", params: "编辑专用", license: "Qwen License",
      rank: "16", vram: "24G", trainers: ["musubi-tuner", "ai-toolkit"],
      badge: "编辑", hot: true,
      note: "图像编辑 LoRA 和文生图 LoRA 的<em>数据形态不同</em>：需要「原图 + 指令 + 目标图」三元组，光靠人像配文字学不会编辑操作。",
      ratings: [["指令遵循", 5], ["一致性", 5], ["生态", 4], ["显存", 3]],
      tags: ["图像编辑", "指令", "换装"],
      trigger: "xu_edit"
    },
    {
      id: "flux-kontext", name: "FLUX.1 Kontext dev", org: "Black Forest Labs",
      mod: "edit", params: "12B", license: "非商用",
      rank: "16–32", vram: "24G", trainers: ["musubi-tuner", "ai-toolkit", "SimpleTuner"],
      badge: "编辑", hot: false,
      note: "Kontext 的「指令编辑」能力是 FLUX 系最稳的之一；Musubi 支持独立缓存与训练。注意 T5 编码器缓存曾有训练模式残留的坑，建议重新缓存。",
      ratings: [["指令遵循", 4], ["一致性", 4], ["生态", 4], ["显存", 3]],
      tags: ["Kontext", "指令编辑"],
      trigger: "xu_edit"
    },
    {
      id: "hidream-e1", name: "HiDream-E1-1", org: "HiDream.ai",
      mod: "edit", params: "编辑模型", license: "开放权重",
      rank: "16–32", vram: "24G", trainers: ["ai-toolkit"],
      badge: "实验", hot: false,
      note: "HiDream 的编辑分支，AI Toolkit 已收录；适合做局部替换与风格保持类实验。",
      ratings: [["指令遵循", 3], ["一致性", 3], ["生态", 2], ["显存", 3]],
      tags: ["编辑", "局部替换"],
      trigger: "xu_edit"
    },
    {
      id: "krea2-edit", name: "Krea 2 Edit", org: "Krea",
      mod: "edit", params: "RAW / Turbo 编辑训练", license: "开放权重",
      rank: "16–32", vram: "24G", trainers: ["ai-toolkit"],
      badge: "新晋", hot: false,
      note: "Krea 2 的编辑训练路线，AI Toolkit 直接提供 Edit Training 选项；审美向修图 LoRA 可试。",
      ratings: [["指令遵循", 4], ["一致性", 4], ["生态", 3], ["显存", 3]],
      tags: ["编辑", "审美"],
      trigger: "xu_edit"
    },

    /* ========== 视频 ========== */
    {
      id: "wan22-a14b", name: "Wan 2.2 T2V/I2V A14B", org: "阿里万相",
      mod: "video", params: "14B MoE 双专家", license: "Apache-2.0",
      rank: "32", vram: "24–48G", trainers: ["musubi-tuner", "ai-toolkit", "diffusion-pipe"],
      badge: "主力", hot: true,
      note: "开源视频 LoRA 的第一选择。Musubi 示例 rank 32 / LR 2e-4 / shift 3.0 / AdamW8bit；<em>2.2 的高噪/低噪专家要分别处理 timestep</em>，别照抄 2.1 的配置。",
      ratings: [["动态", 5], ["一致性", 5], ["显存", 3], ["生态", 5]],
      tags: ["T2V", "I2V", "MoE", "81 帧"],
      trigger: "xu_motion"
    },
    {
      id: "wan22-5b", name: "Wan 2.2 TI2V 5B", org: "阿里万相",
      mod: "video", params: "5B 消费级", license: "Apache-2.0",
      rank: "16–32", vram: "12–16G", trainers: ["musubi-tuner", "ai-toolkit"],
      badge: "亲民", hot: true,
      note: "单卡 4090 甚至 4080 就能练视频 LoRA 的入口；先低分辨率短片段跑通，再抬分辨率与帧数。",
      ratings: [["动态", 4], ["一致性", 4], ["显存", 5], ["生态", 4]],
      tags: ["5B", "低显存", "短视频"],
      trigger: "xu_motion"
    },
    {
      id: "wan21-14b", name: "Wan 2.1 14B", org: "阿里万相",
      mod: "video", params: "14B", license: "Apache-2.0",
      rank: "32", vram: "24–48G", trainers: ["musubi-tuner", "ai-toolkit"],
      badge: "经典", hot: false,
      note: "存量 LoRA 与工作流最多的开源视频线；画质略逊 2.2，但社区经验与模型最全。",
      ratings: [["动态", 4], ["一致性", 4], ["显存", 3], ["生态", 5]],
      tags: ["T2V", "I2V", "存量多"],
      trigger: "xu_motion"
    },
    {
      id: "ltx-25", name: "LTX-2.5", org: "Lightricks",
      mod: "video", params: "官方训练套件", license: "开放权重",
      rank: "16", vram: "32G（低显存档）", trainers: ["LTX Trainer", "ai-toolkit"],
      badge: "官方套件", hot: true,
      note: "官方 <em>ltx-trainer</em> 把预处理、训练、验证收在一个仓库里，低显存 YAML 是 rank/alpha 16/16、LR 1e-4、batch 1、2000 步、INT8+检查点；标准配置建议 80G。",
      ratings: [["动态", 4], ["一致性", 3], ["显存", 3], ["生态", 4]],
      tags: ["官方训练器", "低显存 YAML", "快"],
      trigger: "xu_ltx"
    },
    {
      id: "minimax-h3", name: "MiniMax H3", org: "MiniMax",
      mod: "video", params: "音视频大模型", license: "需核对官方许可",
      rank: "16", vram: "16G（短片段）", trainers: ["musubi-tuner", "Fizgig"],
      badge: "音视频", hot: true,
      note: "同时生成画面与声音的大型模型。Musubi 示例 rank/alpha 16/16、LR 1e-4，且必须<em>选一条完整 loss 路线</em>（训练适配器/引导损失/教师匹配）；Fizgig 的 Fast 档则是 8/8、50 epochs、0.25MP。",
      ratings: [["动态", 5], ["一致性", 4], ["显存", 2], ["生态", 3]],
      tags: ["音频+视频", "有声视频", "大模型"],
      trigger: "xu_h3"
    },
    {
      id: "hunyuanvideo-15", name: "HunyuanVideo 1.5", org: "腾讯混元",
      mod: "video", params: "开放权重视频", license: "腾讯社区许可",
      rank: "16–32", vram: "24–48G", trainers: ["musubi-tuner", "SimpleTuner"],
      badge: "国产", hot: false,
      note: "中文语义与国风场景友好；Musubi 有独立架构页与 LoRA target。SimpleTuner 也有 HunyuanVideo quickstart。",
      ratings: [["动态", 4], ["一致性", 4], ["显存", 3], ["生态", 3]],
      tags: ["国产", "国风", "T2V"],
      trigger: "xu_motion"
    },
    {
      id: "framepack", name: "FramePack", org: "lllyasviel",
      mod: "video", params: "长视频帧打包", license: "Apache-2.0",
      rank: "16–32", vram: "16–24G", trainers: ["musubi-tuner"],
      badge: "长视频", hot: false,
      note: "以「长视频、低显存」著称，Musubi 有 FramePack 与单帧两条训练线；适合练镜头运动而不是单纯画风。",
      ratings: [["动态", 4], ["一致性", 3], ["显存", 4], ["生态", 3]],
      tags: ["长视频", "低显存"],
      trigger: "xu_motion"
    },
    {
      id: "kandinsky5", name: "Kandinsky 5", org: "Sber AI",
      mod: "video", params: "开放视频 DiT", license: "开放权重",
      rank: "16–32", vram: "24–48G", trainers: ["musubi-tuner"],
      badge: "实验", hot: false,
      note: "Musubi 支持的视频族之一，文本编码器为 CLIP-L/T5 组合；社区样本较少，适合实验向。",
      ratings: [["动态", 3], ["一致性", 3], ["显存", 3], ["生态", 2]],
      tags: ["实验", "视频"],
      trigger: "xu_motion"
    },

    /* ========== 音频 ========== */
    {
      id: "ace-step-15-xl", name: "ACE-Step 1.5 XL", org: "ACE Studio × StepFun",
      mod: "audio", params: "音乐生成基座（XL）", license: "Apache-2.0",
      rank: "16–32", vram: "8–16G", trainers: ["ACE-Step 官方训练脚本", "Fizgig", "ai-toolkit"],
      badge: "音乐", hot: true,
      note: "开源音乐生成里最适合做 LoRA 的一族：官方已放出 <em>LoRA 训练代码</em>，并有 Lyric2Vocal、Text2Samples、RapMachine 等现成 LoRA 与 StemGen（ControlNet-LoRA）。v1 起最低 8G 显存可跑推理。",
      ratings: [["音色风格", 5], ["音乐性", 5], ["效率", 4], ["生态", 4]],
      tags: ["音乐", "歌声", "LoRA 官方支持", "19 语种"],
      trigger: "xu_music"
    },
    {
      id: "ace-step-15", name: "ACE-Step 1.5", org: "ACE Studio × StepFun",
      mod: "audio", params: "3.5B 音乐基座", license: "Apache-2.0",
      rank: "16–32", vram: "8G+", trainers: ["ACE-Step 官方训练脚本", "Fizgig"],
      badge: "音乐", hot: false,
      note: "1.5 标准版，2026-01-28 发布；4 分钟音乐在 A100 上约 20 秒（官方 v1 数据），适合快速迭代 demo。",
      ratings: [["音色风格", 4], ["音乐性", 5], ["效率", 5], ["生态", 3]],
      tags: ["音乐", "快速生成"],
      trigger: "xu_music"
    },
    {
      id: "yue2", name: "YuE2-3B", org: "m-a-p",
      mod: "audio", params: "3B 音乐 LLM", license: "开放权重",
      rank: "8–16", vram: "16–24G", trainers: ["ai-toolkit"],
      badge: "实验", hot: false,
      note: "LLM 式音乐生成，官方 audio-to-token 编码器未放出，训练需社区 tokenizer；<em>上手门槛高</em>，不建议作为第一炉。",
      ratings: [["音色风格", 3], ["音乐性", 4], ["效率", 3], ["生态", 2]],
      tags: ["音乐 LLM", "实验"],
      trigger: "xu_music"
    },
    {
      id: "gpt-sovits", name: "GPT-SoVITS v2ProPlus", org: "RVC-Boss（开源社区）",
      mod: "audio", params: "GPT + SoVITS 双模块", license: "MIT",
      rank: "—（微调非 LoRA）", vram: "8G", trainers: ["GPT-SoVITS WebUI", "Colab"],
      badge: "声音克隆", hot: true,
      note: "5 秒零样本、<em>1 分钟素材即可少样本微调</em>，中文社区最常用的声音克隆方案；v2ProPlus 在 4060Ti 上 RTF 0.028。严格说是微调而非 LoRA，但产品里应作为「音色丹方」的一等公民。",
      ratings: [["音色相似", 5], ["自然度", 4], ["素材量", 5], ["生态", 5]],
      tags: ["TTS", "声音克隆", "中文强", "1 分钟"],
      trigger: "xu_voice"
    },
    {
      id: "f5-tts", name: "F5-TTS", org: "开源社区 / SWivid",
      mod: "audio", params: "Flow Matching TTS", license: "CC-BY-NC / MIT（分组件）",
      rank: "—（微调）", vram: "12G", trainers: ["F5-TTS 官方 finetune", "社区脚本"],
      badge: "TTS", hot: false,
      note: "零样本音色克隆的自然度口碑好，微调脚本成熟；英文表现突出，中文可用社区微调权重。",
      ratings: [["音色相似", 4], ["自然度", 5], ["素材量", 4], ["生态", 3]],
      tags: ["TTS", "零样本", "英文强"],
      trigger: "xu_voice"
    },
    {
      id: "cosyvoice3", name: "CosyVoice 3", org: "阿里通义",
      mod: "audio", params: "TTS / 语音克隆", license: "需核对官方许可",
      rank: "LoRA 支持", vram: "12–24G", trainers: ["CosyVoice 官方训练", "ms-swift"],
      badge: "TTS", hot: false,
      note: "指令化 TTS（情感/语速/方言）能力好，官方仓库提供 LoRA/微调路径；适合做品牌音色。",
      ratings: [["音色相似", 4], ["自然度", 5], ["素材量", 4], ["生态", 3]],
      tags: ["TTS", "情感", "指令控制"],
      trigger: "xu_voice"
    },
    {
      id: "indextts2", name: "IndexTTS 2", org: "B 站 Index 团队",
      mod: "audio", params: "情感 TTS", license: "需核对官方许可",
      rank: "—（微调）", vram: "12G", trainers: ["IndexTTS 官方脚本"],
      badge: "情感", hot: false,
      note: "中文情感与韵律表现突出，B 站生态活跃；适合有声书与虚拟主播音色微调。",
      ratings: [["音色相似", 4], ["自然度", 4], ["素材量", 4], ["生态", 3]],
      tags: ["情感 TTS", "中文", "有声书"],
      trigger: "xu_voice"
    },
    {
      id: "stable-audio-open", name: "Stable Audio Open", org: "Stability AI",
      mod: "audio", params: "音效/短音频", license: "Stability 社区许可",
      rank: "16–32", vram: "12G", trainers: ["stable-audio-tools"],
      badge: "音效", hot: false,
      note: "音效与氛围声的 LoRA 路线，训练脚本与文档齐全；音乐长结构不如 ACE-Step。",
      ratings: [["音色风格", 4], ["音乐性", 2], ["效率", 4], ["生态", 4]],
      tags: ["音效", "SFX", "LoRA"],
      trigger: "xu_sfx"
    },

    /* ========== 语言 ========== */
    {
      id: "qwen3", name: "Qwen3 系列 (0.6B–235B-A22B)", org: "阿里通义",
      mod: "llm", params: "0.6B / 1.7B / 4B / 8B / 14B / 32B / 30B-A3B / 235B-A22B", license: "Apache-2.0（多数）",
      rank: "16–64", vram: "8G（0.6B）→ 多卡（235B）", trainers: ["LLaMA-Factory", "Unsloth", "Axolotl", "ms-swift"],
      badge: "主力", hot: true,
      note: "中文小模型 LoRA 的第一选择：8B 单卡 24G 可训，30B-A3B MoE 用 QLoRA 也能在单卡跑；工具链支持最完整，<em>LLaMA-Factory 一条命令</em>即可。",
      ratings: [["能力", 5], ["易训", 5], ["显存", 4], ["生态", 5]],
      tags: ["中文", "MoE", "全尺寸", "Apache-2.0"],
      trigger: "xu_agent"
    },
    {
      id: "llama4", name: "Llama 4 Scout / Maverick", org: "Meta",
      mod: "llm", params: "MoE（Scout 17B 激活 / Maverick 17B 激活）", license: "Llama 4 社区许可",
      rank: "16–64", vram: "多卡 / 大显存", trainers: ["LLaMA-Factory", "Axolotl", "Unsloth"],
      badge: "国际", hot: false,
      note: "多模态 MoE 架构，原生超长上下文；许可与地区限制要看清，个人单卡训练成本偏高。",
      ratings: [["能力", 5], ["易训", 3], ["显存", 2], ["生态", 4]],
      tags: ["MoE", "多模态", "长上下文"],
      trigger: "xu_agent"
    },
    {
      id: "deepseek-v32", name: "DeepSeek V3.2", org: "深度求索",
      mod: "llm", params: "685B MoE（含 Speciale 变体）", license: "DeepSeek 模型许可",
      rank: "16–64", vram: "多卡 / 云", trainers: ["LLaMA-Factory", "ms-swift", "自研脚本"],
      badge: "旗舰", hot: true,
      note: "推理与代码能力的第一梯队，MMLU 等公开分数领先；本地训 LoRA 基本要走云端多卡，<em>个人更适合用蒸馏小模型</em>。",
      ratings: [["能力", 5], ["易训", 2], ["显存", 1], ["生态", 4]],
      tags: ["推理", "代码", "MoE", "云端"],
      trigger: "xu_reason"
    },
    {
      id: "glm-46", name: "GLM-4.6 / GLM-4.5", org: "智谱 AI",
      mod: "llm", params: "355B 级 MoE + 小尺寸版本", license: "MIT（部分）",
      rank: "16–64", vram: "多卡 / 单卡小版本", trainers: ["LLaMA-Factory", "ms-swift"],
      badge: "国产", hot: false,
      note: "中文工具调用与 Agent 场景强，开源协议友好；小尺寸版本适合本地 LoRA，多模态版本可做视觉指令微调。",
      ratings: [["能力", 5], ["易训", 3], ["显存", 2], ["生态", 4]],
      tags: ["Agent", "工具调用", "中文"],
      trigger: "xu_agent"
    },
    {
      id: "kimi-k2", name: "Kimi K2", org: "月之暗面",
      mod: "llm", params: "1T MoE / 32B 激活", license: "修改版 MIT",
      rank: "16–64", vram: "多卡 / 云", trainers: ["社区脚本", "ms-swift"],
      badge: "旗舰", hot: false,
      note: "万亿级 MoE，Agent 与代码能力突出；本地训练门槛极高，适合做云端评测或蒸馏数据源。",
      ratings: [["能力", 5], ["易训", 1], ["显存", 1], ["生态", 3]],
      tags: ["万亿 MoE", "Agent", "云端"],
      trigger: "xu_agent"
    },
    {
      id: "minimax-m2", name: "MiniMax M2", org: "MiniMax",
      mod: "llm", params: "230B MoE", license: "需核对官方许可",
      rank: "16–64", vram: "多卡", trainers: ["ms-swift", "社区脚本"],
      badge: "国产", hot: false,
      note: "长上下文与工具使用见长，开源权重适合做领域微调基座，但需要多卡环境。",
      ratings: [["能力", 4], ["易训", 2], ["显存", 2], ["生态", 3]],
      tags: ["MoE", "长上下文"],
      trigger: "xu_agent"
    },
    {
      id: "gemma3", name: "Gemma 3 (1B–27B)", org: "Google",
      mod: "llm", params: "1B / 4B / 12B / 27B", license: "Gemma 许可",
      rank: "16–32", vram: "8–24G", trainers: ["LLaMA-Factory", "Unsloth", "Axolotl"],
      badge: "轻量", hot: false,
      note: "小尺寸多模态（图文）友好，单卡 24G 能训 12B 的 QLoRA；适合端侧/私有化场景。",
      ratings: [["能力", 3], ["易训", 5], ["显存", 5], ["生态", 4]],
      tags: ["小模型", "多模态", "端侧"],
      trigger: "xu_agent"
    },
    {
      id: "phi4", name: "Phi-4 (14B)", org: "Microsoft",
      mod: "llm", params: "14B", license: "MIT",
      rank: "16–32", vram: "24G", trainers: ["LLaMA-Factory", "Unsloth", "Axolotl"],
      badge: "小钢炮", hot: false,
      note: "小尺寸推理强、MIT 许可；单卡 QLoRA 友好，适合做垂直领域（数学/代码/客服）微调。",
      ratings: [["能力", 4], ["易训", 4], ["显存", 4], ["生态", 4]],
      tags: ["14B", "推理", "MIT"],
      trigger: "xu_reason"
    },
    {
      id: "gpt-oss", name: "GPT-OSS 20B / 120B", org: "OpenAI",
      mod: "llm", params: "20B / 120B MoE", license: "Apache-2.0",
      rank: "16–64", vram: "16G（20B QLoRA）→ 多卡", trainers: ["LLaMA-Factory", "Unsloth", "Axolotl"],
      badge: "开放", hot: true,
      note: "OpenAI 放出的开放权重，Apache-2.0；20B 版本单卡 QLoRA 可训，是 2026 年<em>开源权重里讨论度最高</em>的一族之一。",
      ratings: [["能力", 4], ["易训", 4], ["显存", 3], ["生态", 3]],
      tags: ["Apache-2.0", "MoE", "20B/120B"],
      trigger: "xu_agent"
    },
    {
      id: "qwen25-omni", name: "Qwen2.5-Omni-7B", org: "阿里通义",
      mod: "llm", params: "7B 全模态（文/图/音/视频）", license: "Apache-2.0",
      rank: "16–32", vram: "24G", trainers: ["ai-toolkit", "LLaMA-Factory"],
      badge: "全模态", hot: false,
      note: "少数被扩散训练器（AI Toolkit）也纳管的 LLM：可做音频理解/语音对话的 LoRA，产品上是「听声辨意」丹方的基座。",
      ratings: [["能力", 4], ["易训", 3], ["显存", 3], ["生态", 3]],
      tags: ["全模态", "音频理解", "语音对话"],
      trigger: "xu_omni"
    }
  ];

  /* ---------------- 丹方（可套用的超参配方） ---------------- */
  const RECIPES = [
    {
      id: "r-flux3", modelId: "flux3-klein", title: "FLUX.3 Klein · 风格初炼",
      sub: "BFL 官方 LoRA 指引", glyph: "炼", mod: "image", badge: "官方",
      params: { rank: "32", alpha: "32", lr: "1e-4", steps: "1500–3000", res: "1024", opt: "adamw8bit" },
      note: "官方建议：在 <b>Klein Base</b> 上训练，几十张图 + 单卡 + rank 32 足以学会一种风格或编辑；训练时必须带 prompt upsampler，否则短提示词效果会明显变差。",
      warn: "别在 Distilled（蒸馏）版上直接训；先在 Base 上训，再让 LoRA 跑在蒸馏版。",
      src: "docs.bfl.ml/flux_3/flux3_image_klein"
    },
    {
      id: "r-flux1", modelId: "flux2-klein-9b", title: "FLUX 系 · 通用起手式",
      sub: "AI Toolkit 参考 YAML", glyph: "基", mod: "image", badge: "通用",
      params: { rank: "16 / 16", alpha: "16", lr: "1e-4", steps: "2000", res: "512/768/1024 分桶", opt: "adamw8bit" },
      note: "AI Toolkit 的 FLUX.1-dev 示例是社区最透明的起点：rank/alpha 16/16、batch 1、2000 步、三档分桶。<b>换模型时复制对应 YAML</b>，不要改个名字就开跑。",
      src: "github.com/ostris/ai-toolkit"
    },
    {
      id: "r-qwen", modelId: "qwen-image-21", title: "Qwen-Image · 中文海报",
      sub: "Musubi 示例（原版）", glyph: "文", mod: "image", badge: "参考",
      params: { rank: "16", alpha: "16", lr: "5e-5", steps: "2000–4000", res: "1024+", opt: "adamw8bit · shift 2.2" },
      note: "Musubi 的 Qwen-Image 示例是 rank 16 / LR 5e-5 / shift 2.2。这是<b>原版 Qwen-Image</b> 的配方；2.1 的版本、缓存与键名都不同，请以 2.1 对应文档为准。",
      warn: "Qwen-Image 2.1（2026-09）与旧版不共用配方，混用会白炼。",
      src: "github.com/kohya-ss/musubi-tuner/docs/qwen_image.md"
    },
    {
      id: "r-zimage", modelId: "z-image", title: "Z-Image · 单卡快炼",
      sub: "Musubi 示例", glyph: "快", mod: "image", badge: "高性价比",
      params: { rank: "32", alpha: "32", lr: "1e-4", steps: "1500–3000", res: "1024", opt: "adamw8bit · shift 2.0" },
      note: "6B 单流 DiT，16G 卡就能玩。官方示例 rank 32 / LR 1e-4 / shift 2.0；先做短跑 fit test，再决定是否加 rank。Turbo 蒸馏版需 de-distill 或专用适配。",
      src: "github.com/kohya-ss/musubi-tuner/docs/zimage.md"
    },
    {
      id: "r-krea", modelId: "krea-2", title: "Krea 2 RAW · 审美迁移",
      sub: "Musubi 示例", glyph: "美", mod: "image", badge: "参考",
      params: { rank: "32 / 32", alpha: "32", lr: "1e-4", steps: "2000–4000", res: "1024", opt: "bf16 · shift 2.5" },
      note: "固定 1024 用 shift 2.5；变分辨率改用 <b>krea2_shift</b>（分辨率感知）。RAW 出样要开 CFG，Turbo 才低步数关 CFG —— 用错采样器会误判 LoRA 失败。",
      src: "github.com/kohya-ss/musubi-tuner/docs/krea2.md"
    },
    {
      id: "r-anima", modelId: "anima", title: "Anima · 二次元角色",
      sub: "sd-scripts Anima 示例", glyph: "二", mod: "image", badge: "专用",
      params: { rank: "8", alpha: "1", lr: "1e-4", steps: "1–3 epoch", res: "1024 分桶", opt: "AdamW8bit · bf16" },
      note: "Anima 有独立训练入口 <b>anima_train_network.py</b>，rank 8 / alpha 1 是一套完整配方；提 alpha 就等于换方子，别只改一个数。首轮建议只训 DiT、冻结文本编码器。",
      src: "github.com/kohya-ss/sd-scripts/docs/anima_train_network.md"
    },
    {
      id: "r-sdxl", modelId: "sdxl", title: "SDXL / Pony · 经典稳方",
      sub: "社区共识 + kohya 文档", glyph: "稳", mod: "image", badge: "入门",
      params: { rank: "16–32", alpha: "= rank", lr: "1e-4", steps: "1500–3000", res: "1024（或 768 试跑）", opt: "AdamW8bit · TE 冻结" },
      note: "显卡要求最低、教程最多。Pony 沿用 SDXL 路径但要注意其标签习惯；Illustrious/NoobAI 要先确认 eps 还是 v-pred。",
      src: "github.com/kohya-ss/sd-scripts"
    },
    {
      id: "r-wan", modelId: "wan22-a14b", title: "Wan 2.2 · 运动/画风",
      sub: "Musubi 示例", glyph: "动", mod: "video", badge: "主力",
      params: { rank: "32", alpha: "32", lr: "2e-4", steps: "1000–3000", res: "480p/720p · 81 帧", opt: "AdamW8bit · shift 3.0" },
      note: "先低分辨率短片段跑通，再抬分辨率。<b>2.2 的双专家（高噪/低噪）timestep 处理与 2.1 不同</b>，社区预设不能直接套。素材要按镜头边界切，别把相邻帧同时放进训练和验证。",
      src: "github.com/kohya-ss/musubi-tuner/docs/wan.md"
    },
    {
      id: "r-ltx", modelId: "ltx-25", title: "LTX-2.5 · 低显存官方档",
      sub: "Lightricks 官方 ltx-trainer", glyph: "轻", mod: "video", badge: "官方",
      params: { rank: "16 / 16", alpha: "16", lr: "1e-4", steps: "2000", res: "576×576 × 49 帧", opt: "INT8 + checkpointing" },
      note: "官方提供低显存 YAML（32G 档）与标准档（建议 80G）。先跑通官方配置，再改分辨率/时长；其 576×576×49 是验证设置，不是所有训练片段必须长这样。",
      src: "github.com/Lightricks/LTX-2/packages/ltx-trainer"
    },
    {
      id: "r-h3", modelId: "minimax-h3", title: "MiniMax H3 · 有声短片",
      sub: "Musubi 示例 / Fizgig Fast", glyph: "声", mod: "video", badge: "参考",
      params: { rank: "16 / 16", alpha: "16", lr: "1e-4", steps: "按 loss 路线", res: "0.25MP · ≤56 帧（16G）", opt: "AdamW8bit" },
      note: "H3 是音视频大模型，最忌套「通用视频预设」。Musubi 要求<b>选定一条完整 loss 路线</b>（训练适配器 / 引导损失 / 教师匹配）；Fizgig Fast 档则为 8/8、50 epochs、0.25MP、自适应 LR 从 1e-6 起。",
      warn: "两套配方的 LR 策略不可互换：一个固定、一个自适应。",
      src: "github.com/kohya-ss/musubi-tuner/docs/minimax_h3.md"
    },
    {
      id: "r-ace", modelId: "ace-step-15-xl", title: "ACE-Step 1.5 XL · 曲风 LoRA",
      sub: "官方训练说明 + 社区实践", glyph: "曲", mod: "audio", badge: "参考",
      params: { rank: "16–32", alpha: "16–32", lr: "1e-4", steps: "20–50 epoch", res: "音频片段 ≤ 4 分钟", opt: "adamw8bit" },
      note: "官方已放出 LoRA 训练代码与 Lyric2Vocal / Text2Samples / RapMachine 样例 LoRA。先照官方 TRAIN_INSTRUCTION 跑通，再按曲风微调；数据要成段、带干净标签。",
      warn: "音乐 LoRA 的 rank 与步数区间来自社区实践，不是官方硬性规格。",
      src: "github.com/ace-step/ACE-Step"
    },
    {
      id: "r-sovits", modelId: "gpt-sovits", title: "GPT-SoVITS · 一分钟音色",
      sub: "项目官方流程", glyph: "音", mod: "audio", badge: "微调",
      params: { rank: "—", alpha: "—", lr: "8e-5 / 1e-4（分模块）", steps: "8–15 epoch", res: "≥1 分钟干净人声", opt: "AdamW" },
      note: "不是 LoRA 而是 GPT + SoVITS 双模块微调；1 分钟素材即可出可用的相似音色。先做降噪与切分，静音过长的片段会拖坏韵律。",
      src: "github.com/RVC-Boss/GPT-SoVITS"
    },
    {
      id: "r-llm", modelId: "qwen3", title: "LLM · QLoRA 起手式",
      sub: "LLaMA-Factory / Unsloth 通用", glyph: "语", mod: "llm", badge: "通用",
      params: { rank: "16–64", alpha: "2 × rank", lr: "1e-4（LoRA）/ 2e-4（QLoRA）", steps: "1–3 epoch", res: "序列长度按任务", opt: "adamw_torch · bf16" },
      note: "8B 级模型单卡 24G 可训。先用 500 条高质量样本跑 1 epoch 看方向，再扩数据；<b>评估集必须与训练集同分布但不同样本</b>。",
      src: "github.com/hiyouga/LLaMA-Factory"
    }
  ];

  /* ---------------- 功法（训练范式） ---------------- */
  const METHODS = [
    { name: "LoRA", en: "LOW-RANK ADAPTATION", desc: "冻结基座，只训练低秩旁路矩阵。<b>生态最广、体积最小</b>，绝大多数平台与推理器直接支持。", meta: ["默认之选", "rank 8–64", "10–300MB"] },
    { name: "LoHa", en: "LOW-RANK HADAMARD", desc: "用 Hadamard 积代替普通低秩分解，<b>同等参数量下表达力更强</b>，适合风格与构图类概念。", meta: ["风格向", "需 LyCORIS", "ComfyUI 可读"] },
    { name: "LoKr", en: "LOW-RANK KRONECKER", desc: "Kronecker 分解，<b>参数更省、收敛更快</b>，Fizgig、diffusion-pipe 等已支持；格式兼容性弱于 LoRA。", meta: ["省参数", "工具支持有限"] },
    { name: "DoRA", en: "WEIGHT-DECOMPOSED", desc: "把权重拆成幅度 + 方向分别学习，<b>低 rank 下更接近全量微调</b>，训练略慢、显存略高。", meta: ["低 rank 优势", "LLaMA-Factory 支持"] },
    { name: "PiSSA", en: "PRINCIPAL SVD", desc: "用主成分初始化旁路矩阵，<b>收敛更快、初始损失更低</b>；LLaMA-Factory 已内置。", meta: ["快速收敛", "需 SVD 初始化"] }
  ];

  const TOOLS = [
    { name: "ai-toolkit", by: "ostris", type: "GUI + YAML", strength: "30+ 图像架构、Wan/LTX/H3 视频、ACE-Step/YuE2 音频、Qwen2.5-Omni；安装器一键起 UI", limit: "单人维护；部分新模型调优滞后；缓存 bug 历史多", url: "github.com/ostris/ai-toolkit", tag: "全能" },
    { name: "musubi-tuner", by: "kohya-ss", type: "CLI", strength: "视频/DiT 主力：Wan、HunyuanVideo、FramePack、FLUX.2、Qwen-Image、Z-Image、Krea 2、H3、Kandinsky 5；block swap / fp8 / ConvRot int8", limit: "入口脚本多、无统一 CLI；新族标 experimental", url: "github.com/kohya-ss/musubi-tuner", tag: "视频首选" },
    { name: "sd-scripts + kohya_ss", by: "kohya-ss", type: "CLI + GUI", strength: "SD1/SDXL/SD3/FLUX/Chroma/Lumina/Anima 全谱系；教程与预设最多", limit: "新架构进得慢；脚本历史包袱重", url: "github.com/kohya-ss/sd-scripts", tag: "经典" },
    { name: "SimpleTuner", by: "bghira", type: "CLI", strength: "图像/视频/音频统一基类，多 GPU、多分辨率、验证采样完善", limit: "配置面广、文档按族扇出", url: "github.com/bghira/SimpleTuner", tag: "工程化" },
    { name: "diffusion-pipe", by: "tdrussell", type: "CLI", strength: "DeepSpeed 流水线并行，26 族，多机多卡吞吐高；可直训 Comfy fp8 权重", limit: "原生 Windows 基本不可用；feature×model 矩阵不齐", url: "github.com/tdrussell/diffusion-pipe", tag: "多卡" },
    { name: "OneTrainer", by: "Nerogar", type: "GUI", strength: "族 × 训练方法矩阵；支持 Diffusers/Kohya/Comfy/Legacy 四种导出", limit: "矩阵 boilerplate；新族接入慢", url: "github.com/Nerogar/OneTrainer", tag: "GUI" },
    { name: "LTX Trainer", by: "Lightricks", type: "CLI", strength: "LTX 官方套件：预处理 + 训练 + 验证配置齐备，低显存 YAML 开箱即用", limit: "只覆盖 LTX 家族", url: "github.com/Lightricks/LTX-2", tag: "官方" },
    { name: "Fizgig", by: "社区", type: "GUI", strength: "Klein 9B / Krea 2 / Qwen / Anima / Z-Image / H3 / ACE-Step XL 的引导式配方，LoRA & LoKR 提取", limit: "社区实现，自动 LR 配方不可与官方互换", url: "github.com/shootthesound/Fizgig", tag: "引导" },
    { name: "LLaMA-Factory", by: "hiyouga", type: "GUI + CLI", strength: "100+ LLM 的 LoRA/QLoRA/DoRA/PiSSA 统一训练与部署，中文文档最好", limit: "扩散模型不支持", url: "github.com/hiyouga/LLaMA-Factory", tag: "LLM" },
    { name: "Unsloth", by: "unslothai", type: "库", strength: "同显存下更快、更省，笔记本级 GPU 训 7B–14B", limit: "模型覆盖面窄于 LLaMA-Factory", url: "github.com/unslothai/unsloth", tag: "提速" },
    { name: "Axolotl", by: "Axolotl AI", type: "YAML", strength: "配置即代码，多机多卡与实验管理成熟", limit: "上手门槛高于 LLaMA-Factory", url: "github.com/axolotl-ai-cloud/axolotl", tag: "LLM" },
    { name: "ms-swift", by: "ModelScope 魔搭", type: "CLI + WebUI", strength: "全模态（文/图/音/视频）微调与部署，国内网络友好", limit: "文档偏工程向", url: "github.com/modelscope/ms-swift", tag: "国产" },
    { name: "ComfyUI", by: "社区", type: "节点式", strength: "推理事实标准；训练节点与 LoRA 测试工作流丰富", limit: "不是训练器，别把它当炼丹主力", url: "github.com/comfyanonymous/ComfyUI", tag: "推理" },
    { name: "Kohya-LoRA-Tool", by: "社区", type: "Windows 桌面", strength: "把 kohya / musubi / AI Toolkit 打包成桌面工作区，带数据集工具与对比", limit: "整合包版本可能落后上游", url: "github.com/l1934332574-maker/Kohya-LoRA-Tool", tag: "整合包" }
  ];

  /* ---------------- 丹市（社区与平台） ---------------- */
  const PLATFORMS = [
    { name: "Civitai", sigil: "C", kind: "全球社区", metric: "150k+", metricLabel: "模型 · 80k+ LoRA（第三方估计）", desc: "全球最大模型分享社区，<b>LoRA 存量与风格覆盖第一</b>；2025 年起提供云端训练但限制较多。国内访问需自备网络条件，内容分级需自行过滤。", tags: ["模型下载", "云端训练", "英文"], url: "civitai.com" },
    { name: "LiblibAI 哩布", sigil: "L", kind: "国内社区", metric: "120k+", metricLabel: "模型 · 45k+ LoRA（第三方估计）", desc: "国内最大社区，<b>国风/仙侠/汉服/水墨素材深度远超海外站</b>；云端训练 10–50 张图、30–90 分钟、约 $1–4，支持 SD1.5/SDXL/SD3.x。", tags: ["国内快", "国风", "在线训练"], url: "liblib.art" },
    { name: "TensorArt", sigil: "T", kind: "在线平台", metric: "在线", metricLabel: "生成 + 训练一体", desc: "在线生成与 LoRA 训练一体，中文界面与国内支付友好；适合不想折腾环境的新手先跑通一次完整流程。", tags: ["零环境", "在线"], url: "tensor.art" },
    { name: "Shakker 鲨克", sigil: "S", kind: "国内平台", metric: "在线", metricLabel: "模型 + 训练", desc: "国内设计向 AI 平台，模型库与在线训练并行；偏商用设计场景，模板化工作流多。", tags: ["设计向", "国内"], url: "shakker.ai" },
    { name: "Hugging Face", sigil: "HF", kind: "开源主阵地", metric: "#1", metricLabel: "权重 / 数据集 / 工具", desc: "几乎所有开源基座与训练器的发布地。<b>找官方模型卡与训练文档的第一站</b>；Diffusers、PEFT、Accelerate 都在这里。", tags: ["官方权重", "数据集", "开源"], url: "huggingface.co" },
    { name: "ModelScope 魔搭", sigil: "M", kind: "国内开源", metric: "国内", metricLabel: "权重 + 训练 + 部署", desc: "阿里系开源社区，<b>Qwen / Z-Image 等国产模型的第一发布地</b>，国内下载速度快；ms-swift 可直接接训练。", tags: ["国产权重", "国内快"], url: "modelscope.cn" },
    { name: "Weights.gg", sigil: "W", kind: "音频社区", metric: "音频", metricLabel: "AI 翻唱 / 音色 LoRA", desc: "音频 LoRA 与 AI 翻唱社区，RVC 系音色模型集中；版权与声音授权风险需自行判断。", tags: ["音频", "翻唱", "RVC"], url: "weights.gg" },
    { name: "fal.ai", sigil: "F", kind: "云端 API", metric: "API", metricLabel: "训练 + 推理", desc: "按次计费的云端训练/推理 API，FLUX、Krea、Qwen 等新模型上线极快；适合产品集成而非个人炼丹。", tags: ["API", "商用"], url: "fal.ai" },
    { name: "Replicate", sigil: "R", kind: "云端 API", metric: "API", metricLabel: "开源模型托管", desc: "模型托管与训练 API，社区镜像多；适合快速验证与批量出图。", tags: ["API", "托管"], url: "replicate.com" },
    { name: "优云智算 Compshare", sigil: "优", kind: "国内算力", metric: "GPU", metricLabel: "训练镜像 / 按小时", desc: "国内 GPU 租赁与镜像市场，AI Toolkit / kohya 训练镜像现成；适合没有本地显卡时练手。", tags: ["算力", "镜像"], url: "compshare.cn" },
    { name: "阿里云 PAI ArtLab", sigil: "PAI", kind: "云平台", metric: "云", metricLabel: "魔搭模型训练", desc: "阿里云的可视化模型训练/出图平台，与魔搭模型打通；企业与团队协作更顺。", tags: ["云", "团队"], url: "help.aliyun.com/zh/pai" },
    { name: "OpenArt / SeaArt / PixAI", sigil: "O", kind: "在线生成", metric: "在线", metricLabel: "生成 + 轻训练", desc: "面向创作者的在线生成平台，部分提供角色/风格训练；上手快、可控性弱，适合出概念图。", tags: ["在线", "创作者"], url: "openart.ai" }
  ];

  /* ---------------- 避坑清单 ---------------- */
  const PITFALLS = [
    ["别用推理量化版训练", "fp8/GGUF 量化权重适合出图，不适合当训练基座；要训就下官方 Base/RAW 权重。"],
    ["别混模型世代", "FLUX.1 / FLUX.2 / FLUX.3、Qwen-Image 与 2.1 的键名、缓存、shift 都不同，加载不报错 ≠ 训对了。"],
    ["别给所有图同一句标注", "重复标注会让触发词吞掉一切；把不变的特征写进 caption，变化的（服装/背景）留给提示词。"],
    ["别用静帧教运动", "视频 LoRA 需要连贯运动片段；一叠静态帧只能学外观，学不会镜头运动。"],
    ["别把相邻帧分进训练与验证", "那会让「记住」看起来像「泛化」；验证集要用真正不同的素材。"],
    ["别照抄别人的 LR 与 shift", "rank、alpha、LR、optimizer、shift 是一套配方；单改一个数往往等于换方子。"],
    ["环境与缓存要一起锁版本", "训练器 commit、模型 revision、缓存格式写进配置旁；换版本先重算缓存。"],
    ["版权与肖像权是单独的题", "基座许可、数据权利、导出的 adapter 许可是三件事；真人音色/形象需授权。"]
  ];

  /* ---------------- 数据集建议 ---------------- */
  const DATASET_TIPS = [
    ["20–50", "张主体清晰的图，足以起步一个角色或风格；重复图不等于更多信息。"],
    ["去重去水印", "模糊、压缩伪影、水印与矛盾身份会直接教坏模型。"],
    ["多角度多光照", "只拍一个背景，模型会把背景当成概念的一部分。"],
    ["自动标注要人审", "尤其检查人名、左右、人数与动作；自然语言 caption 更适合新式 DiT。"],
    ["留出验证集", "用真正不同的素材做 held-out prompt，别自欺欺人。"],
    ["记下配方", "模型 revision、训练器 commit、标注规范、配置一起存档。"]
  ];

  /* ---------------- 资料来源 ---------------- */
  const SOURCES = [
    { t: "FLUX 3 Image Klein 官方文档（LoRA 训练指引）", p: "Black Forest Labs", u: "https://docs.bfl.ml/flux_3/flux3_image_klein", note: "Base 用于 LoRA、rank 32、prompt upsampler" },
    { t: "FLUX.2 [klein] / FLUX.2 dev 模型卡", p: "Hugging Face", u: "https://huggingface.co/black-forest-labs", note: "开放权重与许可" },
    { t: "Qwen-Image 2.1 发布说明", p: "QwenImages 编辑团队", u: "https://qwenimages.com/zh/blog/qwen-image-2-1-release", note: "7B DiT、RGBA、2K、10 参考图（2026-09-20）" },
    { t: "AI Toolkit 支持模型清单", p: "ostris/ai-toolkit", u: "https://github.com/ostris/ai-toolkit", note: "图像/编辑/视频/音频/LLM 全量支持列表（2026-10）" },
    { t: "Musubi Tuner 文档索引", p: "kohya-ss/musubi-tuner", u: "https://github.com/kohya-ss/musubi-tuner", note: "14+ 族架构文档、Wan/H3/Krea2/Qwen 配方" },
    { t: "sd-scripts（含 Anima 训练入口）", p: "kohya-ss/sd-scripts", u: "https://github.com/kohya-ss/sd-scripts", note: "SD/SDXL/SD3/FLUX/Anima 支持" },
    { t: "LoRA Training Guide 2026（含各模型起手参数）", p: "AirMore", u: "https://airmore.ai/lora-training-guide.html", note: "2026-10-13 更新；rank/LR/shift 实测示例" },
    { t: "训练器生态对标调研（多模型支持）", p: "AnimaLoraStudio 设计文档", u: "https://github.com/WalkingMeatAxolotl/AnimaLoraStudio", note: "sd-scripts / musubi / ai-toolkit / SimpleTuner / OneTrainer / diffusion-pipe 架构对比（2026-07）" },
    { t: "ACE-Step 官方仓库与训练说明", p: "ACE Studio × StepFun", u: "https://github.com/ace-step/ACE-Step", note: "v1.5（2026-01-28）、LoRA 训练代码、Lyric2Vocal/RapMachine" },
    { t: "GPT-SoVITS 官方仓库", p: "RVC-Boss", u: "https://github.com/RVC-Boss/GPT-SoVITS", note: "5 秒零样本、1 分钟少样本微调、v2ProPlus RTF" },
    { t: "LLaMA-Factory 官方仓库", p: "hiyouga", u: "https://github.com/hiyouga/LLaMA-Factory", note: "100+ LLM 微调；Qwen3/Llama4/GLM/GPT-OSS 支持记录" },
    { t: "LTX-2 官方训练套件", p: "Lightricks", u: "https://github.com/Lightricks/LTX-2", note: "低显存/标准 LoRA 配置" },
    { t: "Liblib vs Civitai：本地化 LoRA 生态对比", p: "Flowith Blog", u: "https://flowith.io/blog/liblib-vs-civitai-which-better-chinese-creators-localized-lora/", note: "平台模型量级与国风类目差异（第三方估计）" },
    { t: "Civitai 平台拆解", p: "Mushroom Blog", u: "https://blog.mushroom.cv/blog/civitai-open-source-ai-image-model-community-platform-teardown/", note: "社区与创作者经济结构" },
    { t: "Krea 2 开源模型页", p: "Krea", u: "https://www.krea.ai/krea-2-open-source", note: "RAW / Turbo 开放权重" },
    { t: "Fizgig：多模型 LoRA 工作室", p: "shootthesound", u: "https://github.com/shootthesound/Fizgig", note: "Klein/Krea2/Qwen/Anima/Z-Image/H3/ACE-Step XL 引导配方" }
  ];

  const FACTS = {
    models: MODELS.length,
    trainers: TOOLS.length,
    platforms: PLATFORMS.length,
    recipes: RECIPES.length,
    date: RESEARCH_DATE
  };

  const MODS = {
    image: { label: "图像", sigil: "图", en: "IMAGE" },
    edit: { label: "编辑", sigil: "编", en: "EDIT" },
    video: { label: "视频", sigil: "影", en: "VIDEO" },
    audio: { label: "音频", sigil: "音", en: "AUDIO" },
    llm: { label: "语言", sigil: "语", en: "LLM" }
  };

  return { MODELS, RECIPES, METHODS, TOOLS, PLATFORMS, PITFALLS, DATASET_TIPS, SOURCES, FACTS, MODS, RESEARCH_DATE };
})();
