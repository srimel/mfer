import { Command } from "commander";
import chalk from "chalk";
import { spawnSync } from "child_process";
import {
  getInstalledVersion,
  getLatestVersion,
} from "../utils/version-utils.js";

const updateCommand = new Command("update")
  .description("update mfer to the latest version")
  .action(async () => {
    const installedVersion = getInstalledVersion();
    console.log(chalk.blue(`Current version: ${installedVersion}`));
    console.log(chalk.blue("Checking for updates..."));

    const latestVersion = await getLatestVersion();
    if (!latestVersion) {
      console.log(
        chalk.red("Error: Could not fetch the latest version from npm."),
      );
      return;
    }

    if (latestVersion === installedVersion) {
      console.log(chalk.green("You are already on the latest version."));
      return;
    }

    console.log(chalk.yellow(`New version available: ${latestVersion}`));
    console.log(chalk.blue("Updating mfer..."));

    const result = spawnSync("npm", ["install", "-g", "mfer@latest"], {
      stdio: "inherit",
      shell: true,
    });

    if (result.status !== 0) {
      console.log(
        chalk.red(
          `Error: Update failed with exit code ${result.status}. Try running: npm install -g mfer@latest`,
        ),
      );
      return;
    }

    console.log(chalk.green(`Successfully updated mfer to ${latestVersion}.`));
  });

export default updateCommand;
