import { Command } from "commander";
import {
  configExists,
  currentConfig,
  warnOfMissingConfig,
} from "../utils/config-utils.js";
import concurrently from "concurrently";
import chalk from "chalk";
import path from "path";
import fs from "fs";
import { spawnSync } from "child_process";

const pullCommand = new Command("pull")
  .description("pull latest changes from git repositories")
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
      console.log(`${messagePrefix}: group '${groupName}' has no repositories defined.`);
      return;
    }

    const mfeDir = currentConfig.mfe_directory;
    
    // Validate repositories before running git pull
    const validRepos: string[] = [];
    const invalidRepos: { name: string; reason: string }[] = [];
    
    console.log(chalk.blue(`Validating repositories in group: ${groupName}...`));
    
    for (const repo of group) {
      const repoPath = path.join(mfeDir, repo);
      
      // Check if directory exists
      if (!fs.existsSync(repoPath)) {
        invalidRepos.push({ 
          name: repo, 
          reason: `Directory does not exist: ${repoPath}` 
        });
        continue;
      }
      
      // Check if it's a git repository
      const gitResult = spawnSync("git", ["rev-parse", "--git-dir"], {
        cwd: repoPath,
        stdio: "pipe",
        shell: true
      });
      
      if (gitResult.status !== 0) {
        invalidRepos.push({ 
          name: repo, 
          reason: `Not a git repository: ${repoPath}` 
        });
        continue;
      }
      
      validRepos.push(repo);
    }
    
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
      if (invalidRepos.some(repo => repo.reason.includes("Directory does not exist"))) {
        console.log(chalk.blue("\nTip: Run 'mfer init' to clone repositories that don't exist yet."));
      }
      return;
    }
    
    // List of colors to use for prefixes
    const commands = validRepos.map((repo) => ({
      command: "git pull",
      name: repo,
      cwd: path.join(mfeDir, repo),
      prefixColor: "green"
    }));

    console.log(chalk.green(`Pulling latest changes for ${validRepos.length} repositories in group: ${groupName}...`));
    const concurrentlyResult = concurrently(commands, {
      prefix: "{name} |",
      killOthersOn: ["failure"],
      restartTries: 0,
    });

    // Graceful shutdown on Ctrl+C
    const handleSigint = () => {
      console.log(chalk.yellow("\nReceived SIGINT. Stopping all git pull operations..."));
      concurrentlyResult.commands.forEach(cmd => {
        if (cmd && typeof cmd.kill === 'function') {
          cmd.kill();
        }
      });
      process.exit(0);
    };
    process.once('SIGINT', handleSigint);

    concurrentlyResult.result.then(
      () => {
        console.log(chalk.green(`\nSuccessfully pulled latest changes for all repositories in group: ${groupName}`));
      },
      (err: any) => {
        console.error(chalk.red("One or more repositories failed to pull."));
        if (Array.isArray(err)) {
          err.forEach((fail) => {
            const name = fail.command?.name || "unknown";
            const exitCode = fail.exitCode;
            const cwd = fail.command?.cwd || "unknown";
            console.error(
              chalk.yellow(`  Repository ${name} failed to pull (cwd: ${cwd}) with exit code ${exitCode}`)
            );
          });
        } else if (err && err.message) {
          console.error(err.message);
        }
      }
    );
  });

export default pullCommand; 