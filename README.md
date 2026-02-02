# OpenClaw Voice Commands

Connect Apple Siri to your OpenClaw/Clawdbot AI assistant.

```
"Hey Siri, OpenClaw"  →  Your Server  →  AI Response  →  Siri speaks
```

## Features

- **Secure**: HTTPS, rate limiting, constant-time auth
- **Simple**: Pure Node.js, no dependencies
- **Modular**: Clean, composable code structure

## Quick Start

```bash
# 1. Clone
git clone https://github.com/marciob/openclaw-voice-commands.git
cd openclaw-voice-commands

# 2. Generate API key
openssl rand -hex 32

# 3. Run
API_KEY=your-key node index.js
```

## Documentation

| Doc | Description |
|-----|-------------|
| [Setup Guide](docs/setup.md) | Server installation & configuration |
| [Shortcut Guide](docs/shortcut.md) | Create the Apple Shortcut |
| [API Reference](docs/api.md) | HTTP endpoints |
| [Troubleshooting](docs/troubleshooting.md) | Common issues & fixes |

## Project Structure

```
├── index.js              # Entry point
├── lib/
│   ├── config.js         # Configuration
│   ├── auth.js           # Authentication
│   ├── rate-limit.js     # Rate limiting
│   └── agent.js          # Agent runner
├── examples/
│   ├── Caddyfile.example # HTTPS proxy config
│   └── siri-bridge.service # systemd service
└── docs/                 # Documentation
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_KEY` | required | Authentication key |
| `PORT` | 18790 | Server port |
| `BIND_HOST` | 127.0.0.1 | Bind address |
| `AGENT` | main | OpenClaw agent ID |
| `CLI_COMMAND` | clawdbot | CLI command |

See [Setup Guide](docs/setup.md) for all options.

## License

MIT
