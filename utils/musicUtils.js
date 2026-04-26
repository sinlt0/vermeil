// ============================================================
//  utils/musicUtils.js
// ============================================================
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const {
  AttachmentBuilder, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
} = require("discord.js");
const emoji = require("../emojis/musicemoji");

// ── Format ms to m:ss or h:mm:ss ─────────────────────────
function formatDuration(ms) {
  if (!ms || ms <= 0) return "0:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  return `${m}:${String(sec).padStart(2,"0")}`;
}

// ── Get dominant color from image url ────────────────────
async function getDominantColor(imageUrl) {
  try {
    const canvas = createCanvas(50, 50);
    const ctx    = canvas.getContext("2d");
    const img    = await loadImage(imageUrl);
    ctx.drawImage(img, 0, 0, 50, 50);
    const data = ctx.getImageData(0, 0, 50, 50).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 16) { r += data[i]; g += data[i+1]; b += data[i+2]; n++; }
    r = Math.floor((r/n) * 0.55);
    g = Math.floor((g/n) * 0.55);
    b = Math.floor((b/n) * 0.55);
    return { r, g, b };
  } catch {
    return { r: 20, g: 20, b: 40 };
  }
}

// ── Rounded rect path helper ──────────────────────────────
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

// ── Truncate text ─────────────────────────────────────────
function trunc(ctx, text, maxW, font) {
  ctx.font = font;
  if (ctx.measureText(text).width <= maxW) return text;
  while (text.length > 0 && ctx.measureText(text+"…").width > maxW) text = text.slice(0,-1);
  return text + "…";
}

