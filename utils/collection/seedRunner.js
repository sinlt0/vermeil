// ============================================================
//  utils/collection/seedRunner.js
//  Seeds the character database on first run
//  Called from ready.js — checks if already seeded first
// ============================================================
const { CHARACTERS } = require("../../data/characterSeed");

async function seedCharacters(client) {
  try {
    // Use the first available guild's connection for global char DB
    // Characters are global — just need any connection
    const guildIds = [...client.guilds.cache.keys()];
    if (!guildIds.length) return;

    const guildDb = await client.db.getGuildDb(guildIds[0]);
    if (!guildDb || guildDb.isDown) return;

    const { fromConnection: Character } = require("../../models/collection/Character");
    const CharModel = Character(guildDb.connection);

    // Check if already seeded
    const count = await CharModel.countDocuments();
    if (count >= CHARACTERS.length) {
      console.log(`  [Collection] Character DB: ${count} characters already seeded.`);
      return;
    }

    console.log(`  [Collection] Seeding ${CHARACTERS.length} characters...`);

    let added = 0, skipped = 0;
    for (const char of CHARACTERS) {
      try {
        await CharModel.findOneAndUpdate(
          { name: char.name, series: char.series },
          { $setOnInsert: char },
          { upsert: true }
        );
        added++;
      } catch { skipped++; }
    }

    console.log(`  [Collection] Seeded ${added} characters (${skipped} skipped).`);
  } catch (err) {
    console.error("[Collection] Seed error:", err.message);
  }
}

module.exports = { seedCharacters };
