const axios = require("axios");
const https = require("https");
const { fromConnection: CollectorUser } = require("../../models/collector/CollectorUser");

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

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
  else if (gender === "female") targetGender = "FEMALE";

  // Top characters (reduced range for higher reliability)
  const maxPage = targetGender ? 200 : 300;
  const randomPage = Math.floor(Math.random() * maxPage) + 1;

  // Build variables object
  const variables = { 
    page: randomPage,
    gender: targetGender // Explicitly include even if null
  };

  try {
    const res = await axios.post("https://graphql.anilist.co", {
      query,
      variables
    }, { 
      timeout: 10000,
      httpsAgent: httpsAgent
    });

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
 * Search for a specific character by name or ID
 */
async function searchCharacter(query) {
  const isId = !isNaN(query);
  const graphqlQuery = `
    query ($id: Int, $search: String) {
      Character(id: $id, search: $search) {
        id
        name { full }
        image { large }
        gender
        description
        siteUrl
        media(perPage: 1, sort: POPULARITY_DESC) {
          nodes {
            title { romaji }
            bannerImage
          }
        }
      }
    }
  `;

  try {
    const res = await axios.post("https://graphql.anilist.co", {
      query: graphqlQuery,
      variables: isId ? { id: parseInt(query) } : { search: query }
    }, { 
      timeout: 10000,
      httpsAgent: httpsAgent
    });
    
    const char = res.data.data.Character;
    if (!char) return null;

    return {
      id:     char.id,
      name:   char.name.full,
      image:  char.image.large,
      gender: char.gender || "Unknown",
      desc:   char.description || "No description available.",
      url:    char.siteUrl,
      anime:  char.media.nodes[0]?.title.romaji || "Unknown",
      banner: char.media.nodes[0]?.bannerImage || null
    };
  } catch (err) {
    return null;
  }
}

/**
 * Get or initialize user collection data
 */
async function getUserData(guildDb, guildId, userId, settings = null) {
  const Model = CollectorUser(guildDb.connection);
  let data = await Model.findOne({ guildId, userId });
  
  if (!data) {
    data = await Model.create({ guildId, userId });
  }

  // ── Handle Roll Reset Logic ──
  const now = new Date();
  const rollInterval = (settings?.rollResetMinutes || 60) * 60 * 1000;
  
  if (now - data.lastRollReset >= rollInterval) {
    data.rollsAvailable = data.maxRolls;
    data.lastRollReset = now;
    await data.save();
  }

  // ── Handle Claim Reset Logic ──
  const claimInterval = (settings?.claimResetMinutes || 180) * 60 * 1000;
  if (now - data.lastClaimReset >= claimInterval) {
    data.claimsAvailable = 1; // Default 1 claim
    data.lastClaimReset = now;
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
  searchCharacter,
  getUserData,
  getCooldownString
};
