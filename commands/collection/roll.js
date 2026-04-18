const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchRandomCharacter, getUserData, getCooldownString } = require("../../utils/collection/collectionUtils");
const { fromConnection: CharacterClaim } = require("../../models/collector/CharacterClaim");
const { fromConnection: CollectorSettings } = require("../../models/collector/CollectorSettings");
const e = require("../../emojis/collectionemoji");

module.exports = {
  name: "roll",
  description: "Roll for a random character.",
  category: "collection",
  aliases: ["r", "w", "h", "waifu", "husbando"],
  usage: "[gender: male|female]",
  cooldown: 2,
  requiresDatabase: true,
  slash: false,

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    // ── 0. Load & Check Settings ──
    const SettingsModel = CollectorSettings(guildDb.connection);
    let settings = await SettingsModel.findOne({ guildId: guild.id });
    if (!settings) settings = await SettingsModel.create({ guildId: guild.id });

    if (!settings.enabled) return reply(ctx, { content: "❌ The collection system is disabled in this server." });

    if (settings.spawnChannelId && channel.id !== settings.spawnChannelId) {
      return reply(ctx, { content: `❌ You can only roll in <#${settings.spawnChannelId}>!` });
    }

    // ── 1. Determine Gender ──
    let gender = null;
    if (ctx.type === "prefix") {
      const cmd = ctx.message.content.split(" ")[0].slice(client.config.prefix.length).toLowerCase();
      if (cmd === "waifu" || cmd === "w") gender = "female";
      else if (cmd === "husbando" || cmd === "h") gender = "male";
      else gender = ctx.args[0]?.toLowerCase();
    } else {
      gender = ctx.interaction.options.getString("gender");
    }

    // ── 2. Check User Data & Rolls ──
    const userData = await getUserData(guildDb, guild.id, author.id, settings);
    if (userData.rollsAvailable <= 0) {
      const rollInterval = (settings.rollResetMinutes || 60) * 60 * 1000;
      const nextReset = new Date(userData.lastRollReset.getTime() + rollInterval);
      const waitTime = nextReset - new Date();
      return reply(ctx, { content: `❌ You are out of rolls! Next reset in **${getCooldownString(waitTime)}**.` });
    }

    userData.rollsAvailable -= 1;
    await userData.save();

    // ── 3. Fetch Character ──
    const char = await fetchRandomCharacter(gender);
    if (!char) return reply(ctx, { content: "Failed to fetch character. Please try again." });

    // ── 4. Build Embed ──
    const embed = new EmbedBuilder()
      .setColor(gender === "female" ? 0xFF69B4 : (gender === "male" ? 0x5865F2 : 0x9B59B6))
      .setAuthor({ name: char.anime })
      .setTitle(`${char.name}`)
      .setDescription(`**Gender:** ${char.gender === 'FEMALE' ? e.female : e.male} ${char.gender}`)
      .setImage(char.image)
      .setFooter({ text: `Rolls left: ${userData.rollsAvailable} | ID: ${char.id}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`claim_${char.id}`).setLabel("Claim").setStyle(ButtonStyle.Success).setEmoji(e.claim)
    );

    const message = await (ctx.type === "prefix" 
      ? ctx.message.reply({ embeds: [embed], components: [row] }) 
      : ctx.interaction.reply({ embeds: [embed], components: [row], withResponse: true }));

    const targetMsg = ctx.type === "prefix" ? message : message.resource.message;

    // ── 5. Claim Logic ──
    const collector = targetMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

    collector.on("collect", async i => {
      const claimerData = await getUserData(guildDb, guild.id, i.user.id, settings);
      if (claimerData.claimsAvailable <= 0) {
        const claimInterval = (settings.claimResetMinutes || 180) * 60 * 1000;
        const nextClaim = new Date(claimerData.lastClaimReset.getTime() + claimInterval);
        const waitTime = nextClaim - new Date();
        return i.reply({ content: `❌ You have no claims available! Next reset in **${getCooldownString(waitTime)}**.`, ephemeral: true });
      }

      try {
        const ClaimModel = CharacterClaim(guildDb.connection);
        await ClaimModel.create({
          guildId: guild.id,
          characterId: char.id,
          characterName: char.name,
          characterImage: char.image,
          userId: i.user.id
        });

        claimerData.claimsAvailable -= 1;
        claimerData.totalClaims += 1;
        await claimerData.save();

        await i.update({ content: `${e.claim} **${i.user.username}** has claimed **${char.name}**!`, components: [] });
        collector.stop("claimed");
      } catch (err) {
        if (err.code === 11000) return i.reply({ content: "❌ Already claimed!", ephemeral: true });
        return i.reply({ content: "Claim error.", ephemeral: true });
      }
    });

    collector.on("end", (_, reason) => {
      if (reason === "claimed") return;
      targetMsg.edit({ components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("d").setLabel("Expired").setStyle(ButtonStyle.Secondary).setDisabled(true))] }).catch(() => null);
    });
  },
};