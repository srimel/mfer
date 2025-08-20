import { Command } from "commander";
import {
  configExists,
  isConfigValid,
  MferConfig,
  saveConfig,
  configPath,
} from "../utils/config-utils.js";
import chalk from "chalk";
import * as fs from "fs";
import { input, confirm, checkbox } from "@inquirer/prompts";

// Helper function to create and save configuration
function createAndSaveConfig(
  githubUsername: string,
  mfeDirectory: string,
  allGroup: string[] = [],
): void {
  // If no repositories are provided, create placeholder entries to show proper YAML syntax
  const repositories =
    allGroup.length > 0 ? allGroup : ["my_mfe_1", "my_mfe_2"];

  const newConfig: MferConfig = {
    base_github_url: `https://github.com/${githubUsername}`,
    mfe_directory: mfeDirectory,
    groups: {
      all: repositories,
    },
  };

  saveConfig(newConfig);

  const successMessage =
    allGroup.length > 0
      ? "Configuration created successfully!"
      : "Basic configuration created successfully!";

  console.log(chalk.green(successMessage));
  console.log(chalk.blue(`Config file saved to: ${configPath}`));
  console.log(
    chalk.yellow("You can edit the config file later using: mfer config edit"),
  );

  if (allGroup.length === 0) {
    console.log(
      chalk.yellow(
        "\nNote: Placeholder repository names have been added to show proper YAML syntax.",
      ),
    );
    console.log(
      chalk.yellow(
        "Please replace 'my_mfe_1' and 'my_mfe_2' with your actual repository names.",
      ),
    );
  }
}

// Helper function to get folders from directory
function getFoldersFromDirectory(directoryPath: string): string[] {
  try {
    if (
      fs.existsSync(directoryPath) &&
      fs.statSync(directoryPath).isDirectory()
    ) {
      const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    }
  } catch {
    // Silently handle errors when reading directory
  }
  return [];
}

// Helper function to prompt for GitHub information
async function promptForGitHubInfo(): Promise<{
  usesGithub: boolean;
  githubUsername?: string;
}> {
  try {
    const usesGithub = await confirm({
      message: "Do you use GitHub to host your repositories?",
      default: true,
    });

    if (!usesGithub) {
      console.log(
        chalk.red(
          "Currently, only GitHub is supported for repository hosting. Other providers are not yet supported.",
        ),
      );
      return { usesGithub: false };
    }

    const githubUsername = await input({
      message: "What is your GitHub username?",
      validate: (val) =>
        val && val.trim() !== "" ? true : "Username cannot be empty",
    });

    return { usesGithub: true, githubUsername };
  } catch (error) {
    // Re-throw the error to maintain the same behavior
    throw error;
  }
}

// Helper function to prompt for MFE directory
async function promptForMFEDirectory(): Promise<string> {
  try {
    return await input({
      message: [
        "Enter the path to the folder containing all your micro frontends.",
        "  (Tip: Drag a folder from your file explorer into this terminal to paste its path)",
        "  >>>",
      ].join("\n"),
      validate: (val) =>
        val && val.trim() !== "" ? true : "Folder path cannot be empty",
    });
  } catch (error) {
    // Re-throw the error to maintain the same behavior
    throw error;
  }
}

// Helper function to prompt for folder selection
async function promptForFolderSelection(folders: string[]): Promise<string[]> {
  try {
    return await checkbox({
      message: "Select which folders to include in the default 'all' group:",
      choices: folders.map((f) => ({ name: f, value: f })),
      validate: (arr) => (arr.length > 0 ? true : "Select at least one folder"),
    });
  } catch (error) {
    // Re-throw the error to maintain the same behavior
    throw error;
  }
}

const initCommand = new Command("init")
  .description("setup a new configuration")
  .option(
    "-f, --force",
    "force re-initialization even if config exists and is valid",
  )
  .action(async (options) => {
    let interrupted = false;
    const handleSigint = () => {
      interrupted = true;
      console.log(
        chalk.yellow("\nReceived SIGINT. Stopping initialization..."),
      );
      process.exit(130);
    };
    process.once("SIGINT", handleSigint);
    if (configExists && isConfigValid() && !options.force) {
      const messagePrefix = chalk.red("Error");
      const mferCommandHint = chalk.blue("mfer config edit");

      console.log(
        `${messagePrefix}: config already exists and is valid, you can edit it with ${mferCommandHint}`,
      );
      console.log(chalk.yellow("Use --force to re-initialize anyway"));
      return;
    }

    if (configExists && !isConfigValid()) {
      console.log(
        chalk.yellow(
          "Existing config file is invalid or incomplete. Re-initializing...",
        ),
      );
    }

    if (configExists && isConfigValid() && options.force) {
      console.log(chalk.yellow("Force re-initializing existing config..."));
    }

    try {
      // Get GitHub information
      const { usesGithub, githubUsername } = await promptForGitHubInfo();
      if (interrupted || !usesGithub || !githubUsername) {
        return;
      }

      // Get MFE directory
      const mfeDirectory = await promptForMFEDirectory();
      if (interrupted) {
        return;
      }

      // Try to get folders from directory
      const folders = getFoldersFromDirectory(mfeDirectory);

      if (folders.length > 0) {
        // Prompt user to select which folders to include in 'all' group
        const selectedFolders = await promptForFolderSelection(folders);
        if (interrupted) {
          return;
        }
        createAndSaveConfig(githubUsername, mfeDirectory, selectedFolders);
      } else {
        // No folders found, create basic config
        console.log(
          "Add the names of your micro frontends to the 'groups' section.",
        );
        createAndSaveConfig(githubUsername, mfeDirectory);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message?.includes("SIGINT") ||
          error.message?.includes("User force closed"))
      ) {
        console.log(
          chalk.yellow("\nReceived SIGINT. Stopping initialization..."),
        );
        process.exit(130);
      }
      throw error;
    }
  });

export default initCommand;
