// ============================================================
//  events/guild/booster.js
//  Handles server boost detection and rewards
// ============================================================
const { MessageType } = require("discord.js");
const { fromConnection: BoosterConfig } = require("../../models/BoosterConfig");
const { fromConnection: BoosterMember } = require("../../models/BoosterMember");
const { generateBoosterCard, buildBoosterEmbed, handleRoleRewards, replaceBoosterVariables } = require("../../utils/boosterUtils");

module.exports = [
  // ── 1. Initial Boost Detection (guildMemberUpdate) ────────
  {
    name: "guildMemberUpdate",
    once: false,
    async execute(client, oldMember, newMember) {
      const wasBoosting = !!oldMember.premiumSince;
      const isBoosting  = !!newMember.premiumSince;

      // Handle boost removed
      if (wasBoosting && !isBoosting) {
        return handleUnboost(client, newMember);
      }

      // Handle started boosting (only if it's the very first time or after they stopped)
      if (!wasBoosting && isBoosting) {
        return handleNewBoost(client, newMember);
      }
    },
  },

  // ── 2. System Message Detection (messageCreate) ───────────
  {
    name: "messageCreate",
    once: false,
    async execute(client, message) {
      if (!message.guild) return;

      const boostTypes = [
        MessageType.GuildBoost,
        MessageType.GuildBoostTier1,
        MessageType.GuildBoostTier2,
        MessageType.GuildBoostTier3,
      ];

      if (boostTypes.includes(message.type)) {
        // System message for a boost!
        const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
        if (!member) return;

        // Since guildMemberUpdate handles the transition from 0->1, 
        // we use messageCreate to catch subsequent boosts OR the first one 
        // if guildMemberUpdate is too slow/fast.
        // To avoid double-triggering, we can use a cooldown or check if we already processed it.
        // Actually, let's consolidate logic.
        return handleNewBoost(client, member, true);
      }
    },
  },
];

/**
 * Core logic for a new boost
 */
async function handleNewBoost(client, member, fromSystemMessage = false) {
  const guild = member.guild;
  const guildDb = await client.db.getGuildDb(guild.id);
  if (!guildDb || guildDb.isDown) return;

  const ConfigModel = BoosterConfig(guildDb.connection);
  const MemberModel = BoosterMember(guildDb.connection);

  const config = await ConfigModel.findOne({ guildId: guild.id });
  if (!config || !config.boost.enabled) return;

  // 1. Update/Get Member Stats
  let memberData = await MemberModel.findOne({ guildId: guild.id, userId: member.id });
  if (!memberData) {
    memberData = await MemberModel.create({ guildId: guild.id, userId: member.id, boostCount: 1, lastBoost: new Date() });
  } else {
    // If it's from a system message, it's definitely a boost.
    // If it's from guildMemberUpdate, we only count it if they weren't boosting before.
    // To prevent double counting when both events fire:
    const now = Date.now();
    if (memberData.lastBoost && (now - memberData.lastBoost.getTime()) < 5000) return; // 5s debounce

    memberData.boostCount++;
    memberData.lastBoost = new Date();
    await memberData.save();
  }

  const boostCount = memberData.boostCount;

  // 2. Role Rewards
  await handleRoleRewards(member, boostCount, config);

  // 3. Send Message
  const boostConfig = config.boost;
  const channel = guild.channels.cache.get(boostConfig.channelId);
  if (!channel || !channel.permissionsFor(guild.members.me).has(["SendMessages", "EmbedLinks"])) return;

  try {
    let card = null;
    if (boostConfig.cardEnabled) {
      card = await generateBoosterCard(member, boostCount, boostConfig.cardBackground);
    }

    const content = boostConfig.message ? await replaceBoosterVariables(boostConfig.message, member, boostCount) : null;
    const embed   = boostConfig.useEmbed ? await buildBoosterEmbed(boostConfig, member, boostCount, card) : null;

    const payload = {};
    if (content) payload.content = content;
    if (embed)   payload.embeds  = [embed];
    if (card)    payload.files   = [card];

    if (Object.keys(payload).length > 0) {
      await channel.send(payload);
    }
  } catch (err) {
    console.error(`[Booster] Send Error in ${guild.id}:`, err.message);
  }
}

/**
 * Logic for when a boost is removed
 */
async function handleUnboost(client, member) {
  const guild = member.guild;
  const guildDb = await client.db.getGuildDb(guild.id);
  if (!guildDb || guildDb.isDown) return;

  const ConfigModel = BoosterConfig(guildDb.connection);
  const MemberModel = BoosterMember(guildDb.connection);

  const config = await ConfigModel.findOne({ guildId: guild.id });
  if (!config || !config.unboost.enabled) return;

  // Reset or decrement boost count? 
  // Usually when unboosting, they lose ALL boosts if they stop entirely.
  // But if they had 2 and removed 1, they still have 1.
  // Unfortunately, we can't detect "removed 1 but still have 1".
  // So we only catch "stopped boosting entirely".
  const memberData = await MemberModel.findOne({ guildId: guild.id, userId: member.id });
  
  if (memberData?.customRoleId) {
    const role = guild.roles.cache.get(memberData.customRoleId);
    if (role) {
      await role.delete("User stopped boosting.").catch(() => {});
    }
  }

  await MemberModel.deleteOne({ guildId: guild.id, userId: member.id });

  const unboostConfig = config.unboost;
  const channel = guild.channels.cache.get(unboostConfig.channelId);
  if (!channel) return;

  try {
    const content = unboostConfig.message ? await replaceBoosterVariables(unboostConfig.message, member, 0) : null;
    const embed   = unboostConfig.useEmbed ? await buildBoosterEmbed(unboostConfig, member, 0) : null;

    const payload = {};
    if (content) payload.content = content;
    if (embed)   payload.embeds  = [embed];

    if (Object.keys(payload).length > 0) {
      await channel.send(payload);
    }
  } catch (err) {
    console.error(`[Booster] Unboost Send Error:`, err.message);
  }
}
