const axios = require("axios");
const https = require("https");

// This agent allows fetching even if the hosting environment's 
// SSL certificate store is outdated (common in Pterodactyl/Termux).
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * NSFW API Configuration & Fallback System
 */
const PROVIDERS = {
  waifu_pics: {
    baseUrl: "https://api.waifu.pics/nsfw/",
    categories: ["hentai", "neko", "trap", "blowjob", "waifu"],
    parse: (data) => data.url
  },
  nekos_best: {
    baseUrl: "https://nekos.best/api/v2/",
    categories: ["hentai", "neko", "waifu", "bj", "cum", "anal", "lesbian", "pussy"],
    parse: (data) => data.results?.[0]?.url
  },
  nekos_life: {
    baseUrl: "https://nekos.life/api/v2/img/",
    categories: ["hentai", "neko", "ero", "lewd", "bj", "cum", "solo", "spank", "pussy", "tits"],
    parse: (data) => data.url
  },
  purrbot: {
    baseUrl: "https://purrbot.site/api/img/nsfw/",
    categories: ["anal", "blowjob", "cum", "fuck", "neko", "pussy", "solo", "threesome", "yuri"],
    parse: (data) => data.link,
    transformCategory: (cat) => {
      if (cat === "bj") return "blowjob";
      return cat;
    }
  },
  nekobot: {
    baseUrl: "https://nekobot.xyz/api/image?type=",
    categories: ["hass", "hboobs", "hentai", "pussy", "4k", "gonewild", "ass", "pgif", "boobs"],
    parse: (data) => data.message,
    transformCategory: (cat) => {
      if (cat === "ass_irl") return "ass";
      if (cat === "boobs_irl") return "boobs";
      if (cat === "pussy_irl") return "pussy";
      return cat;
    }
  }
};

/**
 * Fetch an image from multiple providers with automatic fallback
 * @param {string} category The category to search for (e.g., 'hentai', 'neko')
 */
async function fetchNsfw(category) {
  // Define fallback order (removed broken hmtai)
  const order = ["waifu_pics", "nekos_best", "nekos_life", "purrbot", "nekobot"];
  
  for (const providerKey of order) {
    const provider = PROVIDERS[providerKey];
    
    // Transform category name if the provider uses a different naming convention
    const targetCat = provider.transformCategory ? provider.transformCategory(category) : category;
    
    // Skip if provider doesn't support this category
    if (!provider.categories.includes(targetCat)) continue;

    try {
      const url = `${provider.baseUrl}${targetCat}${providerKey === 'purrbot' ? '/gif' : ''}`;
      const res = await axios.get(url, { 
        timeout: 5000,
        httpsAgent: httpsAgent // Use the custom agent here
      });
      const imgUrl = provider.parse(res.data);
      
      if (imgUrl && imgUrl.startsWith("http")) return { url: imgUrl, provider: providerKey };
    } catch (err) {
      console.error(`[NSFW API] ${providerKey} failed:`, err.message);
      continue; // Try next provider
    }
  }

  throw new Error(`All NSFW providers failed for category: ${category}`);
}

module.exports = { fetchNsfw };

module.exports = { fetchNsfw };
