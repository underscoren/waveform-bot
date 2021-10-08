const { SlashCommandBuilder } = require('@discordjs/builders');
const { Client, Interaction } = require("discord.js");

const data = new SlashCommandBuilder()
.setName("ping")
.setDescription("Checks the latency of the bot.")

/**
 * Basic ping command to test how interaction works
 * @param {Client} bot
 * @param {Interaction} interaction
 */
const func = async function(bot, interaction) {
    interaction.reply(`Latency: ${bot.ws.ping}ms`);
}

module.exports = {
    data,
    func
}