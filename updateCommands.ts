import { REST, RESTPostAPIChatInputApplicationCommandsJSONBody, Routes } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";
import { exit } from "process";
import { token, clientid } from "./config.json";
import { ICommand } from "./util/interfaces";

if(!process.argv[2]) {
    console.log("update usage:\n   update <guild id>");
    exit(1);
}

const guildid = process.argv[2];

const commandsPath = join(__dirname, "cmd");
const commandFiles = readdirSync(commandsPath).filter(name => name.endsWith(".ts"));

const commandData: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

for(const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = require(filePath);

    if("data" in command && "func" in command)
        commandData.push((command as ICommand).data.toJSON());
    else
        console.warn(`Warning: ${file} doesn't export "data" or "func"`);
}

const rest = new REST({version: "10"}).setToken(token);

(async () => {
    try {
        console.log(`Setting commands for ${guildid}`);

        const data = await rest.put(
            Routes.applicationGuildCommands(clientid, guildid),
            { body: commandData }
        )

        console.log(`Success! ${commandData.length} commands set`);
    } catch (err) {
        console.error("Error while setting commands:")
        console.error(err);
    }
})();