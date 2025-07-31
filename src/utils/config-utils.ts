import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import YAML from "yaml";
import chalk from "chalk";
import { editor } from "@inquirer/prompts";
import { spawn } from "child_process";

export interface MferConfig {
  base_github_url: string;
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

export const isConfigValid = (): boolean => {
  if (!configExists) {
    return false;
  }
  
  try {
    const configFile = fs.readFileSync(configPath, "utf8");
    const config = YAML.parse(configFile);
    
    // Check if config has required fields and they're not empty
    return (
      config &&
      typeof config === 'object' &&
      config.base_github_url &&
      config.mfe_directory &&
      config.groups &&
      typeof config.groups === 'object' &&
      config.groups.all &&
      Array.isArray(config.groups.all) &&
      config.groups.all.length > 0
    );
  } catch (e) {
    // If parsing fails or any other error, config is invalid
    return false;
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

/**
 * Opens the config file in the user's default editor.
 */
export const editConfig = () => {
  const editor = process.env.EDITOR || process.env.VISUAL || (os.platform() === "win32" ? "notepad" : "vi");
  console.log(chalk.green(`Opening config file in editor: ${editor}\n`));

  spawn(editor, [configPath], {
    stdio: "ignore",
    detached: true,
    shell: true
  }).unref();
};
