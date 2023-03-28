import { ChatInputCommandInteraction, Client, GuildMember, SlashCommandBuilder } from "discord.js";
import { IBotClient } from "../util/interfaces";
import { MusicPlayer, Song } from "./music/musicPlayer";

const data = new SlashCommandBuilder()
.setName("stop")
.setDescription("Stop anything that's playing right now. The bot will shortly disconnect.");

const func = async (bot: Client & IBotClient, interaction: ChatInputCommandInteraction) => {
    const member = interaction.member;
    const guild = interaction.guild;
    if(!member || !(member instanceof GuildMember) || !guild)
        return interaction.reply({content: "You are not a member of this server.", ephemeral: true});

    const botMember = (await interaction.guild.members.fetchMe());
    if(!botMember.voice.channel)
        return interaction.reply({content: "I am not in any voice channels", ephemeral: true});

    // try getting the player for this server
    let player = bot.players.get(botMember.voice.channel.id);
    if(!player?.connection)
        return interaction.reply({content: "Player does not have a valid connection", ephemeral: true}); // shouldn't ever happen

    // try to stop any currently playing song
    try {
        if(player.stop()) {
            interaction.reply("Stopped playback.");
        } else {
            interaction.reply("Stopping playback.")
        }
    } catch(err) {
        interaction.reply(`Error: ${err.message}`);
    }
}

export {
    data,
    func
}