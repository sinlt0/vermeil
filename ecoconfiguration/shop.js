// ============================================================
//  ecoconfiguration/shop.js
//  All shop items — add/edit/remove freely
// ============================================================
module.exports = {

  categories: [
    {
      name:  "Protection",
      emoji: "🛡️",
      items: [
        {
          id:          "padlock",
          name:        "Padlock",
          emoji:       "🔒",
          description: "Protects your wallet from being robbed for 1 hour.",
          price:       10_000_000,
          currency:    "coins",
          effect:      { type: "rob_protection", duration: 3_600_000 }, // 1 hour
        },
        {
          id:          "vault_lock",
          name:        "Vault Lock",
          emoji:       "🔐",
          description: "Protects your wallet from being robbed for 24 hours.",
          price:       50_000_000,
          currency:    "coins",
          effect:      { type: "rob_protection", duration: 86_400_000 }, // 24 hours
        },
      ],
    },
    {
      name:  "Bank",
      emoji: "🏦",
      items: [
        {
          id:          "banknote",
          name:        "Banknote",
          emoji:       "💵",
          description: "Expands your bank storage limit by 20,000,000 coins.",
          price:       2_000_000,
          currency:    "coins",
          effect:      { type: "bank_expansion", amount: 20_000_000 },
        },
        {
          id:          "golden_banknote",
          name:        "Golden Banknote",
          emoji:       "💰",
          description: "Expands your bank storage limit by 25,000,000 coins.",
          price:       10_000,
          currency:    "gems",
          effect:      { type: "bank_expansion", amount: 25_000_000 },
        },
      ],
    },
    {
      name:  "Boosters",
      emoji: "🚀",
      items: [
        {
          id:          "xp_potion",
          name:        "XP Potion",
          emoji:       "🧪",
          description: "Doubles XP gained from your next activity.",
          price:       500_000,
          currency:    "coins",
          effect:      { type: "xp_boost", multiplier: 2, uses: 1 },
        },
        {
          id:          "coin_magnet",
          name:        "Coin Magnet",
          emoji:       "🧲",
          description: "Increases coin rewards by 50% for 30 minutes.",
          price:       20_000,
          currency:    "gems",
          effect:      { type: "coin_boost", multiplier: 1.5, duration: 1_800_000 },
        },
      ],
    },
    {
      name:  "Special",
      emoji: "✨",
      items: [
        {
          id:          "hunt_lure",
          name:        "Hunt Lure",
          emoji:       "🪤",
          description: "Increases rare creature chance on next hunt by 10%.",
          price:       800_000,
          currency:    "coins",
          effect:      { type: "hunt_boost", rarityBonus: 0.1, uses: 1 },
        },
        {
          id:          "steal_gloves",
          name:        "Steal Gloves",
          emoji:       "🧤",
          description: "Increases rob success rate by 20% for next rob.",
          price:       1_200_000,
          currency:    "coins",
          effect:      { type: "rob_boost", bonus: 0.2, uses: 1 },
        },
        {
          id:          "lucky_clover",
          name:        "Lucky Clover",
          emoji:       "🍀",
          description: "Boosts gambling win chance by 5% for 1 hour.",
          price:       50_000,
          currency:    "gems",
          effect:      { type: "gamble_boost", bonus: 0.05, duration: 3_600_000 },
        },
      ],
    },
  ],
};
