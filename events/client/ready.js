// ============================================================
//  events/client/ready.js
// ============================================================
const chalk  = require("chalk");
const { restoreTempBans }          = require("../../utils/modUtils");
const { checkWeeklyResets }        = require("../../utils/levelUtils");
const { checkAutoClose }           = require("../../utils/ticketUtils");
const { checkModmailAutoClose }    = require("../../utils/modmailUtils");
const { checkGiveaways }           = require("../../utils/giveawayUtils");
const { startReminderChecker }     = require("../../utils/reminderUtils");
const { fromConnection: TwentyFourSeven } = require("../../models/TwentyFourSeven");

const { startWeeklyReset }    = require("../../utils/eco/weeklyReset");
const { startBankInterest }   = require("../../utils/eco/bankInterest");
const { startQuestScheduler } = require("../../utils/eco/questScheduler");
const { startRobProtection }  = require("../../utils/eco/robProtection");
const { checkPremiumExpiry }  = require("../../utils/premiumUtils");
const { startAutoBackup }          = require("../../utils/antiNukeBackup");
const { seedCharacters }           = require("../../utils/collection/seedRunner");

module.exports = {
  name: "clientReady",
  once: true,

  async execute(client) {
    console.log(chalk.green.bold(`\n🤖  Logged in as ${client.user.tag}`));
    console.log(chalk.gray(`    Guilds  : ${client.guilds.cache.size}`));
    console.log(chalk.gray(`    Commands: ${client.commands.size}`));
    console.log(chalk.gray(`    Slash   : ${client.slashCmds.size}\n`));

    client.user.setActivity(`${client.config.prefix}help`, { type: 3 });

    // ── Initialize Riffy ──────────────────────────────
    if (client.riffy) {
      client.riffy.init(client.user.id);
      console.log(chalk.cyan("  [Music] Riffy initialized — connecting to Lavalink..."));
    }

    if (client.db) {
      await restoreTempBans(client);
      console.log(chalk.cyan("  [TempBan] Active bans restored."));

      await checkWeeklyResets(client);
      console.log(chalk.cyan("  [Leveling] Weekly reset checker started."));

      await seedCharacters(client);
            console.log(chalk.cyan("  [Collection] Character seed checked."));

      checkAutoClose(client);
      console.log(chalk.cyan("  [Tickets] Auto-close checker started."));

      checkModmailAutoClose(client);
      console.log(chalk.cyan("  [Modmail] Scheduled close checker started."));

      checkGiveaways(client);
      console.log(chalk.cyan("  [Giveaways] Giveaway checker started."));
        
      checkPremiumExpiry(client);
      setInterval(() => checkPremiumExpiry(client), 60 * 60 * 1000);
      console.log(chalk.cyan("  [Premium] Expiry checker started."));

      // 24/7 auto-rejoin
      setTimeout(() => restore247(client), 8000);
    
     
    startReminderChecker(client);
      console.log(chalk.cyan("  [Reminders] Reminder checker started."));
        
         startAutoBackup(client);
      console.log(chalk.cyan("  [AntiNuke] Auto-backup scheduler started."));
        
        }
    // ── Economy schedulers ────────────────────────────
   if (client.ecoDb) {
      startWeeklyReset(client);
      startBankInterest(client);
      startQuestScheduler(client);
      startRobProtection(client);
      console.log(chalk.cyan("  [Economy] All schedulers started.\n"));
    }
  },
};


// ── 24/7 auto-rejoin ──────────────────────────────────────
async function restore247(client) {
  let rejoined = 0;
  for (const [guildId, guild] of client.guilds.cache) {
    try {
      const guildDb = await client.db.getGuildDb(guildId);
      if (!guildDb || guildDb.isDown) continue;
      const TFModel = TwentyFourSeven(guildDb.connection);
      const tf      = await TFModel.findOne({ guildId });
      if (!tf?.enabled || !tf?.channelId) continue;
      const voiceChannel = guild.channels.cache.get(tf.channelId);
      if (!voiceChannel) {
        await TFModel.findOneAndUpdate({ guildId }, { $set: { enabled: false, channelId: null } });
        continue;
      }
      if (!voiceChannel.permissionsFor(guild.members.me)?.has("Connect")) continue;
      if (!client.riffy) continue;
      client.riffy.createConnection({ guildId, voiceChannel: tf.channelId, textChannel: null, deaf: true });
      rejoined++;
      console.log(chalk.cyan(`  [24/7] Rejoined: ${guild.name} → #${voiceChannel.name}`));
    } catch {}
  }
  if (rejoined > 0) console.log(chalk.cyan(`  [24/7] Restored ${rejoined} connection(s).`));
}
