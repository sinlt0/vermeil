// ============================================================
//  utils/collection/imageCache.js
//  LRU in-memory image URL cache
//  AniList API primary → Kitsu fallback → manual → placeholder
//  Zero DB storage for images
// ============================================================

const CACHE_MAX  = 500;
const CACHE_TTL  = 24 * 60 * 60 * 1000; // 24 hours

// LRU cache: Map preserves insertion order
const cache = new Map();

function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { cache.delete(key); return null; }
  // Move to end (most recently used)
  cache.delete(key);
  cache.set(key, entry);
  return entry.url;
}

function set(key, url) {
  // Evict oldest if at capacity
  if (cache.size >= CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { url, expires: Date.now() + CACHE_TTL });
}

// ============================================================
//  Fetch image URL from AniList
// ============================================================
async function fetchAniListImage(characterName, seriesName) {
  try {
    const query = `
      query ($search: String) {
        Character(search: $search) {
          name { full }
          image { large }
        }
      }
    `;
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ query, variables: { search: characterName } }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.Character?.image?.large ?? null;
  } catch {
    return null;
  }
}

// ============================================================
//  Fetch image URL from Kitsu (fallback)
// ============================================================
async function fetchKitsuImage(characterName) {
  try {
    const url = `https://kitsu.io/api/edge/characters?filter[name]=${encodeURIComponent(characterName)}&page[limit]=1`;
    const res  = await fetch(url, { headers: { "Accept": "application/vnd.api+json" } });
    if (!res.ok) return null;
    const data = await res.json();
    const img  = data?.data?.[0]?.attributes?.image?.original;
    return img ?? null;
  } catch {
    return null;
  }
}

// ============================================================
//  Main: get image URL for a character
//  Checks cache → DB override → AniList → Kitsu → placeholder
// ============================================================
async function getCharacterImage(character) {
  const cacheKey = `char_${character._id}`;

  // 1. Check cache
  const cached = get(cacheKey);
  if (cached) return cached;

  // 2. Manual override stored in DB
  if (character.imageUrl) {
    set(cacheKey, character.imageUrl);
    return character.imageUrl;
  }

  // 3. AniList API
  const anilistUrl = await fetchAniListImage(character.name, character.series);
  if (anilistUrl) {
    set(cacheKey, anilistUrl);
    return anilistUrl;
  }

  // 4. Kitsu fallback
  const kitsuUrl = await fetchKitsuImage(character.name);
  if (kitsuUrl) {
    set(cacheKey, kitsuUrl);
    return kitsuUrl;
  }

  // 5. Placeholder
  const placeholder = "https://cdn.discordapp.com/embed/avatars/0.png";
  set(cacheKey, placeholder);
  return placeholder;
}

function clearCache() { cache.clear(); }
function getCacheSize() { return cache.size; }

module.exports = { getCharacterImage, clearCache, getCacheSize };
