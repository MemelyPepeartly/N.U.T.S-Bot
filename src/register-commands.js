import { REST, Routes } from "discord.js";
import { transferCommand } from "./commands.js";

const token = process.env.DISCORD_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
if (!token || !applicationId) {
  throw new Error("Set DISCORD_TOKEN and DISCORD_APPLICATION_ID before registering commands");
}

const rest = new REST({ version: "10" }).setToken(token);
await rest.put(Routes.applicationCommands(applicationId), {
  body: [transferCommand.toJSON()],
});
console.log("Registered /transfer-soundboard");
