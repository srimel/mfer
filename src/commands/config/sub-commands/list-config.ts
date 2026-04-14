import { inspect } from "util";
import { Command } from "commander";
import {
  configExists,
  currentConfig,
  warnOfMissingConfig,
} from "../../../utils/config-utils.js";

export const listConfigCommand = new Command("list")
  .description("display the current configuration settings")
  .action(() => {
    if (configExists) {
      console.log(inspect(currentConfig, { depth: null, colors: true }));
    } else {
      warnOfMissingConfig();
    }
  });
