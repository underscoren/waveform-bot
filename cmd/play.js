const { SlashCommandBuilder } = require('@discordjs/builders');
const { joinVoiceChannel, VoiceConnectionStatus, createAudioPlayer, AudioPlayerStatus, entersState, createAudioResource, demuxProbe } = require('@discordjs/voice');
const ytdl = require("ytdl-core");
const { error, debug } = require("../util/log");

const data = new SlashCommandBuilder()
.setName("play")
.setDescription("Play a video from youtube.")
.addStringOption(option => 
  option.setName("video-url")
    .setDescription("Video URL")
    .setRequired(true)
)

function respond(interaction, msg) {
  if (!interaction.replied) {
    interaction.editReply(msg);
  } else {
    interaction.followUp(msg);
  }
}

async function probeAndCreateResource(readableStream) {
	const { stream, type } = await demuxProbe(readableStream);
	return createAudioResource(stream, { inputType: type });
}

const func = async function(bot, interaction) {
  // check URL
  const urlstring = interaction.options.getString("video-url");
  if (!ytdl.validateURL(urlstring)) {
    interaction.reply({content: "Invalid URL", ephemeral: true});
    return;
  }

  // get voice channel user is currently in
  if(!interaction.member?.voice.channel) {
    interaction.reply({content: "You are not in a voice channel", ephemeral: true});
    return;
  }

  // check if bot is already playing something
  if(bot.audioStream) {
    interaction.reply({content: "The bot is already playing something.\ni haven't added the ability to queue songs yet bc im lazy, go annoy me about it and maybe ill end up doing it"});
    return;
  }

  // sometimes the interaction takes longer than three seconds, better safe than sorry
  await interaction.deferReply();

  // connect to voice channel
  const connection = joinVoiceChannel({
    channelId: interaction.member.voice.channel.id,
    guildId: interaction.guildId,
    adapterCreator: interaction.member.voice.guild.voiceAdapterCreator
  });
  debug("Connection created");

  // create player
  const player = createAudioPlayer();
  debug("Player created");

  // player event handlers
  
  let idleTimeout;
  let alreadyPlaying = false;

  player.on(AudioPlayerStatus.Playing, () => {
    debug("Player playing");
    if(!alreadyPlaying) {
      respond(interaction, {content: `Playing ${urlstring} in ${interaction.member.voice.channel}`});
      alreadyPlaying = true; // don't re-send the message when moving channels or resuming playback 
    }
    
    if(idleTimeout) {
      clearTimeout(idleTimeout);
      idleTimeout = undefined;
    }
  });

  player.on(AudioPlayerStatus.Idle, () => {
    debug("Player idle");
    idleTimeout = setTimeout(() => {
      debug("Player idle timeout");
      connection.destroy();
      player.stop();
      bot.audioStream = undefined;
    }, 5_000);
  });

  player.on("error", err => {
    error("Player Error");
    console.error(err);
    respond(interaction, {content: "Error trying to play stream"});
  });

  // connection event handlers

  connection.on(VoiceConnectionStatus.Ready, () => {
    debug("Connected to voice channel");
    connection.subscribe(player);
    debug("Subscribed to player");
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
      // Seems to be reconnecting to a new channel - ignore disconnect
    } catch (error) {
      // Seems to be a real disconnect which SHOULDN'T be recovered from
      connection.destroy();
      player.stop();
      bot.audioStream = undefined;
      debug("Player disconnected");
    }
  });

  connection.on("error", err => {
    errror("Connection error");
    console.error(err);
    respond(interaction, {content: "Error connecting to voice channel"});
  });


  // get stream from ytdl
  const ytdlStream = ytdl(urlstring, {
    highWaterMark: 1 << 25,
    quality: "highestaudio",
    filter: fmt => fmt.audioCodec == "opus"
  });

  bot.audioStream = await probeAndCreateResource(ytdlStream);

  // play stream
  player.play(bot.audioStream);
  debug("Playing audio stream");
}

module.exports = {
  data,
  func
}