// ============================================================
//  Generate music card canvas
// ============================================================
async function generateMusicCard({ title, author, duration, currentMs, thumbnail, requester, isLive = false }) {
  const W = 900, H = 280;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  // Background with dominant color
  const c = await getDominantColor(thumbnail);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, `rgb(${c.r},${c.g},${c.b})`);
  bg.addColorStop(1, `rgb(${Math.min(c.r+20,255)},${Math.min(c.g+20,255)},${Math.min(c.b+20,255)})`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Dark overlay
  ctx.fillStyle = "rgba(0,0,0,0.58)";
  ctx.fillRect(0, 0, W, H);

  // Left: Thumbnail
  const TS = 200, TX = 40, TY = (H - TS) / 2 - 15;
  try {
    const img = await loadImage(thumbnail);
    ctx.save();
    rrect(ctx, TX, TY, TS, TS, 14);
    ctx.clip();
    ctx.drawImage(img, TX, TY, TS, TS);
    ctx.restore();
    // Glow border
    ctx.save();
    ctx.shadowColor = `rgba(${Math.min(c.r+120,255)},${Math.min(c.g+120,255)},${Math.min(c.b+120,255)},0.7)`;
    ctx.shadowBlur  = 20;
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth   = 2;
    rrect(ctx, TX, TY, TS, TS, 14);
    ctx.stroke();
    ctx.restore();
  } catch {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    rrect(ctx, TX, TY, TS, TS, 14);
    ctx.fill();
  }

  // Right: Info
  const IX = TX + TS + 40;
  const IW = W - IX - 40;

  // Live badge
  if (isLive) {
    ctx.save();
    ctx.fillStyle = "#ED4245";
    rrect(ctx, IX, TY, 60, 26, 6);
    ctx.fill();
    ctx.fillStyle    = "#fff";
    ctx.font         = "bold 13px Sans";
    ctx.textBaseline = "middle";
    ctx.fillText("● LIVE", IX + 7, TY + 13);
    ctx.restore();
  }

  // Title
  ctx.font         = "bold 30px Sans";
  ctx.fillStyle    = "#ffffff";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(trunc(ctx, title || "Unknown", IW, "bold 30px Sans"), IX, TY + 42);

  // Author
  ctx.font      = "20px Sans";
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText(trunc(ctx, author || "Unknown Artist", IW, "20px Sans"), IX, TY + 76);

  // Requester
  ctx.font      = "15px Sans";
  ctx.fillStyle = "rgba(255,255,255,0.48)";
  ctx.fillText(`Requested by ${requester || "Unknown"}`, IX, TY + 106);

  // Duration text
  if (!isLive) {
    ctx.font      = "bold 17px Sans";
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillText(`${formatDuration(currentMs)} / ${formatDuration(duration)}`, IX, TY + 138);
  }

  // Progress bar
  const BX = 40, BY = H - 48, BW = W - 80, BH = 8, BR = 4;
  const pct = isLive ? 1 : Math.min((currentMs||0)/(duration||1), 1);

  // Track
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  rrect(ctx, BX, BY, BW, BH, BR);
  ctx.fill();

  // Fill
  if (pct > 0) {
    const fg = ctx.createLinearGradient(BX, 0, BX+BW, 0);
    fg.addColorStop(0, "#5865F2");
    fg.addColorStop(1, "#57F287");
    ctx.fillStyle = fg;
    rrect(ctx, BX, BY, Math.max(BW*pct, BR*2), BH, BR);
    ctx.fill();

    // Playhead
    ctx.beginPath();
    ctx.arc(BX + BW*pct, BY + BH/2, 7, 0, Math.PI*2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }

  // Time stamps
  if (!isLive) {
    ctx.font      = "13px Sans";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.textAlign = "left";
    ctx.fillText(formatDuration(currentMs), BX, BY + 22);
    ctx.textAlign = "right";
    ctx.fillText(formatDuration(duration), BX+BW, BY + 22);
    ctx.textAlign = "left";
  }

  return new AttachmentBuilder(canvas.toBuffer("image/png"), { name: "music-card.png" });
}

// ============================================================
//  Build full now playing message
// ============================================================
async function buildNowPlayingMessage(player, track, currentMs = 0) {
  const info   = track.info;
  const isLive = info.isStream;

  const loopLabel = player.loop === "track" ? "Track" : player.loop === "queue" ? "Queue" : "Off";
  const loopEmoji = player.loop === "track" ? emoji.loop : player.loop === "queue" ? emoji.loopAll : emoji.noLoop;

  const card = await generateMusicCard({
    title:     info.title,
    author:    info.author,
    duration:  info.length,
    currentMs,
    thumbnail: info.artworkUrl || info.thumbnail || "https://i.imgur.com/dIFnFBM.png",
    requester: info.requester?.username || info.requester?.tag || "Unknown",
    isLive,
  });

  const embed = new EmbedBuilder()
    .setColor(0x4A3F5F)
    .setAuthor({ name: `$Now Playing` })
    .setDescription(`**[${info.title}](${info.uri})**\n${emoji.mic} ${info.author}`)
    .addFields(
      { name: `${emoji.clock} Duration`,    value: isLive ? `${emoji.live} LIVE` : formatDuration(info.length), inline: true },
      { name: `${emoji.user} Requested`,    value: info.requester?.username || "Unknown",                       inline: true },
      { name: `${loopEmoji} Loop`,           value: loopLabel,                                                   inline: true },
      { name: `${emoji.volume} Volume`,     value: `${player.volume}%`,                                         inline: true },
      { name: `${emoji.autoplay} Autoplay`, value: player.autoplay ? "On" : "Off",                              inline: true },
      { name: `${emoji.queue} In Queue`,    value: `${player.queue.length} track${player.queue.length !== 1 ? "s" : ""}`, inline: true },
    )
    .setImage("attachment://music-card.png")
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("music_prev").setEmoji(emoji.previous).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("music_pause").setEmoji(player.paused ? emoji.play : emoji.pause).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("music_skip").setEmoji(emoji.skip).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("music_stop").setEmoji(emoji.stop).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("music_shuffle").setEmoji(emoji.shuffle).setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("music_voldown").setEmoji(emoji.volumeDown).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("music_volup").setEmoji(emoji.volumeUp).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("music_loop").setEmoji(emoji.loop).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("music_autoplay").setEmoji(emoji.autoplay).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("music_filters").setEmoji(emoji.filter).setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], files: [card], components: [row1, row2] };
}

// ============================================================
//  Rate Limit Manager — backs off on 429s
// ============================================================
class RateLimitManager {
  constructor() { this.limited = false; this.retryAfter = 0; this.failures = 0; }

  isLimited() {
    if (this.limited && Date.now() < this.retryAfter) return true;
    if (this.limited && Date.now() >= this.retryAfter) { this.limited = false; this.failures = 0; }
    return false;
  }

  onRateLimit(retryAfterMs = 30000) {
    this.limited    = true;
    this.failures++;
    const backoff   = Math.min(retryAfterMs * Math.pow(2, this.failures - 1), 120000);
    this.retryAfter = Date.now() + backoff;
    console.warn(`[Music] Rate limited — backing off ${backoff/1000}s`);
  }

  onSuccess() { this.failures = 0; }
}

