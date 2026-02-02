#!/usr/bin/env node
/**
 * Siri Bridge for OpenClaw / Clawdbot
 *
 * A minimal HTTP server that exposes OpenClaw's agent as an HTTP endpoint
 * for Apple Shortcuts / Siri integration.
 *
 * SECURITY NOTES:
 * - This should run behind a reverse proxy (Caddy/nginx) with HTTPS
 * - Bind to 127.0.0.1 only - never expose directly to internet
 * - API key should be stored in /etc/siri-bridge.env with chmod 600
 * - spawn() with args array prevents command injection
 *
 * Usage:
 *   API_KEY=your-secret-key node siri-bridge.js
 *
 * Environment variables:
 *   API_KEY              - Required. Secret key for authentication
 *   PORT                 - Optional. Default: 18790
 *   BIND_HOST            - Optional. Default: 127.0.0.1 (localhost only)
 *   AGENT                - Optional. Agent ID to use. Default: main
 *   TIMEOUT              - Optional. Timeout in seconds. Default: 120
 *   RATE_LIMIT_MAX       - Optional. Max requests per window. Default: 10
 *   RATE_LIMIT_WINDOW_MS - Optional. Window in ms. Default: 60000 (1 min)
 *   MAX_MESSAGE_LENGTH   - Optional. Max message chars. Default: 4000
 *   CLI_COMMAND          - Optional. CLI command name. Default: clawdbot (use 'openclaw' if needed)
 */

const http = require('http');
const { spawn } = require('child_process');
const crypto = require('crypto');

// Configuration
const PORT = parseInt(process.env.PORT || '18790', 10);
const BIND_HOST = process.env.BIND_HOST || '127.0.0.1';
const API_KEY = process.env.API_KEY;
const AGENT = process.env.AGENT || 'main';
const TIMEOUT = process.env.TIMEOUT || '120';
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '10', 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const MAX_MESSAGE_LENGTH = parseInt(process.env.MAX_MESSAGE_LENGTH || '4000', 10);
const CLI_COMMAND = process.env.CLI_COMMAND || 'clawdbot';

if (!API_KEY) {
  console.error('Error: API_KEY environment variable is required');
  console.error('');
  console.error('Usage:');
  console.error('  API_KEY=your-secret-key node siri-bridge.js');
  console.error('');
  console.error('Or with environment file:');
  console.error('  set -a; source /etc/siri-bridge.env; set +a; node siri-bridge.js');
  process.exit(1);
}

// Rate limiting store: Map<hashedIP, { count: number, resetAt: number }>
const rateLimitStore = new Map();

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Hash IP for privacy (don't log raw IPs)
 */
function hashIP(ip) {
  return crypto.createHash('sha256').update(ip + API_KEY).digest('hex').substring(0, 16);
}

/**
 * Check rate limit for an IP
 * Returns { allowed: boolean, remaining: number, resetIn: number }
 */
function checkRateLimit(ip) {
  const hashedIP = hashIP(ip);
  const now = Date.now();

  let entry = rateLimitStore.get(hashedIP);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitStore.set(hashedIP, entry);
  }

  entry.count++;

  return {
    allowed: entry.count <= RATE_LIMIT_MAX,
    remaining: Math.max(0, RATE_LIMIT_MAX - entry.count),
    resetIn: Math.ceil((entry.resetAt - now) / 1000),
  };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Get client IP, handling reverse proxy headers
 */
function getClientIP(req) {
  // Trust X-Forwarded-For only if behind reverse proxy
  // Caddy/nginx set this header
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Run OpenClaw/Clawdbot agent command
 * Uses spawn() with args array - safe from command injection
 */
function runAgent(message) {
  return new Promise((resolve, reject) => {
    // Args are passed as array elements, not interpolated - safe from injection
    const args = ['agent', '--agent', AGENT, '--message', message, '--json', '--timeout', TIMEOUT];

    const proc = spawn(CLI_COMMAND, args, {
      env: { ...process.env, PATH: process.env.PATH },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${CLI_COMMAND} exited with code ${code}: ${stderr.substring(0, 200)}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout.trim());

        let response = '';

        // Primary path: result.payloads[0].text (OpenClaw/Clawdbot format)
        if (parsed.result?.payloads?.[0]?.text) {
          response = parsed.result.payloads[0].text;
        }
        // Fallback paths for other formats
        else if (parsed.text) {
          response = parsed.text;
        } else if (parsed.content) {
          response = parsed.content;
        } else if (parsed.response) {
          response = parsed.response;
        }

        // Clean up response for speech (remove markdown formatting)
        response = response
          .replace(/```[\s\S]*?```/g, ' [code block] ')
          .replace(/`([^`]+)`/g, '$1')
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/#{1,6}\s/g, '')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .trim();

        if (!response) {
          response = 'I received your message but had no response.';
        }

        resolve(response);
      } catch (err) {
        resolve(stdout.trim() || 'No response received');
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn ${CLI_COMMAND}: ${err.message}`));
    });
  });
}

