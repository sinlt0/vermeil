// ============================================================
//  commands/leveling/xpbarcolor.js
//  Lets users set their own XP bar colour on their rank card
// ============================================================
const { SlashCommandBuilder } = require("discord.js");
const { reply }               = require("../../utils/commandRunner");
const embeds                  = require("../../utils/embeds");
const { fromConnection: UserLevel }     = require("../../models/UserLevel");
const { fromConnection: LevelSettings } = require("../../models/LevelSettings");

module.exports = {
  name:             "xpbarcolor",
  description:      "Set your XP bar colour on your rank card.",
  category:         "leveling",
  aliases:          ["xpcolor", "barcolor"],
  usage:            "<#hexcolor|reset>",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("xpbarcolor")
    .setDescription("Set your XP bar colour on your rank card.")
    .addStringOption(o => o.setName("color").setDescription('Hex color e.g. #FF5733 or "reset" to use default.').setRequired(true))
    .toJSON(),

  async execute(client, ctx) {
    const guild  = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    const LevelSettingsModel = LevelSettings(guildDb.connection);
    const settings = await LevelSettingsModel.findOne({ guildId: guild.id });
    if (!settings?.enabled) return reply(ctx, { embeds: [embeds.error("Leveling is not enabled in this server.")] });

    const input = ctx.type === "prefix"
      ? ctx.args[0]
      : ctx.interaction.options.getString("color");

    if (!input) return reply(ctx, { embeds: [embeds.error('Please provide a hex color or "reset".')] });

    const UserLevelModel = UserLevel(guildDb.connection);

    if (input.toLowerCase() === "reset") {
      await UserLevelModel.findOneAndUpdate(
        { guildId: guild.id, userId: author.id },
        { $set: { xpBarColor: null } },
        { upsert: true }
      );
      return reply(ctx, { embeds: [embeds.success("Your XP bar color has been reset to default.", "🎨 Color Reset")] });
    }

    // Validate hex
    const hex = input.startsWith("#") ? input : `#${input}`;
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      return reply(ctx, { embeds: [embeds.error("Invalid hex color. Example: `#FF5733` or `FF5733`.")] });
    }

    await UserLevelModel.findOneAndUpdate(
      { guildId: guild.id, userId: author.id },
      { $set: { xpBarColor: hex }, $setOnInsert: { guildId: guild.id, userId: author.id } },
      { upsert: true }
    );

    const colorInt = parseInt(hex.replace("#", ""), 16);
    return reply(ctx, {
      embeds: [
        embeds.success(`Your XP bar color is now set to **${hex}**.\nUse \`rank\` to see your updated card!`, "🎨 Color Set")
          .setColor(0x4A3F5F),
      ],
    });
  },
};
