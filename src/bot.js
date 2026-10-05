import { Client, Events, GatewayIntentBits } from 'discord.js';
import { cleanUrl } from './cleaner.js';
import { extractUrls } from './extract.js';

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

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.inGuild()) return;

  const reply = buildReply(cleanedLinks(message.content));
  if (!reply) return;

  try {
    await message.reply({
      content: reply,
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
});

client.login(token);
