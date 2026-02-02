# Setup Guide

## Prerequisites

- Node.js 18+
- OpenClaw or Clawdbot installed
- A server with public IP (or Tailscale)

## 1. Install

```bash
git clone https://github.com/marciob/openclaw-voice-commands.git
cd openclaw-voice-commands
```

## 2. Configure

Create `/etc/siri-bridge.env`:

```bash
API_KEY=your-secret-key          # Required: openssl rand -hex 32
PORT=18790                        # Optional
BIND_HOST=127.0.0.1              # Optional (use 127.0.0.1 for security)
AGENT=main                        # Optional: OpenClaw agent ID
TIMEOUT=120                       # Optional: seconds
CLI_COMMAND=clawdbot             # Optional: or 'openclaw'
RATE_LIMIT_MAX=10                # Optional: requests per window
RATE_LIMIT_WINDOW_MS=60000       # Optional: window in ms
MAX_MESSAGE_LENGTH=4000          # Optional: max chars
```

Secure it:
```bash
sudo chmod 600 /etc/siri-bridge.env
```

## 3. Setup HTTPS (Required)

### Install Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

### Configure Caddy

Edit `/etc/caddy/Caddyfile`:

**With domain:**
```
yourdomain.com {
    reverse_proxy localhost:18790
}
```

**Without domain (using sslip.io):**
```
# Replace with your IP using dashes
192-168-1-100.sslip.io {
    reverse_proxy localhost:18790
}
```

Restart:
```bash
sudo systemctl restart caddy
```

## 4. Firewall

```bash
sudo ufw allow 443/tcp
sudo ufw deny 18790/tcp
```

## 5. Run

### Development
```bash
set -a; source /etc/siri-bridge.env; set +a
node index.js
```

### Production (systemd)

Copy `examples/siri-bridge.service` to `/etc/systemd/system/`:

```bash
sudo cp examples/siri-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable siri-bridge
sudo systemctl start siri-bridge
```

## 6. Test

```bash
curl -X POST https://your-domain/ask \
  -H "Authorization: Bearer YOUR-API-KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```
