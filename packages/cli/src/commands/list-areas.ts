/**
 * `easyoref list-areas` — Print all available Oref area names
 */

import chalk from "chalk";
import { AREA_CHOICES } from "../data/areas.js";

export function listAreas(): void {
  console.log(chalk.bold("Available Oref areas for AREAS env var:\n"));
  console.log(
    chalk.dim(
      "Copy the Hebrew name (right column) into your .env AREAS field.\n",
    ),
  );

  const maxName = Math.max(...AREA_CHOICES.map((c) => c.name.length));

  for (const choice of AREA_CHOICES) {
    const padded = choice.name.padEnd(maxName + 2);
    console.log(`  ${padded} ${chalk.cyan(choice.value)}`);
  }

  console.log(chalk.dim("\nExample: AREAS=תל אביב - דרום העיר ויפו,גוש דן"));
}
