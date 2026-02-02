# OpenClaw Voice Commands (Siri Bridge)

Connect Apple Siri to your OpenClaw / Clawdbot assistant via a secure HTTP bridge.

## How It Works

```
iPhone/Mac                     Your Server
┌─────────────┐               ┌─────────────────────────┐
│ "Hey Siri,  │   HTTPS POST  │                         │
│  OpenClaw"  │ ────────────► │  Caddy (HTTPS)          │
│             │               │         │               │
│ [speaks     │ ◄──────────── │         ▼               │
│  response]  │   JSON        │  siri-bridge.js         │
└─────────────┘               │         │               │
                              │         ▼               │
                              │  clawdbot/openclaw CLI  │
                              └─────────────────────────┘
```

## Features

- **Secure by default**: Binds to localhost, requires HTTPS reverse proxy
- **Rate limiting**: Prevents brute-force attacks (10 req/min per IP)
- **Constant-time auth**: Prevents timing attacks on API key
- **Input validation**: Message length limits, request size limits
- **Privacy-focused**: IP addresses are hashed in logs
- **No dependencies**: Pure Node.js, no npm packages required

## Prerequisites

- Node.js 18+ on your server
- OpenClaw or Clawdbot installed and running
- A domain name (or use free sslip.io for IP-based domains)
- Caddy (recommended) or nginx for HTTPS

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/yourusername/openclaw-voice-commands.git
cd openclaw-voice-commands

# Generate a secure API key
openssl rand -hex 32
# Save this key! You'll need it for the server and your Shortcut
```

### 2. Create Environment File

```bash
sudo nano /etc/siri-bridge.env
```

Add:
```bash
API_KEY=your-generated-key-here
PORT=18790
BIND_HOST=127.0.0.1
AGENT=main
TIMEOUT=120
CLI_COMMAND=clawdbot  # or 'openclaw' depending on your installation
```

Secure the file:
```bash
sudo chmod 600 /etc/siri-bridge.env
```

### 3. Install Caddy (for HTTPS)

```bash
# Ubuntu/Debian
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

### 4. Configure Caddy

Edit `/etc/caddy/Caddyfile`:

**Option A: With a domain**
```
yourdomain.com {
    reverse_proxy localhost:18790

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        -Server
    }
}
```

**Option B: Without a domain (using sslip.io)**
```
# Replace YOUR-IP with your server IP (use dashes not dots)
# Example: 192-168-1-100.sslip.io
YOUR-IP.sslip.io {
    reverse_proxy localhost:18790

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        -Server
    }
}
```

Restart Caddy:
```bash
sudo systemctl restart caddy
```

### 5. Configure Firewall

```bash
# Allow HTTPS, block direct access to bridge port
sudo ufw allow 443/tcp
sudo ufw deny 18790/tcp  # Ensure bridge is not directly accessible
sudo ufw status
```

### 6. Run the Bridge

**Simple (for testing):**
```bash
set -a; source /etc/siri-bridge.env; set +a
node siri-bridge.js
```

**With screen (persistent):**
```bash
screen -dmS siri-bridge bash -c 'set -a; source /etc/siri-bridge.env; set +a; node /path/to/siri-bridge.js 2>&1 | tee /var/log/siri-bridge.log'
```

**With systemd (recommended for production):**

Create `/etc/systemd/system/siri-bridge.service`:
```ini
[Unit]
Description=Siri Bridge for OpenClaw
After=network.target

[Service]
Type=simple
User=root
EnvironmentFile=/etc/siri-bridge.env
ExecStart=/usr/bin/node /opt/openclaw-voice-commands/siri-bridge.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/siri-bridge.log
StandardError=append:/var/log/siri-bridge.log

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable siri-bridge
sudo systemctl start siri-bridge
```

### 7. Test It

