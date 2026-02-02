/**
 * Rate limiting module
 */

const crypto = require('crypto');
const { config } = require('./config');

const store = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store) {
    if (value.resetAt < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Hash IP for privacy
 */
function hashIP(ip) {
  return crypto.createHash('sha256')
    .update(ip + config.apiKey)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Check rate limit for an IP
 */
function check(ip) {
  const hashedIP = hashIP(ip);
  const now = Date.now();

  let entry = store.get(hashedIP);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.rateLimitWindowMs };
    store.set(hashedIP, entry);
  }

  entry.count++;

  return {
    allowed: entry.count <= config.rateLimitMax,
    remaining: Math.max(0, config.rateLimitMax - entry.count),
    resetIn: Math.ceil((entry.resetAt - now) / 1000),
  };
}

module.exports = { check, hashIP };
