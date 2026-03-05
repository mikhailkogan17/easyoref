#!/usr/bin/env node
/**
 * @easyoref/cli — Interactive setup wizard
 *
 * Usage:
 *   npx @easyoref/cli init     — interactive setup
 *   npx @easyoref/cli list-areas — show all Oref area names
 */

import chalk from "chalk";
import { init } from "./commands/init.js";
import { listAreas } from "./commands/list-areas.js";

const command = process.argv[2];

async function main(): Promise<void> {
  console.log(chalk.bold("\n🚨 EasyOref — Setup Wizard\n"));

  switch (command) {
    case "init":
    case undefined:
      await init();
      break;
    case "list-areas":
      listAreas();
      break;
    case "--help":
    case "-h":
      printHelp();
      break;
    default:
      console.log(chalk.red(`Unknown command: ${command}`));
      printHelp();
      process.exit(1);
  }
}

function printHelp(): void {
  console.log(`${chalk.bold("Commands:")}
  ${chalk.cyan("init")}         Interactive setup wizard (default)
  ${chalk.cyan("list-areas")}   Show all Oref area names with translations
  ${chalk.cyan("--help")}       Show this help message
`);
}

main().catch((err) => {
  console.error(chalk.red("Fatal error:"), err);
  process.exit(1);
});
