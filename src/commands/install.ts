import { Command } from "commander";
import {
  configExists,
  currentConfig,
  warnOfMissingConfig,
} from "../utils/config-utils.js";
import chalk from "chalk";
import path from "path";
import { spawnSync } from "child_process";

const installCommand = new Command("install")
  .description("run 'npm install' in micro-frontend applications synchronously")
  .argument(
    "[group_name]",
    "name of the group as specified in the configuration",
    "all"
  )
  .action(async (groupName) => {
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
    let hadError = false;
    console.log(chalk.green(`Running 'npm install' in group: ${groupName}`));

    // Handle SIGINT gracefully
    let interrupted = false;
    const handleSigint = () => {
      interrupted = true;
      console.log(chalk.yellow("\nReceived SIGINT. Stopping installs..."));
    };
    process.once('SIGINT', handleSigint);

    for (const mfe of group) {
      if (interrupted) break;
      const cwd = path.join(mfeDir, mfe);
      console.log(chalk.blue(`[${mfe}] Running 'npm install' in ${cwd}`));
      const result = spawnSync("npm", ["install"], {
        cwd,
        stdio: "inherit",
        shell: true
      });
      if (result.status !== 0) {
        hadError = true;
        console.error(chalk.red(`  MFE ${mfe} failed to install (cwd: ${cwd}) with exit code ${result.status}`));
      } else {
        console.log(chalk.green(`  MFE ${mfe} installed successfully (cwd: ${cwd})`));
      }
    }

    if (hadError) {
      console.error(chalk.red("One or more installs failed."));
      process.exitCode = 1;
    } else if (interrupted) {
      process.exitCode = 130; // 128 + SIGINT
    } else {
      console.log(chalk.green("All installs completed successfully."));
    }
  });

export default installCommand;