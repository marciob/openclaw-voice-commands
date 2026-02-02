# API Reference

## Endpoints

### POST /ask

Send a message to the OpenClaw agent.

**Headers:**
```
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

**Request:**
```json
{
  "message": "What's the weather?"
}
```

**Response:**
```json
{
  "response": "I don't have weather data..."
}
```

**Rate Limit Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 45
```

### GET /health

Health check (no auth required).

**Response:**
```json
{
  "status": "ok"
}
```

## Error Codes

| Code | Error | Description |
|------|-------|-------------|
| 400 | Invalid JSON | Malformed request body |
| 400 | Missing message | No `message` field |
| 401 | Unauthorized | Invalid API key |
| 413 | Request too large | Body exceeds limit |
| 429 | Too many requests | Rate limited |
| 500 | Internal error | Server error |

## Example

```bash
curl -X POST https://your-domain/ask \
  -H "Authorization: Bearer abc123" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```
