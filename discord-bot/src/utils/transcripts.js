// Ticket transcript generation — an HTML transcript (via discord-html-transcripts)
// plus a hand-built plain-text version, for the configured transcript channel.
import { createTranscript } from 'discord-html-transcripts';
import { AttachmentBuilder } from 'discord.js';

export async function generateHtmlTranscript(channel, ticketId) {
  return createTranscript(channel, {
    limit: -1,
    returnType: 'attachment',
    filename: `ticket-${ticketId}.html`,
    saveImages: false,
    poweredBy: false,
  });
}

export async function generateTextTranscript(channel, ticketId) {
  const messages = await fetchAllMessages(channel);
  const lines = [
    `Transcript for ticket #${ticketId} — #${channel.name}`,
    `Generated: ${new Date().toISOString()}`,
    '='.repeat(60),
    '',
  ];

  for (const message of messages) {
    const time = new Date(message.createdTimestamp).toISOString();
    const displayName = message.member?.displayName ?? message.author.username;
    lines.push(`[${time}] ${message.author.tag} (${displayName}): ${message.content || '(no text content)'}`);

    for (const embed of message.embeds) {
      if (embed.title || embed.description) {
        lines.push(`    [Embed] ${embed.title ?? ''}${embed.description ? ` — ${embed.description}` : ''}`);
      }
    }
    for (const attachment of message.attachments.values()) {
      lines.push(`    [Attachment] ${attachment.url}`);
    }
  }

  return new AttachmentBuilder(Buffer.from(lines.join('\n'), 'utf-8'), { name: `ticket-${ticketId}.txt` });
}

async function fetchAllMessages(channel) {
  const all = [];
  let lastId;

  // Discord paginates message history in batches of up to 100.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const options = { limit: 100, ...(lastId && { before: lastId }) };
    const batch = await channel.messages.fetch(options);
    if (batch.size === 0) break;
    all.push(...batch.values());
    lastId = batch.last().id;
    if (batch.size < 100) break;
  }

  return all.reverse(); // oldest first
}
