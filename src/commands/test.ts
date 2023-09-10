import type { CacheType, CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import type { Command } from "../main";
import { scrape } from "../scrape";
import fs from "fs-extra";
import path from "path";
import dotenv from "dotenv";

import { ErrorType } from "../scrape";
import tests from "../test-list";

dotenv.config({ path: path.join(process.cwd(), ".env-dev") });

export const command = {
	data: new SlashCommandBuilder()
		.setName("test")
		.setDescription("Testuje bota")
		.addIntegerOption((option) => option.setName("od").setDescription("Od").setRequired(false))
		.addIntegerOption((option) => option.setName("do").setDescription("Do").setRequired(false))
		.addBooleanOption((option) =>
			option
				.setName("non-headless")
				.setDescription("Otwórz w oknie graficznym")
				.setRequired(false)
		)
		.addBooleanOption((option) =>
			option
				.setName("throttle-network")
				.setDescription("Symuluj słaby internet")
				.setRequired(false)
		),
	channels: [process.env.DEV_CHANNEL],
	devOnly: true,

	async execute(interaction: CommandInteraction<CacheType>) {
		const from = (interaction.options.get("od")?.value ?? 0) as number;
		const to = (interaction.options.get("do")?.value ?? tests.length - 1) as number;
		const nonHeadless = (interaction.options.get("non-headless")?.value ?? false) as boolean;
		const throttleNetwork = (interaction.options.get("throttle-network")?.value ??
			false) as boolean;

		if (to + 1 > tests.length) {
			await interaction.reply("End index out of range.");
			return;
		}

		await interaction.reply("Starting tests...");

		// Backup cookies
		const cookiesPath = path.join(process.cwd(), "src/config/cookies.json");
		const cookiesBackupPath = path.join(process.cwd(), "src/config/cookies.json.bak");

		// Avoid error when previous test was interrupted
		if (!fs.existsSync(cookiesPath) && fs.existsSync(cookiesBackupPath)) {
			fs.renameSync(cookiesBackupPath, cookiesPath);
		} else if (fs.existsSync(cookiesPath)) {
			fs.copyFileSync(cookiesPath, cookiesBackupPath, fs.constants.COPYFILE_FICLONE);
		}

		// Run tests
		const results: Map<number, boolean> = new Map<number, boolean>();
		for (let i = from; i < (from === to ? from + 1 : to + 1); i++) {
			const test = tests[i];
			const message = await interaction.channel?.send(
				`\`Starting test ${i} '${test.name}'...\``
			);

			if (test.logIn) {
				fs.rmSync(cookiesPath, { force: true });
			}

			const timer = process.hrtime();
			const { screenshots, error } = await scrape(
				test.bookUrl,
				test.page,
				test.exercise,
				!!test.trailingDot,
				interaction,
				!nonHeadless,
				!!test.throttleNetwork || throttleNetwork
			);
			const time = parseFloat(process.hrtime(timer).join(".")).toFixed(3);
			console.log(`Took ${time} seconds`);

			if (
				error &&
				test.expectedErrorType &&
				error.type !== ErrorType.UnhandledError &&
				error.type !== test.expectedErrorType
			) {
				await message?.edit(
					`\`\`\`diff\n-Test ${i} '${test.name}' failed with ${
						ErrorType[error.type]
					}:\n\n${error.message}
					\n-Expected error of type ${ErrorType[test.expectedErrorType!]}\`\`\``
				);
				results.set(i, false);
			} else if (
				error &&
				error.type === test.expectedErrorType &&
				error.message !== test.expectedErrorMessage
			) {
				await message?.edit(
					`\`\`\`diff\n-Test ${i} '${test.name}' failed with message
					\n'${error.message}'
					\n-Expected error message:
					\n'${test.expectedErrorMessage}'\`\`\``
				);
				results.set(i, false);
			} else if (
				error?.type === ErrorType.UnhandledError ||
				(error && !test.expectedErrorType)
			) {
				await message?.edit(
					`\`\`\`diff\n-Test ${i} '${test.name}' failed with ${
						ErrorType[error.type]
					}:\n\n${error.message}\`\`\``
				);
				results.set(i, false);
			} else if (!error || error.type === test.expectedErrorType) {
				await message?.edit(
					`\`\`\`diff\n+Test ${i} '${test.name}' passed (took ${time} seconds).\`\`\``
				);
				if (screenshots) await interaction.channel?.send({ files: screenshots });

				results.set(i, true);
			}

			if (test.logIn) {
				fs.copyFileSync(cookiesBackupPath, cookiesPath, fs.constants.COPYFILE_FICLONE);
			}
		}

		// Restore cookies
		if (fs.existsSync(cookiesBackupPath)) {
			fs.moveSync(cookiesBackupPath, cookiesPath, { overwrite: true });
		}

		// Remove screenshots
		fs.emptyDirSync(path.join(process.cwd(), "screenshots"));

		await interaction.channel?.send(
			Array.from(results.values()).includes(false)
				? `\`\`\`diff\n-Tests failed (id: ${Array.from(results.entries())
						.map((pair) => pair[0])
						.filter((i) => !results.get(i))
						.join(", ")}).\`\`\``
				: "```diff\n+Tests passed.```"
		);
	},
} as Command;
