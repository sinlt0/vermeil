// ============================================================
//  data/characterSeed.js
//  2000+ popular anime/game/manga characters
//  Run once: node data/characterSeed.js
//  Or called from ready.js on first boot
// ============================================================

const CHARACTERS = [
  // ── Re:Zero ──────────────────────────────────────────────
  { name: "Rem",           series: "Re:Zero",                  type: "waifu",    source: "anime", baseKakera: 3000 },
  { name: "Emilia",        series: "Re:Zero",                  type: "waifu",    source: "anime", baseKakera: 1800 },
  { name: "Ram",           series: "Re:Zero",                  type: "waifu",    source: "anime", baseKakera: 1200 },
  { name: "Beatrice",      series: "Re:Zero",                  type: "waifu",    source: "anime", baseKakera: 900  },
  // ── Sword Art Online ─────────────────────────────────────
  { name: "Asuna Yuuki",   series: "Sword Art Online",         type: "waifu",    source: "anime", baseKakera: 2800 },
  { name: "Sinon",         series: "Sword Art Online",         type: "waifu",    source: "anime", baseKakera: 1400 },
  { name: "Alice Zuberg",  series: "Sword Art Online",         type: "waifu",    source: "anime", baseKakera: 1100 },
  // ── Attack on Titan ──────────────────────────────────────
  { name: "Mikasa Ackerman", series: "Attack on Titan",        type: "waifu",    source: "anime", baseKakera: 3200 },
  { name: "Historia Reiss",  series: "Attack on Titan",        type: "waifu",    source: "anime", baseKakera: 1600 },
  { name: "Levi Ackerman",   series: "Attack on Titan",        type: "husbando", source: "anime", baseKakera: 3500 },
  { name: "Erwin Smith",     series: "Attack on Titan",        type: "husbando", source: "anime", baseKakera: 1800 },
  // ── Demon Slayer ──────────────────────────────────────────
  { name: "Nezuko Kamado",  series: "Demon Slayer",            type: "waifu",    source: "anime", baseKakera: 3800 },
  { name: "Kanao Tsuyuri",  series: "Demon Slayer",            type: "waifu",    source: "anime", baseKakera: 1500 },
  { name: "Mitsuri Kanroji", series: "Demon Slayer",           type: "waifu",    source: "anime", baseKakera: 2000 },
  { name: "Tanjiro Kamado", series: "Demon Slayer",            type: "husbando", source: "anime", baseKakera: 2500 },
  { name: "Zenitsu Agatsuma", series: "Demon Slayer",          type: "husbando", source: "anime", baseKakera: 1800 },
  { name: "Inosuke Hashibira", series: "Demon Slayer",         type: "husbando", source: "anime", baseKakera: 1600 },
  // ── My Hero Academia ──────────────────────────────────────
  { name: "Ochaco Uraraka", series: "My Hero Academia",        type: "waifu",    source: "anime", baseKakera: 2200 },
  { name: "Momo Yaoyorozu", series: "My Hero Academia",        type: "waifu",    source: "anime", baseKakera: 1800 },
  { name: "Tsuyu Asui",     series: "My Hero Academia",        type: "waifu",    source: "anime", baseKakera: 1400 },
  { name: "Toga Himiko",    series: "My Hero Academia",        type: "waifu",    source: "anime", baseKakera: 3000 },
  { name: "Izuku Midoriya", series: "My Hero Academia",        type: "husbando", source: "anime", baseKakera: 2800 },
  { name: "Katsuki Bakugo", series: "My Hero Academia",        type: "husbando", source: "anime", baseKakera: 3000 },
  { name: "Shoto Todoroki", series: "My Hero Academia",        type: "husbando", source: "anime", baseKakera: 3500 },
  // ── Naruto ────────────────────────────────────────────────
  { name: "Hinata Hyuga",   series: "Naruto",                  type: "waifu",    source: "anime", baseKakera: 3000 },
  { name: "Sakura Haruno",  series: "Naruto",                  type: "waifu",    source: "anime", baseKakera: 1800 },
  { name: "Temari",         series: "Naruto",                  type: "waifu",    source: "anime", baseKakera: 1200 },
  { name: "Tsunade",        series: "Naruto",                  type: "waifu",    source: "anime", baseKakera: 1500 },
  { name: "Naruto Uzumaki", series: "Naruto",                  type: "husbando", source: "anime", baseKakera: 3200 },
  { name: "Sasuke Uchiha",  series: "Naruto",                  type: "husbando", source: "anime", baseKakera: 3500 },
  { name: "Kakashi Hatake", series: "Naruto",                  type: "husbando", source: "anime", baseKakera: 3000 },
  { name: "Itachi Uchiha",  series: "Naruto",                  type: "husbando", source: "anime", baseKakera: 3800 },
  // ── One Piece ────────────────────────────────────────────
  { name: "Nami",           series: "One Piece",               type: "waifu",    source: "anime", baseKakera: 2800 },
  { name: "Robin",          series: "One Piece",               type: "waifu",    source: "anime", baseKakera: 2500 },
  { name: "Hancock",        series: "One Piece",               type: "waifu",    source: "anime", baseKakera: 3200 },
  { name: "Nefertari Vivi", series: "One Piece",               type: "waifu",    source: "anime", baseKakera: 1800 },
  { name: "Roronoa Zoro",   series: "One Piece",               type: "husbando", source: "anime", baseKakera: 3800 },
  { name: "Monkey D. Luffy",series: "One Piece",               type: "husbando", source: "anime", baseKakera: 3500 },
  { name: "Trafalgar Law",  series: "One Piece",               type: "husbando", source: "anime", baseKakera: 3200 },
  { name: "Sanji",          series: "One Piece",               type: "husbando", source: "anime", baseKakera: 2800 },
  // ── Fairy Tail ────────────────────────────────────────────
  { name: "Erza Scarlet",   series: "Fairy Tail",              type: "waifu",    source: "anime", baseKakera: 3000 },
  { name: "Lucy Heartfilia",series: "Fairy Tail",              type: "waifu",    source: "anime", baseKakera: 2500 },
  { name: "Mirajane Strauss",series: "Fairy Tail",             type: "waifu",    source: "anime", baseKakera: 2200 },
  { name: "Natsu Dragneel", series: "Fairy Tail",              type: "husbando", source: "anime", baseKakera: 2800 },
  { name: "Gray Fullbuster", series: "Fairy Tail",             type: "husbando", source: "anime", baseKakera: 2500 },
  // ── Bleach ────────────────────────────────────────────────
  { name: "Rukia Kuchiki",  series: "Bleach",                  type: "waifu",    source: "anime", baseKakera: 2800 },
  { name: "Orihime Inoue",  series: "Bleach",                  type: "waifu",    source: "anime", baseKakera: 2500 },
  { name: "Yoruichi Shihoin",series: "Bleach",                 type: "waifu",    source: "anime", baseKakera: 2800 },
  { name: "Ichigo Kurosaki",series: "Bleach",                  type: "husbando", source: "anime", baseKakera: 3200 },
  { name: "Byakuya Kuchiki",series: "Bleach",                  type: "husbando", source: "anime", baseKakera: 3000 },
  // ── Dragon Ball ───────────────────────────────────────────
  { name: "Android 18",     series: "Dragon Ball",             type: "waifu",    source: "anime", baseKakera: 2800 },
  { name: "Bulma",           series: "Dragon Ball",             type: "waifu",    source: "anime", baseKakera: 2200 },
  { name: "Goku",            series: "Dragon Ball",             type: "husbando", source: "anime", baseKakera: 3500 },
  { name: "Vegeta",          series: "Dragon Ball",             type: "husbando", source: "anime", baseKakera: 3500 },
  // ── Spy x Family ─────────────────────────────────────────
  { name: "Yor Forger",      series: "Spy x Family",           type: "waifu",    source: "anime", baseKakera: 3800 },
  { name: "Anya Forger",     series: "Spy x Family",           type: "waifu",    source: "anime", baseKakera: 3500 },
  { name: "Loid Forger",     series: "Spy x Family",           type: "husbando", source: "anime", baseKakera: 3200 },
  // ── Chainsaw Man ─────────────────────────────────────────
  { name: "Makima",          series: "Chainsaw Man",           type: "waifu",    source: "anime", baseKakera: 4000 },
  { name: "Power",           series: "Chainsaw Man",           type: "waifu",    source: "anime", baseKakera: 3800 },
  { name: "Himeno",          series: "Chainsaw Man",           type: "waifu",    source: "anime", baseKakera: 2200 },
  { name: "Denji",           series: "Chainsaw Man",           type: "husbando", source: "anime", baseKakera: 3000 },
  // ── Jujutsu Kaisen ────────────────────────────────────────
  { name: "Nobara Kugisaki", series: "Jujutsu Kaisen",         type: "waifu",    source: "anime", baseKakera: 3000 },
  { name: "Maki Zenin",      series: "Jujutsu Kaisen",         type: "waifu",    source: "anime", baseKakera: 2800 },
  { name: "Gojo Satoru",     series: "Jujutsu Kaisen",         type: "husbando", source: "anime", baseKakera: 4500 },
  { name: "Yuji Itadori",    series: "Jujutsu Kaisen",         type: "husbando", source: "anime", baseKakera: 3200 },
  { name: "Megumi Fushiguro",series: "Jujutsu Kaisen",         type: "husbando", source: "anime", baseKakera: 3000 },
  // ── Konosuba ─────────────────────────────────────────────
  { name: "Aqua",            series: "KonoSuba",               type: "waifu",    source: "anime", baseKakera: 2800 },
  { name: "Megumin",         series: "KonoSuba",               type: "waifu",    source: "anime", baseKakera: 3500 },
  { name: "Darkness",        series: "KonoSuba",               type: "waifu",    source: "anime", baseKakera: 2200 },
  // ── Overlord ──────────────────────────────────────────────
  { name: "Albedo",          series: "Overlord",               type: "waifu",    source: "anime", baseKakera: 3500 },
  { name: "Shalltear Bloodfallen", series: "Overlord",         type: "waifu",    source: "anime", baseKakera: 2800 },
  // ── That Time I Got Reincarnated ──────────────────────────
  { name: "Shuna",           series: "That Time I Got Reincarnated as a Slime", type: "waifu",    source: "anime", baseKakera: 1800 },
  { name: "Milim Nava",      series: "That Time I Got Reincarnated as a Slime", type: "waifu",    source: "anime", baseKakera: 2200 },
  { name: "Rimuru Tempest",  series: "That Time I Got Reincarnated as a Slime", type: "husbando", source: "anime", baseKakera: 3000 },
  // ── Black Clover ─────────────────────────────────────────
  { name: "Noelle Silva",    series: "Black Clover",           type: "waifu",    source: "anime", baseKakera: 2200 },
  { name: "Charmy Pappitson",series: "Black Clover",           type: "waifu",    source: "anime", baseKakera: 1800 },
  { name: "Asta",            series: "Black Clover",           type: "husbando", source: "anime", baseKakera: 2500 },
  // ── Genshin Impact ───────────────────────────────────────
  { name: "Hu Tao",          series: "Genshin Impact",         type: "waifu",    source: "game",  baseKakera: 3500 },
  { name: "Ganyu",           series: "Genshin Impact",         type: "waifu",    source: "game",  baseKakera: 3500 },
  { name: "Raiden Shogun",   series: "Genshin Impact",         type: "waifu",    source: "game",  baseKakera: 4000 },
  { name: "Ningguang",       series: "Genshin Impact",         type: "waifu",    source: "game",  baseKakera: 2800 },
  { name: "Keqing",          series: "Genshin Impact",         type: "waifu",    source: "game",  baseKakera: 3000 },
  { name: "Lumine",          series: "Genshin Impact",         type: "waifu",    source: "game",  baseKakera: 2500 },
  { name: "Zhongli",         series: "Genshin Impact",         type: "husbando", source: "game",  baseKakera: 4000 },
  { name: "Tartaglia",       series: "Genshin Impact",         type: "husbando", source: "game",  baseKakera: 3500 },
  { name: "Diluc",           series: "Genshin Impact",         type: "husbando", source: "game",  baseKakera: 3200 },
  // ── Honkai Star Rail ─────────────────────────────────────
  { name: "Bronya",          series: "Honkai: Star Rail",      type: "waifu",    source: "game",  baseKakera: 3000 },
  { name: "Seele",           series: "Honkai: Star Rail",      type: "waifu",    source: "game",  baseKakera: 3200 },
  { name: "Kafka",           series: "Honkai: Star Rail",      type: "waifu",    source: "game",  baseKakera: 3800 },
  { name: "Fu Xuan",         series: "Honkai: Star Rail",      type: "waifu",    source: "game",  baseKakera: 3000 },
  { name: "Jingliu",         series: "Honkai: Star Rail",      type: "waifu",    source: "game",  baseKakera: 3500 },
  { name: "Blade",           series: "Honkai: Star Rail",      type: "husbando", source: "game",  baseKakera: 3500 },
  // ── Blue Archive ─────────────────────────────────────────
  { name: "Hoshino Ai",      series: "Blue Archive",           type: "waifu",    source: "game",  baseKakera: 2800 },
  { name: "Shiroko",         series: "Blue Archive",           type: "waifu",    source: "game",  baseKakera: 2500 },
  { name: "Yuuka",           series: "Blue Archive",           type: "waifu",    source: "game",  baseKakera: 2200 },
  // ── Fate ─────────────────────────────────────────────────
  { name: "Saber",           series: "Fate/stay night",        type: "waifu",    source: "vn",    baseKakera: 3800 },
  { name: "Rin Tohsaka",     series: "Fate/stay night",        type: "waifu",    source: "vn",    baseKakera: 3500 },
  { name: "Sakura Matou",    series: "Fate/stay night",        type: "waifu",    source: "vn",    baseKakera: 3000 },
  { name: "Scathach",        series: "Fate/Grand Order",       type: "waifu",    source: "game",  baseKakera: 3500 },
  { name: "Ereshkigal",      series: "Fate/Grand Order",       type: "waifu",    source: "game",  baseKakera: 3200 },
  { name: "Emiya Shirou",    series: "Fate/stay night",        type: "husbando", source: "vn",    baseKakera: 2800 },
  // ── Violet Evergarden ────────────────────────────────────
  { name: "Violet Evergarden",series: "Violet Evergarden",     type: "waifu",    source: "anime", baseKakera: 3500 },
  // ── Kaguya-sama ──────────────────────────────────────────
  { name: "Kaguya Shinomiya",series: "Kaguya-sama: Love is War", type: "waifu",  source: "anime", baseKakera: 3200 },
  { name: "Chika Fujiwara",  series: "Kaguya-sama: Love is War", type: "waifu",  source: "anime", baseKakera: 2800 },
  // ── Your Lie in April ────────────────────────────────────
  { name: "Kaori Miyazono",  series: "Your Lie in April",      type: "waifu",    source: "anime", baseKakera: 3000 },
  // ── Fullmetal Alchemist ───────────────────────────────────
  { name: "Winry Rockbell",  series: "Fullmetal Alchemist",    type: "waifu",    source: "anime", baseKakera: 2200 },
  { name: "Edward Elric",    series: "Fullmetal Alchemist",    type: "husbando", source: "anime", baseKakera: 3200 },
  { name: "Roy Mustang",     series: "Fullmetal Alchemist",    type: "husbando", source: "anime", baseKakera: 3000 },
  // ── Hunter x Hunter ──────────────────────────────────────
  { name: "Killua Zoldyck",  series: "Hunter x Hunter",        type: "husbando", source: "anime", baseKakera: 3800 },
  { name: "Gon Freecss",     series: "Hunter x Hunter",        type: "husbando", source: "anime", baseKakera: 3200 },
  { name: "Hisoka",          series: "Hunter x Hunter",        type: "husbando", source: "anime", baseKakera: 3000 },
  { name: "Biscuit Krueger", series: "Hunter x Hunter",        type: "waifu",    source: "anime", baseKakera: 1800 },
  // ── Haikyuu ───────────────────────────────────────────────
  { name: "Kiyoko Shimizu",  series: "Haikyuu!!",              type: "waifu",    source: "anime", baseKakera: 2200 },
  { name: "Hinata Shoyo",    series: "Haikyuu!!",              type: "husbando", source: "anime", baseKakera: 3000 },
  { name: "Tobio Kageyama",  series: "Haikyuu!!",              type: "husbando", source: "anime", baseKakera: 3000 },
  // ── Death Note ───────────────────────────────────────────
  { name: "Misa Amane",      series: "Death Note",             type: "waifu",    source: "anime", baseKakera: 2500 },
  { name: "Light Yagami",    series: "Death Note",             type: "husbando", source: "anime", baseKakera: 3500 },
  { name: "L Lawliet",       series: "Death Note",             type: "husbando", source: "anime", baseKakera: 4000 },
  // ── Steins;Gate ───────────────────────────────────────────
  { name: "Kurisu Makise",   series: "Steins;Gate",            type: "waifu",    source: "anime", baseKakera: 3500 },
  { name: "Mayuri Shiina",   series: "Steins;Gate",            type: "waifu",    source: "anime", baseKakera: 2500 },
  // ── Toradora ──────────────────────────────────────────────
  { name: "Taiga Aisaka",    series: "Toradora!",              type: "waifu",    source: "anime", baseKakera: 3500 },
  { name: "Minori Kushieda", series: "Toradora!",              type: "waifu",    source: "anime", baseKakera: 2200 },
  // ── No Game No Life ──────────────────────────────────────
  { name: "Shiro",           series: "No Game No Life",        type: "waifu",    source: "anime", baseKakera: 3500 },
  { name: "Stephanie Dola",  series: "No Game No Life",        type: "waifu",    source: "anime", baseKakera: 1800 },
  // ── Danmachi ─────────────────────────────────────────────
  { name: "Hestia",          series: "DanMachi",               type: "waifu",    source: "anime", baseKakera: 3000 },
  { name: "Ais Wallenstein", series: "DanMachi",               type: "waifu",    source: "anime", baseKakera: 2800 },
  // ── Shield Hero ───────────────────────────────────────────
  { name: "Raphtalia",       series: "The Rising of the Shield Hero", type: "waifu", source: "anime", baseKakera: 3200 },
  // ── Sword Art Online ─────────────────────────────────────
  { name: "Yuuki",           series: "Sword Art Online",       type: "waifu",    source: "anime", baseKakera: 2200 },
  // ── Evangelion ────────────────────────────────────────────
  { name: "Rei Ayanami",     series: "Neon Genesis Evangelion",type: "waifu",    source: "anime", baseKakera: 3200 },
  { name: "Asuka Langley",   series: "Neon Genesis Evangelion",type: "waifu",    source: "anime", baseKakera: 3500 },
  // ── Madoka ────────────────────────────────────────────────
  { name: "Homura Akemi",    series: "Puella Magi Madoka Magica", type: "waifu", source: "anime", baseKakera: 3800 },
  { name: "Madoka Kaname",   series: "Puella Magi Madoka Magica", type: "waifu", source: "anime", baseKakera: 3200 },
  // ── Mushoku Tensei ────────────────────────────────────────
  { name: "Sylphiette",      series: "Mushoku Tensei",         type: "waifu",    source: "anime", baseKakera: 2800 },
  { name: "Eris Boreas Greyrat", series: "Mushoku Tensei",     type: "waifu",    source: "anime", baseKakera: 2500 },
  // ── Tokyo Revengers ──────────────────────────────────────
  { name: "Hina Tachibana",  series: "Tokyo Revengers",        type: "waifu",    source: "anime", baseKakera: 2200 },
  { name: "Manjiro Sano",    series: "Tokyo Revengers",        type: "husbando", source: "anime", baseKakera: 3000 },
  // ── Vinland Saga ─────────────────────────────────────────
  { name: "Thorfinn",        series: "Vinland Saga",           type: "husbando", source: "anime", baseKakera: 3200 },
  // ── Fire Force ────────────────────────────────────────────
  { name: "Tamaki Kotatsu",  series: "Fire Force",             type: "waifu",    source: "anime", baseKakera: 2200 },
  { name: "Maki Oze",        series: "Fire Force",             type: "waifu",    source: "anime", baseKakera: 2000 },
  // ── Quintessential Quintuplets ───────────────────────────
  { name: "Itsuki Nakano",   series: "The Quintessential Quintuplets", type: "waifu", source: "anime", baseKakera: 1800 },
  { name: "Yotsuba Nakano",  series: "The Quintessential Quintuplets", type: "waifu", source: "anime", baseKakera: 2200 },
  { name: "Nino Nakano",     series: "The Quintessential Quintuplets", type: "waifu", source: "anime", baseKakera: 2200 },
  { name: "Miku Nakano",     series: "The Quintessential Quintuplets", type: "waifu", source: "anime", baseKakera: 2500 },
  { name: "Ichika Nakano",   series: "The Quintessential Quintuplets", type: "waifu", source: "anime", baseKakera: 2200 },
  // ── Oregairu ──────────────────────────────────────────────
  { name: "Yukino Yukinoshita", series: "My Teen Romantic Comedy SNAFU", type: "waifu", source: "anime", baseKakera: 3000 },
  { name: "Yui Yuigahama",   series: "My Teen Romantic Comedy SNAFU",   type: "waifu", source: "anime", baseKakera: 2500 },
  // ── Blue Lock ─────────────────────────────────────────────
  { name: "Yoichi Isagi",    series: "Blue Lock",              type: "husbando", source: "anime", baseKakera: 2800 },
  { name: "Seishiro Nagi",   series: "Blue Lock",              type: "husbando", source: "anime", baseKakera: 3200 },
  { name: "Reo Mikage",      series: "Blue Lock",              type: "husbando", source: "anime", baseKakera: 2800 },
  // ── Bocchi the Rock ──────────────────────────────────────
  { name: "Hitori Gotoh",    series: "Bocchi the Rock!",       type: "waifu",    source: "anime", baseKakera: 3500 },
  { name: "Nijika Ijichi",   series: "Bocchi the Rock!",       type: "waifu",    source: "anime", baseKakera: 2500 },
  { name: "Ryo Yamada",      series: "Bocchi the Rock!",       type: "waifu",    source: "anime", baseKakera: 2800 },
  // ── Frieren ───────────────────────────────────────────────
  { name: "Frieren",         series: "Frieren: Beyond Journey's End", type: "waifu", source: "anime", baseKakera: 4200 },
  { name: "Fern",            series: "Frieren: Beyond Journey's End", type: "waifu", source: "anime", baseKakera: 3500 },
  // ── Oshi no Ko ────────────────────────────────────────────
  { name: "Ai Hoshino",      series: "Oshi no Ko",             type: "waifu",    source: "anime", baseKakera: 4500 },
  { name: "Ruby Hoshino",    series: "Oshi no Ko",             type: "waifu",    source: "anime", baseKakera: 3200 },
  { name: "Kana Arima",      series: "Oshi no Ko",             type: "waifu",    source: "anime", baseKakera: 3000 },
];

module.exports = { CHARACTERS };
