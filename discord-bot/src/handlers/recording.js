// Records every speaker in a voice channel to a separate PCM track (silence-padded
// to stay in sync), then mixes all tracks into a single MP3 with ffmpeg on save.
import { EndBehaviorType } from '@discordjs/voice';
import prism from 'prism-media';
import { createWriteStream, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RECORDINGS_DIR = path.join(__dirname, '..', 'data', 'recordings');

const SAMPLE_RATE = 48_000;
const CHANNELS = 2;
const BYTES_PER_SAMPLE = 2;
const BYTES_PER_MS = (SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE) / 1000;
const MIN_GAP_MS_TO_PAD = 20;

// Active recording sessions, keyed by guild ID.
const sessions = new Map();

function silenceBuffer(ms) {
  return Buffer.alloc(Math.max(0, Math.round(ms * BYTES_PER_MS)));
}

class RecordingSession {
  constructor(guildId, connection, dir) {
    this.guildId = guildId;
    this.connection = connection;
    this.dir = dir;
    this.startedAt = Date.now();
    this.tracks = new Map(); // userId -> { filePath, writeStream }
    this.onSpeakingStart = (userId) => this.subscribeUser(userId);
  }

  subscribeUser(userId) {
    if (this.tracks.has(userId)) return;

    const opusStream = this.connection.receiver.subscribe(userId, { end: { behavior: EndBehaviorType.Manual } });
    const decoder = new prism.opus.Decoder({ rate: SAMPLE_RATE, channels: CHANNELS, frameSize: 960 });

    const filePath = path.join(this.dir, `${userId}.pcm`);
    const writeStream = createWriteStream(filePath);
    this.tracks.set(userId, { filePath, writeStream });

    // Pad silence for the time this user was silent before they started speaking,
    // so every track lines up against the same session start time.
    let lastChunkAt = Date.now();
    writeStream.write(silenceBuffer(lastChunkAt - this.startedAt));

    decoder.on('data', (chunk) => {
      const now = Date.now();
      const chunkDurationMs = chunk.length / BYTES_PER_MS;
      const gapMs = now - lastChunkAt - chunkDurationMs;
      if (gapMs > MIN_GAP_MS_TO_PAD) writeStream.write(silenceBuffer(gapMs));
      writeStream.write(chunk);
      lastChunkAt = now;
    });

    opusStream.pipe(decoder);
    opusStream.on('error', (err) => logger.warn(`Voice receive stream error for user ${userId}: ${err.message ?? err}`));
    decoder.on('error', (err) => logger.warn(`Opus decode error for user ${userId}: ${err.message ?? err}`));
  }

  async finish() {
    this.connection.receiver.speaking.removeListener('start', this.onSpeakingStart);
    await Promise.all([...this.tracks.values()].map(({ writeStream }) => new Promise((resolve) => writeStream.end(resolve))));
  }
}

export function isRecording(guildId) {
  return sessions.has(guildId);
}

/** Starts a new recording session for the guild's current voice connection. */
export async function startRecording(guildId, connection) {
  if (sessions.has(guildId)) return sessions.get(guildId);

  const dir = path.join(RECORDINGS_DIR, guildId, String(Date.now()));
  mkdirSync(dir, { recursive: true });

  const session = new RecordingSession(guildId, connection, dir);
  connection.receiver.speaking.on('start', session.onSpeakingStart);
  sessions.set(guildId, session);
  return session;
}

/** Stops the active recording, mixes every track into a single MP3, and returns its path. */
export async function stopRecordingAndMix(guildId) {
  const session = sessions.get(guildId);
  if (!session) return null;
  sessions.delete(guildId);

  await session.finish();

  const inputFiles = [...session.tracks.values()].map((t) => t.filePath).filter((f) => existsSync(f));
  if (inputFiles.length === 0) return { outputPath: null, dir: session.dir };

  const outputPath = path.join(session.dir, 'recording.mp3');
  await mixToMp3(inputFiles, outputPath);
  return { outputPath, dir: session.dir };
}

function mixToMp3(inputFiles, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [];
    for (const file of inputFiles) {
      args.push('-f', 's16le', '-ar', String(SAMPLE_RATE), '-ac', String(CHANNELS), '-i', file);
    }

    if (inputFiles.length > 1) {
      args.push('-filter_complex', `amix=inputs=${inputFiles.length}:duration=longest:dropout_transition=0`);
    }

    args.push('-y', '-acodec', 'libmp3lame', '-q:a', '4', outputPath);

    const proc = spawn(ffmpegPath, args);
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });
    proc.on('error', reject);
  });
}

export function cleanupRecording(dir) {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch (err) {
    logger.warn(`Failed to clean up recording directory ${dir}: ${err}`);
  }
}
