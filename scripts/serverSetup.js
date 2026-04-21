/**
 * Vermeil Advanced Support Server Setup Script
 * WARNING: This script deletes ALL channels and roles.
 * Usage: node scripts/serverSetup.js <GUILD_ID>
 */
const { 
  Client, 
  GatewayIntentBits, 
  ChannelType, 
  PermissionFlagsBits, 
  EmbedBuilder 
} = require("discord.js");
require("dotenv").config();

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] 
});

const GUILD_ID = process.argv[2];

async function setup() {
  if (!GUILD_ID) {
    console.error("❌ Please provide a Guild ID.");
    process.exit(1);
  }

  console.log(`\n\x1b[35m[Setup]\x1b[0m Rebuilding Vermeil Infrastructure for ID: ${GUILD_ID}...`);

  try {
    await client.login(process.env.TOKEN);
    const guild = await client.guilds.fetch(GUILD_ID);
    if (!guild) throw new Error("Guild not found.");

    // ── 1. WIPE PHASE ─────────────────────────────────────
    console.log("🧨 Wiping existing channels...");
    const channels = await guild.channels.fetch();
    for (const channel of channels.values()) {
      await channel.delete().catch(() => null);
    }

    console.log("🧨 Wiping existing roles...");
    const roles = await guild.roles.fetch();
    for (const role of roles.values()) {
      if (role.managed || role.name === "@everyone") continue;
      await role.delete().catch(() => null);
    }

    // ── 2. ROLE CREATION ──────────────────────────────────
    console.log("🎭 Creating professional role hierarchy...");
    const roleMap = {
      manager:   await guild.roles.create({ name: "Manager", color: "#6a0dad", permissions: [PermissionFlagsBits.Administrator], hoist: true }),
      developer: await guild.roles.create({ name: "Developer", color: "#a855f7", permissions: [PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageChannels], hoist: true }),
      moderator: await guild.roles.create({ name: "Moderator", color: "#2ecc71", permissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers], hoist: true }),
      support:   await guild.roles.create({ name: "Support Team", color: "#5865F2", hoist: true }),
      vip:       await guild.roles.create({ name: "VIP", color: "#f1c40f", hoist: true }),
      partner:   await guild.roles.create({ name: "Partner", color: "#1abc9c", hoist: true }),
      verified:  await guild.roles.create({ name: "Verified", color: "#9ca3af", hoist: true }),
    };

    const staffRoles = [roleMap.manager.id, roleMap.developer.id, roleMap.moderator.id, roleMap.support.id];
    const devRoles   = [roleMap.manager.id, roleMap.developer.id];

    // ── 3. CHANNEL CREATION ───────────────────────────────
    console.log("📁 Building structured categories...");

    // --- IMPORTANT ---
    const catImp = await guild.channels.create({ name: "IMPORTANT", type: ChannelType.GuildCategory });
    const chRules = await guild.channels.create({ name: "rules", parent: catImp, permissionOverwrites: [{ id: guild.roles.everyone, deny: [PermissionFlagsBits.SendMessages] }] });
    await guild.channels.create({ name: "updates", parent: catImp, permissionOverwrites: [{ id: guild.roles.everyone, deny: [PermissionFlagsBits.SendMessages] }] });
    await guild.channels.create({ name: "status", parent: catImp, permissionOverwrites: [{ id: guild.roles.everyone, deny: [PermissionFlagsBits.SendMessages] }] });

    // --- COMMUNITY ---
    const catComm = await guild.channels.create({ name: "COMMUNITY", type: ChannelType.GuildCategory });
    await guild.channels.create({ name: "chat", parent: catComm });
    await guild.channels.create({ name: "commands", parent: catComm });
    await guild.channels.create({ name: "images", parent: catComm });
    await guild.channels.create({ name: "memes", parent: catComm });

    // --- VERMEIL (Support & Tickets) ---
    const catVerm = await guild.channels.create({ name: "VERMEIL", type: ChannelType.GuildCategory });
    try {
      await guild.channels.create({ name: "support", type: ChannelType.GuildForum, parent: catVerm });
      await guild.channels.create({ name: "suggestions", type: ChannelType.GuildForum, parent: catVerm });
    } catch {
      await guild.channels.create({ name: "support-text", type: ChannelType.GuildText, parent: catVerm });
      await guild.channels.create({ name: "suggestions-text", type: ChannelType.GuildText, parent: catVerm });
    }
    
    // Public Ticket Creation
    await guild.channels.create({ 
      name: "tickets", 
      parent: catVerm,
      topic: "Open a ticket here for support.",
      permissionOverwrites: [{ id: guild.roles.everyone, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] }]
    });

    // Private Ticket Logs
    await guild.channels.create({ 
      name: "ticket-logs", 
      parent: catVerm,
      permissionOverwrites: [{ id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] }, ...staffRoles.map(id => ({ id, allow: [PermissionFlagsBits.ViewChannel] }))]
    });
    
    // Private Transcripts
    await guild.channels.create({ 
      name: "transcripts", 
      parent: catVerm,
      permissionOverwrites: [{ id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] }, ...staffRoles.map(id => ({ id, allow: [PermissionFlagsBits.ViewChannel] }))]
    });

    // --- VOICEMASTER ---
    const catVM = await guild.channels.create({ name: "VOICEMASTER", type: ChannelType.GuildCategory });
    await guild.channels.create({ name: "join-2-create", type: ChannelType.GuildVoice, parent: catVM });
    await guild.channels.create({ name: "interface", parent: catVM, permissionOverwrites: [{ id: guild.roles.everyone, deny: [PermissionFlagsBits.SendMessages] }] });

    // --- STAFF ---
    const catStaff = await guild.channels.create({ 
      name: "STAFF", 
      type: ChannelType.GuildCategory,
      permissionOverwrites: [{ id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] }, ...staffRoles.map(id => ({ id, allow: [PermissionFlagsBits.ViewChannel] }))]
    });
    await guild.channels.create({ name: "staff-chat", parent: catStaff });
    await guild.channels.create({ name: "staff-vc", type: ChannelType.GuildVoice, parent: catStaff });
    await guild.channels.create({ name: "staff-announcements", parent: catStaff });

    // --- DEV ---
    const catDev = await guild.channels.create({ 
      name: "DEVELOPMENT", 
      type: ChannelType.GuildCategory,
      permissionOverwrites: [{ id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] }, ...devRoles.map(id => ({ id, allow: [PermissionFlagsBits.ViewChannel] }))]
    });
    await guild.channels.create({ name: "dev-chat", parent: catDev });
    await guild.channels.create({ name: "bot-logs", parent: catDev });
    await guild.channels.create({ name: "database-telemetry", parent: catDev });
    await guild.channels.create({ name: "error-stream", parent: catDev });

    // ── 4. SEND RULES ─────────────────────────────────────
    const rulesEmbed = new EmbedBuilder()
      .setColor(0x6a0dad)
      .setTitle("Vermeil Support | Rules")
      .setDescription(
        "> **No** racism\n" +
        "> **No** nsfw / gore\n" +
        "> **No** raids / doxx\n" +
        "> **No** promo / spam\n" +
        "> **No** alt acc-evasion\n" +
        "> **No** political / debates\n" +
        "> **common** sense / **respect**"
      )
      .setFooter({ text: "3 warns = Ban" });

    await chRules.send({ embeds: [rulesEmbed] });

    console.log("\n\x1b[32m✨ Professional Setup Complete! Everything is ready.\x1b[0m");
    process.exit(0);

  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }
}

setup();
