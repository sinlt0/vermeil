// ============================================================
//  utils/dataUtils.js
//  Read/write helpers for data/*.json persistent files
// ============================================================
const path = require("path");
const fs   = require("fs");

const DATA_DIR = path.join(__dirname, "../data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(filename) {
  ensureDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(filePath)) { fs.writeFileSync(filePath, "[]", "utf8"); return []; }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch { return []; }
}

function writeJson(filename, data) {
  ensureDir();
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

module.exports = { readJson, writeJson };