```bash
curl -X POST https://your-domain.com/ask \
  -H "Authorization: Bearer YOUR-API-KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

Expected response:
```json
{"response":"Hey there! How can I help?"}
```

## Create the Apple Shortcut

### On iPhone or Mac:

1. Open **Shortcuts** app
2. Tap **+** to create new shortcut
3. Add these actions in order:

#### Action 1: Dictate Text
- Search "Dictate Text" and add it

#### Action 2: Get Contents of URL
- **URL:** `https://your-domain.com/ask`
- **Method:** POST
- **Headers:**
  - `Authorization`: `Bearer YOUR-API-KEY`
  - `Content-Type`: `application/json`
- **Request Body:** JSON
  - Key: `message`
  - Value: Select "Dictated Text" variable

#### Action 3: Get Dictionary Value
- **Key:** `response`

#### Action 4: Speak Text
- Select the dictionary value

4. **Name your shortcut** (e.g., "OpenClaw", "Assistant", "Jarvis")

5. **Add to Siri:**
   - Tap the shortcut settings (dropdown arrow)
   - Tap "Add to Siri"
   - Record your voice saying the trigger phrase

### Siri Settings (Important!)

Go to **Settings → Siri & Search → Siri Responses** and set to **"Always"** to ensure responses are spoken aloud.

## Usage

Once configured, say:

> "Hey Siri, run OpenClaw"

Wait for dictation to start, then speak your question.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `API_KEY` | Yes | - | Secret key for authentication |
| `PORT` | No | 18790 | Port to listen on |
| `BIND_HOST` | No | 127.0.0.1 | Host to bind to |
| `AGENT` | No | main | OpenClaw agent ID |
| `TIMEOUT` | No | 120 | Agent timeout in seconds |
| `RATE_LIMIT_MAX` | No | 10 | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | No | 60000 | Rate limit window (ms) |
| `MAX_MESSAGE_LENGTH` | No | 4000 | Max message characters |
| `CLI_COMMAND` | No | clawdbot | CLI command (`clawdbot` or `openclaw`) |

## API Reference

### POST /ask

Send a message to the OpenClaw agent.

**Headers:**
- `Authorization: Bearer <API_KEY>` (required)
- `Content-Type: application/json`

**Body:**
```json
{
  "message": "What's the weather like?"
}
```

**Response:**
```json
{
  "response": "I don't have access to real-time weather data..."
}
```

**Error Responses:**
- `401` - Unauthorized (invalid API key)
- `429` - Too many requests (rate limited)
- `400` - Bad request (invalid JSON or missing message)
- `413` - Request too large
- `500` - Internal server error

### GET /health

Health check endpoint (no authentication required).

**Response:**
```json
{
  "status": "ok"
}
```

## Troubleshooting

### Siri searches the web instead of running shortcut
- Go to Settings → Shortcuts → enable all Siri options
- Go to Settings → Siri & Search → Shortcuts → enable all toggles
- Re-add the shortcut to Siri with a recorded voice phrase
- Try saying "Run [shortcut name]" instead of just the name

### Siri shows text instead of speaking
- Go to Settings → Siri & Search → Siri Responses → set to "Always"
- Make sure phone is not in Silent Mode
- Turn up volume while Siri is active

### "Something went wrong" error
- This is usually a Siri timeout, not a server error
- Check server logs: `tail -f /var/log/siri-bridge.log`
- Keep questions shorter
- Just try again

### Connection refused
- Check if bridge is running: `curl http://localhost:18790/health`
- Check if Caddy is running: `systemctl status caddy`
- Check firewall: `ufw status`

### Unauthorized error
- Verify API key matches in both `/etc/siri-bridge.env` and your Shortcut
- Make sure header is `Authorization: Bearer YOUR-KEY` (with space after Bearer)

## Security Considerations

1. **Always use HTTPS** - Never expose the bridge directly to the internet
2. **Strong API key** - Use `openssl rand -hex 32` to generate
3. **Restrict file permissions** - `/etc/siri-bridge.env` should be `chmod 600`
4. **Firewall** - Only allow port 443, block direct access to 18790
5. **Rate limiting** - Enabled by default (10 req/min)
6. **No command injection** - Uses `spawn()` with args array, not shell interpolation

## License

MIT License - See [LICENSE](LICENSE) file.

## Contributing

Contributions welcome! Please open an issue or PR.
