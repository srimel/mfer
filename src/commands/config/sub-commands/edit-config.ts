import { Command } from "commander";
import YAML from "yaml";
import {
  configExists,
  currentConfig,
  editConfigAsync,
  MferConfig,
  saveConfig,
  warnOfMissingConfig,
} from "../../../utils/config-utils.js";

export const editConfigCommand = new Command("edit")
  .description("edit configuration")
  .action(async () => {
    if (configExists) {
      const answer = await editConfigAsync(
        "edit configuration file, this will overwrite your existing configuration",
        currentConfig
      );

      const newConfig: MferConfig = YAML.parse(answer);
      saveConfig(newConfig);
    } else {
      warnOfMissingConfig();
    }
  });
