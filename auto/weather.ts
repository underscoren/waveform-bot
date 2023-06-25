import cron from "node-cron";
import { log } from "../util/log";
import data from "../config.json";
import axios from "axios";
import { BaseGuildVoiceChannel, Client } from "discord.js"
import weatherCodesToEmoji from "./weather_conditions.json"

/** Setup the cron job */
export const setup = (bot: Client) => {
    cron.schedule("*/5 * * * *", async () => { // update once every hour
        updateWeather(bot);
    });
}

/** Updates the channel name based on the weather */
export const updateWeather = async (bot: Client) => {
    if(!("weatherapi" in data))
        throw new Error("No API key provided");
    
    const weatherapi = data["weatherapi"];
    log("Getting Weather from API");
    
    let resp;
    try {
        resp = await axios.get(`https://api.openweathermap.org/data/3.0/onecall?lat=51.50&lon=-0.12&exclude=minutely,hourly,daily,alerts&units=metric&appid=${weatherapi}`);
        log(resp.data);
        log(resp.data?.current?.weather ?? "no weather");
    } catch (error) {
        log(error.response?.data);
        throw error;
    }
    
    const temperature = resp.data.current.feels_like;
    const weatherID = resp.data.current.weather[0].id;
    if(!temperature || !weatherID) {
        log("No temperature found in data");
        return;
    }

    bot.channels.fetch("584091924726808580")
        .then(channel => {
            let emoji = weatherCodesToEmoji.find(([code]) => code == weatherID)[1] ?? "☀";
            
            const dt = resp.data.current.dt;
            const sunrise = resp.data.current.sunrise;
            const sunset = resp.data.current.sunset;
            if(
                dt && sunrise && sunset && // all fields present
                `${weatherID}`[0] == "8" && // clear
                (dt < sunrise || dt > sunset) // is before sunrise or after sunset (i.e. sunset)
            ) {
                emoji = "☾";
            }
            (channel as BaseGuildVoiceChannel)
                .edit(
                    { name: `${emoji} ${temperature}C VC ${emoji}` }
                )
        });
}