// ============================================================
//  commands/modmail/close.js
//  Close a modmail thread with optional delay
// ============================================================
const { SlashCommandBuilder } = require("discord.js");
const { reply }                          = require("../../utils/commandRunner");
const embeds                             = require("../../utils/embeds");
const { fromConnection: ModmailThread }  = require("../../models/ModmailThread");
const { closeThread }                    = require("../../utils/modmailUtils");
const { parseDuration }                  = require("../../utils/modUtils");

module.exports = {
  name:             "mclose",
  description:      "Close the current modmail thread.",
  category:         "modmail",
  aliases:          ["modclose"],
  usage:            "[reason] [--in <duration>]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("mclose")
    .setDescription("Close the current modmail thread.")
    .addStringOption(o => o.setName("reason").setDescription("Reason for closing.").setRequired(false))
    .addStringOption(o => o.setName("in").setDescription("Close after delay e.g. 1h, 30m.").setRequired(false))
    .toJSON(),

  async execute(client, ctx) {
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
    const guild   = ctx.type === "prefix" ? ctx.message.guild   : ctx.interaction.guild;
    const user    = ctx.type === "prefix" ? ctx.message.author  : ctx.interaction.user;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    const ModmailThreadModel = ModmailThread(guildDb.connection);
    const thread = await ModmailThreadModel.findOne({ channelId: channel.id, status: { $ne: "closed" } });
    if (!thread) return reply(ctx, { embeds: [embeds.error("This is not an active modmail thread.")] });

    let reason, delayStr;
    if (ctx.type === "prefix") {
      const argStr  = ctx.args.join(" ");
      const inMatch = argStr.match(/--in\s+(\S+)/i);
      delayStr      = inMatch?.[1] ?? null;
      reason        = argStr.replace(/--in\s+\S+/i, "").trim() || "No reason provided.";
    } else {
      reason   = ctx.interaction.options.getString("reason") || "No reason provided.";
      delayStr = ctx.interaction.options.getString("in");
    }

    const delay = delayStr ? parseDuration(delayStr) : 0;

    await reply(ctx, {
      embeds: [embeds.info(
        delay > 0
          ? `Thread will close in **${delayStr}**. Send a message to cancel.`
          : "🔒 Closing thread...",
        delay > 0 ? "⏳ Scheduled Close" : "🔒 Closing"
      )],
    });

    const result = await closeThread(client, guild, channel, user, guildDb, reason, delay);
    if (result.error) return reply(ctx, { embeds: [embeds.error(result.error)] });
  },
};
