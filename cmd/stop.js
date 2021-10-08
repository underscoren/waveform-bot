const { SlashCommandBuilder } = require('@discordjs/builders');
const { getVoiceConnection } = require('@discordjs/voice');
const { debug } = require('../util/log');

const data = new SlashCommandBuilder()
.setName("stop")
.setDescription("Stops playing audio and disconnects.")

const func = async function(bot, interaction) {
    const voiceChannel = interaction.guild.me.voice.channel;
    if (!voiceChannel) {
        interaction.reply({content: "I am not in any voice channels", ephemeral: true});
        return;
    }

    const connection = getVoiceConnection(interaction.guildId);
    if(!connection) {
        interaction.reply({content: "I am not connected to any voice channels", ephemeral: true});
        return;
    }

    connection.destroy(); // disconnect bot from channel
    bot.audioStream.audioPlayer.stop(); // stop audioPlayer
    bot.audioStream.playStream.destroy(); // stop ytdl stream
    bot.audioStream = undefined; // hopefully the audio resource gets garbage collected? (it seems like it does)

    interaction.reply({content: "Stopped playing"});
    debug("Stopped player and cleaned up streams");
}

module.exports = {
    data,
    func
}