// ============================================================
//  events/automod/joinGate.js
//  guildMemberAdd — runs all 6 join gate filters
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { fromConnection: JoinGateConfig } = require("../../models/JoinGateConfig");
const { isNewAccount, hasNoAvatar, isSuspicious, hasAdUsername, isUnverifiedBot, formatAge } = require("../../utils/automod/joinGateUtils");
const e = require("../../emojis/automodemoji");

module.exports = {
  name: "guildMemberAdd",
  once: false,

  async execute(client, member) {
    if (!client.db) return;
    const guild   = member.guild;
    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const JGModel = JoinGateConfig(guildDb.connection);
    const config  = await JGModel.findOne({ guildId: guild.id });
    if (!config?.enabled) return;

    const applyAction = async (action, reason, dmText) => {
      try {
        // DM before punish so they can read it
        await member.user.send({
          embeds: [new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle(`${e.gate} Removed from ${guild.name}`)
            .setDescription(`${dmText}`)
            .setTimestamp()],
        }).catch(() => {});

        if (action === "ban") {
          await guild.members.ban(member.id, { reason });
        } else if (action === "kick") {
          await member.kick(reason);
        } else if (action === "timeout") {
          // Can't timeout someone who just joined — kick instead
          await member.kick(reason);
        }

        // Log to automod log channel
        await logJoinGate(client, guild, guildDb, member, reason, action);
      } catch {}
    };

    // ── [1] No avatar ─────────────────────────────────────
    if (config.noAvatar.enabled && hasNoAvatar(member)) {
      await applyAction(
        config.noAvatar.action,
        "No profile picture",
        `You were removed from **${guild.name}** because you don't have a profile picture.\nPlease set one and try rejoining!`
      );
      return;
    }

    // ── [2] New account ───────────────────────────────────
    if (config.newAccount.enabled && isNewAccount(member, config.newAccount.minAgeDays)) {
      const ageStr = formatAge(member);
      const dmText = config.newAccount.showDaysInDm
        ? `You were removed from **${guild.name}** because your account is too new.\nAccount age: **${ageStr}**\nMinimum required: **${config.newAccount.minAgeDays} days**`
        : `You were removed from **${guild.name}** because your account does not meet the minimum age requirement.`;
      await applyAction(config.newAccount.action, `Account too new (${ageStr})`, dmText);
      return;
    }

    // ── [3] Suspicious ────────────────────────────────────
    if (config.suspicious.enabled && isSuspicious(member)) {
      await applyAction(
        config.suspicious.action,
        "Suspicious account",
        `You were removed from **${guild.name}** because your account appears suspicious.\nPlease set a profile picture and try rejoining after your account is older.`
      );
      return;
    }

    // ── [4] Unauthorized bot ──────────────────────────────
    if (config.botAdditions.enabled && member.user.bot) {
      await applyAction(
        config.botAdditions.action,
        "Unauthorized bot addition",
        `This bot was removed from **${guild.name}** because it was added by an unauthorized user.`
      );
      return;
    }

    // ── [5] Advertising username ──────────────────────────
    if (config.adUsername.enabled && hasAdUsername(member)) {
      await applyAction(
        config.adUsername.action,
        "Advertising invite link in username",
        `You were removed from **${guild.name}** because your username contains a Discord invite link.`
      );
      return;
    }

    // ── [6] Unverified bot ────────────────────────────────
    if (config.unverifiedBots.enabled && isUnverifiedBot(member)) {
      await applyAction(
        config.unverifiedBots.action,
        "Unverified bot",
        `This bot was removed from **${guild.name}** because it is not verified by Discord.`
      );
      return;
    }
  },
};

async function logJoinGate(client, guild, guildDb, member, reason, action) {
  try {
    const { fromConnection: AutoModConfig } = require("../../models/AutoModConfig");
    const amConfig = await AutoModConfig(guildDb.connection).findOne({ guildId: guild.id }).lean();
    if (!amConfig?.logChannelId) return;
    const logCh = guild.channels.cache.get(amConfig.logChannelId);
    if (!logCh) return;
    await logCh.send({ embeds: [new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`${e.gate} Join Gate Triggered`)
      .addFields(
        { name: `${e.user} User`, value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
        { name: `${e.kick} Action`, value: action, inline: true },
        { name: `${e.info} Reason`, value: reason, inline: false },
        { name: `${e.time} Time`, value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: false },
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp()] });
  } catch {}
}
