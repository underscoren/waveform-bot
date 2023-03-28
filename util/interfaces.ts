import { ChatInputCommandInteraction, Client, Collection, SlashCommandBuilder } from "discord.js";
import { MusicPlayer } from "../cmd/music/musicPlayer";

export interface ICommand {
    data: SlashCommandBuilder,
    func: (bot: Client, interaction: ChatInputCommandInteraction) => Promise<void>
}

export interface IBotClient {
    commands: Collection<string, ICommand>,
    players: Collection<string, MusicPlayer>
}