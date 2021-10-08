# Waveform bot

### How to run 

`npm install` to install all the dependencies

`node bot.js -update` when you first run the bot to send slash command data to discord

`node bot.js` to run the bot normally afterwards

### Development

If you edit any of the command js files, you can use the slash command `/reload-commands` to invalidate the require cache and make nodejs re-require the commands. **Warning**: I haven't implemented recursively invalidating the cache for any local module changes, so if you have any local util modules (like `util/log.js`) `/reload-commands` won't update it, you will have to restart the bot manually.

The `/reload-commands` will update all command permissions (for all connected servers) by default. Be careful because there is a limit of 200 slash command permission updates per 24 hours (per server). If you haven't changed any permissions, you can just use `/reload-commands code-only: true` to only invalidate the require cache.

Oh, and `/reload-commands` has disabled all permissions by default. you probably want to set your own user id so you can actually use it (see `cmd/reloadCommands.js`). 

### TODO

 - Song queueing
 - Playing from timestamp
 - Pausing
 - Playing from non-youtube services