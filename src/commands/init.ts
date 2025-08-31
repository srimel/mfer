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
  libDirectory?: string,
  libs: string[] = [],
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

  // Add library configuration if provided
  if (libDirectory && libs.length > 0) {
    newConfig.lib_directory = libDirectory;
    newConfig.libs = libs;
  }

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

  if (libDirectory && libs.length > 0) {
    console.log(
      chalk.green(
        `\nLibrary configuration added: ${libs.length} librar${libs.length === 1 ? "y" : "ies"} configured.`,
      ),
    );
    console.log(
      chalk.yellow(
        "You can now use 'mfer lib build', 'mfer lib deploy', and 'mfer lib publish' commands.",
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

// Helper function to prompt for library directory
async function promptForLibDirectory(): Promise<string | undefined> {
  try {
    const useLibs = await confirm({
      message:
        "Do you have internal npm packages/libraries that need to be built and deployed to your micro frontends?",
      default: false,
    });

    if (!useLibs) {
      return undefined;
    }

    return await input({
      message: [
        "Enter the path to the folder containing your internal npm packages/libraries.",
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

// Helper function to prompt for library selection
async function promptForLibSelection(libs: string[]): Promise<string[]> {
  try {
    return await checkbox({
      message: "Select which libraries to include in the configuration:",
      choices: libs.map((lib) => ({ name: lib, value: lib })),
      validate: (arr) =>
        arr.length > 0 ? true : "Select at least one library",
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

        // Prompt for library configuration
        const libDirectory = await promptForLibDirectory();
        if (interrupted) {
          return;
        }

        let libs: string[] = [];
        if (libDirectory) {
          const availableLibs = getFoldersFromDirectory(libDirectory);
          if (availableLibs.length > 0) {
            libs = await promptForLibSelection(availableLibs);
            if (interrupted) {
              return;
            }
          } else {
            console.log(
              chalk.yellow(
                "No library directories found in the specified path.",
              ),
            );
          }
        }

        createAndSaveConfig(
          githubUsername,
          mfeDirectory,
          selectedFolders,
          libDirectory,
          libs,
        );
      } else {
        // No folders found, create basic config
        console.log(
          "Add the names of your micro frontends to the 'groups' section.",
        );

        // Prompt for library configuration even when no MFE folders found
        const libDirectory = await promptForLibDirectory();
        if (interrupted) {
          return;
        }

        let libs: string[] = [];
        if (libDirectory) {
          const availableLibs = getFoldersFromDirectory(libDirectory);
          if (availableLibs.length > 0) {
            libs = await promptForLibSelection(availableLibs);
            if (interrupted) {
              return;
            }
          } else {
            console.log(
              chalk.yellow(
                "No library directories found in the specified path.",
              ),
            );
          }
        }

        createAndSaveConfig(
          githubUsername,
          mfeDirectory,
          [],
          libDirectory,
          libs,
        );
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
