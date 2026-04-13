import { Command } from "commander";
import {
  configExists,
  currentConfig,
  warnOfMissingConfig,
} from "../utils/config-utils.js";
import concurrently from "concurrently";
import chalk from "chalk";
import path from "path";
import {
  promptForMFESelection,
  resolveRunCommand,
} from "../utils/command-utils.js";
import { spawn } from "child_process";

interface MfeCommand {
  mfe: string;
  command: string;
}

const runCommand = new Command("run")
  .description("run micro-frontend applications")
  .argument(
    "[group_name]",
    "name of the group as specified in the configuration",
    "all",
  )
  .option("-s, --select", "prompt to select which micro frontends to run")
  .option(
    "-c, --command <command>",
    "custom command to run (default: npm start)",
  )
  .option(
    "-a, --async",
    "run custom command concurrently instead of sequentially (only works with --command option)",
  )
  .option("-m, --mode <mode_name>", "run MFEs using a named mode from config")

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

    // Check if --async is used without --command (--mode always runs concurrently, so --async is ignored there)
    if (options.async && !options.command && !options.mode) {
      const messagePrefix = chalk.red("Error");
      console.log(
        `${messagePrefix}: --async can only be used with --command option`,
      );
      return;
    }

    // --mode and --command are mutually exclusive
    if (options.mode && options.command) {
      const messagePrefix = chalk.red("Error");
      console.log(
        `${messagePrefix}: --mode and --command cannot be used together`,
      );
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
        `${messagePrefix}: group '${groupName}' has no micro frontends defined.`,
      );
      return;
    }

    let selectedMFEs = group;

    // Prompt user to select MFEs if --select option is provided
    if (options.select) {
      selectedMFEs = await promptForMFESelection(groupName, group);
    }

    // Warn if --mode was given but no MFE in the group has that mode defined
    if (options.mode) {
      const hasAnyMfeWithMode = selectedMFEs.some((mfe) =>
        currentConfig.mfes?.[mfe]?.modes?.some(
          (m) => m.mode_name === options.mode,
        ),
      );
      if (!hasAnyMfeWithMode) {
        console.log(
          chalk.yellow(
            `Warning: no MFE in the selected group has a '${options.mode}' mode defined. All MFEs will use the default command.`,
          ),
        );
      }
    }

    const mfeDir = currentConfig.mfe_directory;
    const isAsync = options.async && options.command;

    // Build per-MFE command list
    const mfeCommands: MfeCommand[] = selectedMFEs.map((mfe) => ({
      mfe,
      command: options.command
        ? options.command
        : resolveRunCommand(mfe, options.mode, currentConfig),
    }));

    const groupText = options.select
      ? `selected MFEs from group '${groupName}'`
      : `group '${groupName}'`;
    const commandText = options.command
      ? `custom command '${options.command}'`
      : options.mode
        ? `mode '${options.mode}'`
        : "default command";

    console.log(
      chalk.green(
        `Running ${commandText} on micro frontends in ${groupText}...`,
      ),
    );

    // If async execution is requested or no custom command is used (default/mode)
    if (isAsync || !options.command) {
      await runConcurrently(mfeCommands, mfeDir);
    } else {
      // Use sequential execution for custom commands (default behavior)
      await runSequentially(mfeCommands, mfeDir);
    }
  });

/**
 * Run commands sequentially across micro frontends
 */
async function runSequentially(
  mfeCommands: MfeCommand[],
  mfeDir: string,
): Promise<void> {
  for (const { mfe, command } of mfeCommands) {
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
        },
      );

      if (result.exitCode !== 0) {
        console.error(
          chalk.red(
            `[${mfe}] Command failed with exit code ${result.exitCode}`,
          ),
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
  mfeCommands: MfeCommand[],
  mfeDir: string,
): Promise<void> {
  const commands = mfeCommands.map(({ mfe, command }) => ({
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
      chalk.yellow("\nReceived SIGINT. Stopping all micro frontends..."),
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
              `  MFE ${name} failed to start (cwd: ${cwd}) with exit code ${exitCode}`,
            ),
          );
        });
      } else if (err && typeof err === "object" && "message" in err) {
        console.error((err as { message: string }).message);
      }
    },
  );
}

export default runCommand;
