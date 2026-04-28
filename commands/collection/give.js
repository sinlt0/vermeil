// ============================================================
//  commands/collection/give.js
//  $give @user <character name> — gift a character
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { giftCharacter } = require("../../utils/collection/tradeUtils");

module.exports = {
  name: "give", description: "Gift a character to another user.",
  category: "collection", aliases: ["marryexchange2","gift"],
  usage: "@user <character>", cooldown: 5, slash: false,

  async execute(client, ctx) {
    const message    = ctx.message;
    const guild      = message.guild;
    const receiver   = message.mentions.users.first();
    const charName   = ctx.args.slice(1).join(" ").trim();

    if (!receiver)  return message.reply("❌ Mention a user to give to.");
    if (!charName)  return message.reply("❌ Provide a character name.");
    if (receiver.id === message.author.id) return message.reply("❌ You can't give to yourself!");
    if (receiver.bot) return message.reply("❌ You can't give to a bot!");

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const result = await giftCharacter(guildDb.connection, guild.id, message.author.id, receiver.id, charName);

    if (!result.success) {
      const reasons = {
        not_in_harem: `❌ **${charName}** not found in your harem.`,
      };
      return message.reply(reasons[result.reason] ?? `❌ ${result.reason}`);
    }

    return message.reply({ embeds: [new EmbedBuilder()
      .setColor(0xFF69B4)
      .setDescription(`💝 **${result.char.name}** gifted to **${receiver.username}**!\n*Keys have been reset.*`)] });
  },
};
