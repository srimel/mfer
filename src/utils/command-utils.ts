import chalk from "chalk";
import { checkbox } from "@inquirer/prompts";
import { spawnSync } from "child_process";
import concurrently from "concurrently";
import path from "path";
import fs from "fs";

/**
 * Prompts the user to select which micro frontends to operate on from a given group.
 * @param groupName - The name of the group being operated on
 * @param mfes - Array of micro frontend names to choose from
 * @returns Promise<string[]> - Array of selected micro frontend names
 */
export async function promptForMFESelection(
  groupName: string,
  mfes: string[],
): Promise<string[]> {
  try {
    console.log(
      chalk.blue(
        `Select micro frontends to operate on from group '${groupName}':`,
      ),
    );
    const selectedMFEs = await checkbox({
      message: "Choose which micro frontends to operate on:",
      choices: mfes.map((mfe) => ({ name: mfe, value: mfe })),
      validate: (arr) =>
        arr.length > 0 ? true : "Select at least one micro frontend",
    });
    return selectedMFEs;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message?.includes("SIGINT") ||
        error.message?.includes("User force closed"))
    ) {
      console.log(chalk.yellow("\nReceived SIGINT. Stopping..."));
      process.exit(130);
    }
    throw error;
  }
}

/**
 * Prompts the user to select which libraries to operate on.
 * @param libs - Array of library names to choose from
 * @returns Promise<string[]> - Array of selected library names
 */
export async function promptForLibrarySelection(
  libs: string[],
): Promise<string[]> {
  try {
    console.log(chalk.blue("Select libraries to operate on:"));
    const selectedLibs = await checkbox({
      message: "Choose which libraries to operate on:",
      choices: libs.map((lib) => ({ name: lib, value: lib })),
      validate: (arr) =>
        arr.length > 0 ? true : "Select at least one library",
    });
    return selectedLibs;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message?.includes("SIGINT") ||
        error.message?.includes("User force closed"))
    ) {
      console.log(chalk.yellow("\nReceived SIGINT. Stopping..."));
      process.exit(130);
    }
    throw error;
  }
}

/**
 * Validates that repositories exist and are git repositories.
 * @param repos - Array of repository names
 * @param baseDir - Base directory containing the repositories
 * @returns Object with validRepos and invalidRepos arrays
 */
export function validateGitRepositories(
  repos: string[],
  baseDir: string,
): {
  validRepos: string[];
  invalidRepos: { name: string; reason: string }[];
} {
  const validRepos: string[] = [];
  const invalidRepos: { name: string; reason: string }[] = [];

  for (const repo of repos) {
    const repoPath = path.join(baseDir, repo);

    // Check if directory exists
    if (!fs.existsSync(repoPath)) {
      invalidRepos.push({
        name: repo,
        reason: `Directory does not exist: ${repoPath}`,
      });
      continue;
    }

    // Check if it's a git repository
    const gitResult = spawnSync("git", ["rev-parse", "--git-dir"], {
      cwd: repoPath,
      stdio: "pipe",
      shell: true,
    });

    if (gitResult.status !== 0) {
      invalidRepos.push({
        name: repo,
        reason: `Not a git repository: ${repoPath}`,
      });
      continue;
    }

    validRepos.push(repo);
  }

  return { validRepos, invalidRepos };
}

/**
 * Runs git pull concurrently on multiple repositories.
 * @param repos - Array of repository names
 * @param baseDir - Base directory containing the repositories
 * @param contextName - Name for context in output messages
 * @param options - Command options including select flag
 * @returns Promise<void>
 */
export async function runGitPullConcurrently(
  repos: string[],
  baseDir: string,
  contextName: string,
  options: { select?: boolean },
): Promise<void> {
  const commands = repos.map((repo) => ({
    command: "git pull",
    name: repo,
    cwd: path.join(baseDir, repo),
    prefixColor: "green",
  }));

  const repoText = options.select
    ? `selected repositories from ${contextName}`
    : `${repos.length} repositories in ${contextName}`;

  console.log(chalk.green(`Pulling latest changes for ${repoText}...`));
  const concurrentlyResult = concurrently(commands, {
    prefix: "{name} |",
    killOthersOn: ["failure"],
    restartTries: 0,
  });

  // Graceful shutdown on Ctrl+C
  const handleSigint = () => {
    console.log(
      chalk.yellow("\nReceived SIGINT. Stopping all git pull operations..."),
    );
    concurrentlyResult.commands.forEach((cmd) => {
      if (cmd && typeof cmd.kill === "function") {
        cmd.kill();
      }
    });
    process.exit(0);
  };
  process.once("SIGINT", handleSigint);

  return concurrentlyResult.result.then(
    () => {
      const successText = options.select
        ? `selected repositories from ${contextName}`
        : `all repositories in ${contextName}`;
      console.log(
        chalk.green(`\nSuccessfully pulled latest changes for ${successText}`),
      );
    },
    (err: unknown) => {
      console.error(chalk.red("One or more repositories failed to pull."));
      if (Array.isArray(err)) {
        err.forEach((fail) => {
          const name = fail.command?.name || "unknown";
          const exitCode = fail.exitCode;
          const cwd = fail.command?.cwd || "unknown";
          console.error(
            chalk.yellow(
              `  Repository ${name} failed to pull (cwd: ${cwd}) with exit code ${exitCode}`,
            ),
          );
        });
      } else if (err && typeof err === "object" && "message" in err) {
        console.error((err as { message: string }).message);
      }
    },
  );
}

/**
 * Runs npm install sequentially on multiple items.
 * @param items - Array of item names
 * @param baseDir - Base directory containing the items
 * @param contextName - Name for context in output messages
 * @param options - Command options including select flag
 * @returns Promise<void>
 */
export async function runNpmInstallSequentially(
  items: string[],
  baseDir: string,
  contextName: string,
  options: { select?: boolean },
): Promise<void> {
  let hadError = false;

  const groupText = options.select
    ? `selected items from ${contextName}`
    : `${contextName}`;
  console.log(chalk.green(`Running 'npm install' in ${groupText}`));

  // Handle SIGINT gracefully
  let interrupted = false;
  const handleSigint = () => {
    interrupted = true;
    console.log(chalk.yellow("\nReceived SIGINT. Stopping installs..."));
  };
  process.once("SIGINT", handleSigint);

  for (const item of items) {
    if (interrupted) break;

    const cwd = path.join(baseDir, item);
    console.log(chalk.blue(`[${item}] Running 'npm install' in ${cwd}`));

    const result = spawnSync("npm", ["install", "--no-fund"], {
      cwd,
      stdio: "inherit",
      shell: true,
    });

    if (result.status !== 0) {
      hadError = true;
      console.error(
        chalk.red(
          `  ${item} failed to install (cwd: ${cwd}) with exit code ${result.status}`,
        ),
      );
    } else {
      console.log(
        chalk.green(`  ${item} installed successfully (cwd: ${cwd})\n`),
      );
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
}
