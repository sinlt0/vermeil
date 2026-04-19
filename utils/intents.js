const { GatewayIntentBits, Partials } = require("discord.js");

/**
 * All possible Gateway Intents for Discord.js v14.25.1
 * Note: Privileged intents (Members, Presences, MessageContent) 
 * must be enabled in the Discord Developer Portal.
 */
const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildModeration,
  GatewayIntentBits.GuildExpressions,
  GatewayIntentBits.GuildIntegrations,
  GatewayIntentBits.GuildWebhooks,
  GatewayIntentBits.GuildInvites,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildPresences,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildEmojisAndStickers,	
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildMessageTyping,
  GatewayIntentBits.DirectMessages,
  GatewayIntentBits.DirectMessageReactions,
  GatewayIntentBits.DirectMessageTyping,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildScheduledEvents,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.AutoModerationConfiguration,
  GatewayIntentBits.AutoModerationExecution,
  GatewayIntentBits.GuildMessagePolls,
  GatewayIntentBits.DirectMessagePolls,
];

const partials = [
  Partials.Channel,
  Partials.Message,
  Partials.Reaction,
  Partials.User,
  Partials.GuildMember,
  Partials.ThreadMember,
  Partials.GuildScheduledEvent,
];

module.exports = { intents, partials };
