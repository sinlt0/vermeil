	// ============================================================
//  webconfig.js — Bot Website Configuration
// ============================================================

module.exports = {

  // ── Website Toggle ────────────────────────────────────────
  enabled: true,
  port:    25104,

  // ── Bot Info ──────────────────────────────────────────────
  botName:        "Vermeil",
  botDescription: "Vermeil Is An advanced, all-in-one Discord bot packed with powerful features for your server.",
  botLogo:        "/img/img.png", // path inside public/ or a URL
  botVersion:     "1.0.0",

  // ── Links ─────────────────────────────────────────────────
  inviteLink:     "https://discord.com/oauth2/authorize?client_id=1483795068606353428&permissions=8&scope=bot%20applications.commands",
  supportServer:  "https://discord.gg/toz",
  githubLink:     "", // optional

  // ── Features (shown on home page) ────────────────────────
  features: [
    { icon: "🛡️", title: "Advanced Anti-Nuke",     description: "Maximum security for your server. Includes Panic Mode, Quarantining, Whitelisting, and automatic backups to prevent unauthorized changes." },
    { icon: "💰", title: "Economy & RPG",          description: "A deep economy system with work, crimes, hunts, battles, clans, marriage, and a global marketplace."                },
    { icon: "🎵", title: "Premium Music",          description: "High-quality, lag-free music powered by Lavalink. Supports 24/7 mode, audio filters, autoplay, and volume control." },
    { icon: "🔨", title: "Advanced Moderation",   description: "Full mod suite — kick, ban, timeout, warnings, case system, auto-threshold actions and detailed mod logs."          },
    { icon: "🎉", title: "Giveaways",              description: "Host advanced giveaways with role requirements, level requirements, and multiple winners."                         },
    { icon: "🎫", title: "Ticket System",          description: "Dynamic ticket categories, custom forms, transcripts, auto-close, claim system and support team roles."            },
    { icon: "📬", title: "Modmail",                description: "Professional modmail system with multi-server support, snippets, anonymous replies and scheduled closing."        },
    { icon: "🎉", title: "Fun & Games",            description: "Keep your server active with memes, jokes, 8ball, cat/dog pictures, and various interactive games."               },
    { icon: "📈", title: "Leveling System",        description: "Amari-style XP system with voice leveling, role rewards, multipliers, weekly leaderboard and beautiful rank cards." },
  ],

  // ── Dev Credits ───────────────────────────────────────────
  credits: [
    {
      name:   "Rex",
      role:   "Lead Developers",
      avatar: "img/rex.png",
      links: {
        github:  "https://github.com/iamrexedits",
        discord: "https://discord.com",
        youtube: "https://youtube.com/@rex_eberhardt",
      },
    },
    {
        name: "Akimi",
        role: "Lead Developers",
        avatar: "img/Akimi.png",
        links: {
            discord: "https://discord.com",
            youtube: "https://youtube.com/@akimichan-fx",
        },
    },
  ],

  // ── Footer ────────────────────────────────────────────────
  footerText: "© 2026 Vermeil. All rights reserved.",

  // ── Hidden Categories ────────────────────────────────────
  // These categories will be hidden from the /commands page
  hiddenCategories: ["owner", "dev", "premium"],
 
  // ── Dashboard ─────────────────────────────────────────────
  dashboard: {
    enabled:      false,
    port:         8080,
    secret:       "",
    callbackURL:  "http://../auth/callback",
    clientId:     "1483795068606353428",
    clientSecret: "Mdmwm2aeGvuVGIFTBwVGByPUXmiY2oGD",
  },
};



