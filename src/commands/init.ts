import { Command } from "commander";
import {
  configExists,
  editConfigAsync,
  MferConfig,
  saveConfig,
} from "../utils/config-utils.js";
import YAML from "yaml";
import chalk from "chalk";

const templateConfig: MferConfig = {
  mfe_directory: "path/to/folder/containing/microfrontends",
  groups: {
    all: ["repo_name_1", "repo_name_2", "repo_name_3"],
    customGroup1: ["repo_name2", "repo_name_3"],
  },
};

// TODO - create an init guided workflow

const initCommand = new Command("init")
  .description("setup a new configuration")
  .action(async (options) => {
    if (!configExists) {
      const answer = await editConfigAsync(
        "create a new configuration file",
        templateConfig
      );

      const newConfig: MferConfig = YAML.parse(answer);
      saveConfig(newConfig);
    } else {
      const messagePrefix = chalk.red("Error");
      const mferCommandHint = chalk.blue("mfer config edit");
      console.log(
        `${messagePrefix}: config already exists, you can edit it with ${mferCommandHint}`
      );
    }
  });

export default initCommand;
