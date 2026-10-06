import { Client, Events, GatewayIntentBits, MessageType } from 'discord.js';
import { cleanUrl } from './cleaner.js';
import { extractUrls, replaceUrls } from './extract.js';

const MAX_MESSAGE_LENGTH = 2000;

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

function cleanedLinks(content) {
  const links = [];
  for (const url of extractUrls(content)) {
    const cleaned = cleanUrl(url);
    if (cleaned !== url && !links.includes(cleaned)) links.push(cleaned);
  }
  return links;
}

function buildReply(links) {
  let reply = '';
  for (const link of links) {
    const next = reply ? `${reply}\n${link}` : link;
    if (next.length > MAX_MESSAGE_LENGTH) break;
    reply = next;
  }
  return reply;
}

client.once(Events.ClientReady, (ready) => {
  console.log(`Logged in as ${ready.user.tag}`);
});

// Replaces the message with a tracker-free copy that mentions its author.
// Returns false when that is not possible, so the caller can fall back to a reply.
async function repost(message) {
  // Stickers and polls cannot be carried over; deleting needs the Manage Messages permission.
  if (!message.deletable || message.stickers.size || message.poll) return false;

  const content = `${message.author}: ${replaceUrls(message.content, cleanUrl)}`;
  if (content.length > MAX_MESSAGE_LENGTH) return false;

  try {
    await message.channel.send({
      content,
      files: [...message.attachments.values()],
      // The mention is shown without pinging anyone a second time.
      allowedMentions: { parse: [], repliedUser: false },
      reply:
        message.type === MessageType.Reply
          ? { messageReference: message.reference.messageId, failIfNotExists: false }
          : undefined,
    });
  } catch (error) {
    console.warn(`Could not repost in #${message.channel.name}: ${error.message}`);
    return false;
  }

  try {
    await message.delete();
  } catch (error) {
    console.warn(`Could not delete the original in #${message.channel.name}: ${error.message}`);
  }
  return true;
}

async function replyWithLinks(message, links) {
  try {
    await message.reply({
      content: buildReply(links),
      allowedMentions: { parse: [], repliedUser: false },
    });
  } catch (error) {
    console.error(`Could not reply in #${message.channel.name}: ${error.message}`);
    return;
  }

  // Hides the preview of the tracked link; needs the Manage Messages permission.
  try {
    await message.suppressEmbeds(true);
  } catch (error) {
    console.warn(`Could not suppress embeds in #${message.channel.name}: ${error.message}`);
  }
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.inGuild()) return;

  const links = cleanedLinks(message.content);
  if (!links.length) return;

  if (!(await repost(message))) await replyWithLinks(message, links);
});

client.login(token);
