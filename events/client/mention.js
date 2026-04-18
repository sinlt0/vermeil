// ============================================================
//  events/client/mention.js
//  Fires when the bot is @mentioned
//  - Loading animation
//  - Main menu with team/links/commands dropdowns
//  - About Team shows Rex, Akimi, Lumian with roles
//  - Invite/Support sends ephemeral-style embed then deletes main
//  - Commands dropdown calls the help command handler directly
// ============================================================
const {
  EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ButtonBuilder, ButtonStyle,
} = require("discord.js");
const e = require("../../emojis/helpemoji");

// ── Team data ─────────────────────────────────────────────
const TEAM = [
  {
    name:        "Sin",
    role:        "Project Lead & Developer",
    description: "username: (sinlt)",
    emoji:       e.owner,
    userId:      null, // set to Discord user ID to fetch avatar
  },
  {
    name:        "Mist",
    role:        "Developer",
    description: "username: (f_mist)",
    emoji:       e.dev,
    userId:      null,
  },
  {
    name:        "Yz",
    role:        "Developer & Designer",
    description: "username: (.7yml) ",
    emoji:       e.designer,
    userId:      null,
  },
];

const SUPPORT_URL = "https://discord.gg/UjHnCK9A88";
const BANNER_URL  = "https://cdn.discordapp.com/attachments/1457521614009929759/1488087364239622374/a_b143a17e16f55e0c021b21f7b806b9c3.gif?ex=69cb80da&is=69ca2f5a&hm=b1c8bb5766e088e2090bc8faa28684839ca1769c97992e0de7eef394bfb281be&";

