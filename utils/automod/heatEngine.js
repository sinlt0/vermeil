// ============================================================
//  utils/automod/heatEngine.js
//  Core heat calculation engine — lazy evaluation
//  Heat decays based on time elapsed since last message
//  No intervals — calculated fresh on each message
// ============================================================
const { fromConnection: UserHeat }      = require("../../models/UserHeat");
const { fromConnection: AutoModConfig } = require("../../models/AutoModConfig");

// ── Heat weights per filter (% added per trigger) ─────────
const HEAT_WEIGHTS = {
  normalMessage:   18,  // base per message
  similarMessage:  35,  // repeated same message
  emojiSpam:       25,  // too many emojis
  messageChars:    30,  // wall of text
  newLines:        20,  // excessive newlines
  inactiveChannel: 40,  // spamming quiet channel
  mention:         30,  // @user mentions
  roleMention:     45,  // @role mentions
  everyoneMention: 100, // @everyone/@here — instant trigger
  attachment:      25,  // image/file spam
  inviteLink:      100, // discord invite — instant trigger
  maliciousLink:   100, // phishing/scam — instant trigger
  blacklistedWord: 80,  // blacklisted word
  webhookSpam:     50,  // webhook spam
};

// ============================================================
//  Get current heat for a user (with lazy decay applied)
// ============================================================
async function getUserHeat(connection, config, guildId, userId) {
  const HeatModel = UserHeat(connection);
  let record      = await HeatModel.findOne({ guildId, userId });

  if (!record) return { heat: 0, strikeCount: 0, record: null };

  // Apply lazy decay — calculate elapsed time since last update
  const now        = Date.now();
  const elapsed    = (now - new Date(record.lastUpdated).getTime()) / 1000; // seconds
  const degradation = config.heat.degradationRate ?? 5; // % per second
  const decayed    = Math.min(record.heat, elapsed * degradation);
  const newHeat    = Math.max(0, record.heat - decayed);

  // Update if heat changed
  if (decayed > 0) {
    record.heat        = newHeat;
    record.lastUpdated = new Date(now);
    await record.save();
  }

  return { heat: newHeat, strikeCount: record.strikeCount, record };
}

// ============================================================
//  Add heat to a user
//  Returns { heat, triggered, record }
// ============================================================
async function addHeat(connection, config, guildId, userId, amount) {
  const HeatModel  = UserHeat(connection);
  const maxHeat    = config.heat.maxPercent ?? 100;

  // Get current heat with decay applied
  const { heat: currentHeat, record: existingRecord } = await getUserHeat(connection, config, guildId, userId);

  const newHeat  = Math.min(currentHeat + amount, 999); // allow overshoot for display
  const triggered = newHeat >= maxHeat && currentHeat < maxHeat;

  const update = {
    heat:        newHeat,
    lastUpdated: new Date(),
    guildId,
    userId,
  };

  if (triggered) {
    update.strikeCount = (existingRecord?.strikeCount ?? 0) + 1;
    update.lastStrike  = new Date();
  }

  const record = await HeatModel.findOneAndUpdate(
    { guildId, userId },
    { $set: update },
    { upsert: true, new: true }
  );

  return { heat: newHeat, triggered, record };
}

// ============================================================
//  Reset a user's heat (after punishment applied)
// ============================================================
async function resetHeat(connection, guildId, userId) {
  const HeatModel = UserHeat(connection);
  await HeatModel.findOneAndUpdate(
    { guildId, userId },
    { $set: { heat: 0, lastUpdated: new Date() } }
  );
}

// ============================================================
//  Calculate timeout duration based on strike count
// ============================================================
function calcTimeoutDuration(config, strikeCount) {
  const capCount      = config.heat.capCount       ?? 3;
  const strikeTimeout = config.heat.strikeTimeout  ?? 3600;   // 1 hour
  const capTimeout    = config.heat.capTimeout      ?? 86400;  // 1 day
  const multiplier    = config.heat.multiplier      ?? 1;

  if (strikeCount >= capCount) {
    // Cap strike — apply multiplier
    return capTimeout * Math.pow(multiplier, strikeCount - capCount + 1);
  }

  return strikeTimeout;
}

// ============================================================
//  Get heat bar visual (Wick-style display)
// ============================================================
function heatBar(heat, max = 100) {
  const pct     = Math.min(100, Math.floor((heat / max) * 100));
  const filled  = Math.floor(pct / 10);
  const empty   = 10 - filled;
  const bar     = "█".repeat(filled) + "░".repeat(empty);
  let   color   = "🟢";
  if (pct >= 80) color = "🔴";
  else if (pct >= 50) color = "🟠";
  else if (pct >= 25) color = "🟡";
  return `${color} \`${bar}\` **${pct}%**`;
}

module.exports = {
  HEAT_WEIGHTS,
  getUserHeat,
  addHeat,
  resetHeat,
  calcTimeoutDuration,
  heatBar,
};