const server = http.createServer(async (req, res) => {
  const clientIP = getClientIP(req);
  const hashedIP = hashIP(clientIP);

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight (for CORS if needed)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check endpoint (no auth, no rate limit)
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // Main endpoint: POST /ask
  if (req.method === 'POST' && req.url === '/ask') {
    // Rate limiting (applied before auth to prevent brute force)
    const rateLimit = checkRateLimit(clientIP);
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX);
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimit.resetIn);

    if (!rateLimit.allowed) {
      console.log(`[${new Date().toISOString()}] Rate limited: ${hashedIP}`);
      res.writeHead(429);
      res.end(JSON.stringify({
        error: 'Too many requests',
        retryAfter: rateLimit.resetIn
      }));
      return;
    }

    // Verify API key with constant-time comparison
    const authHeader = req.headers['authorization'] || '';
    const providedKey = authHeader.replace(/^Bearer\s+/i, '');

    if (!secureCompare(providedKey, API_KEY)) {
      console.log(`[${new Date().toISOString()}] Auth failed: ${hashedIP}`);
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    // Parse request body with size limit
    let body = '';
    let bodyTooLarge = false;

    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > MAX_MESSAGE_LENGTH + 1000) { // +1000 for JSON overhead
        bodyTooLarge = true;
        req.destroy();
      }
    });

    req.on('end', async () => {
      if (bodyTooLarge) {
        res.writeHead(413);
        res.end(JSON.stringify({ error: 'Request too large' }));
        return;
      }

      try {
        const parsed = JSON.parse(body);
        const message = parsed.message;

        // Validate message
        if (!message || typeof message !== 'string') {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing or invalid "message" field' }));
          return;
        }

        if (message.length > MAX_MESSAGE_LENGTH) {
          res.writeHead(400);
          res.end(JSON.stringify({
            error: `Message too long (max ${MAX_MESSAGE_LENGTH} chars)`
          }));
          return;
        }

        if (message.trim().length === 0) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Message cannot be empty' }));
          return;
        }

        console.log(`[${new Date().toISOString()}] Request from ${hashedIP}: "${message.substring(0, 50)}..."`);

        const response = await runAgent(message);

        console.log(`[${new Date().toISOString()}] Response: "${response.substring(0, 50)}..."`);

        res.writeHead(200);
        res.end(JSON.stringify({ response }));
      } catch (err) {
        if (err instanceof SyntaxError) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        } else {
          console.error(`[${new Date().toISOString()}] Error:`, err.message);
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      }
    });

    return;
  }

  // 404 for everything else
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, BIND_HOST, () => {
  console.log(`🦞 Siri Bridge for OpenClaw`);
  console.log(`Listening on http://${BIND_HOST}:${PORT}`);
  console.log(`Endpoint: POST /ask`);
  console.log(`Health: GET /health`);
  console.log(`CLI: ${CLI_COMMAND}`);
  console.log(`Agent: ${AGENT}`);
  console.log(`Rate limit: ${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW_MS / 1000}s`);
  console.log(`Max message length: ${MAX_MESSAGE_LENGTH} chars`);
  console.log('');
  if (BIND_HOST === '0.0.0.0') {
    console.log('⚠️  WARNING: Bound to all interfaces. Use a reverse proxy with HTTPS!');
  }
  console.log('Waiting for requests...');
});
