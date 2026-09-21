# pi-learn-btw

> **Learn English By The Way, while coding with AI.**  
> 零心智负担的开发者语言表达提升插件 —— 在与 AI 结对编程时，顺便把语言学了。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Pi Package](https://img.shields.io/badge/Pi-Package-purple.svg)](https://pi.dev)

---

## 🌟 核心理念：交互归快捷键，管理归命令

- **交互操作交给快捷键（零心智记忆负担）**：
  - **`Alt+E`**：一键循环切换视图（`DIFF` ➔ `IMPROVED` ➔ `ORIGINAL`）。
- **Slash Command 仅保留 3 个顶级入口**：
  - 不再堆砌多余的二级命令，补全列表干干净净。

---

## 🚀 极简命令：`/learn-btw` (别名: `/btw`)

```text
/learn-btw          -> 快速开启 / 关闭（无参数即一键切换）
/learn-btw stats    -> 查看学习量化统计（总数、修改率、进步百分比、高频新词）
/learn-btw config   -> 打开交互式配置中心
```

### 交互式配置中心 (`/learn-btw config`)
输入 `/learn-btw config` 即可在终端打开图形化选择菜单：
1. **Target Language**：选择目标学习语言（英语、西班牙语、法语、德语、日语、中文或自定义）。
2. **Send Polished Prompt to AI**：是否将润色后的地道 Prompt 发给 AI Agent（默认关闭：0ms 延迟发原句）。
3. **Select Model**：选择批改模型（默认 `antigravity/gemini-3.8-flash`）。
4. **Default View**：设定默认视图（`diff` / `improved` / `original`）。
5. **Clear History Data**：重置本地历史统计数据。

配置自动保存于 `~/.pi/learn-btw/config.json`。

---

## 🧪 自动化测试

```bash
cd /Users/chxsong/pi-learn-btw && npm test
```

包含针对分词、Diff 算法、ANSI 终端高亮、大小写与标点忽略门禁、历史存储与量化统计的 12 项完整单元测试（100% Pass）。

---

## 📄 License

MIT © [chxsong](https://github.com/chxsong)
