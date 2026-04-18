// ============================================================
//  utils/eco/robProtection.js
//  Expires rob protection items every 5 minutes
// ============================================================
const chalk = require("chalk");

async function runRobProtectionCheck(client) {
  try {
    const UserProfile = client.ecoDb.getModel("Userprofile");
    if (!UserProfile) return;

    const result = await UserProfile.updateMany(
      { robProtection: true, robProtectionExp: { $lt: new Date(), $ne: null } },
      { $set: { robProtection: false, robProtectionExp: null } }
    );

    if (result.modifiedCount > 0) {
      console.log(chalk.gray(`  [Economy] 🔒 Expired ${result.modifiedCount} rob protection(s).`));
    }
  } catch (err) {
    console.error(chalk.red("  [Economy] Rob protection check error:"), err.message);
  }
}

function startRobProtection(client) {
  if (!client.ecoDb) return;
  runRobProtectionCheck(client);
  setInterval(() => runRobProtectionCheck(client), 5 * 60 * 1000);
  console.log(chalk.cyan("  [Economy] Rob protection checker started."));
}

module.exports = { startRobProtection, runRobProtectionCheck };
