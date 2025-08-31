import { Command } from "commander";
import chalk from "chalk";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { checkbox } from "@inquirer/prompts";
import {
  currentConfig,
  configExists,
  warnOfMissingConfig,
} from "../../utils/config-utils.js";

const buildCommand = new Command("build")
  .description("Build internal npm packages")
  .argument(
    "[lib-name]",
    "Name of the library to build (builds all if not specified)",
  )
  .option("-s, --select", "prompt to select which libraries to build")
  .action(async (libName?: string, options?: { select?: boolean }) => {
    if (!configExists) {
      warnOfMissingConfig();
      return;
    }

    if (!currentConfig.lib_directory || !currentConfig.libs) {
      console.log(
        chalk.red("Error: Library configuration not found in config file."),
      );
      console.log(
        chalk.yellow("Please run 'mfer init' to configure library settings."),
      );
      return;
    }

    let libsToBuild: string[];

    // If --select option is provided, prompt user to select libraries
    if (options?.select) {
      try {
        console.log(chalk.blue(`Select libraries to build:`));
        const selectedLibs = await checkbox({
          message: "Choose which libraries to build:",
          choices: currentConfig.libs.map((lib) => ({ name: lib, value: lib })),
          validate: (arr) =>
            arr.length > 0 ? true : "Select at least one library",
        });
        libsToBuild = selectedLibs;
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
    } else {
      // Use existing logic for libName or all libs
      libsToBuild = libName
        ? [libName].filter((lib) => currentConfig.libs!.includes(lib))
        : currentConfig.libs;

      if (libName && !currentConfig.libs.includes(libName)) {
        console.log(
          chalk.red(`Error: Library '${libName}' not found in configuration.`),
        );
        console.log(
          chalk.yellow(`Available libraries: ${currentConfig.libs.join(", ")}`),
        );
        return;
      }
    }

    if (libsToBuild.length === 0) {
      console.log(chalk.yellow("No libraries to build."));
      return;
    }

    const libsText = options?.select
      ? `selected libraries (${libsToBuild.length})`
      : libName
        ? `library '${libName}'`
        : `all libraries (${libsToBuild.length})`;

    console.log(chalk.blue(`Building ${libsText}...`));

    for (const lib of libsToBuild) {
      const libPath = path.join(currentConfig.lib_directory, lib);

      if (!fs.existsSync(libPath)) {
        console.log(
          chalk.red(`Error: Library directory not found: ${libPath}`),
        );
        continue;
      }

      console.log(chalk.blue(`\nBuilding ${chalk.bold(lib)}...`));

      try {
        await buildLibrary(libPath, lib);
        console.log(chalk.green(`✓ ${lib} built successfully`));
      } catch (error) {
        console.log(chalk.red(`✗ Failed to build ${lib}: ${error}`));
      }
    }

    console.log(chalk.green("\nBuild process completed!"));
  });

async function buildLibrary(libPath: string, _libName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const buildProcess = spawn("npm", ["run", "build"], {
      stdio: "inherit",
      cwd: libPath,
      shell: true,
    });

    buildProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Build process exited with code ${code}`));
      }
    });

    buildProcess.on("error", (error) => {
      reject(error);
    });
  });
}

export default buildCommand;
