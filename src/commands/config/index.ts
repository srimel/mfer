import { Command } from "commander";
import { listConfigCommand } from "./sub-commands/list-config.js";
import { editConfigCommand } from "./sub-commands/edit-config.js";
import { migrateConfigCommand } from "./sub-commands/migrate.js";

/* TODO - support adding / modifying a group

Examples:
  - mfer config add -g myGroup -n repo1 repo2 repo3

*/

const configCommand = new Command("config").description(
  "configuration settings",
);

configCommand.addCommand(listConfigCommand);
configCommand.addCommand(editConfigCommand);
configCommand.addCommand(migrateConfigCommand);

export default configCommand;
