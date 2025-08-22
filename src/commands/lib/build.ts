import { Command } from "commander";
import chalk from "chalk";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
  currentConfig,
  configExists,
  warnOfMissingConfig,
} from "../../utils/config-utils.js";

const buildCommand = new Command("build")
  .description("Build internal npm packages")
  .argument("[lib-name]", "Name of the library to build (builds all if not specified)")
  .action(async (libName?: string) => {
    if (!configExists) {
      warnOfMissingConfig();
      return;
    }

    if (!currentConfig.lib_directory || !currentConfig.libs) {
      console.log(
        chalk.red("Error: Library configuration not found in config file.")
      );
      console.log(
        chalk.yellow("Please run 'mfer init' to configure library settings.")
      );
      return;
    }

    const libsToBuild = libName 
      ? [libName].filter(lib => currentConfig.libs!.includes(lib))
      : currentConfig.libs;

    if (libName && !currentConfig.libs.includes(libName)) {
      console.log(
        chalk.red(`Error: Library '${libName}' not found in configuration.`)
      );
      console.log(
        chalk.yellow(`Available libraries: ${currentConfig.libs.join(", ")}`)
      );
      return;
    }

    if (libsToBuild.length === 0) {
      console.log(chalk.yellow("No libraries to build."));
      return;
    }

    console.log(
      chalk.blue(`Building ${libsToBuild.length} librar${libsToBuild.length === 1 ? 'y' : 'ies'}...`)
    );

    for (const lib of libsToBuild) {
      const libPath = path.join(currentConfig.lib_directory, lib);
      
      if (!fs.existsSync(libPath)) {
        console.log(chalk.red(`Error: Library directory not found: ${libPath}`));
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

async function buildLibrary(libPath: string, libName: string): Promise<void> {
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
