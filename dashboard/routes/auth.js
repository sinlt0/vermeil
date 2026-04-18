// ============================================================
//  routes/auth.js
//  Discord OAuth2 authentication routes
// ============================================================
const express    = require("express");
const router     = express.Router();
const fetch      = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
const webconfig  = require("../../webconfig");
const botconfig  = require("../../config");

const DISCORD_API  = "https://discord.com/api/v10";
const OAUTH_SCOPES = "identify guilds";

// ── Login redirect ─────────────────────────────────────────
router.get("/login", (req, res) => {
  res.render("pages/login", {
    title:  "Login",
    config: webconfig,
    error:  req.query.error || null,
    flash:  null,
    user:   null,
    guild:  null,
  });
});

// ── Discord OAuth redirect ─────────────────────────────────
router.get("/discord", (req, res) => {
  const dash = webconfig.dashboard;
  const params = new URLSearchParams({
    client_id:     dash.clientId,
    redirect_uri:  dash.callbackURL,
    response_type: "code",
    scope:         OAUTH_SCOPES,
  });
  res.redirect(`${DISCORD_API}/oauth2/authorize?${params}`);
});

// ── OAuth callback ─────────────────────────────────────────
router.get("/callback", async (req, res) => {
  const { code, error } = req.query;
  const dash = webconfig.dashboard;

  if (error || !code) {
    return res.redirect("/auth/login?error=auth_failed");
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    new URLSearchParams({
        client_id:     dash.clientId,
        client_secret: dash.clientSecret,
        grant_type:    "authorization_code",
        code,
        redirect_uri:  dash.callbackURL,
      }),
    });

    if (!tokenRes.ok) return res.redirect("/auth/login?error=token_failed");
    const tokens = await tokenRes.json();

    // Fetch user
    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const user = await userRes.json();

    // Fetch guilds
    const guildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const guilds = await guildsRes.json();

    // Filter guilds where user has Manage Server (0x20)
    const manageableGuilds = guilds.filter(g => (BigInt(g.permissions) & BigInt(0x20)) === BigInt(0x20));

    // Store in session
    req.session.user = {
      id:          user.id,
      username:    user.username,
      avatar:      user.avatar,
      isOwner:     user.id === botconfig.ownerID,
      isDev:       botconfig.devIDs?.includes(user.id) || user.id === botconfig.ownerID,
    };
    req.session.guilds  = manageableGuilds;
    req.session.tokens  = tokens;

    const returnTo = req.session.returnTo || "/servers";
    delete req.session.returnTo;
    res.redirect(returnTo);
  } catch (err) {
    console.error("[Dashboard] OAuth error:", err.message);
    res.redirect("/auth/login?error=server_error");
  }
});

// ── Logout ─────────────────────────────────────────────────
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/auth/login");
});

module.exports = router;
