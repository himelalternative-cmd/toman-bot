// Central bot configuration — colors, branding, and shared constants.
export const EMBED_COLORS = {
  primary: 0x5865f2, // Discord blurple
  success: 0x57f287,
  error: 0xed4245,
  warning: 0xfee75c,
};

export const FOOTER_TEXT = 'TOMAN';

// Duration choices offered by /timeout, in milliseconds.
export const TIMEOUT_DURATIONS = {
  '1m': 60_000,
  '5m': 5 * 60_000,
  '10m': 10 * 60_000,
  '30m': 30 * 60_000,
  '1h': 60 * 60_000,
  '6h': 6 * 60 * 60_000,
  '12h': 12 * 60 * 60_000,
  '1d': 24 * 60 * 60_000,
  '3d': 3 * 24 * 60 * 60_000,
  '7d': 7 * 24 * 60 * 60_000,
};

// Discord's hard cap on timeout duration (28 days).
export const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60_000;

// Default cooldown (seconds) applied to any command that doesn't declare its own.
export const DEFAULT_COOLDOWN_SECONDS = 3;
