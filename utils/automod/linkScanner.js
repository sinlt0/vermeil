// ============================================================
//  utils/automod/linkScanner.js
//  URL extraction, invite detection, blacklist + malicious check
// ============================================================
const { fromConnection: BlacklistedLink } = require("../../models/BlacklistedLink");

// Known malicious/scam domains
const MALICIOUS_DOMAINS = [
  "discordnitro-free", "free-nitro", "steamcommunity.ru", "steamcommunity.eu",
  "discord-gift", "discordgift", "discordapp.io", "discord.io",
  "dlscord", "discrod", "discorid", "discoord",
  "freegiftcard", "claim-reward", "getnitro",
  "csgo-skins", "cs-skins", "crypto-gift",
  "bit.ly", "tinyurl.com", "goo.gl", "ow.ly", // shorteners often used for phishing
];

// Discord invite patterns
const INVITE_REGEX = /discord(?:\.gg|app\.com\/invite|\.com\/invite)\/([a-zA-Z0-9\-]+)/gi;

// URL extraction regex
const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;

// ============================================================
//  Extract all URLs from message content
// ============================================================
function extractURLs(content) {
  return [...(content.match(URL_REGEX) ?? [])];
}

// ============================================================
//  Check if message contains a Discord invite
// ============================================================
function hasDiscordInvite(content) {
  INVITE_REGEX.lastIndex = 0;
  return INVITE_REGEX.test(content);
}

// ============================================================
//  Extract invite codes from message
// ============================================================
function extractInviteCodes(content) {
  const codes = [];
  let match;
  const regex = /discord(?:\.gg|app\.com\/invite|\.com\/invite)\/([a-zA-Z0-9\-]+)/gi;
  while ((match = regex.exec(content)) !== null) {
    codes.push(match[1]);
  }
  return codes;
}

// ============================================================
//  Check if any URL is malicious/phishing
// ============================================================
function hasMaliciousLink(content) {
  const urls = extractURLs(content);
  for (const url of urls) {
    const domain = url.replace(/https?:\/\//i, "").split("/")[0].toLowerCase();
    if (MALICIOUS_DOMAINS.some(bad => domain.includes(bad))) return true;
    // Check for IP addresses (common in phishing)
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(domain)) return true;
  }
  return false;
}

// ============================================================
//  Check if URL matches any server blacklisted link
// ============================================================
async function isBlacklistedLink(connection, guildId, content) {
  const LinkModel = BlacklistedLink(connection);
  const entries   = await LinkModel.find({ guildId }).lean();
  if (!entries.length) return false;

  const urls  = extractURLs(content);
  const lower = content.toLowerCase();

  for (const entry of entries) {
    const normalized = entry.link.toLowerCase().replace(/https?:\/\//i, "");
    // Check raw content
    if (lower.includes(normalized)) return { matched: entry.link };
    // Check extracted URLs
    for (const url of urls) {
      if (url.toLowerCase().includes(normalized)) return { matched: entry.link };
    }
  }
  return false;
}

// ============================================================
//  Normalize a link for storage
// ============================================================
function normalizeLink(link) {
  return link.toLowerCase()
    .replace(/https?:\/\//i, "")
    .replace(/www\./i, "")
    .replace(/\/$/, "");
}

module.exports = {
  extractURLs,
  hasDiscordInvite,
  extractInviteCodes,
  hasMaliciousLink,
  isBlacklistedLink,
  normalizeLink,
};
