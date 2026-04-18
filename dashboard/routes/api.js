const express  = require("express");
const router   = express.Router();
const { requireAuth, requireGuild } = require("../middleware/auth");

// Import models
const { fromConnection: GuildSettings } = require("../../models/GuildSettings");
const { fromConnection: WarnConfig }    = require("../../models/WarnConfig");
const { fromConnection: LevelSettings } = require("../../models/LevelSettings");
const { fromConnection: TicketConfig }  = require("../../models/TicketConfig");
const { fromConnection: ModmailConfig } = require("../../models/ModmailConfig");
const { fromConnection: GreetSettings } = require("../../models/GreetSettings");
const { fromConnection: AutoRole }      = require("../../models/AutoRole");
const { fromConnection: ModCase }       = require("../../models/ModCase");
const { fromConnection: Ticket }        = require("../../models/Ticket");
const { fromConnection: ModmailThread } = require("../../models/ModmailThread");
const { fromConnection: UserLevel }     = require("../../models/UserLevel");
const { fromConnection: Giveaway }      = require("../../models/Giveaway");

// Helper to get guild DB
async function getDb(req) {
  const client = req.app.get("client");
  return client.db.getGuildDb(req.params.guildId);
}

// ── SECURITY MIDDLEWARE ───────────────────────────────────
router.use(requireAuth);
router.use(requireGuild);

