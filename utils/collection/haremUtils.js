// ============================================================
//  utils/collection/haremUtils.js
//  Harem display, sorting, pagination
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { fromConnection: UserCollection } = require("../../models/collection/UserCollection");
const { fromConnection: UserStats }      = require("../../models/collection/UserStats");
const { getCharacterImage }              = require("./imageCache");
const { calcKakeraValue }                = require("./kakera");
const { getActivePerks }                 = require("./badgeUtils");

const HAREM_PER_PAGE = 15;

// ── Sort modes ────────────────────────────────────────────
const SORT_MODES = {
  "ka":  { label: "Kakera ↓",   sort: { keys: -1, claimedAt: 1 } },
  "al":  { label: "A → Z",      sort: { name: 1  } },
  "az":  { label: "Z → A",      sort: { name: -1 } },
  "ea":  { label: "Oldest first",sort: { claimedAt: 1  } },
  "me":  { label: "Newest first",sort: { claimedAt: -1 } },
  "po":  { label: "Position",   sort: { position: 1  } },
  "ke":  { label: "Keys ↓",     sort: { keys: -1 } },
};

// ============================================================
//  Get full harem page embed
// ============================================================
async function getHaremPage(connection, guild, targetUser, page = 0, sortMode = "po", filterType = null) {
  const UCollModel = UserCollection(connection);
  const UStatsModel = UserStats(connection);

  const filter = { guildId: guild.id, userId: targetUser.id };
  if (filterType) filter.type = filterType;

  const sort  = SORT_MODES[sortMode]?.sort ?? { position: 1 };
  const total = await UCollModel.countDocuments(filter);
  const pages = Math.ceil(total / HAREM_PER_PAGE) || 1;

  page = Math.max(0, Math.min(page, pages - 1));

  const chars = await UCollModel
    .find(filter)
    .sort(sort)
    .skip(page * HAREM_PER_PAGE)
    .limit(HAREM_PER_PAGE)
    .lean();

  const stats = await UStatsModel.findOne({ guildId: guild.id, userId: targetUser.id }).lean();
  const perks = getActivePerks(stats);

  const lines = chars.map((c, i) => {
    const num    = page * HAREM_PER_PAGE + i + 1;
    const keys   = c.keys > 0 ? ` 🔑×${c.keys}` : "";
    const fav    = c.isFavorite ? " ⭐" : "";
    const alias  = c.alias ? ` *(${c.alias})*` : "";
    const note   = c.note ? ` — ${c.note.slice(0, 30)}` : "";
    return `\`${String(num).padStart(3, "0")}\` **${c.name}**${alias}${fav}${keys} — *${c.series}*${note}`;
  });

  const title    = stats?.haremTitle ?? `${targetUser.username}'s Harem`;
  const sortLabel = SORT_MODES[sortMode]?.label ?? "Position";

  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle(title)
    .setDescription(lines.join("\n") || "*Empty harem.*")
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
    .setFooter({
      text: `${total} character${total !== 1 ? "s" : ""} • Page ${page + 1}/${pages} • Sort: ${sortLabel}`,
    });

  return { embed, page, pages, total };
}

// ============================================================
//  Build a single character display embed
// ============================================================
async function buildCharacterEmbed(character, options = {}) {
  const {
    owner       = null,
    guild       = null,
    claimed     = false,
    kakera      = null,
    kakeraCrystal = null,
    isWished    = false,
    claimRank   = 0,
    likeRank    = 0,
    keys        = 0,
    showStats   = true,
  } = options;

  const imageUrl = await getCharacterImage(character);
  const typeEmoji = character.type === "waifu" ? "💕" : "💙";

  const embed = new EmbedBuilder()
    .setColor(character.type === "waifu" ? 0xFF69B4 : 0x4169E1)
    .setTitle(`${typeEmoji} ${character.name}`)
    .setImage(imageUrl)
    .setDescription(`*${character.series}*`);

  if (showStats) {
    const fields = [];
    if (claimRank > 0) fields.push({ name: "Claim Rank", value: `#${claimRank.toLocaleString()}`, inline: true });
    if (likeRank  > 0) fields.push({ name: "Like Rank",  value: `#${likeRank.toLocaleString()}`,  inline: true });
    if (keys      > 0) fields.push({ name: "Keys",        value: `🔑 ${keys}`,                    inline: true });
    if (kakera)        fields.push({ name: "Kakera",       value: `${kakeraCrystal?.emoji ?? "💜"} ${kakera}`, inline: true });
    if (isWished)      fields.push({ name: "Wished",       value: "⭐ On your wishlist!",          inline: true });
    if (fields.length) embed.addFields(...fields);
  }

  if (owner && guild) {
    const member = guild.members.cache.get(owner);
    if (member) {
      embed.setFooter({
        text:    `Married to ${member.user.username}`,
        iconURL: member.user.displayAvatarURL({ dynamic: true }),
      });
    }
  } else if (!claimed) {
    embed.setFooter({ text: "React with ❤️ to claim!" });
  }

  return embed;
}

// ============================================================
//  Get character by name fuzzy match in harem
// ============================================================
async function findInHarem(connection, guildId, userId, query) {
  const UCollModel = UserCollection(connection);
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return UCollModel.findOne({
    guildId, userId,
    $or: [{ name: regex }, { alias: regex }, { alias2: regex }],
  }).lean();
}

// ============================================================
//  Divorce a character (remove from harem)
// ============================================================
async function divorceCharacter(connection, guildId, userId, query) {
  const UCollModel = UserCollection(connection);
  const entry = await findInHarem(connection, guildId, userId, query);
  if (!entry) return { success: false, reason: "not_found" };
  await UCollModel.deleteOne({ _id: entry._id });
  return { success: true, entry };
}

module.exports = {
  SORT_MODES,
  HAREM_PER_PAGE,
  getHaremPage,
  buildCharacterEmbed,
  findInHarem,
  divorceCharacter,
};
