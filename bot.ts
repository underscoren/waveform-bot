import { Client, ClientOptions, Collection, Events, GatewayIntentBits } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";
import { MusicPlayer } from "./cmd/music/musicPlayer";
import { token } from "./config.json";
import { IBotClient, ICommand } from "./util/interfaces";
import { error } from "./util/log";
import { warn } from "console";

export class Bot extends Client implements IBotClient {
    commands = new Collection<string, ICommand>();
    players = new Collection<string, MusicPlayer>();

    constructor(options: ClientOptions) {
        super(options);

        const commandsPath = join(__dirname, "cmd");
        const commandFiles = readdirSync(commandsPath).filter(name => name.endsWith(".ts"));

        for(const file of commandFiles) {
            const filePath = join(commandsPath, file);
            const command = require(filePath);

            if("data" in command && "func" in command)
                this.commands.set(command.data.name, command);
            else
                warn(`command ${file} doesn't export "data" or "func"`);
        }

        // setup autos
        const autosPath = join(__dirname, "auto");
        const autosFiles = readdirSync(autosPath).filter(name => name.endsWith(".ts"));

        for(const file of autosFiles) {
            const filePath = join(autosPath, file);
            const auto = require(filePath);

            if("setup" in auto)
                auto.setup(this);
            else
                warn(`auto ${file} doesn't export "setup"`);
        }
    }
}

const bot = new Bot({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]});

bot.on(Events.InteractionCreate, async interaction => {
    if(!interaction.isChatInputCommand())
        return;
    
    const command = bot.commands.get(interaction.commandName);
    if(!command) {
        error(`No such command: ${interaction.commandName}`);
        return;
    }

    try {
        await command.func(bot, interaction);
    } catch (error) {

        const reply = {content: "Something fucked up, go ping <@96642719270600704>", ephemeral: true};
        if(interaction.replied || interaction.deferred)
            await interaction.followUp(reply);
        else
            await interaction.reply(reply);
    }

});

// login

bot.once(Events.ClientReady, () => {
    console.log(`${bot.user?.username}#${bot.user?.discriminator} [${bot.user?.id}] now active in ${bot.guilds.cache.size} servers`);
});

bot.login(token);