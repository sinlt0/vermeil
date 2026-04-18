const axios = require("axios");

const PROVIDERS = {
  waifu_pics: {
    baseUrl: "https://api.waifu.pics/sfw/",
    categories: ["hug", "kiss", "pat", "slap", "cuddle", "smug", "blush", "dance", "smile", "highfive", "wave", "bite", "nom", "kill", "lick"],
    parse: (data) => data.url
  },
  nekos_best: {
    baseUrl: "https://nekos.best/api/v2/",
    categories: ["hug", "kiss", "pat", "slap", "cuddle", "poke", "tickle", "dance", "smile", "wave", "bite", "nom", "highfive", "shrug"],
    parse: (data) => data.results?.[0]?.url
  },
  nekos_life: {
    baseUrl: "https://nekos.life/api/v2/img/",
    categories: ["hug", "kiss", "pat", "slap", "cuddle", "poke", "tickle", "smug"],
    parse: (data) => data.url
  },
  purrbot: {
    baseUrl: "https://purrbot.site/api/img/sfw/",
    categories: ["hug", "kiss", "pat", "slap", "cuddle", "poke", "tickle", "dance", "smile", "bite", "blush"],
    parse: (data) => data.link
  },
  otakugifs: {
    baseUrl: "https://api.otakugifs.xyz/gif?reaction=",
    categories: ["hug", "kiss", "pat", "slap", "cuddle", "poke", "tickle", "dance", "smile", "wave", "bite", "blush", "smug"],
    parse: (data) => data.url
  }
};

async function fetchSocial(category) {
  const order = ["waifu_pics", "nekos_best", "otakugifs", "purrbot", "nekos_life"];
  
  for (const providerKey of order) {
    const provider = PROVIDERS[providerKey];
    if (!provider.categories.includes(category)) continue;

    try {
      const url = `${provider.baseUrl}${category}${providerKey === 'purrbot' ? '/gif' : ''}`;
      const res = await axios.get(url, { timeout: 5000 });
      const imgUrl = provider.parse(res.data);
      if (imgUrl && imgUrl.startsWith("http")) return { url: imgUrl, provider: providerKey };
    } catch {
      continue;
    }
  }
  throw new Error(`All providers failed for: ${category}`);
}

module.exports = { fetchSocial };
