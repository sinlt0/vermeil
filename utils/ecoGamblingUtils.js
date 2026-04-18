// ============================================================
//  utils/ecoGamblingUtils.js
//  Gambling helpers — slots, coinflip, blackjack, dice
// ============================================================
const eco = require("../emojis/ecoemoji");

// ============================================================
//  SLOTS — 3x3 reels
// ============================================================
const SLOT_SYMBOLS = ["🍒","🍋","🍊","🍇","⭐","💎","7️⃣"];
const SLOT_WEIGHTS = [30, 25, 20, 15, 5, 3, 2]; // % chance each

function spinSlots() {
  const reels = [];
  for (let i = 0; i < 3; i++) {
    reels.push(weightedRandom(SLOT_SYMBOLS, SLOT_WEIGHTS));
  }
  return reels;
}

function calcSlotPayout(reels, bet) {
  const [a, b, c] = reels;
  if (a === b && b === c) {
    // Triple match
    const multipliers = { "7️⃣": 50, "💎": 25, "⭐": 10, "🍇": 7, "🍊": 5, "🍋": 3, "🍒": 2 };
    return { won: true, multiplier: multipliers[a] ?? 2, payout: bet * (multipliers[a] ?? 2), type: "JACKPOT" };
  }
  if (a === b || b === c || a === c) {
    // Pair
    return { won: true, multiplier: 1.5, payout: Math.floor(bet * 1.5), type: "MATCH" };
  }
  return { won: false, multiplier: 0, payout: 0, type: "LOSE" };
}

// ============================================================
//  COINFLIP
// ============================================================
function flipCoin(choice) {
  const result = Math.random() < 0.5 ? "heads" : "tails";
  return { result, won: result === choice.toLowerCase() };
}

// ============================================================
//  BLACKJACK — card deck
// ============================================================
const SUITS  = ["♠","♥","♦","♣"];
const VALUES = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function createDeck() {
  const deck = [];
  for (const s of SUITS) for (const v of VALUES) deck.push({ suit: s, value: v });
  return deck.sort(() => Math.random() - 0.5);
}

function cardValue(card) {
  if (["J","Q","K"].includes(card.value)) return 10;
  if (card.value === "A") return 11;
  return parseInt(card.value);
}

function handTotal(hand) {
  let total = hand.reduce((s, c) => s + cardValue(c), 0);
  let aces  = hand.filter(c => c.value === "A").length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function formatCard(card) {
  return `${card.value}${card.suit}`;
}

function formatHand(hand) {
  return hand.map(formatCard).join(" ");
}

// ============================================================
//  DICE
// ============================================================
function rollDice(sides = 6) {
  return Math.floor(Math.random() * sides) + 1;
}

// ============================================================
//  Weighted random helper
// ============================================================
function weightedRandom(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

module.exports = {
  spinSlots, calcSlotPayout,
  flipCoin,
  createDeck, cardValue, handTotal, formatCard, formatHand,
  rollDice,
  weightedRandom,
};
