// ============================================================
//  routes/admin.js
//  Admin panel routes — owner and devs only
// ============================================================
const express   = require("express");
const router    = express.Router();
const webconfig = require("../../webconfig");
const { requireAuth, requireAdmin } = require("../middleware/auth");

router.get("/", requireAuth, requireAdmin, async (req, res) => {
  const client = req.app.get("client");

  const allGuilds = [...client.guilds.cache.values()].map(g => ({
    id:          g.id,
    name:        g.name,
    icon:        g.icon,
    memberCount: g.memberCount,
  }));

  const clusters = client.db?.getClusterStatus() ?? [];

  res.render("pages/admin", {
    title:    "Admin Panel",
    config:   webconfig,
    user:     req.session.user,
    guild:    null,
    page:     "admin",
    flash:    null,
    allGuilds,
    clusters,
    botStats: {
      guilds:   client.guilds.cache.size,
      users:    client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
      commands: client.commands.size,
      ping:     client.ws.ping,
    },
  });
});

module.exports = router;
