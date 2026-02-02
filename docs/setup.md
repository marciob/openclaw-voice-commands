# Setup Guide

Works on **any server** running OpenClaw/Clawdbot - VPS, cloud, or your own Mac.

## Prerequisites

- Node.js 18+
- OpenClaw or Clawdbot installed and running
- Network access (see hosting options below)

## Hosting Options

| Setup | Best For | Complexity |
|-------|----------|------------|
| [VPS/Cloud](#vps-cloud) | Always-on, public access | Medium |
| [Mac Mini + Tailscale](#mac-with-tailscale) | Home server, secure | Easy |
| [Mac Mini + Port Forward](#mac-with-port-forwarding) | Home server, public | Medium |
| [Local Only](#local-network-only) | Same WiFi only | Easy |

---

## VPS / Cloud

Works on Hetzner, DigitalOcean, AWS, Linode, Vultr, or any VPS.

### 1. Install & Configure

```bash
git clone https://github.com/marciob/openclaw-voice-commands.git
cd openclaw-voice-commands

# Create config
sudo nano /etc/siri-bridge.env
```

Add:
```bash
API_KEY=your-secret-key    # openssl rand -hex 32
CLI_COMMAND=clawdbot       # or 'openclaw'
```

```bash
sudo chmod 600 /etc/siri-bridge.env
```

### 2. Setup HTTPS with Caddy

```bash
# Install Caddy (Ubuntu/Debian)
sudo apt install -y caddy
```

Edit `/etc/caddy/Caddyfile`:

**With domain:**
```
yourdomain.com {
    reverse_proxy localhost:18790
}
```

**Without domain (free sslip.io):**
```
# Replace YOUR-SERVER-IP with dashes: 203-0-113-50.sslip.io
YOUR-SERVER-IP.sslip.io {
    reverse_proxy localhost:18790
}
```

```bash
sudo systemctl restart caddy
```

### 3. Firewall

```bash
sudo ufw allow 443/tcp
sudo ufw enable
```

### 4. Run

```bash
# Test
set -a; source /etc/siri-bridge.env; set +a; node index.js

# Production: use systemd (see examples/siri-bridge.service)
```

---

## Mac with Tailscale

Best for home Mac Mini - secure, no port forwarding needed.

### 1. Install Tailscale

Download from [tailscale.com](https://tailscale.com/download) and sign in.

### 2. Enable HTTPS

```bash
tailscale cert $(tailscale status --json | jq -r '.Self.DNSName' | sed 's/\.$//')
```

Or enable [Tailscale Funnel](https://tailscale.com/kb/1223/tailscale-funnel) for public access:

```bash
tailscale funnel 18790
```

### 3. Configure & Run

```bash
git clone https://github.com/marciob/openclaw-voice-commands.git
cd openclaw-voice-commands

export API_KEY=$(openssl rand -hex 32)
export CLI_COMMAND=clawdbot
export BIND_HOST=0.0.0.0  # Allow Tailscale access

node index.js
```

### 4. Your URL

Use your Tailscale hostname:
```
https://your-mac.tail1234.ts.net:18790/ask
```

Or with Funnel:
```
https://your-mac.tail1234.ts.net/ask
```

---

## Mac with Port Forwarding

For home server with public access via router.

### 1. Get Static IP or Dynamic DNS

- Use a service like [DuckDNS](https://duckdns.org) (free)
- Or check if your ISP offers static IP

### 2. Port Forward on Router

Forward port `443` to your Mac's local IP on port `18790`.

### 3. Install Caddy on Mac

```bash
brew install caddy
```

Create `Caddyfile`:
```
yourdomain.duckdns.org {
    reverse_proxy localhost:18790
}
```

Run:
```bash
sudo caddy run
```

### 4. Configure & Run

```bash
export API_KEY=$(openssl rand -hex 32)
export CLI_COMMAND=clawdbot
node index.js
```

---

## Local Network Only

For Siri on same WiFi as your Mac (no internet access needed).

### 1. Run with local binding

```bash
export API_KEY=$(openssl rand -hex 32)
export CLI_COMMAND=clawdbot
export BIND_HOST=0.0.0.0  # Allow LAN access

node index.js
```

### 2. Find your Mac's local IP

```bash
ipconfig getifaddr en0
# Example: 192.168.1.100
```

### 3. Use in Shortcut

URL: `http://192.168.1.100:18790/ask`

Note: HTTP only works on local network (no HTTPS needed for LAN).

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_KEY` | required | Auth key (`openssl rand -hex 32`) |
| `PORT` | 18790 | Server port |
| `BIND_HOST` | 127.0.0.1 | `0.0.0.0` for network access |
| `AGENT` | main | OpenClaw agent ID |
| `CLI_COMMAND` | clawdbot | `clawdbot` or `openclaw` |
| `TIMEOUT` | 120 | Agent timeout (seconds) |
| `RATE_LIMIT_MAX` | 10 | Requests per minute |

---

## Run as Service

### macOS (launchd)

Create `~/Library/LaunchAgents/com.openclaw.siri-bridge.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.openclaw.siri-bridge</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/openclaw-voice-commands/index.js</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>API_KEY</key>
        <string>your-api-key</string>
        <key>CLI_COMMAND</key>
        <string>clawdbot</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.openclaw.siri-bridge.plist
```

### Linux (systemd)

See `examples/siri-bridge.service`
