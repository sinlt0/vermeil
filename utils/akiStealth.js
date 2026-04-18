const axios = require("axios");
const https = require("https");

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * stealth-akinator utility
 * Tries to bypass Cloudflare by mimicking a mobile browser
 */
class AkiStealth {
  constructor(region = "en", gameType = "character") {
    this.region = region;
    this.gameType = gameType;
    this.session = null;
    this.signature = null;
    this.step = 0;
    this.progression = 0;
    this.question = "";
  }

  getHeaders() {
    return {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      "Accept": "application/json",
      "Referer": `https://${this.region}.akinator.com/`,
      "x-requested-with": "XMLHttpRequest"
    };
  }

  async start() {
    try {
      // 1. Initial request to get session
      const res = await axios.get(`https://${this.region}.akinator.com/new_session?type=${this.gameType}`, {
        headers: this.getHeaders(),
        httpsAgent,
        timeout: 10000
      });

      const data = res.data;
      if (!data.completion || data.completion !== "OK") throw new Error("Akinator Blocked (Cloudflare)");

      this.session = data.parameters.identification.session;
      this.signature = data.parameters.identification.signature;
      this.question = data.parameters.step_information.question;
      
      return data.parameters.step_information;
    } catch (err) {
      console.error("[Aki Stealth] Start Failed:", err.message);
      throw err;
    }
  }

  async sendAnswer(answerId) {
    try {
      const res = await axios.get(`https://${this.region}.akinator.com/answer?session=${this.session}&signature=${this.signature}&step=${this.step}&answer=${answerId}`, {
        headers: this.getHeaders(),
        httpsAgent,
        timeout: 5000
      });

      const data = res.data;
      this.step++;
      this.progression = parseFloat(data.parameters.progression);
      this.question = data.parameters.question;

      return data.parameters;
    } catch (err) {
      throw err;
    }
  }
}

module.exports = AkiStealth;
