import { Command } from "commander";
import {
  configExists,
  currentConfig,
  warnOfMissingConfig,
} from "../utils/config-utils.js";
import { run } from "node:test";
import chalk from "chalk";

/* TODO - run command implementation

Examples: 
  - 'mfer run' runs all micro frontends in the configuration, same as 'mfer run all'
  - 'mfer run [group_name]' runs all micro frontends in the specified group
  - 'mfer run --select' prompts the user to de-select MFEs to run from specified group
      - should also work with 'mfer run -s [group_name]'
*/

const runCommand = new Command("run")
  .description("run micro-frontend applications")
  .argument(
    "[group_name]",
    "name of the group as specified in the configuration",
    "all"
  )
  .action((options) => {
    if (!configExists) {
      warnOfMissingConfig();
      return;
    }

    const runGroup = currentConfig.groups[options];

    if (!runGroup) {
      const messagePrefix = chalk.red("Error");
      console.log(`${messagePrefix}: no group found with name '${options}'`);
      console.log(
        `Available groups: ${chalk.green(
          Object.keys(currentConfig.groups).join(" ")
        )}`
      );
      return;
    }

    console.log(chalk.green(`Running micro frontends in group: ${options}...`));
  });

export default runCommand;
