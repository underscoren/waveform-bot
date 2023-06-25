# Waveform bot

### How to run

Make a file called `config.json` with the following fields:

    {
        "token": "your bot client token",
        "clientid": "your application client id",
        "weatherapi": "weather api key (optional)"
    }

`yarn` to install all the dependencies

`yarn update <guild id>` when you first run the bot to send slash command data to discord

`yarn bot` to run the bot normally afterwards

### TODO

 - Song queueing
 - Playing from timestamp
 - Pausing
 - Playing from non-youtube services