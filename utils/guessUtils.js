const axios = require("axios");

/**
 * Fetch a random popular anime character from AniList
 */
async function fetchRandomCharacter() {
  const query = `
    query ($page: Int) {
      Page(page: $page, perPage: 1) {
        characters(sort: FAVOURITES_DESC) {
          id
          name {
            full
          }
          image {
            large
          }
          description
          media(perPage: 1, sort: POPULARITY_DESC) {
            nodes {
              title {
                romaji
              }
            }
          }
        }
      }
    }
  `;

  // Pick a random page between 1 and 200 (top characters)
  const randomPage = Math.floor(Math.random() * 200) + 1;

  try {
    const res = await axios.post("https://graphql.anilist.co", {
      query,
      variables: { page: randomPage }
    });
    
    const char = res.data.data.Page.characters[0];
    return {
      name: char.name.full,
      image: char.image.large,
      anime: char.media.nodes[0]?.title.romaji || "Unknown",
      id: char.id
    };
  } catch (err) {
    console.error("[GuessWho] API Error:", err.message);
    throw err;
  }
}

module.exports = { fetchRandomCharacter };
