// ============================================================
//  routes/dashboard.js
//  Main dashboard page routes
// ============================================================
const express    = require("express");
const router     = express.Router();
const webconfig  = require("../../webconfig");
const botconfig  = require("../../config");
const { requireAuth, requireGuild } = require("../middleware/auth");

const { fromConnection: GuildSettings } = require("../../models/GuildSettings");
const { fromConnection: ModCase }       = require("../../models/ModCase");
const { fromConnection: WarnConfig }    = require("../../models/WarnConfig");
const { fromConnection: LevelSettings } = require("../../models/LevelSettings");
const { fromConnection: UserLevel }     = require("../../models/UserLevel");
const { fromConnection: TicketConfig }  = require("../../models/TicketConfig");
const { fromConnection: TicketCategory }= require("../../models/TicketCategory");
const { fromConnection: Ticket }        = require("../../models/Ticket");
const { fromConnection: ModmailConfig } = require("../../models/ModmailConfig");
const { fromConnection: ModmailThread } = require("../../models/ModmailThread");
const { fromConnection: Giveaway }      = require("../../models/Giveaway");
const { fromConnection: AutoRole }      = require("../../models/AutoRole");
const { fromConnection: GreetSettings } = require("../../models/GreetSettings");

// Helper to render dashboard pages
function dash(res, page, data = {}) {
  res.renderPage(page, data);
}

// Helper to get guild DB
async function getGuildDb(client, guildId) {
  return client.db.getGuildDb(guildId);
}

// ── Servers list ───────────────────────────────────────────
router.get("/", requireAuth, (req, res) => res.redirect("/servers"));

router.get("/servers", requireAuth, (req, res) => {
  const client    = req.app.get("client");
  const userGuilds = req.session.guilds ?? [];

  const guilds = userGuilds.map(g => ({
    ...g,
    botPresent: client.guilds.cache.has(g.id),
  }));

  dash(res, "servers", {
    title:  "Select Server",
    user:   req.session.user,
    guild:  null,
    guilds,
    flash:  req.session.flash || null,
  });
  delete req.session.flash;
});

// ── Overview ───────────────────────────────────────────────
router.get("/dashboard/:guildId", requireAuth, requireGuild, async (req, res) => {
  const client  = req.app.get("client");
  const guild   = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.redirect("/servers");

  const guildDb = await getGuildDb(client, guild.id);
  if (!guildDb || guildDb.isDown) {
    return dash(res, "error", { title: "DB Error", error: "Database unavailable.", user: req.session.user, guild: req.guild });
  }

  const [cases, tickets, threads, leveledUsers, giveaways, settings] = await Promise.all([
    ModCase(guildDb.connection).countDocuments({ guildId: guild.id }),
    Ticket(guildDb.connection).countDocuments({ guildId: guild.id, status: "open" }),
    ModmailThread(guildDb.connection).countDocuments({ guildId: guild.id, status: { $ne: "closed" } }),
    UserLevel(guildDb.connection).countDocuments({ guildId: guild.id }),
    Giveaway(guildDb.connection).countDocuments({ guildId: guild.id, status: "active" }),
    GuildSettings(guildDb.connection).findOne({ guildId: guild.id }),
  ]);

  const levelSettings  = await LevelSettings(guildDb.connection).findOne({ guildId: guild.id });
  const ticketConfig   = await TicketConfig(guildDb.connection).findOne({ guildId: guild.id });
  const modmailConfig  = await ModmailConfig(guildDb.connection).findOne({ guildId: guild.id });
  const greetSettings  = await GreetSettings(guildDb.connection).findOne({ guildId: guild.id });
  const recentCases    = await ModCase(guildDb.connection).find({ guildId: guild.id }).sort({ caseNumber: -1 }).limit(5);

  dash(res, "overview", {
    title:  "Overview",
    user:   req.session.user,
    guild:  req.guild,
    page:   "overview",
    stats: {
      members:       guild.memberCount,
      cases,
      tickets,
      modmailThreads: threads,
      leveledUsers,
      giveaways,
    },
    settings: {
      levelingEnabled: levelSettings?.enabled ?? false,
      ticketsEnabled:  ticketConfig?.enabled ?? false,
      modmailEnabled:  modmailConfig?.enabled ?? false,
      welcomeEnabled:  greetSettings?.welcome?.enabled ?? false,
    },
    recentCases,
    flash: req.session.flash || null,
  });
  delete req.session.flash;
});

// ── General Settings ───────────────────────────────────────
router.get("/dashboard/:guildId/general", requireAuth, requireGuild, async (req, res) => {
  const client  = req.app.get("client");
  const guild   = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.redirect("/servers");

  const guildDb  = await getGuildDb(client, guild.id);
  const settings = await GuildSettings(guildDb.connection).findOne({ guildId: guild.id });
  const channels = [...guild.channels.cache.values()].map(c => ({ id: c.id, name: c.name, type: c.type }));

  dash(res, "general", { title: "General", user: req.session.user, guild: req.guild, page: "general", settings: settings ?? {}, channels, flash: null });
});

