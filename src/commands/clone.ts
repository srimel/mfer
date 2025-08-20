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

const cloneCommand = new Command("clone")
  .description("clone repositories from the specified group")
  .argument(
    "[group_name]",
    "name of the group as specified in the configuration",
    "all",
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
    const baseUrl = currentConfig.base_github_url;

    // Validate repositories before cloning
    const reposToClone: string[] = [];
    const existingRepos: string[] = [];

    console.log(chalk.blue(`Checking repositories in group: ${groupName}...`));

    for (const repo of group) {
      const repoPath = path.join(mfeDir, repo);

      // Check if directory already exists
      if (fs.existsSync(repoPath)) {
        // Check if it's already a git repository
        const gitResult = spawnSync("git", ["rev-parse", "--git-dir"], {
          cwd: repoPath,
          stdio: "pipe",
          shell: true,
        });

        if (gitResult.status === 0) {
          existingRepos.push(repo);
        } else {
          console.log(
            chalk.yellow(
              `  ${repo}: Directory exists but is not a git repository. Skipping.`,
            ),
          );
        }
        continue;
      }

      reposToClone.push(repo);
    }

    // Report existing repositories
    if (existingRepos.length > 0) {
      console.log(
        chalk.green(`\nRepositories already exist (${existingRepos.length}):`),
      );
      existingRepos.forEach((repo) => {
        console.log(chalk.green(`  ✓ ${repo}`));
      });
      console.log();
    }

    if (reposToClone.length === 0) {
      console.log(chalk.blue("All repositories in the group already exist."));
      return;
    }

    // Ensure the MFE directory exists
    if (!fs.existsSync(mfeDir)) {
      try {
        fs.mkdirSync(mfeDir, { recursive: true });
        console.log(chalk.blue(`Created directory: ${mfeDir}`));
      } catch (error) {
        console.log(chalk.red(`Error creating directory ${mfeDir}: ${error}`));
        return;
      }
    }

    // Create clone commands
    const commands = reposToClone.map((repo) => ({
      command: `git clone ${baseUrl}/${repo}.git`,
      name: repo,
      cwd: mfeDir,
      prefixColor: "green",
    }));

    console.log(
      chalk.green(
        `Cloning ${reposToClone.length} repositories in group: ${groupName}...`,
      ),
    );
    const concurrentlyResult = concurrently(commands, {
      prefix: "{name} |",
      killOthersOn: ["failure"],
      restartTries: 0,
    });

    // Graceful shutdown on Ctrl+C
    const handleSigint = () => {
      console.log(
        chalk.yellow("\nReceived SIGINT. Stopping all clone operations..."),
      );
      concurrentlyResult.commands.forEach((cmd) => {
        if (cmd && typeof cmd.kill === "function") {
          cmd.kill();
        }
      });
      process.exit(0);
    };
    process.once("SIGINT", handleSigint);

    concurrentlyResult.result.then(
      () => {
        console.log(
          chalk.green(
            `\nSuccessfully cloned all repositories in group: ${groupName}`,
          ),
        );
        console.log(chalk.blue(`Repositories are located in: ${mfeDir}`));
      },
      (err: unknown) => {
        console.error(chalk.red("One or more repositories failed to clone."));
        if (Array.isArray(err)) {
          err.forEach((fail) => {
            const name = fail.command?.name || "unknown";
            const exitCode = fail.exitCode;
            const cwd = fail.command?.cwd || "unknown";
            console.error(
              chalk.yellow(
                `  Repository ${name} failed to clone (cwd: ${cwd}) with exit code ${exitCode}`,
              ),
            );
          });
        } else if (err && typeof err === "object" && "message" in err) {
          console.error((err as { message: string }).message);
        }
      },
    );
  });

export default cloneCommand;
