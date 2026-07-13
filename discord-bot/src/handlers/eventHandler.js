// Loads every event file under src/events/*.js and binds it to the client.
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVENTS_PATH = path.join(__dirname, '..', 'events');

export async function loadEvents(client) {
  const files = readdirSync(EVENTS_PATH).filter((file) => file.endsWith('.js'));

  for (const file of files) {
    const imported = await import(pathToFileURL(path.join(EVENTS_PATH, file)).href);
    const event = imported.default;

    if (!event?.name || typeof event.execute !== 'function') {
      logger.warn(`Skipping invalid event file: ${file}`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }

  logger.success(`Loaded ${files.length} events.`);
}
