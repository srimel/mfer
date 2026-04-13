import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import chalk from "chalk";
import { spawn } from "child_process";

export interface MfeMode {
  mode_name: string;
  command: string;
}

export interface MfeConfig {
  modes?: MfeMode[];
}

export interface MferConfig {
  base_github_url: string;
  mfe_directory: string;
  lib_directory?: string;
  libs?: string[];
  groups: {
    all: string[];
    [groupname: string]: string[];
  };
  mfes?: {
    [mfeName: string]: MfeConfig;
  };
}

export const configPath: string = path.join(os.homedir(), ".mfer/config.toml");
export const legacyYamlConfigPath: string = path.join(
  os.homedir(),
  ".mfer/config.yaml",
);
export const configExists: boolean = fs.existsSync(configPath);
export const legacyYamlConfigExists: boolean = fs.existsSync(
  legacyYamlConfigPath,
);
export let currentConfig: MferConfig;

/**
 * Loads a configuration file from the user's home directory.
 * @param file path of file to load configuration from
 */
export const loadConfig = (): MferConfig | undefined => {
  if (configExists) {
    const configFile = fs.readFileSync(configPath, "utf8");
    currentConfig = parseToml(configFile) as unknown as MferConfig;
    return currentConfig;
  }
  return undefined;
};

export const warnOfMissingConfig = () => {
  if (!configExists) {
    if (legacyYamlConfigExists) {
      console.log(
        `${chalk.red(
          "Error",
        )}: No TOML configuration file detected, but a legacy YAML config was found at ${legacyYamlConfigPath}\n       Please run ${chalk.blue.bold(
          "mfer config migrate",
        )} to convert it to TOML`,
      );
      return;
    }
    console.log(
      `${chalk.red(
        "Error",
      )}: No configuration file detected\n       Please run ${chalk.blue.bold(
        "mfer init",
      )} to create one`,
    );
  }
};

export const isParsedConfigValid = (parsed: unknown): boolean => {
  const config = parsed as Partial<MferConfig> & {
    mfes?: Record<string, unknown>;
  };

  const hasRequiredFields = Boolean(
    config &&
      typeof config === "object" &&
      config.base_github_url &&
      config.mfe_directory &&
      config.groups &&
      typeof config.groups === "object" &&
      config.groups.all &&
      Array.isArray(config.groups.all) &&
      config.groups.all.length > 0,
  );

  if (!hasRequiredFields) return false;

  if (config.lib_directory && (!config.libs || !Array.isArray(config.libs))) {
    return false;
  }

  if (config.mfes && typeof config.mfes === "object") {
    for (const mfeConfig of Object.values(config.mfes)) {
      if (mfeConfig && (mfeConfig as { modes?: unknown }).modes !== undefined) {
        const modes = (mfeConfig as { modes: unknown }).modes;
        if (!Array.isArray(modes)) return false;
        for (const mode of modes) {
          if (
            !mode ||
            typeof mode !== "object" ||
            !mode.mode_name ||
            !mode.command
          ) {
            return false;
          }
        }
      }
    }
  }

  return true;
};

export const isConfigValid = (): boolean => {
  if (!configExists) {
    return false;
  }

  try {
    const configFile = fs.readFileSync(configPath, "utf8");
    return isParsedConfigValid(parseToml(configFile));
  } catch {
    return false;
  }
};

export const saveConfig = (newConfig: MferConfig) => {
  try {
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(
      configPath,
      stringifyToml(newConfig as unknown as Record<string, unknown>),
    );
  } catch (error) {
    console.log(`Error writing config file!\n\n${error}`);
  }
};

/**
 * Opens the config file in the user's default editor.
 */
export const editConfig = () => {
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
};
