// ============================================================
//  middleware/auth.js
//  Authentication and session middleware
// ============================================================
const webconfig = require("../../webconfig");

function requireAuth(req, res, next) {
  if (!req.session?.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect("/auth/login");
  }
  next();
}

function requireGuild(req, res, next) {
  if (!req.session?.user) return res.redirect("/auth/login");

  const guildId = req.params.guildId;
  const userGuilds = req.session.guilds ?? [];
  const guild = userGuilds.find(g => g.id === guildId);

  if (!guild) {
    return res.redirect("/servers?error=no_access");
  }

  req.guild = guild;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session?.user) return res.redirect("/auth/login");
  const user = req.session.user;
  const config = require("../../config");

  const isOwner = user.id === config.ownerID;
  const isDev   = config.devIDs?.includes(user.id);

  if (!isOwner && !isDev) {
    return res.status(403).render("pages/error", {
      title:  "403 Forbidden",
      error:  "You don't have permission to access the admin panel.",
      config: webconfig,
      flash:  null,
      user:   req.session.user,
      guild:  null,
    });
  }

  next();
}

module.exports = { requireAuth, requireGuild, requireAdmin };
