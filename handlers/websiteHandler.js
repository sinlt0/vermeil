// ============================================================
//  handlers/websiteHandler.js
//  Starts the Express bot website
//  Pages: / | /commands | /docs | /credits
// ============================================================
const express    = require("express");
const path       = require("path");
const fs         = require("fs");
const axios      = require("axios");
const { marked } = require("marked");
const chalk      = require("chalk");
const webconfig  = require("../webconfig");

module.exports = async (client) => {
  if (!webconfig.enabled) {
    console.log(chalk.gray("  [Website] Disabled in webconfig.js"));
    return;
  }

  const app  = express();
  const WEB  = path.join(__dirname, "../webs");

  // ── Middleware ────────────────────────────────────────
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Template engine ───────────────────────────────────
  app.set("view engine", "ejs");
  app.set("views", path.join(WEB, "views"));
  app.use(express.static(path.join(WEB, "public")));

  // ── Helper: render with layout ────────────────────────
  function render(res, view, data = {}) {
    res.render(view, { ...data, config: webconfig, layout: "layout" }, (err, body) => {
      if (err) return res.status(500).send("Template error: " + err.message);
      res.render("layout", { ...data, config: webconfig, body, title: data.title ?? view });
    });
  }

  // ── Helper: get category icon ────────────────────────
  function getCategoryIcon(cat) {
    const map = {
      utility: "fa-solid fa-wrench",
      moderation: "fa-solid fa-hammer",
      admin: "fa-solid fa-cog",
      music: "fa-solid fa-music",
      fun: "fa-solid fa-gamepad",
      nsfw: "fa-solid fa-eye-slash",
      collection: "fa-solid fa-images",
      economy: "fa-solid fa-dollar-sign",
      leveling: "fa-solid fa-chart-line",
      info: "fa-solid fa-info-circle",
      ticket: "fa-solid fa-ticket",
      modmail: "fa-solid fa-headset",
      autorole: "fa-solid fa-user-plus",
      welcome: "fa-solid fa-bullhorn",
      owner: "fa-solid fa-crown",
      general: "fa-solid fa-th-large"
    };
    return map[cat.toLowerCase()] || "fa-solid fa-folder";
  }

  // ── Home ──────────────────────────────────────────────
  app.get("/", (req, res) => {
    const stats = {
      guilds:   client?.guilds?.cache?.size ?? 0,
      commands: client?.commands?.size ?? 0,
      users:    client?.guilds?.cache?.reduce((a, g) => a + g.memberCount, 0) ?? 0,
    };
    render(res, "home", { title: "Home", page: "home", stats });
  });

  // ── Commands ──────────────────────────────────────────
  app.get("/commands", (req, res) => {
    const hidden = webconfig.hiddenCategories ?? [];
    const categoryMap = new Map();

    if (client?.commands) {
      for (const [, cmd] of client.commands) {
        const cat = (cmd.category || "general").toLowerCase();
        if (hidden.includes(cat)) continue;
        if (!categoryMap.has(cat)) categoryMap.set(cat, []);
        categoryMap.get(cat).push(cmd);
      }
    }

    const categories = [...categoryMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, cmds]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), emoji: getCategoryIcon(name), commands: cmds }));

    const totalCommands = categories.reduce((a, c) => a + c.commands.length, 0);
    const prefix        = webconfig.prefix ?? "!";

    render(res, "commands", { title: "Commands", page: "commands", categories, totalCommands, prefix });
  });

  // ── Docs ──────────────────────────────────────────────
  const DOCS_DIR = path.join(WEB, "docs");

  function buildSidebar() {
    const sidebar = [];
    if (!fs.existsSync(DOCS_DIR)) return sidebar;

    const entries = fs.readdirSync(DOCS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        const slug  = entry.name.replace(".md", "");
        const title = slugToTitle(slug);
        sidebar.push({ type: "file", slug, title });
      } else if (entry.isDirectory()) {
        const catFiles = [];
        const catDir   = path.join(DOCS_DIR, entry.name);
        const catEntries = fs.readdirSync(catDir, { withFileTypes: true });

        for (const f of catEntries) {
          if (f.isFile() && f.name.endsWith(".md")) {
            const slug  = `${entry.name}/${f.name.replace(".md", "")}`;
            const title = slugToTitle(f.name.replace(".md", ""));
            catFiles.push({ slug, title });
          }
        }

        if (catFiles.length > 0) {
          sidebar.push({ type: "category", name: slugToTitle(entry.name), files: catFiles });
        }
      }
    }

    return sidebar;
  }

  function getDocContent(slug) {
    const fullPath = path.join(DOCS_DIR, `${slug}.md`);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, "utf-8");
    }
    return null;
  }

  function slugToTitle(slug) {
    return slug.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  app.get("/docs", (req, res) => {
    const sidebar = buildSidebar();
    render(res, "docs", { title: "Documentation", page: "docs", sidebar, content: null, currentSlug: null });
  });

  app.get("/docs/*", (req, res) => {
    const slug    = req.params[0];
    const raw     = getDocContent(slug);
    const sidebar = buildSidebar();

    if (!raw) {
      return res.status(404).render("layout", {
        config: webconfig,
        title:  "Not Found",
        page:   "docs",
        body:   "<div style='padding:4rem 2rem;text-align:center'><h1>404 — Doc not found</h1><p style='color:var(--text-secondary)'>This documentation page does not exist.</p></div>",
      });
    }

    const content = marked.parse(raw);
    render(res, "docs", { title: slugToTitle(slug.split("/").pop()), page: "docs", sidebar, content, currentSlug: slug });
  });

  // ── Credits ───────────────────────────────────────────
  app.get("/credits", (req, res) => {
    render(res, "credits", { title: "Credits", page: "credits" });
  });

  // ── Embed Builder ─────────────────────────────────────
  app.get("/embeds", (req, res) => {
    render(res, "embeds", { title: "Embed Builder", page: "embeds" });
  });

  // ── Music Streaming ───────────────────────────────────
  app.get("/music", (req, res) => {
    render(res, "music", { title: "Vermeil Music", page: "music" });
  });

  app.get("/api/music/search", async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing search query" });

    if (!client.riffy) {
      return res.status(500).json({ error: "Music engine not initialized" });
    }

    try {
      const results = await client.riffy.resolve({ query, source: "ytsearch", requester: client.user });
      
      if (!results || results.loadType === "empty" || results.loadType === "error") {
        return res.json({ tracks: [] });
      }

      // Format tracks for frontend
      const tracks = results.tracks.map(t => ({
        title: t.info.title,
        author: t.info.author,
        duration: t.info.length,
        uri: t.info.uri,
        thumbnail: t.info.thumbnail,
        identifier: t.info.identifier,
        isStream: t.info.isStream
      }));

      res.json({ tracks });
    } catch (err) {
      res.status(500).json({ error: "Search failed: " + err.message });
    }
  });

  app.post("/api/webhook", async (req, res) => {
    const { url, data } = req.body;
    if (!url || !data) return res.status(400).json({ error: "Missing URL or Data" });
    if (!url.startsWith("https://discord.com/api/webhooks/")) {
      return res.status(400).json({ error: "Invalid Webhook URL" });
    }

    try {
      const response = await axios.post(url, data, {
        headers: { "Content-Type": "application/json" }
      });

      if (response.status >= 200 && response.status < 300) {
        res.json({ success: true });
      } else {
        res.status(response.status).json({ error: "Discord API Error: " + response.statusText });
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      res.status(err.response?.status || 500).json({ error: errorMsg });
    }
  });

  // ── Changelog ─────────────────────────────────────────
  app.get("/changelog", (req, res) => {
    const changelogPath = path.join(WEB, "changelog.md");
    let content = "<h1>Changelog coming soon...</h1>";
    if (fs.existsSync(changelogPath)) {
      const raw = fs.readFileSync(changelogPath, "utf-8");
      content = marked.parse(raw);
    }
    render(res, "changelog", { title: "Changelog", page: "changelog", content });
  });

  // ── Dynamic Autoloader ────────────────────────────────
  // This serves any .ejs file in the views folder that isn't handled above.
  app.get("/:page", (req, res, next) => {
    const page = req.params.page.toLowerCase();
    const viewPath = path.join(WEB, "views", `${page}.ejs`);

    // Prevent access to layout or partials via URL
    if (["layout", "body"].includes(page)) return next();

    if (fs.existsSync(viewPath)) {
      const title = page.charAt(0).toUpperCase() + page.slice(1);
      return render(res, page, { title, page });
    }
    next();
  });

  // ── 404 ───────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).render("layout", {
      config: webconfig,
      title:  "Not Found",
      page:   "",
      body:   `<div style="min-height:80vh;display:flex;align-items:center;justify-content:center;text-align:center;flex-direction:column;gap:1rem;">
        <div style="font-size:6rem;">404</div>
        <h1 style="font-size:2rem;font-weight:800;">Page not found</h1>
        <p style="color:var(--text-secondary)">The page you're looking for doesn't exist.</p>
        <a href="/" class="btn btn-primary" style="margin-top:1rem;">Go Home</a>
      </div>`,
    });
  });

  // ── Start server ──────────────────────────────────────
  const port = webconfig.port ?? 3000;
  app.listen(port, () => {
    console.log(chalk.green(`  [Website] ✅ Running at http://localhost:${port}`));
  });
};