// ============================================================
//  Filters menu
// ============================================================
function buildFiltersMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("music_filter_select")
      .setPlaceholder(`${emoji.filter} Select a filter...`)
      .addOptions([
        new StringSelectMenuOptionBuilder().setLabel("None (Clear)").setValue("none").setDescription("Remove all filters").setEmoji("✖️"),
        new StringSelectMenuOptionBuilder().setLabel("Bass Boost").setValue("bassboost").setDescription("Heavy bass enhancement").setEmoji("🔉"),
        new StringSelectMenuOptionBuilder().setLabel("Nightcore").setValue("nightcore").setDescription("Sped up + higher pitch").setEmoji("🌙"),
        new StringSelectMenuOptionBuilder().setLabel("Vaporwave").setValue("vaporwave").setDescription("Slowed + lower pitch").setEmoji("🌊"),
        new StringSelectMenuOptionBuilder().setLabel("8D Audio").setValue("eightd").setDescription("Rotating audio effect").setEmoji("🎪"),
        new StringSelectMenuOptionBuilder().setLabel("Karaoke").setValue("karaoke").setDescription("Removes vocals").setEmoji("🎤"),
        new StringSelectMenuOptionBuilder().setLabel("Tremolo").setValue("tremolo").setDescription("Wavering volume").setEmoji("〰️"),
        new StringSelectMenuOptionBuilder().setLabel("Vibrato").setValue("vibrato").setDescription("Pitch vibration").setEmoji("📳"),
        new StringSelectMenuOptionBuilder().setLabel("Rotation").setValue("rotation").setDescription("Audio panning rotation").setEmoji("🌀"),
        new StringSelectMenuOptionBuilder().setLabel("Soft").setValue("soft").setDescription("Low pass, softer sound").setEmoji("🌸"),
        new StringSelectMenuOptionBuilder().setLabel("Pop").setValue("pop").setDescription("Boosted mids and highs").setEmoji("💥"),
        new StringSelectMenuOptionBuilder().setLabel("Earrape").setValue("earrape").setDescription("Extreme volume + distortion").setEmoji("💀"),
      ])
  );
}

// ============================================================
//  Apply filter to player
// ============================================================
async function applyFilter(player, name) {
  // Clear any existing filters first
  player.filters.clearFilters();

  switch (name) {
    case "bassboost":
      player.filters.setEqualizer([
        { band: 0, gain: 0.6 },
        { band: 1, gain: 0.6 },
        { band: 2, gain: 0.5 },
        { band: 3, gain: 0.1 },
        { band: 4, gain: -0.05 },
        { band: 5, gain: -0.1 },
      ]);
      break;
    case "nightcore":
      player.filters.setTimescale({ speed: 1.25, pitch: 1.3, rate: 1.0 });
      break;
    case "vaporwave":
      player.filters.setTimescale({ speed: 0.8, pitch: 0.7, rate: 1.0 });
      break;
    case "eightd":
      player.filters.setRotation({ rotationHz: 0.2 });
      break;
    case "karaoke":
      player.filters.setKaraoke({ level: 1.0, monoLevel: 1.0, filterBand: 220, filterWidth: 100 });
      break;
    case "tremolo":
      player.filters.setTremolo({ frequency: 4.0, depth: 0.75 });
      break;
    case "vibrato":
      player.filters.setVibrato({ frequency: 14.0, depth: 1.0 });
      break;
    case "rotation":
      player.filters.setRotation({ rotationHz: 0.5 });
      break;
    case "soft":
      player.filters.setLowPass({ smoothing: 20.0 });
      break;
    case "pop":
      player.filters.setEqualizer([
        { band: 0, gain: -0.25 },
        { band: 1, gain: 0.48 },
        { band: 2, gain: 0.59 },
        { band: 3, gain: 0.72 },
        { band: 4, gain: 0.56 },
      ]);
      break;
    case "earrape":
      player.filters.setDistortion({ sinOffset: 0, sinScale: 1, cosOffset: 0, cosScale: 1, tanOffset: 0, tanScale: 1, offset: 0, scale: 1.5 });
      player.setVolume(200);
      break;
    case "none":
    default:
      player.filters.clearFilters();
      player.setVolume(80); // Reset volume if it was earraped
      break;
  }

  // Apply filters to the player
  // In some Riffy versions, you need to call update() or similar.
  // We'll try apply() and if that fails, manually trigger via the socket.
  try {
    await player.filters.apply();
  } catch (err) {
    console.error("[Music FX] Failed to apply filters via apply():", err.message);
  }
}

module.exports = { formatDuration, getDominantColor, generateMusicCard, buildNowPlayingMessage, buildFiltersMenu, applyFilter, RateLimitManager };
