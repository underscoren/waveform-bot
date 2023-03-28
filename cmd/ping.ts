import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from "discord.js";


const data = new SlashCommandBuilder()
.setName("ping")
.setDescription("Check if the bot is alive")

const func = async (bot: Client, interaction: ChatInputCommandInteraction) => {
    interaction.reply(`Pong! Round trip time was: ${bot.ws.ping}ms`);
}

export {
    data,
    func
}