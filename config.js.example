// ============================================================
//  config.js.example — Central configuration template
// ============================================================

const path = require("path");
const fs   = require("fs");

function loadJson(filename) {
  const filePath = path.join(__dirname, "data", filename);
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "[]", "utf8");
      return [];
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return [];
  }
}

module.exports = {

  // ── Bot ──────────────────────────────────────────────────
  token:   "", // Fill in .env or here
  prefix:  "!",
  ownerID: "YOUR_DISCORD_ID",
       
  // ── Developer IDs ────────────────────────────────────────
  devIDs: loadJson("devs.json"),

  // ── No-Prefix Users ──────────────────────────────────────
  noPrefix: loadJson("nplist.json"),
    
  // ── Hidden Categories ────────────────────────────────────
  hiddenCategories: [
    "owner",
    "dev",
    "premium",
  ],

  // ── MongoDB Clusters ─────────────────────────────────────
  mongodb: {
    clusters: [
      { name: "cluster1", uri: "YOUR_MONGODB_CLUSTER_1_URI" },
      { name: "cluster2", uri: "YOUR_MONGODB_CLUSTER_2_URI" },
    ],
    economyUri: "YOUR_ECONOMY_MONGODB_URI",
    maxServersPerCluster: 100,
  },

  // ── Emoji Hosting ────────────────────────────────────
  // The bot will upload custom emojis to these servers.
  emojiServers: ["YOUR_SERVER_ID_1", "YOUR_SERVER_ID_2"],

  // ── Lavalink ─────────────────────────────────────────────
  lavalink: {
    host: "YOUR_LAVALINK_HOST",
    port: 443,
    password: "YOUR_LAVALINK_PASSWORD",
    secure: true,
    restVersion: "v4",
    name: "Main Node", 
  },

};
