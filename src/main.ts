import type { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, Client, Collection, CommandInteraction, GatewayIntentBits } from "discord.js";
import fs from "fs-extra";
import path from "path";
import dotenv from "dotenv";
import clc from "cli-color";
import express from "express";
import { __dirname } from "./utils";

export type Command = {
	data: SlashCommandBuilder;
	channels?: string[];
	devOnly?: true;
	execute: (interaction: CommandInteraction<CacheType>) => Promise<void>;
};

// Environment variables are already loaded in docker container
// On local connect to dev guild
if (process.env.NODE_ENV === "local") dotenv.config({ path: ".env-dev" });
else if (process.env.NODE_ENV === "server") dotenv.config();

// Setup bot
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once("ready", () => {
	// Setup healthcheck endpoint
	const app = express();
	app.listen(3000, () => console.log(clc.green(`ready (${process.env.NODE_ENV}, ${process.env.npm_package_version})`)));

	app.get("/", (_, res) => {
		res.sendStatus(200);
	});
});

// Retrieve commands
const commands = new Collection<string, Command>();
const files = fs
	.readdirSync(path.join(__dirname, "commands"))
	.filter((file) => file.endsWith(".ts"));

for (const file of files) {
	const { command }: { command: Command } = await import(`./commands/${file}`);
	commands.set(command.data.name, command);
}

// Execute commands
client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) {
		return;
	}

	const command = commands.get(interaction.commandName);
	if (!command) {
		return;
	}
	if (command.channels && !command.channels.includes(interaction.channelId)) {
		interaction.reply("Komenda nie jest dostępna w tym kanale!");
		return;
	}

	try {
		await command.execute(interaction);
	} catch (err: any) {
		let aux = err.stack.split("\n");
		aux.splice(0, 2); //removing the line that we force to generate the error (var err = new Error();) from the message
		aux = aux.join("\n");

		await interaction.channel?.send({
			content: "```diff\n-Błąd (main.ts):\n\n" + err.message + "\n\n" + aux + "```",
		});
	}
});

await client.login(process.env.TOKEN);
