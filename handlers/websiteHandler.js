// ============================================================
//  handlers/websiteHandler.js
//  Starts the Express bot website
//  Pages: / | /commands | /docs | /credits
// ============================================================
const express    = require("express");
const path       = require("path");
const fs         = require("fs");
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

  // ── Helper: get category emoji ────────────────────────
  function getCategoryEmoji(cat) {
    const map = { utility: "🔧", moderation: "🔨", admin: "⚙️", music: "🎵", fun: "🎉", economy: "💰", leveling: "📈", info: "📋", ticket: "🎫", modmail: "📬", autorole: "👋", welcome: "🎊", owner: "👑", general: "📌" };
    return map[cat.toLowerCase()] || "📁";
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
      .map(([name, cmds]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), emoji: getCategoryEmoji(name), commands: cmds }));

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
    // Try direct path
    const directPath = path.join(DOCS_DIR, `${slug}.md`);
    if (fs.existsSync(directPath)) {
      return fs.readFileSync(directPath, "utf-8");
    }
    // Try nested path (e.g. moderation/warn)
    const nestedPath = path.join(DOCS_DIR, `${slug}.md`);
    if (fs.existsSync(nestedPath)) {
      return fs.readFileSync(nestedPath, "utf-8");
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
