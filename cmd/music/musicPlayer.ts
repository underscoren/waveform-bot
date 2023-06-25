import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, demuxProbe, DiscordGatewayAdapterCreator, entersState, joinVoiceChannel, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import EventEmitter from "events";
import ytdl, { getInfo, validateURL, videoInfo } from "ytdl-core";
import { debug } from "../../util/log";

export class Song {
    title: string;
    info: videoInfo;

    constructor(
        public url: string
    ) {
        if(!validateURL(this.url))
            throw new Error("Invalid video URL.");
    }

    /** Fetches the video metadata from youtube */
    async getInfo() {
        this.info = await getInfo(this.url);
        this.title = this.info.videoDetails.title;
        return this.info;
    }

    /** Gets the audio stream from youtube */
    async createAudioStream() {
        if(!this.info)
            throw new Error("Song does not have info fetched!");

        const ytdlStream = ytdl(this.url, {
            highWaterMark: 1 << 25,
            quality: "highestaudio",
            filter: fmt => fmt.audioCodec == "opus"
        });

        const { stream, type } = await demuxProbe(ytdlStream);
	    return createAudioResource(stream, { inputType: type });
    }
}

// general timeouts for various situations

/** How long to stay in channel after audio stream stops */
const TIMEOUT_MS = 15_000;
/** How long to stay in channel after audio stream stops and something is paused */
const TIMEOUT_PAUSED_MS = 60_000 * 10; // 10 minutes
const TIMEOUT_EMPTY_MS = 5_000;

/** How long to wait before throwing a timeout error when connecting */
const CONNECTION_TIMEOUT_MS = 5_000;

export class MusicPlayer extends EventEmitter {
    /** Is the player supposed to continue playing */
    isPlaying = false;

    player: AudioPlayer;
    connection: VoiceConnection | undefined;

    currentSong: Song | undefined;
    queue: Song[] = [];

    /** The id of a setTimeout call (if there is a current timeout operation) */
    idleTimeoutID: NodeJS.Timeout | undefined;
    
    constructor() {
        super();

        this.player = createAudioPlayer();

        // if we are playing something, clear the timeout
        this.player.on(AudioPlayerStatus.Playing, () => {
            if(!this.connection)
                return;

            debug("AudioPlayer playing");
            this.isPlaying = true;

            if(this.idleTimeoutID) {
                clearTimeout(this.idleTimeoutID);
                this.idleTimeoutID = undefined;
            }
        });

        // if we enter the idle state, that means a stream finished or was stopped
        this.player.on(AudioPlayerStatus.Idle, () => {
            if(!this.connection)
                return;

            debug("AudioPlayer idle");
            
            if(this.isPlaying) { // expected to continue playing
                if(this.queue.length > 0) { // songs left in queue, continue playing
                    const nextSong = this.queue.shift();
                    if(!nextSong) {
                        console.error("Next song in queue does not exist?");
                        return;
                    }

                    debug("playing next queued song");
                    
                    this.play(nextSong);
                } else {
                    // no songs left in queue, stop playing
                    this.isPlaying = false;
                    this.currentSong = undefined;

                    debug("stopping player");

                    // disconnect after timeout
                    this.setNewTimeout(() => {
                        this.disconnect();
                    }, TIMEOUT_MS);
                }
            } else {
                // we have stopped, disconnect after timeout
                this.currentSong = undefined;

                debug("player was stopped");

                this.setNewTimeout(() => {
                    this.disconnect();
                }, TIMEOUT_MS);
            }
        });

        // if we are paused, disconnect after timeout
        this.player.on(AudioPlayerStatus.Paused, () => {
            this.setNewTimeout(() => {
                this.disconnect();
            }, TIMEOUT_PAUSED_MS);
        });
    }

    /** Connect to a voice channel */
    async connect(channelId: string, guildId: string, adapterCreator: DiscordGatewayAdapterCreator) {
        debug("joining voice channel");
        this.connection = joinVoiceChannel({
            channelId,
            guildId,
            adapterCreator
        });

        // handle connection loss
        this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
            if(!this.connection)
                return;
            
            try {
                // see if we re-connect (e.g. moving channel)
                await Promise.race([
                    entersState(this.connection, VoiceConnectionStatus.Signalling, CONNECTION_TIMEOUT_MS),
                    entersState(this.connection, VoiceConnectionStatus.Connecting, CONNECTION_TIMEOUT_MS),
                ]);
            } catch (err) {
                this.disconnect();
            }
        });

        this.connection.subscribe(this.player);
        
        await entersState(this.connection, VoiceConnectionStatus.Ready, CONNECTION_TIMEOUT_MS);
    }

    /** Cleanup the player state and close the connection */
    async disconnect() {
        debug("disconnecting");

        this.isPlaying = false;
        this.queue = [];
        this.currentSong = undefined;

        this.connection?.destroy();
        this.player.stop();

        if(this.idleTimeoutID) {
            clearTimeout(this.idleTimeoutID)
            this.idleTimeoutID = undefined;
        }
        
        this.connection = undefined;
    }


    /** Play a song. Must be connected to a voice channel first. */
    async play(song: Song) {
        if(!this.connection)
            throw new Error("Not connected to a voice channel.");
        
        if(this.isPlaying) // stop anything that was already playing
            this.player.stop();
        
        this.player.play(await song.createAudioStream());
        this.currentSong = song;

        debug("playing song");

        await new Promise((resolve, reject) => {
            this.player.once(AudioPlayerStatus.Playing, resolve);
            setTimeout(() => reject("Player start timeout."), CONNECTION_TIMEOUT_MS);
        });
    }

    /** Stops currently playing song and pauses the queue */
    stop() {
        if(!this.connection)
            throw new Error("Not connected to a voice channel.");
        
        if(this.isPlaying) {
            debug("stopping");
            this.isPlaying = false;
            return this.player.stop();
        }

        throw new Error("Not playing anything.");
    }

    /** Queues a song to be played */
    enqueue(song: Song) {
        debug("queueing song");
        this.queue.push(song);
    }

    /** Skips the currently playing or next queued song */
    skip() {
        if(!this.connection)
            throw new Error("Not connected to a voice channel.");
        
        if(this.isPlaying) {
            // stop playing whatever you were playing
            this.player.stop();
        } else {
            if(this.queue.length > 0)
                this.queue.shift(); // remove the next queued song
            else
                throw new Error("Nothing to skip.");
        }
    }

    /** Pause playback of current song */
    pause() {
        if(!this.connection)
            throw new Error("Not connected to a voice channel.");

        if(!this.currentSong)
            throw new Error("Not playing anything.")
        
        if(this.isPlaying) {
            this.isPlaying = false;
            return this.player.pause();
        }

        throw new Error("Already paused.");
    }

    /** Resumes playback of currently paused song, or next song in queue */
    async resume() {
        if(!this.connection)
            throw new Error("Not connected to a voice channel.");
        
        if(!this.isPlaying && this.currentSong) {
            this.isPlaying = true;
            return this.player.unpause();
        }

        if(!this.currentSong && this.queue.length > 0) {
            const nextSong = this.queue.shift();
            if(!nextSong) {
                console.error("Next song does not exist?")
                return;
            }

            return await this.play(nextSong);
        }

        throw new Error("Not playing anything.")
    }

    /** Sets a new idle timeout */
    setNewTimeout(callback: () => void, ms: number | undefined) {
        if(this.idleTimeoutID)
            clearTimeout(this.idleTimeoutID);

        return this.idleTimeoutID = setTimeout(callback, ms);
    }
}