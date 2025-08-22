import { Command } from "commander";
import {
  configExists,
  currentConfig,
  warnOfMissingConfig,
} from "../utils/config-utils.js";
import concurrently from "concurrently";
import chalk from "chalk";
import path from "path";
import { checkbox } from "@inquirer/prompts";
import { spawn } from "child_process";

const DEFAULT_RUN_COMMAND = "npm start";

const runCommand = new Command("run")
  .description("run micro-frontend applications")
  .argument(
    "[group_name]",
    "name of the group as specified in the configuration",
    "all"
  )
  .option("-s, --select", "prompt to select which micro frontends to run")
  .option(
    "-c, --command <command>",
    "custom command to run (default: npm start)"
  )
  .option(
    "-a, --async",
    "run custom command concurrently instead of sequentially"
  )

  .action(async (groupName, options) => {
    if (!configExists) {
      warnOfMissingConfig();
      return;
    }

    // Validate custom command if provided
    if (
      options.command &&
      typeof options.command === "string" &&
      options.command.trim() === ""
    ) {
      const messagePrefix = chalk.red("Error");
      console.log(`${messagePrefix}: custom command cannot be empty`);
      return;
    }

    // Check if --async is used without --command
    if (options.async && !options.command) {
      const messagePrefix = chalk.red("Error");
      console.log(
        `${messagePrefix}: --async can only be used with --command option`
      );
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
      console.log(
        `${messagePrefix}: group '${groupName}' has no micro frontends defined.`
      );
      return;
    }

    let selectedMFEs = group;

    // Prompt user to select MFEs if --select option is provided
    if (options.select) {
      try {
        console.log(
          chalk.blue(`Select micro frontends to run from group '${groupName}':`)
        );
        selectedMFEs = await checkbox({
          message: "Choose which micro frontends to run:",
          choices: group.map((mfe) => ({ name: mfe, value: mfe })),
          validate: (arr) =>
            arr.length > 0 ? true : "Select at least one micro frontend",
        });
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

    const mfeDir = currentConfig.mfe_directory;
    const commandToRun = options.command || DEFAULT_RUN_COMMAND;
    const isAsync = options.async && options.command;

    const groupText = options.select
      ? `selected MFEs from group '${groupName}'`
      : `group '${groupName}'`;
    const commandText = options.command
      ? `custom command '${commandToRun}'`
      : "default command";
    const executionMode = isAsync ? "concurrently" : "sequentially";

    console.log(
      chalk.green(
        `Running ${commandText} on micro frontends in ${groupText} ${executionMode}...`
      )
    );

    // If async execution is requested or default command is used
    if (isAsync || !options.command) {
      await runConcurrently(selectedMFEs, commandToRun, mfeDir);
    } else {
      // Use sequential execution for custom commands (default behavior)
      await runSequentially(selectedMFEs, commandToRun, mfeDir);
    }
  });

/**
 * Run commands sequentially across micro frontends
 */
async function runSequentially(
  mfes: string[],
  command: string,
  mfeDir: string
): Promise<void> {
  for (const mfe of mfes) {
    const cwd = path.join(mfeDir, mfe);
    console.log(chalk.blue(`\n[${mfe}] Running: ${command}`));

    try {
      const result = await new Promise<{ exitCode: number | null }>(
        (resolve) => {
          const child = spawn(command, [], {
            stdio: "inherit",
            cwd,
            shell: true,
          });

          child.on("close", (exitCode) => {
            resolve({ exitCode });
          });

          child.on("error", (error) => {
            console.error(chalk.red(`[${mfe}] Error: ${error.message}`));
            resolve({ exitCode: 1 });
          });
        }
      );

      if (result.exitCode !== 0) {
        console.error(
          chalk.red(`[${mfe}] Command failed with exit code ${result.exitCode}`)
        );
      }
    } catch (error) {
      console.error(chalk.red(`[${mfe}] Unexpected error: ${error}`));
    }
  }
}

/**
 * Run commands concurrently across micro frontends
 */
async function runConcurrently(
  mfes: string[],
  command: string,
  mfeDir: string
): Promise<void> {
  const commands = mfes.map((mfe) => ({
    command,
    name: mfe,
    cwd: path.join(mfeDir, mfe),
    prefixColor: "blue",
  }));

  const concurrentlyResult = concurrently(commands, {
    prefix: "{name} |",
    killOthersOn: ["failure", "success"],
    restartTries: 0,
  });

  // Handle graceful shutdown on Ctrl+C
  const handleSigint = () => {
    console.log(
      chalk.yellow("\nReceived SIGINT. Stopping all micro frontends...")
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
    () => {},
    (err: unknown) => {
      console.error(chalk.red("One or more micro frontends failed to start."));
      if (Array.isArray(err)) {
        err.forEach((fail) => {
          const name = fail.command?.name || "unknown";
          const exitCode = fail.exitCode;
          const cwd = fail.command?.cwd || "unknown";
          console.error(
            chalk.yellow(
              `  MFE ${name} failed to start (cwd: ${cwd}) with exit code ${exitCode}`
            )
          );
        });
      } else if (err && typeof err === "object" && "message" in err) {
        console.error((err as { message: string }).message);
      }
    }
  );
}

export default runCommand;
