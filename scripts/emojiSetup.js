/**
 * Vermeil Custom Emoji Automator
 * Downloads, Themes (Deep Purple), and Uploads emojis to your servers.
 */
const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const config = require("../config");
const { getThemedEmoji } = require("../utils/emojiThemer");

// ── COMPREHENSIVE ICON SOURCE MAP ─────────────────────────
// Mapping EVERY key from your emoji folder to premium SVG sources
const ICON_MAP = {
  // --- Global / Status ---
  success: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/circle-check.svg",
  error: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/circle-xmark.svg",
  warning: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/circle-exclamation.svg",
  info: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/circle-info.svg",
  loading: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/spinner.svg",
  check: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/check.svg",
  on: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/toggle-on.svg",
  off: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/toggle-off.svg",
  enabled: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/square-check.svg",
  disabled: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/square-xmark.svg",
  shield: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/shield-halved.svg",
  shieldOn: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/shield-halved.svg",
  shieldOff: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/shield.svg",

  // --- Economy ---
  coin: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/coins.svg",
  gem: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/gem.svg",
  token: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/ticket.svg",
  wallet: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/wallet.svg",
  bank: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/building-columns.svg",
  profile: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/user-tie.svg",
  rank: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/trophy.svg",
  work: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/briefcase.svg",
  shop: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/cart-shopping.svg",

  // --- Music ---
  play: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/play.svg",
  pause: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/pause.svg",
  stop: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/stop.svg",
  skip: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/forward-step.svg",
  previous: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/backward-step.svg",
  volumeUp: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/volume-high.svg",
  queue: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/list-ul.svg",
  autoplay: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/infinity.svg",
  music: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/music.svg",
  filter: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/sliders.svg",

  // --- Collection ---
  roll: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/dice.svg",
  claim: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/heart.svg",
  inventory: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/box-archive.svg",
  wish: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/wand-magic-sparkles.svg",
  star: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/star.svg",

  // --- Social Interaction ---
  hug: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/people-pulling.svg",
  kiss: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/lips.svg",
  pat: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/hand-holding-heart.svg",
  slap: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/hand-back-fist.svg",
  dance: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/person-walking-arrow-right.svg",
  kill: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/skull-crossbones.svg",

  // --- Security / Moderation ---
  quarantine: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/biohazard.svg",
  panic: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/triangle-exclamation.svg",
  lock: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/lock.svg",
  unlock: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/lock-open.svg",
  ban: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/gavel.svg",
  kick: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/user-minus.svg",

  // --- General / Category ---
  utility: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/screwdriver-wrench.svg",
  moderation: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/shield-halved.svg",
  admin: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/user-gear.svg",
  fun: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/face-grin-tears.svg",
  info: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/circle-info.svg",
  settings: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/gear.svg",
  invite: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/envelope-open-text.svg",
  support: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/headset.svg",
  bot: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/robot.svg",
  server: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/server.svg",
  
  // --- VoiceMaster ---
  voice: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/microphone-lines.svg",
  hide: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/eye-slash.svg",
  unhide: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/eye.svg",
  rename: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/signature.svg",
  claim: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/hand-sparkles.svg",
  transfer: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/right-left.svg",
};

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildEmojisAndStickers] });

async function run() {
  console.log("\x1b[35m[Emoji Automator]\x1b[0m Starting setup...");
  
  try {
    await client.login(process.env.TOKEN);
  } catch (err) {
    console.error("❌ Failed to login. Check your TOKEN in .env");
    process.exit(1);
  }

  const serverIds = config.emojiServers || [];
  if (!serverIds.length) {
    console.error("❌ No emojiServers found in config.js");
    process.exit(1);
  }

  const emojiDir = path.join(__dirname, "../emojis");
  const files = fs.readdirSync(emojiDir).filter(f => f.endsWith(".js"));

  for (const file of files) {
    const filePath = path.join(emojiDir, file);
    let content = fs.readFileSync(filePath, "utf8");
    
    // Extract all keys from the file using regex
    const keyRegex = /(\w+):\s*["'][^"']+["']/g;
    const matches = content.matchAll(keyRegex);
    if (!matches) continue;

    console.log(`\n📦 Processing Category: ${file}`);

    for (const match of matches) {
      const key = match[1];
      
      // Skip if we don't have a source for this icon
      if (!ICON_MAP[key]) {
        console.log(`  - ${key}: No icon source found, keeping original.`);
        continue;
      }

      // Skip if already a custom emoji
      if (content.includes(`<:vm_${key}:`)) {
        console.log(`  - ${key}: Already custom, skipping.`);
        continue;
      }

      console.log(`  - ${key}: Theming and Uploading...`);
      
      const themedBuffer = await getThemedEmoji(ICON_MAP[key]);
      if (!themedBuffer) continue;

      // Find a server with space
      let uploadedEmoji = null;
      for (const id of serverIds) {
        const guild = client.guilds.cache.get(id);
        if (!guild) continue;

        if (guild.emojis.cache.size < 50) { 
          try {
            uploadedEmoji = await guild.emojis.create({
              attachment: themedBuffer,
              name: `vm_${key}`
            });
            console.log(`    ✅ Uploaded to ${guild.name} (<:${uploadedEmoji.name}:${uploadedEmoji.id}>)`);
            break;
          } catch (e) {
            console.error(`    ❌ Upload failed in ${guild.name}: ${e.message}`);
          }
        }
      }

      if (uploadedEmoji) {
        const emojiTag = `<:${uploadedEmoji.name}:${uploadedEmoji.id}>`;
        const replaceRegex = new RegExp(`${key}:\\s*["'][^"']+["']`, 'g');
        content = content.replace(replaceRegex, `${key}: "${emojiTag}"`);
      }
    }

    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✅ Updated ${file}`);
  }

  console.log("\n\x1b[32m✨ All emojis processed and files updated successfully!\x1b[0m");
  process.exit(0);
}

run();
