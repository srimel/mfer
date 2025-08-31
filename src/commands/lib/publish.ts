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

const publishCommand = new Command("publish")
  .description("Build and deploy libraries to micro frontends")
  .argument(
    "[lib-name]",
    "Name of the library to publish (publishes all if not specified)",
  )
  .option("-s, --select", "prompt to select which libraries to publish")
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

    let libsToPublish: string[];

    // If --select option is provided, prompt user to select libraries
    if (options?.select) {
      try {
        console.log(chalk.blue(`Select libraries to publish:`));
        const selectedLibs = await checkbox({
          message: "Choose which libraries to publish:",
          choices: currentConfig.libs.map((lib) => ({ name: lib, value: lib })),
          validate: (arr) =>
            arr.length > 0 ? true : "Select at least one library",
        });
        libsToPublish = selectedLibs;
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
      libsToPublish = libName
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

    if (libsToPublish.length === 0) {
      console.log(chalk.yellow("No libraries to publish."));
      return;
    }

    const libsText = options?.select
      ? `selected libraries (${libsToPublish.length})`
      : libName
        ? `library '${libName}'`
        : `all libraries (${libsToPublish.length})`;

    console.log(chalk.blue(`Publishing ${libsText}...`));

    // Get all MFE directories
    const mfeDirectories = currentConfig.groups.all.map((mfe) =>
      path.join(currentConfig.mfe_directory, mfe),
    );

    for (const lib of libsToPublish) {
      const libPath = path.join(currentConfig.lib_directory, lib);

      if (!fs.existsSync(libPath)) {
        console.log(
          chalk.red(`Error: Library directory not found: ${libPath}`),
        );
        continue;
      }

      console.log(chalk.blue(`\nPublishing ${chalk.bold(lib)}...`));

      // Step 1: Build the library
      console.log(chalk.blue(`  Building ${lib}...`));
      try {
        await buildLibrary(libPath, lib);
        console.log(chalk.green(`  ✓ ${lib} built successfully`));
      } catch (error) {
        console.log(chalk.red(`  ✗ Failed to build ${lib}: ${error}`));
        continue; // Skip deployment if build fails
      }

      // Step 2: Deploy the library
      console.log(chalk.blue(`  Deploying ${lib}...`));
      const libDistPath = path.join(libPath, "dist");
      let deployedCount = 0;

      for (const mfeDir of mfeDirectories) {
        if (!fs.existsSync(mfeDir)) {
          console.log(
            chalk.yellow(`    Warning: MFE directory not found: ${mfeDir}`),
          );
          continue;
        }

        const targetPath = path.join(mfeDir, "node_modules", lib);
        if (fs.existsSync(targetPath)) {
          try {
            await copyLibraryToMfe(libDistPath, targetPath, lib);
            console.log(
              chalk.green(`    ✓ Deployed to ${path.basename(mfeDir)}`),
            );
            deployedCount++;
          } catch (error) {
            console.log(
              chalk.red(
                `    ✗ Failed to deploy to ${path.basename(mfeDir)}: ${error}`,
              ),
            );
          }
        } else {
          console.log(
            chalk.gray(
              `    - Skipped ${path.basename(mfeDir)} (not installed)`,
            ),
          );
        }
      }

      if (deployedCount > 0) {
        console.log(
          chalk.green(
            `  ✓ ${lib} published to ${deployedCount} MFE${deployedCount === 1 ? "" : "s"}`,
          ),
        );
      } else {
        console.log(
          chalk.yellow(
            `  ⚠ ${lib} not deployed (not found in any MFE's node_modules)`,
          ),
        );
      }
    }

    console.log(chalk.green("\nPublish process completed!"));
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

async function copyLibraryToMfe(
  sourcePath: string,
  targetPath: string,
  _libName: string,
): Promise<void> {
  return new Promise((resolve, _reject) => {
    // Remove existing contents
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }

    // Create target directory
    fs.mkdirSync(targetPath, { recursive: true });

    // Copy all files from dist to node_modules
    copyDirectoryRecursive(sourcePath, targetPath);
    resolve();
  });
}

function copyDirectoryRecursive(source: string, target: string): void {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const items = fs.readdirSync(source);

  for (const item of items) {
    const sourcePath = path.join(source, item);
    const targetPath = path.join(target, item);

    const stat = fs.statSync(sourcePath);

    if (stat.isDirectory()) {
      copyDirectoryRecursive(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

export default publishCommand;
