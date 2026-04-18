# SaxCode

SaxCode is a high-fidelity, autonomous coding agent designed for a professional terminal experience. Inspired by the minimalist aesthetics of Claude Code, SaxCode combines agentic power with a state-of-the-art Terminal User Interface (TUI).

---

## Features

- **High-Fidelity TUI**: A professional, Claude-inspired interface built with [Ink](https://github.com/vadimdemedes/ink).
- **Shimmering Spinner**: An adaptive, glimmering thinking indicator with randomized agent verbs (Whirring, Architecting, Processing...).
- **Professional Autocomplete**: A sleek, two-column autocomplete system for commands and file mentions, with clear descriptions.
- **Approval Modes**: Switch between `MANUAL` (approval required) and `AUTO` (autonomous execution).
- **Thinking Stats**: Track thinking duration (s) and token usage (↓) in real-time.
- **Multi-Provider Support**: Support for Anthropic, Ollama, Kilocode, and more.
- **Output Styles**: Customize the agent's response style (Default, Explanatory, or Learning).

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed.
- API Key for your preferred provider.

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

3. **Set up environment:**
   Create a `.env` file:
   ```env
   SAX_PROVIDER=anthropic
   ANTHROPIC_API_KEY=your_key_here
   ```

4. **Run SaxCode:**
   ```bash
   bun run dev
   ```

---

## Commands

- `/auto` - Toggle autonomous mode.
- `/clear` - Clear conversation.
- `/model <name>` - Switch model.
- `/provider <name>` - Switch provider.
- `/style <name>` - Change response style.
- `/stats` - Open usage dashboard.
- `/exit` - Close application.

---

## Tech Stack

- **Runtime**: Bun
- **UI Engine**: Ink
- **Styling**: Chalk
- **MD Rendering**: Marked

---

## Contributing

Feel free to open issues or PRs to improve the project.

---

## License

MIT License.

---

*By JonusNattapong*