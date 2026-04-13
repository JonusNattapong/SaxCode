# 🎷 SaxCode

**SaxCode** is a high-fidelity, autonomous coding agent designed for a premium terminal experience. Inspired by the minimalist and shimmering aesthetics of Claude Code, SaxCode combines agentic power with a state-of-the-art Terminal User Interface (TUI).

---

## ✨ Features

- **🎨 High-Fidelity TUI**: A beautiful, Claude-inspired interface built with [Ink](https://github.com/vadimdemedes/ink).
- **✻ Shimmering Spinner**: An adaptive, glimmering thinking indicator with randomized "agent verbs" (Whirring, Architecting, Clauding...).
- **⌨️ Professional Autocomplete**: A sleek, two-column autocomplete system for commands and file mentions, complete with descriptions.
- **🛡️ Autonomous Mode**: Switch between `MANUAL` (approval required) and `AUTO` (autonomous execution) with ease.
- **📊 Real-time Thinking Stats**: Track thinking duration (s) and token usage (↓) live as the agent processes.
- **🏗️ Multi-Provider Support**: Seamlessly switch between Anthropic, Ollama, Kilocode, and more.
- **🎭 Output Styles**: Adapt the agent's personality—choose between *Default*, *Explanatory*, or *Learning* modes.

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your machine.
- An API Key for your preferred provider (Anthropic, Ollama, etc.).

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/JonusNattapong/SaxCode.git
   cd SaxCode
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory and add your keys:
   ```env
   SAX_PROVIDER=anthropic
   ANTHROPIC_API_KEY=your_key_here
   ```

4. **Launch SaxCode:**
   ```bash
   bun run dev
   ```

---

## ⌨️ Commands

- `/auto` - Toggle autonomous mode for automatic tool approval.
- `/clear` - Clear the current conversation and start fresh.
- `/model <name>` - Switch to a different AI model.
- `/provider <name>` - Switch LLM provider (anthropic, kilocode, ollama).
- `/style <name>` - Change response style (Default, Explanatory, Learning).
- `/stats` - Open the detailed usage statistics dashboard.
- `/exit` - Close the application.

---

## 🛠️ Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **UI Engine**: [Ink](https://github.com/vadimdemedes/ink) (React for CLI)
- **Styling**: [Chalk](https://github.com/chalk/chalk)
- **MD Rendering**: [Marked](https://github.com/markedjs/marked)
- **Agent Core**: Custom modular architecture with multi-provider support.

---

## 🤝 Contributing

SaxCode is built for the community. Feel free to open issues or PRs to help make the terminal experience even better!

---

## 📄 License

MIT License.

---

*Made with ❤️ by JonusNattapong*