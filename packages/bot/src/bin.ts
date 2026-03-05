#!/usr/bin/env node
/**
 * EasyOref CLI entrypoint.
 *
 *   npx easyoref          — run the bot
 *   npx easyoref init     — interactive setup wizard
 */

const command = process.argv[2];

if (command === "init") {
  const { init } = await import("./init.js");
  await init();
} else if (command === "--help" || command === "-h") {
  console.log(`
  Usage:
    easyoref          Start the bot
    easyoref init     Interactive setup wizard
    easyoref --help   Show this message
`);
} else {
  await import("./bot.js");
}
