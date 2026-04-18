// ============================================================
//  commands/utility/ping.js
//  Shows bot latency and API ping with a clean embed
// ============================================================
const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");

module.exports = {
  name:             "ping",
  description:      "Check the bot's latency and API response time.",
  category:         "utility",
  aliases:          ["latency", "pong"],
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: false,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check the bot's latency and API response time.")
    .toJSON(),

  async execute(client, ctx) {
    // For prefix: send a placeholder first so we can measure round-trip
    const sent = ctx.type === "prefix"
      ? await ctx.message.reply({ content: "🏓 Pinging..." })
      : null;

    const wsLatency  = client.ws.ping;
    const msgLatency = sent
      ? sent.createdTimestamp - ctx.message.createdTimestamp
      : null;

    const getColor = (ms) => {
      if (ms < 100) return 0x57F287; // green  — excellent
      if (ms < 200) return 0xFEE75C; // yellow — decent
      return 0xED4245;               // red    — poor
    };

    const getLabel = (ms) => {
      if (ms < 100) return "Excellent 🟢";
      if (ms < 200) return "Decent 🟡";
      return "Poor 🔴";
    };

    const author = ctx.type === "prefix"
      ? ctx.message.author
      : ctx.interaction.user;

    const embed = new EmbedBuilder()
      .setColor(getColor(wsLatency))
      .setTitle("🏓 Pong!")
      .setDescription("Here are the current latency readings.")
      .addFields(
        {
          name:   "📡 WebSocket Latency",
          value:  `\`${wsLatency}ms\` — ${getLabel(wsLatency)}`,
          inline: true,
        },
        ...(msgLatency !== null
          ? [{
              name:   "💬 Message Latency",
              value:  `\`${msgLatency}ms\` — ${getLabel(msgLatency)}`,
              inline: true,
            }]
          : []
        ),
        {
          name:   "⏱️ Uptime",
          value:  `\`${formatUptime(client.uptime)}\``,
          inline: false,
        }
      )
      .setFooter({
        text:    `Requested by ${author.tag}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    if (ctx.type === "prefix") {
      return sent.edit({ content: null, embeds: [embed] });
    }

    return reply(ctx, { embeds: [embed] });
  },
};

// ── Helpers ───────────────────────────────────────────────
function formatUptime(ms) {
  const total   = Math.floor(ms / 1000);
  const days    = Math.floor(total / 86400);
  const hours   = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const parts = [];
  if (days)    parts.push(`${days}d`);
  if (hours)   parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
}
