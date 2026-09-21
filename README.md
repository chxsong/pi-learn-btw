# pi-learn-btw

> **Learn English By The Way, while coding with AI.**  
> Zero-cognitive-load, multi-language expression improvement for Pi Coding Agent.

[![npm version](https://img.shields.io/npm/v/pi-learn-btw.svg)](https://www.npmjs.com/package/pi-learn-btw)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Pi Package](https://img.shields.io/badge/Pi-Package-purple.svg)](https://pi.dev)

---

## 💡 Philosophy: Learn By The Way

Existing AI language tools either:
1. **Pollute conversation context**: Inject grammar lectures directly into chat history, consuming expensive reasoning tokens on every subsequent turn.
2. **Interrupt your flow**: Force you into a "language lesson" mindset while you are solving engineering problems.
3. **Scroll away**: In terminal coding agents, tool calls, bash logs, and thinking blocks push your original prompt and any feedback off the screen.

**pi-learn-btw** solves this with a clean, decoupled architecture:
- 📌 **Pinned `belowEditor`**: Pinned directly below your input box. It never scrolls away.
- ⚡ **Zero Friction**: Uses models you have already configured in Pi. Your primary task runs immediately, while your expression is refined in parallel.
- 🎨 **Git Code Diff Theme**: Soft dark-red (removed words) and soft dark-green (improved words) in a clean 2-line stacked diff.
- ⌨️ **Instant Toggle (`Alt+E`)**: Cycle seamlessly between `[DIFF]` ➔ `[IMPROVED]` ➔ `[ORIGINAL]` with clear mode badges.
- 🌐 **Multi-Language Ready**: Learn English (recommended), Spanish, French, German, Italian, Portuguese, or any space-delimited language. *(Note: Non-spaced languages like Chinese and Japanese are not currently supported by word-level diffing).*
- 📊 **Quantified Progress (`/learn-btw stats`)**: Tracks your modification ratio and error reduction percentage over time.

---

## 📦 Installation

Install directly via Pi's package manager:

```bash
# Install from npm (recommended)
pi install npm:pi-learn-btw

# Or install from GitHub
pi install git:github.com/chxsong/pi-learn-btw
```

On first startup, `pi-learn-btw` greets you with a quick setup prompt to confirm or customize your coach model and target language.

---

## 🤖 Model Configuration

`pi-learn-btw` uses the models **you have already configured in Pi**:
- **Default**: Automatically uses your active Pi session model (0 additional setup required).
- **Custom Coach**: Want to use a cheaper/faster model (like `gpt-4o-mini`, `claude-3-5-haiku`, or `gemini-2.5-flash`) for expression coaching? Run `/learn-btw config` and select from any model configured in your Pi environment.

You can also override the coach provider and model via environment variables:
- `PI_LEARN_BTW_PROVIDER`: e.g. `openai`, `anthropic`, `google`
- `PI_LEARN_BTW_MODEL`: e.g. `gpt-4o-mini`, `claude-3-5-haiku`, `gemini-2.5-flash`

---

## 🎮 Commands: `/learn-btw` (Alias: `/btw`)

```text
/learn-btw          -> Toggle on / off (quick one-shot toggle)
/learn-btw stats    -> View learning analytics (prompts analyzed, improvement rate, top words)
/learn-btw config   -> Open the interactive configuration wizard
```

### Keyboard Shortcut
- **`Alt+E`**: Cycle between `[DIFF]` ➔ `[IMPROVED]` ➔ `[ORIGINAL]` views.

---

## ⚙️ Interactive Configuration (`/learn-btw config`)

Running `/learn-btw config` opens an interactive TUI menu:
1. **Target Language**: English (recommended), Spanish, French, German, Italian, Portuguese, or Custom (space-delimited).
2. **Send Polished Prompt to AI**: Disabled (0ms latency, sends what you typed) or Enabled (waits for polish, sends improved prompt to AI).
3. **Select Model**: Choose from the models you have already configured in Pi, or enter a custom `provider/model_id`.
4. **Default View**: `diff`, `improved`, or `original`.
5. **Clear History Data**: Reset local analytics records.

Configuration is persisted in `~/.pi/learn-btw/config.json`.

---

## 🧪 Testing & Verification

Run the automated test suite and type checking:

```bash
npm test       # Run 12 unit tests
npm run check  # TypeScript strict type checking
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
