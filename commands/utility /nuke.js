const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const embeds = require("../../utils/embeds");

module.exports = {
  name:             "nuke",
  description:      "Delete and recreate the current channel with the same permissions.",
  category:         "utility",
  aliases:          ["recreate"],
  usage:            "[reason]",
  cooldown:         10,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: false,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("nuke")
    .setDescription("Delete and recreate the current channel with the same permissions.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("Reason for nuking this channel.")
        .setRequired(false)
    )
    .toJSON(),

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
    const member = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;
    const reason = ctx.type === "prefix"
      ? ctx.args.join(" ").trim() || "No reason provided."
      : ctx.interaction.options.getString("reason") || "No reason provided.";

    if (!guild || !channel) {
      return sendFailure(ctx, "This command can only be used inside a server channel.");
    }

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return sendFailure(ctx, "You need the **Administrator** permission to use this command.");
    }

    const me = guild.members.me;
    if (!me?.permissionsIn(channel).has(PermissionFlagsBits.ManageChannels)) {
      return sendFailure(ctx, "I need the **Manage Channels** permission in this channel.");
    }

    if (!channel.deletable) {
      return sendFailure(ctx, "I cannot delete this channel. Check my role position and permissions.");
    }

    if (ctx.type === "slash" && !ctx.interaction.replied && !ctx.interaction.deferred) {
      await ctx.interaction.reply({
        embeds: [embeds.warning("Nuking this channel now. A fresh copy will be created with the same permissions.", "💥 Channel Nuke")],
        ephemeral: true,
      });
    }

    const position = channel.rawPosition;
    const oldName = channel.name;
    const nukeReason = `Channel nuked by ${author.tag} (${author.id}) • ${reason}`;

    let newChannel;
    try {
      newChannel = await channel.clone({ reason: nukeReason });
      await newChannel.setPosition(position).catch(() => {});
      await channel.delete(nukeReason);
    } catch (err) {
      if (newChannel?.deletable) await newChannel.delete("Cleaning up failed nuke clone.").catch(() => {});
      return sendFailure(ctx, `Failed to nuke this channel: \`${err.message}\``);
    }

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle("💥 Channel Nuked")
      .setDescription(`This channel was recreated by ${author}.`)
      .addFields(
        { name: "Old Channel", value: `#${oldName}`, inline: true },
        { name: "Reason", value: reason.slice(0, 1024), inline: false },
      )
      .setFooter({
        text:    `Nuked by ${author.tag}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    await newChannel.send({ embeds: [embed] }).catch(() => {});
  },
};

async function sendFailure(ctx, message) {
  const payload = { embeds: [embeds.error(message)] };

  if (ctx.type === "prefix") {
    return ctx.message.reply(payload);
  }

  if (ctx.interaction.deferred || ctx.interaction.replied) {
    return ctx.interaction.editReply(payload).catch(() => {});
  }

  return ctx.interaction.reply({ ...payload, ephemeral: true });
}