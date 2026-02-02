# Troubleshooting

## Siri Issues

### Siri searches web instead of running shortcut

1. Go to **Settings → Shortcuts**
2. Enable all toggles
3. Go to **Settings → Siri & Search → Shortcuts**
4. Enable all toggles
5. Re-add shortcut to Siri with recorded voice phrase
6. Say **"run [name]"** instead of just the name

### Siri shows text instead of speaking

1. Go to **Settings → Siri & Search → Siri Responses**
2. Set to **"Always"**
3. Turn off Silent Mode (side switch)
4. Turn up volume

### "Something went wrong" error

This is usually Siri timing out, not a server error.

- Check server logs: `tail -f /var/log/siri-bridge.log`
- Keep questions shorter
- Try again

## Server Issues

### Connection refused

```bash
# Check if running
curl http://localhost:18790/health

# Check Caddy
systemctl status caddy

# Check firewall
ufw status
```

### Unauthorized error

- Verify API key matches in `/etc/siri-bridge.env` and Shortcut
- Format: `Authorization: Bearer YOUR-KEY` (space after Bearer)

### Command not found

- Verify CLI is installed: `which clawdbot` or `which openclaw`
- Set correct `CLI_COMMAND` in env file

## Logs

```bash
# Bridge logs
tail -f /var/log/siri-bridge.log

# Caddy logs
tail -f /var/log/caddy/siri-bridge.log

# systemd logs
journalctl -u siri-bridge -f
```
