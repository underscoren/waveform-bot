const { SlashCommandBuilder } = require('@discordjs/builders');
const { log } = require("../util/log");

const data = new SlashCommandBuilder()
.setName("reload-commands")
.setDescription("Dev use only.")
.setDefaultPermission(false)
.addBooleanOption(option => 
    option.setName("code-only")
    .setDescription("No update requests")
    .setRequired(false)
)

const func = async function(bot, interaction) {
    log("Reloading commands")
    bot.loadCommands();
    if (!interaction.options.get("code-only")) {
        log("Sending updated command data to discord");
        bot.updateCommands();
        bot.updatePermissions();
        interaction.reply({content: "Sent update requests.", ephemeral: true});
    } else {
        interaction.reply({content: "Reloaded all commands.", ephemeral: true});
    }
}

// only allow me perms to this command
const perms = [
    {
        id: "96642719270600704", // change this to your own user ID
        type: "USER",
        permission: true
    }
]

module.exports = {
    data,
    func,
    perms
}