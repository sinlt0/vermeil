// ============================================================
//  handlers/dashboardHandler.js
//  Starts the bot dashboard on a separate port
//  Uses Discord OAuth2, session auth, rate limiting
// ============================================================
const express      = require("express");
const session      = require("express-session");
const rateLimit    = require("express-rate-limit");
const path         = require("path");
const chalk        = require("chalk");
const webconfig    = require("../webconfig");

module.exports = async (client) => {
  const dash = webconfig.dashboard;
  if (!dash?.enabled) {
    console.log(chalk.gray("  [Dashboard] Disabled in webconfig.js"));
    return;
  }

  const app = express();
  const DASH_DIR = path.join(__dirname, "../dashboard");

  // ── View engine ──────────────────────────────────────
  app.set("view engine", "ejs");
  app.set("views", path.join(DASH_DIR, "views"));
  app.use(express.static(path.join(DASH_DIR, "public")));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Sessions ─────────────────────────────────────────
  app.use(session({
    secret:            dash.secret,
    resave:            false,
    saveUninitialized: false,
    cookie: {
      secure:   false, // set true if using HTTPS
      maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
    },
  }));

  // ── Rate limiter ──────────────────────────────────────
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max:      100,
    message:  { error: "Too many requests. Please try again later." },
    skip: (req) => req.path.startsWith("/css") || req.path.startsWith("/js"),
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max:      20,
    message:  { error: "Too many auth attempts." },
  });

  app.use(limiter);
  app.use("/auth", authLimiter);

  // ── Attach client to app ──────────────────────────────
  app.set("client", client);

  // ── Helper: render with layout ────────────────────────
  app.use((req, res, next) => {
    res.renderPage = (view, data = {}) => {
      res.render(`pages/${view}`, { 
        ...data, 
        config: webconfig, 
        user: req.session.user, 
        guild: req.guild || data.guild || null,
        title: data.title || view
      }, (err, body) => {
        if (err) {
          console.error(chalk.red("[Dashboard] Render Error:"), err.message);
          return res.status(500).send("Render Error: " + err.message);
        }
        res.render("partials/dash-layout", { 
          ...data, 
          config: webconfig, 
          user: req.session.user, 
          guild: req.guild || data.guild || null,
          title: data.title || view,
          body 
        });
      });
    };
    next();
  });

  // ── Routes ────────────────────────────────────────────
  app.use("/auth",      require("../dashboard/routes/auth"));
  app.use("/api",       require("../dashboard/routes/api"));
  app.use("/admin",     require("../dashboard/routes/admin"));
  app.use("/",          require("../dashboard/routes/dashboard"));

  // ── Redirect root to servers ──────────────────────────
  app.get("/", (req, res) => {
    if (req.session?.user) return res.redirect("/servers");
    res.redirect("/auth/login");
  });

  // ── 404 ───────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).render("pages/error", {
      title:  "404 Not Found",
      error:  "The page you're looking for doesn't exist.",
      config: webconfig,
      flash:  null,
      user:   req.session?.user ?? null,
      guild:  null,
    });
  });

  // ── Error handler ─────────────────────────────────────
  app.use((err, req, res, next) => {
    console.error(chalk.red("[Dashboard] Error:"), err.message);
    res.status(500).render("pages/error", {
      title:  "500 Server Error",
      error:  "An internal error occurred.",
      config: webconfig,
      flash:  null,
      user:   req.session?.user ?? null,
      guild:  null,
    });
  });

  // ── Start ─────────────────────────────────────────────
  app.listen(dash.port, () => {
    console.log(chalk.green(`  [Dashboard] ✅ Running at http://localhost:${dash.port}`));
  });
};
