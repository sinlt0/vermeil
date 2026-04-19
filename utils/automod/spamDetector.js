// ============================================================
//  utils/automod/spamDetector.js
//  Message similarity + spam pattern detection
// ============================================================

// In-memory recent message tracker per user per guild
// Map<guildId_userId, [{ content, timestamp }]>
const recentMessages = new Map();
const WINDOW_MS      = 5000; // 5 second window

// ============================================================
//  Track message and check for spam patterns
//  Returns { isSpam, type, heat }
// ============================================================
function checkSpam(guildId, userId, message, config) {
  const key    = `${guildId}_${userId}`;
  const now    = Date.now();

  if (!recentMessages.has(key)) recentMessages.set(key, []);
  const history = recentMessages.get(key).filter(m => now - m.timestamp < WINDOW_MS);

  const content  = message.content ?? "";
  const results  = [];

  // ── Similar/repeated message ──────────────────────────
  if (config?.filters?.similarMessage) {
    const sameCount = history.filter(m => similarity(m.content, content) > 0.85).length;
    if (sameCount >= 2) {
      results.push({ type: "Similar Message", heat: 35 });
    }
  }

  // ── Emoji spam ────────────────────────────────────────
  if (config?.filters?.emojiSpam) {
    const emojiCount = countEmojis(content);
    if (emojiCount >= 8) {
      results.push({ type: "Emoji Spam", heat: Math.min(25 + (emojiCount - 8) * 5, 60) });
    }
  }

  // ── Message chars (wall of text) ─────────────────────
  if (config?.filters?.messageChars) {
    if (content.length > 900) {
      results.push({ type: "Message Characters (Wall of Text)", heat: Math.min(30 + Math.floor((content.length - 900) / 100) * 5, 80) });
    }
  }

  // ── New lines ─────────────────────────────────────────
  if (config?.filters?.newLines) {
    const lineCount = (content.match(/\n/g) ?? []).length;
    if (lineCount >= 8) {
      results.push({ type: "Excessive New Lines", heat: Math.min(20 + (lineCount - 8) * 3, 50) });
    }
  }

  // ── Inactive channel ──────────────────────────────────
  if (config?.filters?.inactiveChannel) {
    const recentInChannel = history.filter(m =>
      m.channelId === message.channelId &&
      now - m.timestamp < 30000
    );
    if (recentInChannel.length === 0 && history.length >= 3) {
      // First message in this channel but spamming across channels
      results.push({ type: "Inactive Channel Spam", heat: 40 });
    }
  }

  // Save this message to history
  history.push({
    content:   content.slice(0, 500),
    timestamp: now,
    channelId: message.channelId,
  });
  recentMessages.set(key, history.slice(-20)); // keep last 20

  // Auto-cleanup
  setTimeout(() => {
    const current = recentMessages.get(key);
    if (current) {
      const fresh = current.filter(m => Date.now() - m.timestamp < WINDOW_MS);
      if (fresh.length === 0) recentMessages.delete(key);
      else recentMessages.set(key, fresh);
    }
  }, WINDOW_MS + 100);

  return results;
}

// ============================================================
//  String similarity (Dice's coefficient)
// ============================================================
function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aBigrams = new Map();
  for (let i = 0; i < a.length - 1; i++) {
    const bigram = a.slice(i, i + 2);
    aBigrams.set(bigram, (aBigrams.get(bigram) ?? 0) + 1);
  }
  let intersect = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bigram = b.slice(i, i + 2);
    if (aBigrams.has(bigram) && aBigrams.get(bigram) > 0) {
      aBigrams.set(bigram, aBigrams.get(bigram) - 1);
      intersect++;
    }
  }
  return (2 * intersect) / (a.length + b.length - 2);
}

// ============================================================
//  Count emojis in a string (unicode + custom Discord)
// ============================================================
function countEmojis(str) {
  const unicodeEmoji  = str.match(/\p{Emoji}/gu) ?? [];
  const customEmoji   = str.match(/<a?:[a-zA-Z0-9_]+:\d+>/g) ?? [];
  return unicodeEmoji.length + customEmoji.length;
}

module.exports = { checkSpam, similarity, countEmojis };
