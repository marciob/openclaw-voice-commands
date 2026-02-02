/**
 * Agent runner module
 */

const { spawn } = require('child_process');
const { config } = require('./config');

/**
 * Clean response for speech (remove markdown)
 */
function cleanForSpeech(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' [code block] ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

/**
 * Parse agent response from JSON output
 */
function parseResponse(stdout) {
  const parsed = JSON.parse(stdout.trim());

  // Primary: result.payloads[0].text (OpenClaw/Clawdbot format)
  if (parsed.result?.payloads?.[0]?.text) {
    return parsed.result.payloads[0].text;
  }
  // Fallbacks
  if (parsed.text) return parsed.text;
  if (parsed.content) return parsed.content;
  if (parsed.response) return parsed.response;

  return '';
}

/**
 * Run OpenClaw/Clawdbot agent
 * Uses spawn() with args array - safe from command injection
 */
function run(message) {
  return new Promise((resolve, reject) => {
    const args = [
      'agent',
      '--agent', config.agent,
      '--message', message,
      '--json',
      '--timeout', config.timeout
    ];

    const proc = spawn(config.cliCommand, args, {
      env: { ...process.env, PATH: process.env.PATH },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${config.cliCommand} exited with code ${code}`));
        return;
      }

      try {
        let response = parseResponse(stdout);
        response = cleanForSpeech(response);
        resolve(response || 'I received your message but had no response.');
      } catch {
        resolve(stdout.trim() || 'No response received');
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn ${config.cliCommand}: ${err.message}`));
    });
  });
}

module.exports = { run };
