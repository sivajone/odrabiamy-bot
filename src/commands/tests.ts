import { SlashCommandBuilder } from "@discordjs/builders";
import type { CacheType, CommandInteraction } from "discord.js";
import type { Command } from "../main";
import tests from "../test-list";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env-dev") });

export const command = {
	data: new SlashCommandBuilder().setName("tests").setDescription("Wyświetla listę testów"),
	channels: [process.env.DEV_CHANNEL],
	devOnly: true,

	async execute(interaction: CommandInteraction<CacheType>) {
		let out = "```\n";
		tests.forEach((test, i) => {
			out += `${test.name} [${i}]\n`;
		});
		out += "```";

		await interaction.reply(out);
	},
} as Command;
