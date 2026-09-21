# pi-learn-btw

> **Learn English By The Way, while coding with AI.**  
> 零心智负担的开发者语言表达提升插件 —— 在与 AI 结对编程时，顺便把语言学了。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Pi Package](https://img.shields.io/badge/Pi-Package-purple.svg)](https://pi.dev)

---

## 💡 核心理念：交互归快捷键，管理归命令

- **交互操作交给快捷键（零心智记忆负担）**：
  - **`Alt+E`**：一键循环切换视图（`[DIFF]` ➔ `[IMPROVED]` ➔ `[ORIGINAL]`），带有清晰的模式标识。
- **Slash Command 仅保留 3 个顶级入口**：
  - 不再堆砌多余的二级命令，补全列表干干净净。
- **多语言支持**：
  - 支持英语（推荐）、西班牙语、法语、德语、意大利语等以空格分词的语言。
  - *(注：中文、日文等无空格语言的分词 Diff 算法暂未支持，建议用于西文类语言学习)*。

---

## 📦 安装方式

通过 Pi 的包管理器直接安装：

```bash
# 从 GitHub 直接安装
pi install git:github.com/chxsong/pi-learn-btw

# 或通过 npm 安装（发布后可用）
pi install npm:pi-learn-btw
```

首次安装运行后，`pi-learn-btw` 会弹出首启配置引导，确认或调整您的批改模型与学习语言。

---

## 🎮 极简命令：`/learn-btw` (别名: `/btw`)

```text
/learn-btw          -> 快速开启 / 关闭（无参数即一键切换）
/learn-btw stats    -> 查看学习量化统计（总数、修改率、进步百分比、高频新词）
/learn-btw config   -> 打开交互式配置中心
```

### 交互式配置中心 (`/learn-btw config`)
输入 `/learn-btw config` 即可在终端打开图形化选择菜单：
1. **Target Language**：选择目标学习语言（英语、西班牙语、法语、德语、意大利语、葡萄牙语或自定义西文语言）。
2. **Send Polished Prompt to AI**：是否将润色后的地道 Prompt 发给 AI Agent（默认关闭：0ms 延迟发原句）。
3. **Select Model**：选择批改模型（自动列出您当前环境中已认证的轻量模型，默认智能回退至可用模型）。
4. **Default View**：设定默认视图（`diff` / `improved` / `original`）。
5. **Clear History Data**：重置本地历史统计数据。

配置自动保存于 `~/.pi/learn-btw/config.json`。

### 环境变量覆盖
您也可以通过环境变量直接指定批改模型：
- `PI_LEARN_BTW_PROVIDER`：模型 Provider（如 `openai`, `anthropic`, `google` 等）
- `PI_LEARN_BTW_MODEL`：模型 ID（如 `gpt-4o-mini`, `claude-3-5-haiku` 等）

---

## 🧪 自动化测试

```bash
cd /Users/chxsong/pi-learn-btw
npm test       # 运行 12 项单元测试
npm run check  # TypeScript 严格类型检查
```

包含针对分词、Diff 算法、ANSI 终端高亮、大小写与标点忽略门禁、历史存储与量化统计的 12 项完整单元测试（100% Pass）。

---

## 📄 License

MIT © [chxsong](https://github.com/chxsong)
