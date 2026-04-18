// ============================================================
//  ecoconfiguration/hunt.js
//  Hunt system — rarities, creatures, rewards
// ============================================================
module.exports = {

  cooldownMs: 60_000, // 15 seconds

  // ── Rarity tiers with drop chances ───────────────────
  rarities: [
    { name: "common",    chance: 55, coinReward: { min: 50_000,    max: 200_000    } },
    { name: "uncommon",  chance: 25, coinReward: { min: 200_000,   max: 600_000    } },
    { name: "rare",      chance: 12, coinReward: { min: 600_000,   max: 1_500_000  } },
    { name: "epic",      chance: 6,  coinReward: { min: 1_500_000, max: 4_000_000  } },
    { name: "legendary", chance: 2,  coinReward: { min: 4_000_000, max: 12_000_000 } },
  ],

  // ── Creature pool ─────────────────────────────────────
  creatures: [
    // Common
    { id: "rabbit",    name: "Rabbit",    emoji: "🐰", rarity: "common"    },
    { id: "squirrel",  name: "Squirrel",  emoji: "🐿️", rarity: "common"    },
    { id: "chicken",   name: "Chicken",   emoji: "🐔", rarity: "common"    },
    { id: "frog",      name: "Frog",      emoji: "🐸", rarity: "common"    },
    { id: "mouse",     name: "Mouse",     emoji: "🐭", rarity: "common"    },
    { id: "duck",      name: "Duck",      emoji: "🦆", rarity: "common"    },
    // Uncommon
    { id: "fox",       name: "Fox",       emoji: "🦊", rarity: "uncommon"  },
    { id: "deer",      name: "Deer",      emoji: "🦌", rarity: "uncommon"  },
    { id: "owl",       name: "Owl",       emoji: "🦉", rarity: "uncommon"  },
    { id: "penguin",   name: "Penguin",   emoji: "🐧", rarity: "uncommon"  },
    { id: "crab",      name: "Crab",      emoji: "🦀", rarity: "uncommon"  },
    // Rare
    { id: "wolf",      name: "Wolf",      emoji: "🐺", rarity: "rare"      },
    { id: "bear",      name: "Bear",      emoji: "🐻", rarity: "rare"      },
    { id: "shark",     name: "Shark",     emoji: "🦈", rarity: "rare"      },
    { id: "eagle",     name: "Eagle",     emoji: "🦅", rarity: "rare"      },
    { id: "crocodile", name: "Crocodile", emoji: "🐊", rarity: "rare"      },
    // Epic
    { id: "lion",      name: "Lion",      emoji: "🦁", rarity: "epic"      },
    { id: "tiger",     name: "Tiger",     emoji: "🐯", rarity: "epic"      },
    { id: "gorilla",   name: "Gorilla",   emoji: "🦍", rarity: "epic"      },
    { id: "whale",     name: "Whale",     emoji: "🐋", rarity: "epic"      },
    // Legendary
    { id: "dragon",    name: "Dragon",    emoji: "🐉", rarity: "legendary" },
    { id: "unicorn",   name: "Unicorn",   emoji: "🦄", rarity: "legendary" },
    { id: "phoenix",   name: "Phoenix",   emoji: "🔥", rarity: "legendary" },
  ],

  // ── Sacrifice rewards (sell creature for coins) ───────
  sacrificeMultiplier: 0.5, // get 50% of max rarity coin reward

  // ── Zoo capacity ──────────────────────────────────────
  zooCapacity: 100, // max creatures a user can hold

};
