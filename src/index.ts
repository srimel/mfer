#!/usr/bin/env node

import { program } from "commander";
import configCommand from "./commands/config/index.js";
import initCommand from "./commands/init.js";
import runCommand from "./commands/run.js";
import installCommand from "./commands/install.js";
import cloneCommand from "./commands/clone.js";
import pullCommand from "./commands/pull.js";
import libCommand from "./commands/lib/index.js";
import updateCommand from "./commands/update.js";
import { loadConfig } from "./utils/config-utils.js";
import { checkForUpdateNotification } from "./utils/version-utils.js";

// General
program
  .name("mfer")
  .description(
    "Micro Frontend Runner (mfer) - A CLI for running your project's micro frontends.",
  )
  .version("3.2.0", "-v, --version", "mfer CLI version")
  .hook("preAction", () => {
    console.log();
  })
  .hook("postAction", () => {
    console.log();
  });

// Commands
program.addCommand(configCommand);
program.addCommand(initCommand);
program.addCommand(runCommand);
program.addCommand(installCommand);
program.addCommand(cloneCommand);
program.addCommand(pullCommand);
program.addCommand(libCommand);
program.addCommand(updateCommand);

// Configuration
loadConfig();

program.parse();

// Best-effort update check after command execution
checkForUpdateNotification().catch(() => {});
