// Minimal JSON-file storage layer. No database — everything persists to src/data/*.json.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

function ensureFile(fileName, defaultData) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const filePath = path.join(DATA_DIR, fileName);
  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
  return filePath;
}

export function readJson(fileName, defaultData = {}) {
  const filePath = ensureFile(fileName, defaultData);
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (err) {
    logger.error(`Failed to read ${fileName}, falling back to default: ${err}`);
    return defaultData;
  }
}

export function writeJson(fileName, data) {
  const filePath = ensureFile(fileName, {});
  try {
    writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    logger.error(`Failed to write ${fileName}: ${err}`);
  }
}
