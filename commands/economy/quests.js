// ============================================================
//  commands/economy/quests.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const eco = require("../../emojis/ecoemoji");

module.exports = {
  name: "quests", description: "View your active quests.", category: "economy",
  aliases: ["quest", "q"], usage: "", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const Quest = client.ecoDb.getModel("Quest");
    const doc   = await Quest.findOne({ userId: message.author.id }).lean();

    if (!doc?.active?.length) return message.reply(`${eco.error} No active quests. Check back later!`);

    const now    = new Date();
    const active = doc.active.filter(q => new Date(q.expiresAt) > now);
    if (!active.length) return message.reply(`${eco.error} All your quests have expired. New ones coming soon!`);

    const lines = active.map(q => {
      const pct    = Math.min(100, Math.floor((q.progress / q.goal) * 100));
      const bar    = "█".repeat(Math.floor(pct / 10)) + "░".repeat(10 - Math.floor(pct / 10));
      const reward = [];
      if (q.reward.coins)  reward.push(`${eco.coin} ${q.reward.coins.toLocaleString()}`);
      if (q.reward.gems)   reward.push(`${eco.gem} ${q.reward.gems}`);
      if (q.reward.tokens) reward.push(`${eco.token} ${q.reward.tokens}`);
      return `${q.type === "weekly" ? eco.weekly_q : eco.daily_q} **${q.name}** (${q.type})\n\`${bar}\` ${q.progress}/${q.goal}\nReward: ${reward.join(" ")}`;
    });

    return message.reply({ embeds: [new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${eco.quest} Active Quests`)
      .setDescription(lines.join("\n\n"))
      .setTimestamp()] });
  },
};
