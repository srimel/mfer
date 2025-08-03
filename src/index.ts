#!/usr/bin/env node

import { program } from "commander";
import configCommand from "./commands/config/index.js";
import initCommand from "./commands/init.js";
import runCommand from "./commands/run.js";
import installCommand from "./commands/install.js";
import cloneCommand from "./commands/clone.js";
import pullCommand from "./commands/pull.js";
import { loadConfig } from "./utils/config-utils.js";

// General
program
  .name("mfer")
  .description(
    "Micro Frontend Runner (mfer) - A CLI for running your project's micro frontends."
  )
  .version("1.0.2", "-v, --version", "mfer CLI version")
  .hook("preAction", (thisCommand, actionCommand) => {
    console.log();
  })
  .hook("postAction", (thisCommand, actionCommand) => {
    console.log();
  });

// Commands
program.addCommand(configCommand);
program.addCommand(initCommand);
program.addCommand(runCommand);
program.addCommand(installCommand);
program.addCommand(cloneCommand);
program.addCommand(pullCommand);

// Configuration
loadConfig();

program.parse();
