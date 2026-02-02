/**
 * Configuration module
 */

const config = {
  port: parseInt(process.env.PORT || '18790', 10),
  bindHost: process.env.BIND_HOST || '127.0.0.1',
  apiKey: process.env.API_KEY,
  agent: process.env.AGENT || 'main',
  timeout: process.env.TIMEOUT || '120',
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '10', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH || '4000', 10),
  cliCommand: process.env.CLI_COMMAND || 'clawdbot',
};

function validate() {
  if (!config.apiKey) {
    console.error('Error: API_KEY environment variable is required');
    console.error('');
    console.error('Usage:');
    console.error('  API_KEY=your-secret-key node index.js');
    process.exit(1);
  }
}

module.exports = { config, validate };
