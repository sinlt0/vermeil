// ============================================================
//  commands/collection/trade.js
//  $marryexchange / $me @user — initiate a trade
//  Both sides react to confirm, or add chars with $trade add
// ============================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { createTrade, addToOffer, confirmOffer, giftCharacter } = require("../../utils/collection/tradeUtils");
const { fromConnection: TradeSession }   = require("../../models/collection/TradeSession");
const { fromConnection: UserCollection } = require("../../models/collection/UserCollection");

module.exports = {
  name: "marryexchange", description: "Trade characters with another user.",
  category: "collection", aliases: ["me","trade"],
  usage: "@user", cooldown: 5, slash: false,

  async execute(client, ctx) {
    const message  = ctx.message;
    const guild    = message.guild;
    const partner  = message.mentions.users.first();

    if (!partner)           return message.reply("❌ Mention a user to trade with.");
    if (partner.bot)        return message.reply("❌ You can't trade with a bot!");
    if (partner.id === message.author.id) return message.reply("❌ You can't trade with yourself!");

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const result = await createTrade(guildDb.connection, guild.id, message.author.id, partner.id);
    if (!result.success) {
      const reasons = { already_in_trade: "❌ You or the target are already in a trade session." };
      return message.reply(reasons[result.reason] ?? `❌ ${result.reason}`);
    }

    const session  = result.session;
    const TradeModel = TradeSession(guildDb.connection);
    const UCollModel = UserCollection(guildDb.connection);

    const buildTradeEmbed = async () => {
      const fresh = await TradeModel.findById(session._id).lean();
      const initChars = fresh.initiatorOffer.characterNames.join(", ") || "*None yet*";
      const targChars = fresh.targetOffer.characterNames.join(", ")    || "*None yet*";

      return new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle("🔄 Trade Session")
        .setDescription(
          `**${message.author.username}** wants to trade with **${partner.username}**!\n\n` +
          `Type a character name to add it to your offer.\n` +
          `Both players must ✅ confirm to complete the trade.`
        )
        .addFields(
          { name: `${message.author.username}'s offer${fresh.initiatorOffer.confirmed ? " ✅" : ""}`, value: initChars, inline: true },
          { name: `${partner.username}'s offer${fresh.targetOffer.confirmed ? " ✅" : ""}`,           value: targChars, inline: true },
        )
        .setFooter({ text: `Session ID: ${session._id} • Expires in 5 minutes` });
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("trade_confirm").setLabel("✅ Confirm").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("trade_cancel").setLabel("❌ Cancel").setStyle(ButtonStyle.Danger),
    );

    const tradeMsg = await message.channel.send({
      content: `<@${partner.id}> — You've been invited to trade!`,
      embeds:  [await buildTradeEmbed()],
      components: [row],
    });

    // Save message/channel to session
    await TradeModel.findByIdAndUpdate(session._id, {
      $set: { messageId: tradeMsg.id, channelId: message.channelId },
    });

    // ── Collect messages to add characters ─────────────────
    const msgCollector = message.channel.createMessageCollector({
      filter: m => [message.author.id, partner.id].includes(m.author.id) && !m.author.bot,
      time: 5 * 60 * 1000,
    });

    msgCollector.on("collect", async m => {
      const fresh = await TradeModel.findById(session._id).lean();
      if (!fresh || fresh.status === "completed" || fresh.status === "cancelled") return msgCollector.stop();

      const res = await addToOffer(guildDb.connection, guild.id, m.author.id, session._id, m.content.trim());
      if (res.success) {
        await tradeMsg.edit({ embeds: [await buildTradeEmbed()], components: [row] });
        await m.react("✅").catch(() => {});
      } else {
        await m.react("❌").catch(() => {});
      }
    });

    // ── Collect button interactions ─────────────────────────
    const btnCollector = tradeMsg.createMessageComponentCollector({
      filter: i => [message.author.id, partner.id].includes(i.user.id),
      time: 5 * 60 * 1000,
    });

    btnCollector.on("collect", async i => {
      await i.deferUpdate();

      if (i.customId === "trade_cancel") {
        await TradeModel.findByIdAndUpdate(session._id, { $set: { status: "cancelled" } });
        await tradeMsg.edit({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription("❌ Trade cancelled.")], components: [] });
        btnCollector.stop();
        msgCollector.stop();
        return;
      }

      if (i.customId === "trade_confirm") {
        const res = await confirmOffer(guildDb.connection, guild.id, i.user.id, session._id);
        if (res.completed) {
          await tradeMsg.edit({
            embeds: [new EmbedBuilder().setColor(0x57F287).setDescription("✅ Trade complete! Characters have been swapped.")],
            components: [],
          });
          btnCollector.stop();
          msgCollector.stop();
        } else if (res.waiting) {
          await tradeMsg.edit({ embeds: [await buildTradeEmbed()], components: [row] });
        } else {
          await i.followUp({ content: `❌ ${res.reason ?? "Could not confirm trade."}`, ephemeral: true });
        }
      }
    });

    btnCollector.on("end", async (_, reason) => {
      if (reason === "time") {
        await TradeModel.findByIdAndUpdate(session._id, { $set: { status: "cancelled" } });
        await tradeMsg.edit({ embeds: [new EmbedBuilder().setColor(0x99AAB5).setDescription("⏱️ Trade expired.")], components: [] }).catch(() => {});
      }
      msgCollector.stop();
    });
  },
};
