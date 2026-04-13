import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import chalk from "chalk";
import YAML from "yaml";
import { stringify as stringifyToml } from "smol-toml";
import { confirm } from "@inquirer/prompts";
import {
  MferConfig,
  isParsedConfigValid,
} from "../../../utils/config-utils.js";

const yamlConfigPath = path.join(os.homedir(), ".mfer/config.yaml");
const tomlConfigPath = path.join(os.homedir(), ".mfer/config.toml");

export const migrateConfigCommand = new Command("migrate")
  .description("migrate a legacy YAML config to TOML")
  .action(async () => {
    if (!fs.existsSync(yamlConfigPath)) {
      console.log(
        `${chalk.red("Error")}: No YAML config found at ${yamlConfigPath}`,
      );
      return;
    }

    let parsed: MferConfig;
    try {
      parsed = YAML.parse(fs.readFileSync(yamlConfigPath, "utf8"));
    } catch (error) {
      console.log(
        `${chalk.red("Error")}: Failed to parse YAML config\n${error}`,
      );
      return;
    }

    if (!parsed || typeof parsed !== "object") {
      console.log(`${chalk.red("Error")}: YAML config is empty or invalid`);
      return;
    }

    if (!isParsedConfigValid(parsed)) {
      console.log(
        `${chalk.red(
          "Error",
        )}: YAML config is missing required fields or is structurally invalid. Migration aborted.`,
      );
      return;
    }

    if (fs.existsSync(tomlConfigPath)) {
      try {
        const overwrite = await confirm({
          message: `${tomlConfigPath} already exists. Overwrite?`,
          default: false,
        });
        if (!overwrite) {
          console.log(chalk.yellow("Migration cancelled."));
          return;
        }
      } catch (error) {
        console.log(
          `${chalk.red("Error")}: Unable to prompt for overwrite\n${error}`,
        );
        return;
      }
    }

    try {
      fs.writeFileSync(
        tomlConfigPath,
        stringifyToml(parsed as unknown as Record<string, unknown>),
      );
    } catch (error) {
      console.log(
        `${chalk.red("Error")}: Failed to write TOML config\n${error}`,
      );
      return;
    }

    console.log(chalk.green(`Migrated config written to ${tomlConfigPath}`));

    let removeOld = false;
    try {
      removeOld = await confirm({
        message: `Delete the legacy ${yamlConfigPath}?`,
        default: false,
      });
    } catch (error) {
      console.log(
        `${chalk.yellow(
          "Warning",
        )}: Unable to prompt for legacy deletion — leaving legacy config in place\n${error}`,
      );
      return;
    }
    if (removeOld) {
      fs.unlinkSync(yamlConfigPath);
      console.log(chalk.green(`Removed ${yamlConfigPath}`));
    } else {
      console.log(
        chalk.yellow(
          `Legacy config left in place at ${yamlConfigPath}. You can delete it manually.`,
        ),
      );
    }
  });
