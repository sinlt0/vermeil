// ============================================================
//  commands/collection/roll.js
//  $waifu / $w   — roll a random waifu
//  $husbando / $h — roll a random husbando
//  $marry / $ma  — roll waifu or husbando
//
//  React ❤️ within 30s to claim
//  If you already own it → gain a 🔑 key
//  Kakera crystal spawns on claimed characters (35% chance)
// ============================================================
const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require("discord.js");
const { pickCharacter, getCharacterOwner, claimCharacter, gainKey, useRoll, getRollsInfo } = require("../../utils/collection/rollUtils");
const { pickKakeraCrystal, calcKakeraValue }       = require("../../utils/collection/kakera");
const { buildCharacterEmbed }                       = require("../../utils/collection/haremUtils");
const { fromConnection: CollectionConfig }          = require("../../models/collection/CollectionConfig");
const { fromConnection: UserStats }                 = require("../../models/collection/UserStats");
const { fromConnection: Wishlist }                  = require("../../models/collection/Wishlist");
const { fromConnection: UserCollection }            = require("../../models/collection/UserCollection");
const { getActivePerks }                            = require("../../utils/collection/badgeUtils");
const { formatTimeRemaining }                       = require("../../utils/collection/cooldownUtils");
const { fromConnection: Character }                 = require("../../models/collection/Character");

const CLAIM_EMOJI = "❤️";
const KAKERA_EMOJI = "💜";
const CLAIM_WINDOW = 30_000; // 30s