// ── GET: Fetch All Guild Data ─────────────────────────────
router.get("/:guildId/data", async (req, res) => {
  try {
    const guildDb = await getDb(req);
    if (!guildDb || guildDb.isDown) return res.status(503).json({ error: "Database unavailable." });

    const guildId = req.params.guildId;
    const client = req.app.get("client");
    const guild = client.guilds.cache.get(guildId);

    if (!guild) return res.status(404).json({ error: "Guild not found." });

    const [
      settings, casesCount, ticketsCount, threadsCount, 
      levelsCount, giveawaysCount, leveling, tickets, 
      modmail, greeting, autorole, recentCases
    ] = await Promise.all([
      GuildSettings(guildDb.connection).findOne({ guildId }),
      ModCase(guildDb.connection).countDocuments({ guildId }),
      Ticket(guildDb.connection).countDocuments({ guildId, status: "open" }),
      ModmailThread(guildDb.connection).countDocuments({ guildId, status: { $ne: "closed" } }),
      UserLevel(guildDb.connection).countDocuments({ guildId }),
      Giveaway(guildDb.connection).countDocuments({ guildId, status: "active" }),
      LevelSettings(guildDb.connection).findOne({ guildId }),
      TicketConfig(guildDb.connection).findOne({ guildId }),
      ModmailConfig(guildDb.connection).findOne({ guildId }),
      GreetSettings(guildDb.connection).findOne({ guildId }),
      AutoRole(guildDb.connection).findOne({ guildId }),
      ModCase(guildDb.connection).find({ guildId }).sort({ caseNumber: -1 }).limit(5)
    ]);

    res.json({
      success: true,
      stats: {
        members: guild.memberCount,
        cases: casesCount,
        tickets: ticketsCount,
        threads: threadsCount,
        leveledUsers: levelsCount,
        giveaways: giveawaysCount
      },
      settings: {
        prefix: settings?.prefix || "!",
        modLog: settings?.modLogChannel || null,
        leveling: leveling || { enabled: false, voiceEnabled: false, levelUpDM: true, minXP: 15, maxXP: 25, cooldown: 60 },
        tickets: tickets || { enabled: false, categoryId: null, supportRole: null, loggingChannel: null },
        modmail: modmail || { enabled: false, categoryId: null, staffRole: null, logChannel: null },
        welcome: greeting || { welcome: { enabled: false, channelId: null, message: "", cardEnabled: false, useEmbed: false }, leave: { enabled: false, channelId: null, message: "", cardEnabled: false, useEmbed: false } },
      },
      recentCases,
      autorole: autorole || { humanRoles: [], botRoles: [] }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── SAVE: General Settings ────────────────────────────────
router.post("/:guildId/general", async (req, res) => {
  try {
    const { prefix, modLogChannel } = req.body;
    const guildDb = await getDb(req);
    await GuildSettings(guildDb.connection).findOneAndUpdate(
      { guildId: req.params.guildId },
      { $set: { prefix, modLogChannel: modLogChannel || null } },
      { upsert: true }
    );
    res.json({ success: true, message: "General settings updated." });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── SAVE: Leveling Settings ───────────────────────────────
router.post("/:guildId/leveling", async (req, res) => {
  try {
    const guildDb = await getDb(req);
    await LevelSettings(guildDb.connection).findOneAndUpdate(
      { guildId: req.params.guildId },
      { $set: { 
        enabled: req.body.enabled,
        voiceEnabled: req.body.voiceEnabled,
        levelUpDM: req.body.levelUpDM,
        minXP: parseInt(req.body.minXP),
        maxXP: parseInt(req.body.maxXP),
        cooldown: parseInt(req.body.cooldown)
      }},
      { upsert: true }
    );
    res.json({ success: true, message: "Leveling settings updated." });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── SAVE: Ticket Settings ────────────────────────────────
router.post("/:guildId/tickets", async (req, res) => {
  try {
    const guildDb = await getDb(req);
    await TicketConfig(guildDb.connection).findOneAndUpdate(
      { guildId: req.params.guildId },
      { $set: { 
        enabled: req.body.enabled,
        categoryId: req.body.categoryId || null,
        supportRole: req.body.supportRole || null,
        loggingChannel: req.body.loggingChannel || null
      }},
      { upsert: true }
    );
    res.json({ success: true, message: "Ticket settings updated." });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── SAVE: Welcome Settings ───────────────────────────────
router.post("/:guildId/welcome", async (req, res) => {
  try {
    const guildDb = await getDb(req);
    await GreetSettings(guildDb.connection).findOneAndUpdate(
      { guildId: req.params.guildId },
      { $set: { 
        "welcome.enabled": req.body.welcomeEnabled,
        "welcome.channelId": req.body.welcomeChannel || null,
        "welcome.message": req.body.welcomeMessage || "",
        "welcome.cardEnabled": req.body.welcomeCardEnabled,
        "welcome.useEmbed": req.body.welcomeUseEmbed,
        "leave.enabled": req.body.leaveEnabled,
        "leave.channelId": req.body.leaveChannel || null,
        "leave.message": req.body.leaveMessage || "",
        "leave.cardEnabled": req.body.leaveCardEnabled,
        "leave.useEmbed": req.body.leaveUseEmbed
      }},
      { upsert: true }
    );
    res.json({ success: true, message: "Welcome/Leave settings updated." });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── SAVE: Modmail Settings ────────────────────────────────
router.post("/:guildId/modmail", async (req, res) => {
  try {
    const guildDb = await getDb(req);
    await ModmailConfig(guildDb.connection).findOneAndUpdate(
      { guildId: req.params.guildId },
      { $set: { 
        enabled: req.body.enabled,
        categoryId: req.body.categoryId || null,
        staffRole: req.body.staffRole || null,
        logChannel: req.body.logChannel || null
      }},
      { upsert: true }
    );
    res.json({ success: true, message: "Modmail settings updated." });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Auto Role: update ──────────────────────────────────────
router.post("/:guildId/autorole", async (req, res) => {
  try {
    const { type, roleId, action } = req.body;
    const guildDb = await getDb(req);
    if (!guildDb || guildDb.isDown) return res.status(503).json({ message: "Database unavailable." });

    const field = type === "human" ? "humanRoles" : "botRoles";
    const op    = action === "add" ? { $addToSet: { [field]: roleId } } : { $pull: { [field]: roleId } };

    await AutoRole(guildDb.connection).findOneAndUpdate(
      { guildId: req.params.guildId },
      { ...op, $setOnInsert: { guildId: req.params.guildId } },
      { upsert: true }
    );

    res.json({ message: `Role ${action === "add" ? "added" : "removed"} successfully.` });
  } catch {
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
