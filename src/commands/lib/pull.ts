import { Command } from "commander";
import {
  configExists,
  currentConfig,
  warnOfMissingConfig,
} from "../../utils/config-utils.js";
import chalk from "chalk";
import {
  validateGitRepositories,
  runGitPullConcurrently,
  promptForLibrarySelection,
} from "../../utils/command-utils.js";

const pullCommand = new Command("pull")
  .description("pull latest changes from library git repositories")
  .argument(
    "[lib-name]",
    "name of the library to pull from (pulls all if not specified)",
  )
  .option("-s, --select", "prompt to select which libraries to pull")
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

    const libDir = currentConfig.lib_directory;

    // Validate repositories before running git pull
    console.log(chalk.blue(`Validating library repositories...`));

    const { validRepos, invalidRepos } = validateGitRepositories(
      targetLibs,
      libDir,
    );

    // Report invalid repositories
    if (invalidRepos.length > 0) {
      console.log(chalk.yellow("\nSkipping invalid repositories:"));
      invalidRepos.forEach(({ name, reason }) => {
        console.log(chalk.yellow(`  ${name}: ${reason}`));
      });
      console.log();
    }

    if (validRepos.length === 0) {
      console.log(chalk.red("No valid git repositories found to pull from."));
      if (
        invalidRepos.some((repo) =>
          repo.reason.includes("Directory does not exist"),
        )
      ) {
        console.log(
          chalk.blue(
            "\nTip: Make sure your libraries are cloned to the configured directory.",
          ),
        );
      }
      return;
    }

    let selectedLibs = validRepos;

    // Prompt user to select libraries if --select option is provided
    if (options.select) {
      selectedLibs = await promptForLibrarySelection(validRepos);
    }

    const contextName = libName ? `library '${libName}'` : "all libraries";

    await runGitPullConcurrently(selectedLibs, libDir, contextName, options);
  });

export default pullCommand;
