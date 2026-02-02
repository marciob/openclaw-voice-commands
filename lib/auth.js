/**
 * Authentication module
 */

const crypto = require('crypto');
const { config } = require('./config');

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Verify API key from Authorization header
 */
function verifyApiKey(authHeader) {
  const providedKey = (authHeader || '').replace(/^Bearer\s+/i, '');
  return secureCompare(providedKey, config.apiKey);
}

/**
 * Get client IP, handling reverse proxy headers
 */
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

module.exports = { verifyApiKey, getClientIP };
