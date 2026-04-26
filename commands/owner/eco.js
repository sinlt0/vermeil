// ============================================================
//  commands/economy/eco.js
//  Owner/Dev only economy admin commands
//  eco reset - resets a user's economy
//  eco add   - give coins/gems/tokens to a user
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { isEcoReady, formatNum } = require("../../utils/ecoUtils");
const eco = require("../../emojis/ecoemoji");

module.exports = {
  name:        "eco",
  description: "Economy admin commands (Owner/Dev only).",
  category:    "dev",
  aliases:     ["ecoadmin"],
  usage:       "<reset|add> <@user> [amount] [currency]",
  cooldown:    3,
  ownerOnly:   false,
  devOnly:     false,
  slash:       false,

  async execute(client, ctx) {
    const message = ctx.message;
    const userId  = message.author.id;

    // ── Owner/Dev only ────────────────────────────────
    const isOwner = userId === client.config.ownerID;
    const isDev   = client.config.devIDs?.includes(userId);
    if (!isOwner && !isDev) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${eco.error} This command is restricted to the bot owner and developers.`)] });
    }

    if (!isEcoReady(client)) return message.reply(`${eco.error} Economy system unavailable.`);

    const UserProfile = client.ecoDb.getModel("Userprofile");
    const sub         = ctx.args[0]?.toLowerCase();
    const target      = message.mentions.users.first();

    // ── RESET ─────────────────────────────────────────
    if (sub === "reset") {
      if (!target) return message.reply(`${eco.error} Mention a user to reset.`);

      await UserProfile.findOneAndUpdate(
        { userId: target.id },
        {
          $set: {
            wallet:        0,
            bank:          0,
            gems:          0,
            tokens:        0,
            level:         1,
            xp:            0,
            prestige:      0,
            robProtection: false,
            robProtectionExp: null,
            marriedTo:     null,
            marriedAt:     null,
            clanId:        null,
            stats:         {},
            cooldowns:     {},
          },
        }
      );

      // Reset inventory
      const Inventory = client.ecoDb.getModel("Inventory");
      await Inventory.findOneAndDelete({ userId: target.id });

      // Reset creatures
      const Creature = client.ecoDb.getModel("Creature");
      await Creature.deleteMany({ userId: target.id });

      // Reset job
      const Job = client.ecoDb.getModel("Job");
      await Job.findOneAndDelete({ userId: target.id });

      // Reset quests
      const Quest = client.ecoDb.getModel("Quest");
      await Quest.findOneAndDelete({ userId: target.id });

      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${eco.success} Economy profile for **${target.username}** has been reset.`)] });
    }

    // ── ADD ───────────────────────────────────────────
    if (sub === "add") {
      if (!target) return message.reply(`${eco.error} Mention a user.`);

      const amount   = parseInt(ctx.args[2]?.replace(/,/g, ""));
      const currency = ctx.args[3]?.toLowerCase() ?? "coins";

      if (!amount || amount <= 0) return message.reply(`${eco.error} Provide a valid amount.`);
      if (!["coins", "gems", "tokens"].includes(currency)) return message.reply(`${eco.error} Currency must be \`coins\`, \`gems\`, or \`tokens\`.`);

      const field = currency === "coins" ? "wallet" : currency;
      await UserProfile.findOneAndUpdate(
        { userId: target.id },
        { $inc: { [field]: amount } }
      );

      const currEmoji = { coins: eco.coin, gems: eco.gem, tokens: eco.token }[currency];
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${eco.success} Added ${currEmoji} **${formatNum(amount)} ${currency}** to **${target.username}**.`)] });
    }

    // ── TAKE ──────────────────────────────────────────
    if (sub === "take") {
      if (!target) return message.reply(`${eco.error} Mention a user.`);

      const amount   = parseInt(ctx.args[2]?.replace(/,/g, ""));
      const currency = ctx.args[3]?.toLowerCase() ?? "coins";

      if (!amount || amount <= 0) return message.reply(`${eco.error} Provide a valid amount.`);
      if (!["coins", "gems", "tokens"].includes(currency)) return message.reply(`${eco.error} Currency must be \`coins\`, \`gems\`, or \`tokens\`.`);

      const field = currency === "coins" ? "wallet" : currency;
      await UserProfile.findOneAndUpdate(
        { userId: target.id },
        { $inc: { [field]: -amount } }
      );

      const currEmoji = { coins: eco.coin, gems: eco.gem, tokens: eco.token }[currency];
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${eco.success} Removed ${currEmoji} **${formatNum(amount)} ${currency}** from **${target.username}**.`)] });
    }

    return message.reply(`${eco.error} Usage: \`!eco reset @user\` | \`!eco add @user <amount> [coins/gems/tokens]\` | \`!eco take @user <amount> [coins/gems/tokens]\``);
  },
};