module.exports = {
  name: "messageCreate",
  once: false,

  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild)     return;

    const mentionRegex = new RegExp(`^<@!?${client.user.id}>( |)$`);
    if (!message.content.match(mentionRegex)) return;

    // ── Resolve prefix ─────────────────────────────────
    let prefix = client.config.prefix;
    try {
      if (client.db) {
        const guildDb = await client.db.getGuildDb(message.guild.id);
        if (guildDb && !guildDb.isDown) {
          const { fromConnection } = require("../../models/GuildSettings");
          const GS = fromConnection(guildDb.connection);
          const s  = await GS.findOne({ guildId: message.guild.id });
          if (s?.prefix) prefix = s.prefix;
        }
      }
    } catch {}

    // ── Loading ────────────────────────────────────────
    const loadingEmbed = new EmbedBuilder()
      .setColor(0x7d5ba6)
      .setDescription(`${e.loading} **Initializing Vermeil Mention Menu...**`);

    const msg = await message.reply({ embeds: [loadingEmbed] });
    await new Promise(r => setTimeout(r, 1100));

    // ── Main embed ─────────────────────────────────────
    const buildMain = () => new EmbedBuilder()
      .setTitle(`${e.star}  ${client.user.username} | System Protocol`)
      .setColor(0x7d5ba6)
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setImage(BANNER_URL)
      .setDescription(
        `Greetings, **${message.author.username}**. I am the **Vermeil** core system.\n\n` +
        `${e.settings} **Server Prefix:** \`${prefix}\`\n` +
        `${e.cmd} **Help Command:** \`${prefix}help\``
      )
      .addFields(
        { name: "Developer", value: "`Sin`",         inline: true },
        { name: "Status",    value: "`Operational`", inline: true },
      )
      .setFooter({ text: `Developed by Rex, Akimi & Lumian | ${client.user.username}`, iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    // ── Dropdowns ──────────────────────────────────────
    const buildMenuRow = () => new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`mention_menu_${message.id}`)
        .setPlaceholder("Select an option...")
        .addOptions([
          new StringSelectMenuOptionBuilder().setLabel("👥 About Team").setDescription("Meet the developers behind Vermeil").setValue("team").setEmoji(e.team),
          new StringSelectMenuOptionBuilder().setLabel("📜 Commands List").setDescription("Open the interactive help menu").setValue("help").setEmoji(e.commands),
          new StringSelectMenuOptionBuilder().setLabel("📨 Invite Bot").setDescription("Add Vermeil to your server").setValue("invite").setEmoji(e.invite),
          new StringSelectMenuOptionBuilder().setLabel("🔗 Support Server").setDescription("Join our support server").setValue("support").setEmoji(e.support),
        ])
    );

    await msg.edit({ embeds: [buildMain()], components: [buildMenuRow()] });

    // ── Collector ──────────────────────────────────────
    const collector = msg.createMessageComponentCollector({
      filter:  i => i.customId === `mention_menu_${message.id}`,
      time:    120_000,
    });

    collector.on("collect", async i => {
      const val = i.values[0];

      // ── TEAM ────────────────────────────────────────
      if (val === "team") {
        await i.deferUpdate();

        // Try to fetch avatars
        const teamFields = await Promise.all(TEAM.map(async member => {
          let avatarURL = null;
          if (member.userId) {
            const user = await client.users.fetch(member.userId).catch(() => null);
            if (user) avatarURL = user.displayAvatarURL({ dynamic: true, size: 128 });
          }
          return {
            name:  `${member.emoji} ${member.name} — ${member.role}`,
            value: member.description + (avatarURL ? ` [Avatar](${avatarURL})` : ""),
          };
        }));

        const teamEmbed = new EmbedBuilder()
          .setColor(0x7d5ba6)
          .setTitle(`${e.team} The Vermeil Team`)
          .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
          .setDescription("Meet the talented team behind Vermeil.\n\u200b")
          .addFields(...teamFields)
          .setFooter({ text: `${client.user.username} | Team`, iconURL: client.user.displayAvatarURL() })
          .setTimestamp();

        await msg.edit({ embeds: [teamEmbed], components: [buildMenuRow()] });
        return;
      }

      // ── HELP ────────────────────────────────────────
      if (val === "help") {
        await i.deferUpdate();

        // Delete mention message and run the help command
        await msg.delete().catch(() => {});

        // Run help command handler directly
        const helpCmd = client.commands.get("help");
        if (helpCmd) {
          await helpCmd.execute(client, {
            type:    "prefix",
            message,
            args:    [],
          });
        }
        collector.stop();
        return;
      }

      // ── INVITE ──────────────────────────────────────
      if (val === "invite") {
        await i.deferUpdate();

        const inviteUrl  = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
        const inviteEmbed = new EmbedBuilder()
          .setColor(0x7d5ba6)
          .setTitle(`${e.invite} Invite ${client.user.username}`)
          .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
          .setDescription(
            `Click the button below to add **${client.user.username}** to your server!\n\n` +
            `${e.bot} **Permissions:** Administrator (required for all features)\n` +
            `${e.server} **Servers:** Currently in \`${client.guilds.cache.size}\` servers`
          )
          .setFooter({ text: `${client.user.username} | Invite`, iconURL: client.user.displayAvatarURL() })
          .setTimestamp();

        const inviteBtn = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel("Invite Bot").setURL(inviteUrl).setStyle(ButtonStyle.Link).setEmoji(e.invite),
        );

        // Delete main menu and send invite embed
        await msg.delete().catch(() => {});
        const inviteMsg = await message.channel.send({ embeds: [inviteEmbed], components: [inviteBtn] });

        // Auto-delete after 60s
        setTimeout(() => inviteMsg.delete().catch(() => {}), 60_000);
        collector.stop();
        return;
      }

      // ── SUPPORT ─────────────────────────────────────
      if (val === "support") {
        await i.deferUpdate();

        const supportEmbed = new EmbedBuilder()
          .setColor(0x7d5ba6)
          .setTitle(`${e.support} Support Server`)
          .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
          .setDescription(
            `Join our support server for help, updates, and community!\n\n` +
            `${e.cmd} **Get help** with commands and setup\n` +
            `${e.star} **Stay updated** with new features\n` +
            `${e.team} **Meet the team** and the community`
          )
          .setFooter({ text: `${client.user.username} | Support`, iconURL: client.user.displayAvatarURL() })
          .setTimestamp();

        const supportBtn = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel("Join Support Server").setURL(SUPPORT_URL).setStyle(ButtonStyle.Link).setEmoji(e.support),
        );

        // Delete main menu and send support embed
        await msg.delete().catch(() => {});
        const supportMsg = await message.channel.send({ embeds: [supportEmbed], components: [supportBtn] });

        // Auto-delete after 60s
        setTimeout(() => supportMsg.delete().catch(() => {}), 60_000);
        collector.stop();
        return;
      }
    });

    collector.on("end", async () => {
      await msg.edit({
        components: [new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("mention_expired")
            .setPlaceholder("⏱️ Menu expired")
            .setDisabled(true)
            .addOptions(new StringSelectMenuOptionBuilder().setLabel("Expired").setValue("expired"))
        )],
      }).catch(() => {});
    });
  },
};
