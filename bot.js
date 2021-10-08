const fs = require("fs");
const path = require("path");
const { Client, Collection, Intents } = require("discord.js");
const { token } = require("./config.json");
const { log, debug } = require("./util/log");

const bot = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES /*, Intents.FLAGS.GUILD_MESSAGES*/]});

bot.loadCommands = function() {
  const commandFiles = fs.readdirSync("./cmd").filter(file => file.endsWith(".js"));
  bot.commands = new Collection();

  for (const file of commandFiles) {
    delete require.cache[path.resolve("./cmd/", file)]; // invalidate any cached files
    const command = require(`./cmd/${file}`);

    bot.commands.set(command.data.name, command);
  }
}

// application interaction handler
bot.on("interactionCreate", async interaction => {
  if (!interaction.isCommand()) return;

  const cmd = bot.commands.get(interaction.commandName);
  if(!cmd) return;

  try {
    await cmd.func(bot, interaction);
  } catch (err) {
    console.error(err);
    interaction.reply({content: "something fucked up, go ping _n#1111", ephemeral: true});
  }
});

bot.once("ready", () => {
  log(`Bot ${bot.user.username}#${bot.user.discriminator} - ${bot.user.id} started.`);
  log(`Loaded ${bot.commands.size} commands, active in ${bot.guilds.cache.size} servers.`);
  
  // must happen after bot has connected
  if(process.argv[2] == "-update") {
    bot.updateCommands();
    bot.updatePermissions();
  }
});

bot.loadCommands();
bot.login(token);



// command updating

bot.updateCommands = function() {
  for (const guild of bot.guilds.cache.values()) {
    console.log(`Setting commands for ${guild.name}`);
    guild.commands.set([...bot.commands.values()].map(c => c.data));
  }
}

bot.updatePermissions = function() {
  for(const guild of bot.guilds.cache.values()) {
    guild.commands.fetch()
      .then(commands => {
        const fullPermissions = [];
        
        // get permissions for all commands
        for (const command of commands.values()) {
          const cmd = bot.commands.get(command.name);
          if(!cmd?.perms) continue;
          
          fullPermissions.push({
            id: command.id,
            permissions: cmd.perms,
          });
        }
        
        // send permission data to discord
        debug(`Setting ${fullPermissions.length} command permissions for ${guild.name}`);
        guild.commands.permissions.set({ fullPermissions });

      })
    .catch(console.error);
  }
}