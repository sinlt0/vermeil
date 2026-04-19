// ============================================================
//  commands/automod/joingate.js  (alias: !jg)
//  !joingate / !jg                — view all join gate settings
//  !jg 1 ?on/?off                 — no avatar filter
//  !jg ACTION ?set 1b             — set action for no avatar
//  !jg 2 ?on/?off                 — new account filter
//  !jg X ?set 2b                  — set min account age (days)
//  !jg ACTION ?set 2c             — set action for new account
//  !jg 3d ?on/?off                — show days in DM toggle
//  !jg 3 ?on/?off                 — suspicious accounts filter
//  !jg ACTION ?set 3b             — set action for suspicious
//  !jg 4a ?on/?off                — bot additions filter
//  !jg ACTION ?set 4b             — set action for bots
//  !jg 5a ?on/?off                — advertising username filter
//  !jg ACTION ?set 5b             — set action for ad usernames
//  !jg 6a ?on/?off                — unverified bots filter
//  !jg ACTION ?set 6b             — set action for unverified bots
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { fromConnection: JoinGateConfig } = require("../../models/JoinGateConfig");
const e = require("../../emojis/automodemoji");

const VALID_ACTIONS = ["timeout","kick","ban"];

module.exports = {
  name: "joingate", description: "Configure the join gate system.", category: "automod",
  aliases: ["jg"], usage: "[filter] [?on/?off/?set] [value]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;
    if (!canManage(message)) return;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return message.reply(`${e.error} Database unavailable.`);

    const JGModel = JoinGateConfig(guildDb.connection);
    let config    = await JGModel.findOne({ guildId: guild.id });
    if (!config)  config = await JGModel.create({ guildId: guild.id });

    const slot  = ctx.args[0]?.toLowerCase();
    const flag  = ctx.args[1]?.toLowerCase();
    const value = ctx.args[2]?.toLowerCase();

    // ── VIEW ──────────────────────────────────────────────
    if (!slot) {
      const embed = new EmbedBuilder()
        .setColor(config.enabled ? 0x57F287 : 0xED4245)
        .setTitle(`${e.gate} Join Gate Settings — ${guild.name}`)
        .addFields(
          { name: `${config.noAvatar.enabled ? e.on : e.off} [1] No Avatar`,
            value: `Action: \`${config.noAvatar.action}\``, inline: true },
          { name: `${config.newAccount.enabled ? e.on : e.off} [2] New Accounts`,
            value: `Min age: \`${config.newAccount.minAgeDays}d\` | Action: \`${config.newAccount.action}\`\nShow days in DM: ${config.newAccount.showDaysInDm ? e.on : e.off}`, inline: true },
          { name: `${config.suspicious.enabled ? e.on : e.off} [3] Suspicious`,
            value: `Action: \`${config.suspicious.action}\``, inline: true },
          { name: `${config.botAdditions.enabled ? e.on : e.off} [4a] Bot Additions`,
            value: `Action: \`${config.botAdditions.action}\``, inline: true },
          { name: `${config.adUsername.enabled ? e.on : e.off} [5a] Ad Usernames`,
            value: `Action: \`${config.adUsername.action}\``, inline: true },
          { name: `${config.unverifiedBots.enabled ? e.on : e.off} [6a] Unverified Bots`,
            value: `Action: \`${config.unverifiedBots.action}\``, inline: true },
        )
        .setFooter({ text: "!jg <slot> ?on/?off | !jg <action> ?set <slot>" })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const update = async (path, val) => {
      await JGModel.findOneAndUpdate({ guildId: guild.id }, { $set: { [path]: val } });
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
        .setDescription(`${e.success} Updated **${path.split(".").pop()}** to \`${val}\`.`)] });
    };

    // ── SLOT handlers ─────────────────────────────────────
    const toggleMap = {
      "1":  "noAvatar.enabled",
      "2":  "newAccount.enabled",
      "3":  "suspicious.enabled",
      "3d": "newAccount.showDaysInDm",
      "4a": "botAdditions.enabled",
      "5a": "adUsername.enabled",
      "6a": "unverifiedBots.enabled",
    };

    if (toggleMap[slot] && (flag === "?on" || flag === "?off")) {
      return update(toggleMap[slot], flag === "?on");
    }

    // ── Action ?set ───────────────────────────────────────
    if (flag === "?set") {
      const action = slot;
      if (!VALID_ACTIONS.includes(action)) return message.reply(`${e.error} Action must be: \`timeout\`, \`kick\`, or \`ban\`.`);

      const actionMap = {
        "1b": "noAvatar.action",
        "2b": null, // numeric — min age days
        "2c": "newAccount.action",
        "3b": "suspicious.action",
        "4b": "botAdditions.action",
        "5b": "adUsername.action",
        "6b": "unverifiedBots.action",
      };

      if (value === "2b") {
        // Min age days — value is the number from slot
        const days = parseFloat(slot);
        if (isNaN(days) || days < 1 || days > 365) return message.reply(`${e.error} Min age must be between 1 and 365 days.`);
        return update("newAccount.minAgeDays", days);
      }

      const field = actionMap[value];
      if (!field) return message.reply(`${e.error} Valid slots: 1b, 2b, 2c, 3b, 4b, 5b, 6b.`);
      return update(field, action);
    }

    return message.reply(`${e.error} Usage: \`!jg\` to view | \`!jg <slot> ?on/?off\` | \`!jg <action> ?set <slot>\``);
  },
};

function canManage(message) {
  return message.member?.permissions.has("ManageGuild") || message.guild?.ownerId === message.author.id;
}
