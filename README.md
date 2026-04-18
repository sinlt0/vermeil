# 💜 Vermeil — The Ultimate AIO Discord Bot

Vermeil is a high-performance, feature-rich All-In-One Discord bot designed for modern community management. Built with a modular architecture and a premium aesthetic, it features a multi-cluster database system and a powerful web dashboard.

## 🚀 Key Features

### 🛡️ Advanced Security
- **Anti-Nuke System:** Protect your server from malicious actions with Panic Mode, Quarantining, and Whitelisting.
- **Verification:** Secure your community with high-quality captcha verification.
- **Automated Punishments:** Configure warn-thresholds (e.g., 5 warns = Ban).

### 🎵 Premium Music
- **High Quality:** Lag-free audio powered by Lavalink (Riffy).
- **Audio Filters:** 12+ premium filters including Bass Boost, 8D, and Nightcore.
- **Manual Autoplay:** Intelligent related-track playback when the queue ends.
- **24/7 Mode:** Keep the bot in the voice channel even when it's empty.

### 💰 Economy & RPG
- **Deep Economy:** Global and server-based systems with Work, Crimes, and Gambling.
- **RPG Elements:** Hunt for creatures, engage in battles, and join clans.
- **Marriage:** Build connections with an integrated marriage system.

### 📈 Leveling & Engagement
- **Amari-style XP:** Competitive XP system with role rewards and multipliers.
- **Premium Cards:** High-resolution (1024x450) welcome/leave and rank cards.
- **Giveaways:** Professional giveaway suite with advanced requirements.

### 📬 Support & Modmail
- **Ticket System:** Dynamic categories, support roles, and transcript logging.
- **Modmail:** Direct user-to-staff communication threads with snippet support.

## 🌐 Web Dashboard
Vermeil includes a modern, **API-driven Web Dashboard** for real-time configuration.
- **Zero-Refresh UI:** Built with glassmorphism and instant feedback.
- **Module Management:** Toggle and configure every feature without Discord commands.
- **Statistics:** Real-time member and bot performance tracking.

---

## 🛠️ Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or higher.
- [MongoDB](https://www.mongodb.com/) (Supports multiple clusters).
- [Lavalink](https://github.com/lavalink-devs/Lavalink) server for music functionality.

### 1. Clone the Repository
```bash
git clone https://github.com/YourName/Vermeil.git
cd Vermeil
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Create a `.env` file in the root directory:
```env
TOKEN=your_bot_token
MONGODB_URI=your_main_mongodb_uri
CLIENT_ID=your_bot_id
CLIENT_SECRET=your_bot_secret
```

### 4. Start the Bot
```bash
# Production
npm start

# Development
npm run dev
```

---

## 🏗️ Technical Architecture
- **Framework:** Discord.js v14
- **Database:** Mongoose (Multi-cluster manager)
- **Music:** Riffy (Lavalink client)
- **Frontend:** Express & EJS with a custom REST API
- **Graphics:** @napi-rs/canvas for dynamic image generation

---

## 📄 License
This project is licensed under the MIT License.

---
*Developed with 💜 for the Discord community.*
