// ============================================================
//  config.js — Central configuration
//  Token & MongoDB URI will be overridden by .env if set
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
  token:   "",
  prefix:  "!",
  ownerID: "1181137505505001544",
       

  // ── Developer IDs ────────────────────────────────────────
  // These users can run dev-level commands
  devIDs: loadJson("devs.json"),
  // ── No-Prefix Users ──────────────────────────────────────
  // These users can run commands without the prefix
  noPrefix: loadJson("nplist.json"),

    
  // ── Hidden Categories ────────────────────────────────────
  // Categories listed here won't appear in the help menu
  // Commands still work normally — just hidden from help
  hiddenCategories: [
    "owner",
    "dev",
    "premium",
  ],

  // ── MongoDB Clusters ─────────────────────────────────────
  // Add as many clusters as needed
  // New guilds are auto-assigned to a random available cluster
  // Available = connection alive AND serverCount < maxServersPerCluster
  mongodb: {
    clusters: [
      { name: "cluster1", uri: "mongodb+srv://codex:codex@cdx-in-1.0idu7ol.mongodb.net/?appName=cdx-in-1" },
      { name: "cluster2", uri: "mongodb+srv://codex:codex@cdx-in-2.nvi4kep.mongodb.net/?appName=cdx-in-2" },
      { name: "cluster3", uri: "mongodb+srv://codex:codex@cdx-us-1.zunskft.mongodb.net/?appName=cdx-us-1" },
    ],
    economyUri: "mongodb+srv://AeroX:AeroX@aerox.9qfrqol.mongodb.net/?retryWrites=true&w=majority&appName=AeroX",
    maxServersPerCluster: 100,
  },

  // ── Lavalink ─────────────────────────────────────────────
  lavalink: {
    host: "lavalinkv4.serenetia.com",
    port: 443,
    password: "https://seretia.link/discord",
    secure: true,
    restVersion: "v4",
    name:"Main Node", 
  },

};
