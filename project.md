# Vermeil Project Overview

Vermeil is a high-performance, feature-rich Discord bot designed as an "All-In-One" (AIO) solution. It provides advanced security, a global economy, high-quality music, and a comprehensive web dashboard.

## 🚀 Tech Stack
- **Runtime:** Node.js
- **Bot Library:** [discord.js v14](https://discord.js.org/)
- **Database:** MongoDB via [Mongoose](https://mongoosejs.com/)
- **Music Engine:** [Riffy](https://github.com/Riffy-Music/riffy) (Lavalink client)
- **Web Framework:** Express.js with EJS templating
- **Image Processing:** @napi-rs/canvas, @resvg/resvg-js

## 🏗️ Architecture
- **Multi-Cluster Database:** Vermeil uses a unique multi-cluster management strategy (`handlers/database.js`). Guilds are automatically assigned to one of several MongoDB clusters to ensure scalability and prevent bottlenecks.
- **Dedicated Economy DB:** The global economy system runs on its own dedicated MongoDB connection (`handlers/ecodatabase.js`).
- **Dynamic Loading:** Commands and events are recursively loaded from their respective directories. Commands automatically inherit categories based on their folder name.
- **Unified Handlers:** A `handlerLoader.js` orchestrates the sequential initialization of databases, commands, music (Riffy), and web handlers.

## 🛠️ Core Modules
- **🛡️ Anti-Nuke:** Advanced security suite with Panic Mode, Quarantining, Whitelisting, and automatic backups.
- **💰 Economy & RPG:** Global system featuring work, crimes, hunts, battles, clans, marriage, and a marketplace.
- **🎵 Premium Music:** High-quality playback via Lavalink with filters, 24/7 mode, and autoplay.
- **🔨 Moderation:** Full suite including a case system, auto-threshold actions, and detailed logs.
- **🎉 Giveaways:** Supports role/level requirements and multiple winners.
- **🎫 Ticket System:** Dynamic categories, custom forms, and transcripts.
- **📬 Modmail:** Multi-server support with snippets and anonymous replies.
- **📈 Leveling:** Amari-style XP with voice leveling and beautiful rank cards.

## 📂 File Structure
- `/commands`: Feature implementations categorized by folder.
- `/events`: Discord and Riffy event listeners.
- `/handlers`: Core logic for system initialization and DB management.
- `/models`: Guild-specific Mongoose schemas.
- `/ecomodels`: Global economy Mongoose schemas.
- `/utils`: Shared utility functions and middlewares.
- `/dashboard` & `/webs`: Web interface components (Express/EJS).
- `/data`: Local JSON storage for dev IDs and no-prefix users.

## ⚙️ Configuration
- `config.js`: Main bot configuration (Prefix, Owners, MongoDB Clusters, Lavalink).
- `webconfig.js`: Website settings, dashboard OAuth2 credentials, and UI features.
- `.env`: Sensitive tokens and secrets.

## 🌐 Web Dashboard
- **Port:** 8080 (Dashboard), 25104 (Website)
- **Features:** Server management, configuration toggles, and bot statistics.
