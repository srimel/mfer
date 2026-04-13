import { Command } from "commander";
import {
  configExists,
  currentConfig,
  warnOfMissingConfig,
} from "../../utils/config-utils.js";
import chalk from "chalk";
import {
  runNpmInstallSequentially,
  promptForLibrarySelection,
} from "../../utils/command-utils.js";

const installCommand = new Command("install")
  .description("run 'npm install' in library directories")
  .argument(
    "[lib-name]",
    "name of the library to install dependencies for (installs all if not specified)",
  )
  .option("-s, --select", "prompt to select which libraries to install")
  .action(async (libName, options) => {
    if (!configExists) {
      warnOfMissingConfig();
      return;
    }

    if (!currentConfig.lib_directory || !currentConfig.libs) {
      console.log(
        chalk.red("Error: Library configuration not found in config file."),
      );
      console.log(
        chalk.yellow("Please run 'mfer init' to configure library settings."),
      );
      return;
    }

    if (!Array.isArray(currentConfig.libs) || currentConfig.libs.length === 0) {
      console.log(chalk.red("Error: No libraries configured in config file."));
      return;
    }

    let targetLibs: string[];

    if (libName) {
      // Check if the specified library exists
      if (!currentConfig.libs.includes(libName)) {
        console.log(
          chalk.red(`Error: Library '${libName}' not found in configuration.`),
        );
        console.log(
          `Available libraries: ${chalk.green(currentConfig.libs.join(" "))}`,
        );
        return;
      }
      targetLibs = [libName];
    } else {
      targetLibs = currentConfig.libs;
    }

    let selectedLibs = targetLibs;

    // Prompt user to select libraries if --select option is provided
    if (options.select) {
      selectedLibs = await promptForLibrarySelection(targetLibs);
    }

    const libDir = currentConfig.lib_directory;
    const contextName = libName ? `library '${libName}'` : "all libraries";

    await runNpmInstallSequentially(selectedLibs, libDir, contextName, options);
  });

export default installCommand;
