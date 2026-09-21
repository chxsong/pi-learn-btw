# pi-learn-btw

> **Learn English By The Way, while coding with AI.**  
> Zero-cognitive-load, multi-language expression improvement for Pi Coding Agent.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Pi Package](https://img.shields.io/badge/Pi-Package-purple.svg)](https://pi.dev)

---

## 💡 Philosophy: Learn By The Way

Existing AI language tools either:
1. **Pollute conversation context**: Inject grammar lectures directly into the chat history, wasting expensive reasoning tokens on every subsequent turn.
2. **Interrupt your flow**: Force you into a "language lesson" mindset while you are trying to solve complex engineering problems.
3. **Scroll away**: In terminal coding agents, tool calls, bash logs, and thinking blocks push your original prompt and any feedback off the screen.

**pi-learn-btw** solves this with a clean, decoupled architecture:
- 📌 **Pinned `belowEditor`**: Pinned directly below your dialogue box. It never scrolls away.
- ⚡ **Dual-Model Decoupling**: Your primary reasoning model (Claude Sonnet/Opus, GPT) solves your task immediately with 0ms added latency. A cheap model (`gemini-3.8-flash`) refines your expression in parallel.
- 🎨 **Git Code Diff Theme**: Soft dark-red (removed words) and soft dark-green (improved words) in a clean 2-line stacked diff.
- ⌨️ **Instant Toggle (`Alt+E`)**: Cycle seamlessly between `[DIFF]` ➔ `[IMPROVED]` ➔ `[ORIGINAL]` with clear mode indicators.
- 🌐 **Multi-Language Ready**: Learn English, Spanish, French, German, Italian, Portuguese, or any space-delimited language by the way. *(Note: Non-spaced languages like Chinese and Japanese are currently not supported by word-level diffing).*
- 📊 **Quantified Progress (`/learn-btw stats`)**: Tracks your modification ratio and error reduction percentage over time.

---

## 📦 Installation

Install via Pi's package manager:

```bash
# Install directly from GitHub
pi install git:github.com/chxsong/pi-learn-btw

# Or via npm (once published)
pi install npm:pi-learn-btw
```

On first startup, `pi-learn-btw` guides you through initial setup to configure your preferred coach model and target language.

---

## 🎮 Commands: `/learn-btw` (Alias: `/btw`)

```text
/learn-btw          -> Toggle on / off
/learn-btw stats    -> View learning analytics (prompts analyzed, improvement rate, top words)
/learn-btw config   -> Open the interactive configuration wizard
```

### Keyboard Shortcut
- **`Alt+E`**: Cycle between `[DIFF]` ➔ `[IMPROVED]` ➔ `[ORIGINAL]` view.

---

## ⚙️ Interactive Configuration (`/learn-btw config`)

Running `/learn-btw config` opens an interactive menu to customize:
1. **Target Language**: English (recommended), Spanish, French, German, Italian, Portuguese, or Custom (space-delimited).
2. **Send Polished Prompt to AI**: Disabled (0ms raw prompt) or Enabled (waits for polish).
3. **Select Model**: Choose from authenticated fast models in your environment (defaults to `antigravity/gemini-3.8-flash` with auto-fallback).
4. **Default View**: `diff`, `improved`, or `original`.
5. **Clear History Data**: Reset local analytics records.

Configuration is stored in `~/.pi/learn-btw/config.json`.

### Environment Variables
You can also override the coach provider and model via environment variables:
- `PI_LEARN_BTW_PROVIDER`: Set custom provider (e.g. `openai`, `anthropic`, `google`)
- `PI_LEARN_BTW_MODEL`: Set custom model ID (e.g. `gpt-4o-mini`, `claude-3-5-haiku`)

---

## 🧪 Testing

Run the automated test suite and type checking:

```bash
npm test
npm run check
```

All 12 unit tests cover:
- Word-level LCS diffing without word concatenation
- Soft code-diff ANSI terminal color rendering
- Case-insensitivity and punctuation-ignoring gatekeeper
- JSON parsing and error resilience
- History persistence and metrics calculation

---

## 📄 License

MIT © [chxsong](https://github.com/chxsong)
