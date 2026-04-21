const { createCanvas, loadImage } = require("@napi-rs/canvas");
const axios = require("axios");

/**
 * Downloads an image and applies a color tint
 * @param {string} url Image URL
 * @param {string} color Hex color to apply (e.g. #6a0dad)
 */
async function getThemedEmoji(url, color = "#6a0dad") {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    const img = await loadImage(res.data);

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    // 1. Draw the original image
    ctx.drawImage(img, 0, 0);

    // 2. Apply "Source-Atop" composition
    // This fills the existing non-transparent pixels with the chosen color
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, img.width, img.height);

    // 3. Optional: Add a slight glow or outer layer if needed
    // For now, simple tinting is best for icons.

    return canvas.toBuffer("image/png");
  } catch (err) {
    console.error(`[EmojiThemer] Failed to theme image: ${url}`, err.message);
    return null;
  }
}

module.exports = { getThemedEmoji };
