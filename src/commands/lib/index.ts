import { Command } from "commander";
import buildCommand from "./build.js";
import deployCommand from "./deploy.js";
import publishCommand from "./publish.js";
import listCommand from "./list.js";

const libCommand = new Command("lib")
  .description("Manage internal npm packages and their distribution to micro frontends")
  .addCommand(buildCommand)
  .addCommand(deployCommand)
  .addCommand(publishCommand)
  .addCommand(listCommand);

export default libCommand;