module.exports = {
  name: "waifu",
  description: "Roll a random waifu.",
  category: "collection",
  aliases: ["w", "husbando", "h", "marry", "ma", "m"],
  usage: "",
  cooldown: 2,
  slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;
    const userId  = message.author.id;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const config = await CollectionConfig(guildDb.connection).findOne({ guildId: guild.id })
      ?? { rollsPerReset: 10, claimCooldownHrs: 3, kakeraEnabled: true, kakeraSpawnChance: 35, claimWindowSecs: 30 };

    // ── Check rolls remaining ──────────────────────────────
    const rollInfo = await getRollsInfo(guildDb.connection, guild.id, userId);
    if (rollInfo.rollsLeft <= 0) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xED4245)
          .setDescription(`❌ No rolls left! Resets in **${formatTimeRemaining(rollInfo.resetAt ? new Date(rollInfo.resetAt).getTime() - Date.now() : 0)}**`)],
      });
    }

    // ── Determine roll type ────────────────────────────────
    const cmd = ctx.commandName ?? ctx.args?.[0] ?? "marry";
    let rollType = "both";
    if (["waifu","w"].includes(cmd))          rollType = "waifu";
    else if (["husbando","h"].includes(cmd))  rollType = "husbando";

    // ── Pick character ─────────────────────────────────────
    const character = await pickCharacter(guildDb.connection, guild.id, userId, rollType);
    if (!character) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription("❌ No characters found. Try `$mu` to see pool settings.")] });
    }

    // ── Use a roll ─────────────────────────────────────────
    await useRoll(guildDb.connection, guild.id, userId);

    // ── Check ownership in guild ───────────────────────────
    const ownerId = await getCharacterOwner(guildDb.connection, guild.id, character._id);
    const owner   = ownerId ? await guild.members.fetch(ownerId).catch(() => null) : null;

    // ── Check wishlist ─────────────────────────────────────
    const WLModel    = Wishlist(guildDb.connection);
    const stats      = await UserStats(guildDb.connection).findOne({ guildId: guild.id, userId }).lean();
    const perks      = getActivePerks(stats);
    const wishlistEntry = await WLModel.findOne({
      guildId: guild.id,
      userId,
      $or: [
        { name: { $regex: new RegExp(`^${character.name}$`, "i") } },
        { name: character.series, isSeries: true },
      ],
    }).lean();

    // ── Pick kakera crystal (if char is unclaimed) ─────────
    let kakeraCrystal = null;
    let kakeraValue   = null;
    if (!ownerId && config.kakeraEnabled && Math.random() * 100 < (config.kakeraSpawnChance ?? 35)) {
      const claimRank = character.globalClaimCount;
      const keys      = 0;
      kakeraValue     = calcKakeraValue(character, claimRank, character.globalLikeCount, 0, keys);
      kakeraCrystal   = pickKakeraCrystal(keys, perks.blueToYellow);
      kakeraCrystal.value = kakeraValue;
    }

    // ── Build embed ────────────────────────────────────────
    const embed = await buildCharacterEmbed(character, {
      owner:    ownerId,
      guild,
      claimed:  !!ownerId,
      kakera:   kakeraValue,
      kakeraCrystal,
      isWished: !!wishlistEntry,
      claimRank: character.globalClaimCount,
      likeRank:  character.globalLikeCount,
    });

    // Add rolls remaining footer
    const newRolls = rollInfo.rollsLeft - 1;
    embed.setFooter({
      text: `${newRolls} roll${newRolls !== 1 ? "s" : ""} left • ${CLAIM_EMOJI} to claim${kakeraCrystal ? ` • ${kakeraCrystal.emoji} ${kakeraCrystal.value} kakera` : ""}`,
      iconURL: message.author.displayAvatarURL({ dynamic: true }),
    });

    // ── Send the roll ──────────────────────────────────────
    const rollMsg = await message.channel.send({ embeds: [embed] });

    // ── React with claim emoji ─────────────────────────────
    await rollMsg.react(CLAIM_EMOJI).catch(() => {});
    if (kakeraCrystal) await rollMsg.react(kakeraCrystal.emoji).catch(() => {});

    // ── Reaction collector ─────────────────────────────────
    const claimWindow = (config.claimWindowSecs ?? 30) * 1000;
    const filter      = (reaction, user) =>
      !user.bot && (reaction.emoji.name === CLAIM_EMOJI || reaction.emoji.name === kakeraCrystal?.emoji);

    const collector = rollMsg.createReactionCollector({ filter, time: claimWindow });

    collector.on("collect", async (reaction, user) => {
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) return;

      // ── Kakera react ─────────────────────────────────────
      if (kakeraCrystal && reaction.emoji.name === kakeraCrystal.emoji) {
        // Only owner can react to their own char's kakera
        if (ownerId && user.id !== ownerId) {
          // Other users can react to kakera on unclaimed chars
        }

        const userStats = await UserStats(guildDb.connection).findOne({ guildId: guild.id, userId: user.id });
        const uPerks    = getActivePerks(userStats);
        const powerCost = uPerks.kakeraReactCost;

        // Check power
        const { calcReactPower } = require("../../utils/collection/kakera");
        const currentPower = calcReactPower(
          userStats?.kakeraReactPower ?? 100,
          userStats?.kakeraLastRegen ?? new Date()
        );

        if (currentPower < powerCost) {
          return member.user.send(`❌ Not enough kakera react power! (${Math.floor(currentPower)}% / ${powerCost}% needed)`).catch(() => {});
        }

        // Give kakera
        await UserStats(guildDb.connection).findOneAndUpdate(
          { guildId: guild.id, userId: user.id },
          {
            $inc: { kakera: kakeraCrystal.value, totalKakeraSent: kakeraCrystal.value },
            $set: {
              kakeraReactPower: Math.max(0, currentPower - powerCost),
              kakeraLastRegen:  new Date(),
            },
          },
          { upsert: true }
        );

        // Update embed to show kakera was taken
        embed.setColor(0xFFD700);
        const newFooter = `${kakeraCrystal.emoji} +${kakeraCrystal.value} kakera → ${user.username}`;
        embed.setFooter({ text: newFooter });
        await rollMsg.edit({ embeds: [embed] }).catch(() => {});
        kakeraCrystal = null; // prevent double-collect
        return;
      }

      // ── Claim react ───────────────────────────────────────
      if (reaction.emoji.name !== CLAIM_EMOJI) return;

      // Already owned — key gain for owner
      if (ownerId) {
        if (user.id === ownerId) {
          const keys = await gainKey(guildDb.connection, guild.id, user.id, character._id);
          if (keys !== null) {
            embed.setFooter({ text: `🔑 Key gained! ${character.name} now has ${keys} key${keys !== 1 ? "s" : ""}` });
            await rollMsg.edit({ embeds: [embed] }).catch(() => {});
          }
        }
        return;
      }

      // ── Attempt claim ─────────────────────────────────────
      const result = await claimCharacter(
        guildDb.connection, guild.id, user.id, character,
        config.claimCooldownHrs ?? 3
      );

      if (result.success) {
        collector.stop("claimed");

        // Wishlist bonus kakera
        if (wishlistEntry && perks.wishlistClaimBonus) {
          await UserStats(guildDb.connection).findOneAndUpdate(
            { guildId: guild.id, userId: user.id },
            { $inc: { kakera: 500, totalKakeraSent: 500 } },
            { upsert: true }
          );
        }

        // Emerald IV: claim gives kakera
        if (perks.claimGivesKakera && kakeraValue) {
          await UserStats(guildDb.connection).findOneAndUpdate(
            { guildId: guild.id, userId: user.id },
            { $inc: { kakera: kakeraValue, totalKakeraSent: kakeraValue } },
            { upsert: true }
          );
        }

        // Update embed
        embed.setColor(0x57F287);
        embed.setFooter({
          text: `💕 Claimed by ${user.username}!${wishlistEntry && perks.wishlistClaimBonus ? " (+500 kakera wishlist bonus!)" : ""}`,
          iconURL: user.displayAvatarURL({ dynamic: true }),
        });
        await rollMsg.edit({ embeds: [embed] }).catch(() => {});

      } else if (result.reason === "cooldown") {
        const ms = Math.max(0, new Date(result.availableAt).getTime() - Date.now());
        await member.user.send(
          `❌ Claim cooldown! Available in **${formatTimeRemaining(ms)}**`
        ).catch(() => {});
      } else if (result.reason === "already_claimed") {
        embed.setFooter({ text: `Already claimed by someone else!` });
        await rollMsg.edit({ embeds: [embed] }).catch(() => {});
      } else if (result.reason === "harem_full") {
        await member.user.send("❌ Your harem is full! Use `$divorce` to remove characters.").catch(() => {});
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason !== "claimed") {
        // Remove reactions and fade the embed
        await rollMsg.reactions.removeAll().catch(() => {});
        embed.setColor(0x99AAB5);
        embed.setFooter({ text: "No one claimed this character." });
        await rollMsg.edit({ embeds: [embed] }).catch(() => {});
      }
    });
  },
};
