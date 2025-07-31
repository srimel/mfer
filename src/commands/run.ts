import { Command } from "commander";
import {
  configExists,
  currentConfig,
  warnOfMissingConfig,
} from "../utils/config-utils.js";
import concurrently from "concurrently";
import chalk from "chalk";
import path from "path";

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
  .action((groupName) => {
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
      console.log(`${messagePrefix}: group '${groupName}' has no micro frontends defined.`);
      return;
    }

    const mfeDir = currentConfig.mfe_directory;
    // List of colors to use for prefixes
    const commands = group.map((mfe) => ({
      command: "npm start",
      name: mfe,
      cwd: path.join(mfeDir, mfe),
      prefixColor: "blue"
    }));

    console.log(chalk.green(`Running micro frontends in group: ${groupName}...`));
    const concurrentlyResult = concurrently(commands, {
      prefix: "{name} |",
      killOthersOn: ["failure", "success"],
      restartTries: 0,
    });

    // Graceful shutdown on Ctrl+C
    const handleSigint = () => {
      console.log(chalk.yellow("\nReceived SIGINT. Stopping all micro frontends..."));
      concurrentlyResult.commands.forEach(cmd => {
        if (cmd && typeof cmd.kill === 'function') {
          cmd.kill();
        }
      });
      process.exit(0);
    };
    process.once('SIGINT', handleSigint);

    concurrentlyResult.result.then(
      () => {},
      (err: any) => {
        console.error(chalk.red("One or more micro frontends failed to start."));
        if (Array.isArray(err)) {
          err.forEach((fail) => {
            const name = fail.command?.name || "unknown";
            const exitCode = fail.exitCode;
            const cwd = fail.command?.cwd || "unknown";
            console.error(
              chalk.yellow(`  MFE ${name} failed to start (cwd: ${cwd}) with exit code ${exitCode}`)
            );
          });
        } else if (err && err.message) {
          console.error(err.message);
        }
      }
    );
  });

export default runCommand;