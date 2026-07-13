// Lightweight timestamped logger — no external dependencies.
const COLORS = {
  info: '\x1b[36m', // cyan
  success: '\x1b[32m', // green
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
  reset: '\x1b[0m',
};

function timestamp() {
  return new Date().toISOString().replace('T', ' ').split('.')[0];
}

function log(level, color, message) {
  console.log(`${color}[${timestamp()}] [${level.toUpperCase()}]${COLORS.reset} ${message}`);
}

export const logger = {
  info: (message) => log('info', COLORS.info, message),
  success: (message) => log('success', COLORS.success, message),
  warn: (message) => log('warn', COLORS.warn, message),
  error: (message) => log('error', COLORS.error, message),
};
