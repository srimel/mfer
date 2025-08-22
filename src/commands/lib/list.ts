import { Command } from "commander";
import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import {
  currentConfig,
  configExists,
  warnOfMissingConfig,
} from "../../utils/config-utils.js";

const listCommand = new Command("list")
  .description("List configured libraries and their status")
  .action(async () => {
    if (!configExists) {
      warnOfMissingConfig();
      return;
    }

    if (!currentConfig.lib_directory || !currentConfig.libs) {
      console.log(
        chalk.red("Error: Library configuration not found in config file.")
      );
      console.log(
        chalk.yellow("Please run 'mfer init' to configure library settings.")
      );
      return;
    }

    console.log(chalk.blue("Configured Libraries:"));
    console.log(chalk.gray("─".repeat(50)));

    if (currentConfig.libs.length === 0) {
      console.log(chalk.yellow("No libraries configured."));
      return;
    }

    for (const lib of currentConfig.libs) {
      const libPath = path.join(currentConfig.lib_directory, lib);
      const distPath = path.join(libPath, "dist");
      
      const libExists = fs.existsSync(libPath);
      const distExists = fs.existsSync(distPath);
      
      let status = "";
      if (!libExists) {
        status = chalk.red("✗ Directory not found");
      } else if (!distExists) {
        status = chalk.yellow("⚠ Not built");
      } else {
        status = chalk.green("✓ Built");
      }

      console.log(`${chalk.bold(lib)}`);
      console.log(`  Path: ${libPath}`);
      console.log(`  Status: ${status}`);
      console.log("");
    }

    console.log(chalk.gray("─".repeat(50)));
    console.log(chalk.blue(`Library Directory: ${currentConfig.lib_directory}`));
    console.log(chalk.blue(`Total Libraries: ${currentConfig.libs.length}`));
  });

export default listCommand;
