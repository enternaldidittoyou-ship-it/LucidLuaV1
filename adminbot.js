require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const ALLOWED_ROLE = "YOUR_ROLE_ID";

client.on("ready", () => {
  console.log("Admin bot ready");
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "genkey") {

    const hasRole = interaction.member.roles.cache.has(ALLOWED_ROLE);
    if (!hasRole) {
      return interaction.reply("❌ No permission");
    }

    const duration = interaction.options.getString("duration");

    const res = await axios.post(`${process.env.API_URL}/generate`, {
      password: process.env.ADMIN_PASS,
      duration
    });

    interaction.reply("🔑 Key: " + res.data.key);
  }
});

client.login(process.env.ADMIN_BOT_TOKEN);