// ── Moderation ─────────────────────────────────────────────
router.get("/dashboard/:guildId/moderation", requireAuth, requireGuild, async (req, res) => {
  const client  = req.app.get("client");
  const guild   = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.redirect("/servers");

  const guildDb    = await getGuildDb(client, guild.id);
  const [cases, warnConfig] = await Promise.all([
    ModCase(guildDb.connection).find({ guildId: guild.id }).sort({ caseNumber: -1 }).limit(20),
    WarnConfig(guildDb.connection).findOne({ guildId: guild.id }),
  ]);

  dash(res, "moderation", { title: "Moderation", user: req.session.user, guild: req.guild, page: "moderation", cases, thresholds: warnConfig?.thresholds ?? [], flash: null });
});

// ── Leveling ───────────────────────────────────────────────
router.get("/dashboard/:guildId/leveling", requireAuth, requireGuild, async (req, res) => {
  const client  = req.app.get("client");
  const guild   = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.redirect("/servers");

  const guildDb   = await getGuildDb(client, guild.id);
  const [settings, leaderboard] = await Promise.all([
    LevelSettings(guildDb.connection).findOne({ guildId: guild.id }),
    UserLevel(guildDb.connection).find({ guildId: guild.id }).sort({ xp: -1 }).limit(10),
  ]);

  dash(res, "leveling", { title: "Leveling", user: req.session.user, guild: req.guild, page: "leveling", settings: settings ?? {}, leaderboard, roleRewards: settings?.roleRewards ?? [], flash: null });
});

// ── Tickets ────────────────────────────────────────────────
router.get("/dashboard/:guildId/tickets", requireAuth, requireGuild, async (req, res) => {
  const client  = req.app.get("client");
  const guild   = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.redirect("/servers");

  const guildDb = await getGuildDb(client, guild.id);
  const [config, categories, tickets] = await Promise.all([
    TicketConfig(guildDb.connection).findOne({ guildId: guild.id }),
    TicketCategory(guildDb.connection).find({ guildId: guild.id }),
    Ticket(guildDb.connection).find({ guildId: guild.id, status: "open" }).limit(20),
  ]);

  dash(res, "tickets", { title: "Tickets", user: req.session.user, guild: req.guild, page: "tickets", config: config ?? {}, categories, tickets, flash: null });
});

// ── Modmail ────────────────────────────────────────────────
router.get("/dashboard/:guildId/modmail", requireAuth, requireGuild, async (req, res) => {
  const client  = req.app.get("client");
  const guild   = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.redirect("/servers");

  const guildDb = await getGuildDb(client, guild.id);
  const [config, threads] = await Promise.all([
    ModmailConfig(guildDb.connection).findOne({ guildId: guild.id }),
    ModmailThread(guildDb.connection).find({ guildId: guild.id, status: { $ne: "closed" } }).sort({ createdAt: -1 }).limit(20),
  ]);

  const channels = [...guild.channels.cache.values()].map(c => ({ id: c.id, name: c.name, type: c.type }));
  const roles    = [...guild.roles.cache.values()].map(r => ({ id: r.id, name: r.name }));

  dash(res, "modmail", { title: "Modmail", user: req.session.user, guild: req.guild, page: "modmail", config: config ?? {}, threads, channels, roles, flash: null });
});

// ── Giveaways ──────────────────────────────────────────────
router.get("/dashboard/:guildId/giveaways", requireAuth, requireGuild, async (req, res) => {
  const client  = req.app.get("client");
  const guild   = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.redirect("/servers");

  const guildDb   = await getGuildDb(client, guild.id);
  const giveaways = await Giveaway(guildDb.connection).find({ guildId: guild.id }).sort({ createdAt: -1 }).limit(20);

  dash(res, "giveaways", { title: "Giveaways", user: req.session.user, guild: req.guild, page: "giveaways", giveaways, flash: null });
});

// ── Auto Role ──────────────────────────────────────────────
router.get("/dashboard/:guildId/autorole", requireAuth, requireGuild, async (req, res) => {
  const client  = req.app.get("client");
  const guild   = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.redirect("/servers");

  const guildDb  = await getGuildDb(client, guild.id);
  const config   = await AutoRole(guildDb.connection).findOne({ guildId: guild.id });
  const roles    = [...guild.roles.cache.values()].filter(r => !r.managed && r.id !== guild.id).map(r => ({ id: r.id, name: r.name, color: r.hexColor }));

  dash(res, "autorole", { title: "Auto Role", user: req.session.user, guild: req.guild, page: "autorole", config: config ?? { humanRoles: [], botRoles: [] }, roles, flash: null });
});

// ── Welcome ────────────────────────────────────────────────
router.get("/dashboard/:guildId/welcome", requireAuth, requireGuild, async (req, res) => {
  const client  = req.app.get("client");
  const guild   = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.redirect("/servers");

  const guildDb  = await getGuildDb(client, guild.id);
  const settings = await GreetSettings(guildDb.connection).findOne({ guildId: guild.id });
  const channels = [...guild.channels.cache.values()].filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name }));

  dash(res, "welcome", { title: "Welcome & Leave", user: req.session.user, guild: req.guild, page: "welcome", settings: settings ?? {}, channels, flash: null });
});

module.exports = router;
