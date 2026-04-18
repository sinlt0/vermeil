// ============================================================
//  utils/eco/bankInterest.js
//  Applies bank interest every 24 hours to all users
// ============================================================
const chalk = require("chalk");

async function runBankInterest(client) {
  try {
    const bankConfig  = require("../../ecoconfiguration/bank");
    const UserProfile = client.ecoDb.getModel("Userprofile");
    if (!UserProfile) return;
    if (!bankConfig.interestRate || bankConfig.interestRate <= 0) return;

    // Only apply to users with bank balance > 0 and below the max threshold
    const users = await UserProfile.find({
      bank:        { $gt: 0, $lte: bankConfig.interestMaxBalance },
      agreedToTos: true,
    }).lean();

    let updated = 0;
    for (const user of users) {
      const interest  = Math.floor(user.bank * bankConfig.interestRate);
      if (interest <= 0) continue;
      const limit     = user.bankLimit ?? bankConfig.defaultLimit;
      const newBank   = Math.min(user.bank + interest, limit);
      const actual    = newBank - user.bank;
      if (actual <= 0) continue;

      await UserProfile.findOneAndUpdate(
        { userId: user.userId },
        { $inc: { bank: actual, "stats.coinsEarned": actual } }
      );
      updated++;
    }

    if (updated > 0) {
      console.log(chalk.gray(`  [Economy] 💰 Bank interest applied to ${updated} users.`));
    }
  } catch (err) {
    console.error(chalk.red("  [Economy] Bank interest error:"), err.message);
  }
}

function startBankInterest(client) {
  if (!client.ecoDb) return;
  // Run immediately then every 24h
  runBankInterest(client);
  setInterval(() => runBankInterest(client), 24 * 60 * 60 * 1000);
  console.log(chalk.cyan("  [Economy] Bank interest scheduler started."));
}

module.exports = { startBankInterest, runBankInterest };
