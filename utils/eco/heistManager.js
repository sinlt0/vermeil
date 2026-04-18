// ============================================================
//  utils/eco/heistManager.js
//  Active heist session management
//  Stores pending heists in memory
// ============================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const eco              = require("../../emojis/ecoemoji");
const { formatNum }    = require("../ecoUtils");
const crimeConfig      = require("../../ecoconfiguration/crime");

// In-memory heist store: guildId → heist data
const activeHeists = new Map();

// ============================================================
//  Start a new heist
// ============================================================
async function startHeist(client, message, initiator) {
  const guildId = message.guild.id;

  if (activeHeists.has(guildId)) {
    return message.reply(`${eco.error} A heist is already in progress! Join with \`!heist join\`.`);
  }

  const config = crimeConfig.heist;
  const heist  = {
    initiatorId: initiator.id,
    channelId:   message.channel.id,
    members:     [{ id: initiator.id, tag: initiator.user.tag }],
    startedAt:   Date.now(),
    msgId:       null,
  };

  activeHeists.set(guildId, heist);

  const embed = buildHeistEmbed(heist, "recruiting");
  const row   = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`heist_join_${guildId}`).setLabel("Join Heist").setStyle(ButtonStyle.Success).setEmoji(eco.heist),
    new ButtonBuilder().setCustomId(`heist_cancel_${guildId}`).setLabel("Cancel").setStyle(ButtonStyle.Danger),
  );

  const msg = await message.channel.send({ embeds: [embed], components: [row] });
  heist.msgId = msg.id;

  // Auto-start when join window closes
  setTimeout(() => executeHeist(client, guildId, msg), config.joinWindowMs);

  return msg;
}

// ============================================================
//  Join an existing heist
// ============================================================
function joinHeist(guildId, userId, userTag) {
  const heist = activeHeists.get(guildId);
  if (!heist) return { error: "No active heist." };
  if (heist.members.find(m => m.id === userId)) return { error: "Already in this heist." };
  if (heist.members.length >= crimeConfig.heist.maxPlayers) return { error: "Heist is full!" };

  heist.members.push({ id: userId, tag: userTag });
  return { success: true, heist };
}

// ============================================================
//  Execute the heist
// ============================================================
async function executeHeist(client, guildId, msg) {
  const heist = activeHeists.get(guildId);
  if (!heist) return;

  activeHeists.delete(guildId);

  const config     = crimeConfig.heist;
  const memberCount = heist.members.length;

  if (memberCount < config.minPlayers) {
    await msg.edit({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription(`${eco.error} Not enough members joined the heist. Need at least **${config.minPlayers}**.`)], components: [] }).catch(() => {});
    return;
  }

  // Calculate success rate
  const successRate = Math.min(
    config.successRateBase + (config.successPerPlayer * (memberCount - 1)),
    0.9
  );
  const success = Math.random() < successRate;

  const UserProfile = client.ecoDb.getModel("Userprofile");
  const results     = [];

  for (const member of heist.members) {
    if (success) {
      const reward = Math.floor(Math.random() * (config.rewardPerPlayer.max - config.rewardPerPlayer.min + 1)) + config.rewardPerPlayer.min;
      await UserProfile.findOneAndUpdate({ userId: member.id }, { $inc: { wallet: reward, "stats.coinsEarned": reward } });
      results.push(`${eco.success} <@${member.id}> earned **${formatNum(reward)}** ${eco.coin}`);
    } else {
      const fine = Math.floor(Math.random() * (config.fineOnFail.max - config.fineOnFail.min + 1)) + config.fineOnFail.min;
      const profile = await UserProfile.findOne({ userId: member.id });
      const actualFine = Math.min(fine, profile?.wallet ?? 0);
      if (actualFine > 0) await UserProfile.findOneAndUpdate({ userId: member.id }, { $inc: { wallet: -actualFine } });
      results.push(`${eco.caught} <@${member.id}> was caught and fined **${formatNum(actualFine)}** ${eco.coin}`);
    }
  }

  const embed = new EmbedBuilder()
    .setColor(success ? 0x57F287 : 0xED4245)
    .setTitle(`${eco.heist} Heist ${success ? "Succeeded!" : "Failed!"}`)
    .setDescription(results.join("\n"))
    .setTimestamp();

  await msg.edit({ embeds: [embed], components: [] }).catch(() => {});
}

function buildHeistEmbed(heist, status) {
  const config = crimeConfig.heist;
  return new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle(`${eco.heist} Heist Recruiting!`)
    .setDescription(
      `A heist is being planned! Click **Join Heist** to participate.\n\n` +
      `**Members (${heist.members.length}/${config.maxPlayers}):**\n` +
      heist.members.map(m => `• ${m.tag}`).join("\n")
    )
    .addFields(
      { name: "Min Players",    value: `${config.minPlayers}`,                               inline: true },
      { name: "Base Success",   value: `${(config.successRateBase * 100).toFixed(0)}%`,      inline: true },
      { name: "Reward/Player",  value: `${formatNum(config.rewardPerPlayer.min)}-${formatNum(config.rewardPerPlayer.max)} ${eco.coin}`, inline: true },
    )
    .setFooter({ text: `Join window: ${config.joinWindowMs / 1000}s` })
    .setTimestamp();
}

function getHeist(guildId) { return activeHeists.get(guildId) ?? null; }
function cancelHeist(guildId) { activeHeists.delete(guildId); }

module.exports = { startHeist, joinHeist, executeHeist, getHeist, cancelHeist, buildHeistEmbed };
