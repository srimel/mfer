import { Command } from "commander";
import {
  configExists,
  currentConfig,
  warnOfMissingConfig,
} from "../utils/config-utils.js";
import chalk from "chalk";
import {
  runNpmInstallSequentially,
  promptForMFESelection,
} from "../utils/command-utils.js";

const installCommand = new Command("install")
  .description("run 'npm install' in micro-frontend applications synchronously")
  .argument(
    "[group_name]",
    "name of the group as specified in the configuration",
    "all"
  )
  .option("-s, --select", "prompt to select which micro frontends to install")
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
          Object.keys(currentConfig.groups).join(" ")
        )}`
      );
      return;
    }
    if (!Array.isArray(group) || group.length === 0) {
      const messagePrefix = chalk.red("Error");
      console.log(
        `${messagePrefix}: group '${groupName}' has no micro frontends defined.`
      );
      return;
    }

    let selectedMFEs = group;

    // Prompt user to select MFEs if --select option is provided
    if (options.select) {
      selectedMFEs = await promptForMFESelection(groupName, group);
    }

    const mfeDir = currentConfig.mfe_directory;
    const contextName = `group: ${groupName}`;

    await runNpmInstallSequentially(selectedMFEs, mfeDir, contextName, options);
  });

export default installCommand;
