import { Command } from "commander";
import {
  configExists,
  configPath,
  warnOfMissingConfig,
} from "../../../utils/config-utils.js";
import chalk from "chalk";
import { spawn } from "child_process";
import * as os from "os";

export const editConfigCommand = new Command("edit")
  .description("edit configuration in your preferred editor")
  .action(() => {
    if (!configExists) {
      warnOfMissingConfig();
      return;
    }

    // Determine the editor
    const editor =
      process.env.EDITOR ||
      process.env.VISUAL ||
      (os.platform() === "win32" ? "notepad" : "vi");
    console.log(chalk.green(`Opening config file in editor: ${editor}\n`));

    spawn(editor, [configPath], {
      stdio: "ignore",
      detached: true,
      shell: true,
    }).unref();

    process.exit(0);
  });
