// ============================================================
//  events/guild/ecoInteraction.js
//  Handles all economy button interactions:
//  - Heist join/cancel buttons
//  - Battle accept/decline buttons
//  - Eco start agree/decline buttons
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { joinHeist, executeHeist, getHeist, cancelHeist, buildHeistEmbed } = require("../../utils/eco/heistManager");
const { executePvpBattle, getChallenge, deleteChallenge } = require("../../utils/eco/battleManager");

module.exports = {
  name: "interactionCreate",
  once: false,

  async execute(client, interaction) {
    if (!interaction.isButton()) return;
    if (!client.ecoDb) return;

    const id = interaction.customId;

    // ── Heist join ────────────────────────────────────
    if (id.startsWith("heist_join_")) {
      const guildId = id.replace("heist_join_", "");
      const result  = joinHeist(guildId, interaction.user.id, interaction.user.tag);

      if (result.error) return interaction.reply({ content: result.error, ephemeral: true });

      await interaction.update({
        embeds:     [buildHeistEmbed(result.heist, "recruiting")],
        components: interaction.message.components,
      });
      return;
    }

    // ── Heist cancel ──────────────────────────────────
    if (id.startsWith("heist_cancel_")) {
      const guildId = id.replace("heist_cancel_", "");
      const heist   = getHeist(guildId);
      if (!heist || heist.initiatorId !== interaction.user.id) {
        return interaction.reply({ content: "Only the heist initiator can cancel.", ephemeral: true });
      }
      cancelHeist(guildId);
      await interaction.update({
        embeds:     [new EmbedBuilder().setColor(0xED4245).setDescription("❌ Heist cancelled.")],
        components: [],
      });
      return;
    }

    // ── Battle accept ─────────────────────────────────
    if (id.startsWith("battle_accept_")) {
      const challengeId = id.replace("battle_accept_", "");
      const challenge   = getChallenge(challengeId);
      if (!challenge) return interaction.reply({ content: "Challenge expired.", ephemeral: true });
      if (interaction.user.id !== challenge.targetId) return interaction.reply({ content: "This challenge isn't for you!", ephemeral: true });

      await interaction.deferUpdate();
      await executePvpBattle(client, challengeId, interaction.message);
      return;
    }

    // ── Battle decline ────────────────────────────────
    if (id.startsWith("battle_decline_")) {
      const challengeId = id.replace("battle_decline_", "");
      const challenge   = getChallenge(challengeId);
      if (!challenge) return interaction.reply({ content: "Challenge expired.", ephemeral: true });
      if (interaction.user.id !== challenge.targetId) return interaction.reply({ content: "This challenge isn't for you!", ephemeral: true });

      deleteChallenge(challengeId);

      // Refund wager
      if (challenge.wager > 0) {
        const UserProfile = client.ecoDb.getModel("Userprofile");
        await UserProfile.findOneAndUpdate({ userId: challenge.challengerId }, { $inc: { wallet: challenge.wager } });
      }

      await interaction.update({
        embeds:     [new EmbedBuilder().setColor(0x99AAB5).setDescription("❌ Battle challenge was declined.")],
        components: [],
      });
      return;
    }

    // ── Eco start agree ───────────────────────────────
    if (id.startsWith("eco_start_agree_")) {
      // Handled in start.js via awaitMessageComponent — just ignore here
      return;
    }
  },
};
