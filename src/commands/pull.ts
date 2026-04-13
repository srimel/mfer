import { Command } from "commander";
import {
  configExists,
  currentConfig,
  warnOfMissingConfig,
} from "../utils/config-utils.js";
import chalk from "chalk";
import {
  validateGitRepositories,
  runGitPullConcurrently,
  promptForMFESelection,
} from "../utils/command-utils.js";

const pullCommand = new Command("pull")
  .description("pull latest changes from git repositories")
  .argument(
    "[group_name]",
    "name of the group as specified in the configuration",
    "all",
  )
  .option("-s, --select", "prompt to select which repositories to pull")
  .action(async (groupName, options) => {
    if (!configExists) {
      warnOfMissingConfig();
      return;
    }

    const group = currentConfig.groups[groupName];
    if (!group) {
      const messagePrefix = chalk.red("Error");
      console.log(`${messagePrefix}: no group found with name '${groupName}'`);
      console.log(
        `Available groups: ${chalk.green(
          Object.keys(currentConfig.groups).join(" "),
        )}`,
      );
      return;
    }
    if (!Array.isArray(group) || group.length === 0) {
      const messagePrefix = chalk.red("Error");
      console.log(
        `${messagePrefix}: group '${groupName}' has no repositories defined.`,
      );
      return;
    }

    const mfeDir = currentConfig.mfe_directory;

    // Validate repositories before running git pull
    console.log(
      chalk.blue(`Validating repositories in group: ${groupName}...`),
    );

    const { validRepos, invalidRepos } = validateGitRepositories(group, mfeDir);

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
            "\nTip: Run 'mfer init' to clone repositories that don't exist yet.",
          ),
        );
      }
      return;
    }

    let selectedRepos = validRepos;

    // Prompt user to select repositories if --select option is provided
    if (options.select) {
      selectedRepos = await promptForMFESelection(groupName, validRepos);
    }

    const contextName = `group: ${groupName}`;
    await runGitPullConcurrently(selectedRepos, mfeDir, contextName, options);
  });

export default pullCommand;
