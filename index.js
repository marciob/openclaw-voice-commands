#!/usr/bin/env node
/**
 * Siri Bridge for OpenClaw / Clawdbot
 *
 * A secure HTTP bridge for Apple Shortcuts / Siri integration.
 * See README.md for setup instructions.
 */

const http = require('http');
const { config, validate } = require('./lib/config');
const { verifyApiKey, getClientIP } = require('./lib/auth');
const { check: checkRateLimit, hashIP } = require('./lib/rate-limit');
const agent = require('./lib/agent');

validate();

const server = http.createServer(async (req, res) => {
  const clientIP = getClientIP(req);
  const hashedIP = hashIP(clientIP);

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Type', 'application/json');

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.writeHead(204);
    return res.end();
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: 'ok' }));
  }

  // POST /ask
  if (req.method === 'POST' && req.url === '/ask') {
    // Rate limit
    const rateLimit = checkRateLimit(clientIP);
    res.setHeader('X-RateLimit-Limit', config.rateLimitMax);
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimit.resetIn);

    if (!rateLimit.allowed) {
      console.log(`[${new Date().toISOString()}] Rate limited: ${hashedIP}`);
      res.writeHead(429);
      return res.end(JSON.stringify({ error: 'Too many requests', retryAfter: rateLimit.resetIn }));
    }

    // Auth
    if (!verifyApiKey(req.headers['authorization'])) {
      console.log(`[${new Date().toISOString()}] Auth failed: ${hashedIP}`);
      res.writeHead(401);
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }

    // Parse body
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > config.maxMessageLength + 1000) req.destroy();
    });

    req.on('end', async () => {
      try {
        const { message } = JSON.parse(body);

        if (!message || typeof message !== 'string' || !message.trim()) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: 'Missing or invalid "message" field' }));
        }

        if (message.length > config.maxMessageLength) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: `Message too long (max ${config.maxMessageLength})` }));
        }

        console.log(`[${new Date().toISOString()}] Request from ${hashedIP}: "${message.substring(0, 50)}..."`);

        const response = await agent.run(message);

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

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(config.port, config.bindHost, () => {
  console.log(`🦞 Siri Bridge for OpenClaw`);
  console.log(`Listening on http://${config.bindHost}:${config.port}`);
  console.log(`CLI: ${config.cliCommand} | Agent: ${config.agent}`);
  console.log(`Rate limit: ${config.rateLimitMax}/${config.rateLimitWindowMs / 1000}s`);
  if (config.bindHost === '0.0.0.0') {
    console.log('⚠️  WARNING: Use a reverse proxy with HTTPS!');
  }
});
