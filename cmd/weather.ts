import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from "discord.js";
import { updateWeather } from "../auto/weather";
import { error } from "../util/log";

export const data = new SlashCommandBuilder()
.setName("weather")
.setDescription("Update VC weather");

export const func = async (bot: Client, interaction: ChatInputCommandInteraction) => {
    updateWeather(bot)
        .then(() => interaction.reply({content: "Success", ephemeral: true}))
        .catch(err => {
            error(err);
            interaction.reply({content: `Error: ${err}`, ephemeral: true});
        });
}