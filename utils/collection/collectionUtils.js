const axios = require("axios");
const { fromConnection: CollectorUser } = require("../../models/collector/CollectorUser");

/**
 * Fetch a random character from AniList with smart filtering
 */
async function fetchRandomCharacter(gender = null) {
  const query = `
    query ($page: Int, $gender: CharacterGender) {
      Page(page: $page, perPage: 1) {
        characters(sort: FAVOURITES_DESC, gender: $gender) {
          id
          name { full }
          image { large }
          gender
          media(perPage: 1, sort: POPULARITY_DESC) {
            nodes {
              title { romaji }
              bannerImage
              type
            }
          }
        }
      }
    }
  `;

  // Filter valid gender strings for AniList
  let targetGender = null;
  if (gender === "male")   targetGender = "MALE";
  if (gender === "female") targetGender = "FEMALE";

  // Top characters (smaller range if filtered for better quality)
  const maxPage = targetGender ? 300 : 500;
  const randomPage = Math.floor(Math.random() * maxPage) + 1;

  try {
    const res = await axios.post("https://graphql.anilist.co", {
      query,
      variables: { 
        page: randomPage,
        gender: targetGender
      }
    }, { timeout: 5000 });

    const char = res.data.data.Page.characters[0];
    if (!char) return null;

    return {
      id:     char.id,
      name:   char.name.full,
      image:  char.image.large,
      gender: char.gender || "Unknown",
      anime:  char.media.nodes[0]?.title.romaji || "Unknown",
      banner: char.media.nodes[0]?.bannerImage || null
    };
  } catch (err) {
    console.error("[Collection Utils] API Error:", err.message);
    return null;
  }
}

/**
 * Get or initialize user collection data
 */
async function getUserData(guildDb, guildId, userId) {
  const Model = CollectorUser(guildDb.connection);
  let data = await Model.findOne({ guildId, userId });
  
  if (!data) {
    data = await Model.create({ guildId, userId });
  }

  // ── Handle Roll Reset Logic ──
  const now = new Date();
  const resetInterval = 60 * 60 * 1000; // 1 hour reset
  
  if (now - data.lastRollReset >= resetInterval) {
    data.rollsAvailable = data.maxRolls;
    data.lastRollReset = now;
    await data.save();
  }

  return data;
}

/**
 * Format a countdown string
 */
function getCooldownString(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

module.exports = {
  fetchRandomCharacter,
  getUserData,
  getCooldownString
};
