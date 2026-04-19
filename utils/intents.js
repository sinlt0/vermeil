const { GatewayIntentBits, Partials } = require("discord.js");

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildBans,
  GatewayIntentBits.GuildEmojisAndStickers,
  GatewayIntentBits.GuildIntegrations,
  GatewayIntentBits.GuildWebhooks,
  GatewayIntentBits.GuildInvites,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildPresences,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildMessageTyping,
  GatewayIntentBits.DirectMessages,
  GatewayIntentBits.DirectMessageReactions,
  GatewayIntentBits.DirectMessageTyping,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildScheduledEvents,
  GatewayIntentBits.AutoModerationConfiguration,
  GatewayIntentBits.AutoModerationExecution,
  GatewayIntentBits.GuildMessagePolls,
  GatewayIntentBits.DirectMessagePolls,
  GatewayIntentBits.GuildModeration,
  GatewayIntentBits.GuildAuditLog,
  GatewayIntentBits.GuildExpressions,
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
