// ============================================================
//  commands/economy/clan.js
//  Clan create/join/leave/info/contribute/kick
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { getProfile, removeCoins, addCoins, formatNum } = require("../../utils/ecoUtils");
const eco      = require("../../emojis/ecoemoji");
const clanConf = require("../../ecoconfiguration/clan");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  name: "clan", description: "Manage your clan.", category: "economy",
  aliases: ["guild"], usage: "<create|join|leave|info|kick|contribute|promote|demote>", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const Clan        = client.ecoDb.getModel("Clan");
    const UserProfile = client.ecoDb.getModel("Userprofile");
    const sub         = ctx.args[0]?.toLowerCase();
    const profile     = await getProfile(client, message.author.id);

    // ── Info ──────────────────────────────────────────
    if (!sub || sub === "info") {
      const clanId = ctx.args[1] ? null : profile.clanId;
      const clan   = clanId
        ? await Clan.findOne({ clanId }).lean()
        : await Clan.findOne({ name: { $regex: new RegExp(ctx.args[1] || "", "i") } }).lean();

      if (!clan) return message.reply(`${eco.error} ${clanId ? "You're not in a clan!" : "Clan not found!"}`);

      const member = clan.members.find(m => m.userId === message.author.id);
      const embed  = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${eco.clan} [${clan.tag}] ${clan.name}`)
        .setDescription(clan.description || "No description set.")
        .addFields(
          { name: "Level",       value: `${clan.level}`,                         inline: true },
          { name: "Members",     value: `${clan.members.length}/${clanConf.maxMembers}`, inline: true },
          { name: "Bank",        value: `${eco.coin} ${formatNum(clan.bank)}`,   inline: true },
          { name: "Owner",       value: `<@${clan.ownerId}>`,                    inline: true },
          { name: "Your Role",   value: member?.role ?? "Not a member",          inline: true },
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ── Create ────────────────────────────────────────
    if (sub === "create") {
      if (profile.clanId) return message.reply(`${eco.error} You're already in a clan! Leave first.`);
      if (profile.wallet < clanConf.createCost) return message.reply(`${eco.error} Creating a clan costs ${eco.coin} **${formatNum(clanConf.createCost)} coins**.`);

      const name = ctx.args[1];
      const tag  = ctx.args[2]?.toUpperCase();
      if (!name || !tag) return message.reply(`${eco.error} Usage: \`!clan create <name> <TAG>\``);
      if (tag.length < clanConf.tagMinLength || tag.length > clanConf.tagMaxLength) return message.reply(`${eco.error} Tag must be ${clanConf.tagMinLength}-${clanConf.tagMaxLength} characters.`);

      const exists = await Clan.findOne({ $or: [{ name }, { tag }] });
      if (exists) return message.reply(`${eco.error} A clan with that name or tag already exists!`);

      const clanId = uuidv4().slice(0, 8);
      await removeCoins(client, message.author.id, clanConf.createCost, "clan_create");
      await Clan.create({
        clanId, name, tag,
        ownerId: message.author.id,
        members: [{ userId: message.author.id, role: "owner" }],
      });
      await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $set: { clanId } });

      return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
        .setDescription(`${eco.success} Clan **[${tag}] ${name}** created! Use \`!clan info\` to view it.`)] });
    }

    // ── Join ──────────────────────────────────────────
    if (sub === "join") {
      if (profile.clanId) return message.reply(`${eco.error} You're already in a clan!`);
      const name = ctx.args.slice(1).join(" ");
      const clan = await Clan.findOne({ name: { $regex: new RegExp(name, "i") }, isPublic: true });
      if (!clan) return message.reply(`${eco.error} Public clan **${name}** not found.`);
      if (clan.members.length >= clanConf.maxMembers) return message.reply(`${eco.error} That clan is full!`);

      await Clan.findOneAndUpdate({ clanId: clan.clanId }, { $push: { members: { userId: message.author.id, role: "member" } } });
      await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $set: { clanId: clan.clanId } });
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(`${eco.success} Joined **[${clan.tag}] ${clan.name}**!`)] });
    }

    // ── Leave ─────────────────────────────────────────
    if (sub === "leave") {
      if (!profile.clanId) return message.reply(`${eco.error} You're not in a clan!`);
      const clan = await Clan.findOne({ clanId: profile.clanId });
      if (clan.ownerId === message.author.id) return message.reply(`${eco.error} You can't leave your own clan! Transfer ownership or disband it.`);

      await Clan.findOneAndUpdate({ clanId: profile.clanId }, { $pull: { members: { userId: message.author.id } } });
      await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $set: { clanId: null } });
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(`${eco.success} Left **${clan.name}**.`)] });
    }

    // ── Contribute ────────────────────────────────────
    if (sub === "contribute" || sub === "contrib") {
      if (!profile.clanId) return message.reply(`${eco.error} You're not in a clan!`);
      const amount = parseInt(ctx.args[1]?.replace(/,/g, ""));
      if (!amount || amount <= 0) return message.reply(`${eco.error} Provide an amount to contribute.`);
      if (profile.wallet < amount) return message.reply(`${eco.error} Not enough coins!`);

      const clan = await Clan.findOne({ clanId: profile.clanId });
      if (clan.bank + amount > (clanConf.defaultBankLimit + clan.level * clanConf.bankLimitPerLevel)) return message.reply(`${eco.error} Clan bank is full!`);

      await removeCoins(client, message.author.id, amount, "clan_contribute");
      await Clan.findOneAndUpdate(
        { clanId: profile.clanId, "members.userId": message.author.id },
        { $inc: { bank: amount, xp: amount * clanConf.xpPerContribution, "stats.totalContributed": amount, "members.$.contribution": amount } }
      );

      // Check level up
      const updatedClan = await Clan.findOne({ clanId: profile.clanId });
      if (updatedClan.xp >= updatedClan.level * clanConf.xpPerLevel) {
        await Clan.findOneAndUpdate({ clanId: profile.clanId }, { $inc: { level: 1 }, $set: { xp: 0 } });
      }

      return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
        .setDescription(`${eco.success} Contributed ${eco.coin} **${formatNum(amount)}** to **${clan.name}**'s bank!`)] });
    }

    return message.reply(`${eco.error} Unknown subcommand. Use: \`create\`, \`join\`, \`leave\`, \`info\`, \`contribute\`.`);
  },
};
