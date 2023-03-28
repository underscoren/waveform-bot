import { ChatInputCommandInteraction, Client, GuildMember, SlashCommandBuilder } from "discord.js";
import { IBotClient } from "../util/interfaces";
import { MusicPlayer, Song } from "./music/musicPlayer";
import ytpl, { validateID } from "ytpl";

const data = new SlashCommandBuilder()
.setName("play")
.setDescription("Play a video from youtube")
.addStringOption(opt => 
    opt
    .setName("url")
    .setDescription("The video URL. Can be a video or playlist. If both, plays video only.")
    .setRequired(true)
)

const func = async (bot: Client & IBotClient, interaction: ChatInputCommandInteraction) => {
    const url = interaction.options.getString("url");
    if(!url) {
        return interaction.reply({content: "You didn't give me a URL to play.", ephemeral: true});
    }

    const member = interaction.member;
    const guild = interaction.guild;
    if(!member || !(member instanceof GuildMember) || !guild)
        return interaction.reply({content: "You are not a member of this server.", ephemeral: true});


    if(!member.voice.channel)
        return interaction.reply({content: "You are not connected to a voice channel", ephemeral: true});

    await interaction.deferReply();

    // try loading song(s)
    let song: Song | undefined;
    let playlist: Song[] = [];
    try {
        song = new Song(url);
        await song.getInfo();
    } catch (error) {
        if(validateID(url)) {
            // this is a playlist URL, load all songs
            interaction.editReply(`Loading playlist...`);
            
            const playlistData = await ytpl(url);
            let i = 0;
            for(const video of playlistData.items) {
                i++;
                const s = new Song(video.url);
                await s.getInfo();
                playlist.push(s);
                interaction.editReply(`Loading playlist... (${i}/${playlistData.items.length})`);
            }
        } else {
            interaction.editReply(`Error: ${error.message}`);
            return;
        }
    }

    // try getting the player for this server
    let player = bot.players.get(member.voice.channel.id);
    if(!player) {
        player = new MusicPlayer();
        bot.players.set(member.voice.channel.id, player);
    }

    // if bot isn't connected to a channel, connect
    if(!player.connection)
        await player.connect(
            member.voice.channel.id,
            guild.id,
            guild.voiceAdapterCreator
        );

    // finally. play the damn thing
    try {
        if(player.isPlaying) { // already playing something
            if(song) {
                console.log("to queue song");
                player.enqueue(song);
                interaction.editReply(`Queued ${song.url}.\nCurrent queue length: ${player.queue.length}`);
            } else if(playlist.length > 0) {
                console.log("to queue playlist");
                for(const s of playlist)
                    player.enqueue(s);
                
                interaction.editReply(`Queued playlist ${url}.\nCurrent queue length: ${player.queue.length}`)
            } else {
                throw new Error("Nothing to play.");
            }
        } else { // nothing playing
            if(song) {
                console.log("to play song");
                await player.play(song);
                interaction.editReply(`Now playing ${song.url}`);
            } else if(playlist.length > 0) {
                console.log("to play playlist");
                const firstSong = playlist.shift() as Song;
                
                for(const s of playlist)
                    player.enqueue(s);
                
                await player.play(firstSong);

                interaction.editReply(`Now playing ${firstSong.url}\nQueued playlist ${url}\nCurrent queue length: ${player.queue.length}`);
            }
        }
    } catch(err) {
        interaction.editReply(`Error: ${err.message}`);
        
        if(!player.isPlaying && player.queue.length == 0)
            player.disconnect();
    }
}

export {
    data,
    func
}