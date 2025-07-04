import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import YAML from "yaml";
import chalk from "chalk";
import { editor } from "@inquirer/prompts";

export interface MferConfig {
  mfe_directory: string;
  groups: {
    all: string[];
    [groupname: string]: string[];
  };
}

export const configPath: string = path.join(os.homedir(), ".mfer/config.yaml");
export const configExists: boolean = fs.existsSync(configPath);
export let currentConfig: MferConfig;

/**
 * Loads a configuration file from the user's home directory.
 * @param file path of file to load configuration from
 */
export const loadConfig = (): any => {
  if (configExists) {
    const configFile = fs.readFileSync(configPath, "utf8");
    currentConfig = YAML.parse(configFile);
  }
};

export const warnOfMissingConfig = () => {
  if (!configExists) {
    console.log(
      `${chalk.red(
        "Error"
      )}: No configuration file detected\n       Please run ${chalk.blue.bold(
        "mfer init"
      )} to create one`
    );
  }
};

export const saveConfig = (newConfig: MferConfig) => {
  try {
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, YAML.stringify(newConfig));
  } catch (e) {
    console.log(`Error writing config file!\n\n${e}`);
  }
};

export const editConfigAsync = async (message: string, config: MferConfig) => {
  const prefixMessage =
    "# This file is whitespace sensitive. Tabs are two spaces, and file must be valid YAML.";

  const answer = await editor({
    message,
    default: `${prefixMessage}\n${YAML.stringify(config)}`,
    postfix: ".yaml",
  });

  return answer;
};
