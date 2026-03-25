#!/usr/bin/env node
/**
 * EasyOref CLI entrypoint.
 *
 *   easyoref              — run the bot (foreground)
 *   easyoref run          — same as above
 *   easyoref init         — interactive setup wizard
 *   easyoref update       — update to latest version
 *   easyoref install      — create systemd service + start
 *   easyoref uninstall    — remove systemd service
 *   easyoref start        — start service
 *   easyoref stop         — stop service
 *   easyoref restart      — restart service
 *   easyoref status       — show service status
 *   easyoref logs         — follow service logs
 */

import { execSync } from "node:child_process";

const command = process.argv[2];

switch (command) {
  case "init": {
    const { init } = await import("./init.js");
    await init();
    break;
  }

  case "update": {
    console.log("\n🚀 Updating EasyOref...\n");
    try {
      console.log("  → sudo npm install -g easyoref@latest");
      execSync("sudo npm install -g easyoref@latest", { stdio: "inherit" });

      // Ensure redis is running
      try {
        execSync("docker inspect easyoref-redis --format '{{.State.Running}}' 2>/dev/null | grep -q true", { stdio: "pipe" });
        console.log("\n  → redis already running");
      } catch {
        console.log("\n  → docker run redis");
        execSync(
          "docker run -d --name easyoref-redis --restart unless-stopped " +
          "-v easyoref-redis:/data " +
          "redis:7-alpine redis-server --appendonly yes --maxmemory 64mb --maxmemory-policy allkeys-lru",
          { stdio: "inherit" }
        );
      }

      console.log("\n  → sudo systemctl restart easyoref");
      execSync("sudo systemctl restart easyoref", { stdio: "inherit" });

      console.log("\n✅ EasyOref updated successfully!");
    } catch (err) {
      console.error("\n❌ Update failed:", err);
      process.exit(1);
    }
    break;
  }

  case "install": {
    const svc = await import("./service.js");
    svc.install();
    break;
  }

  case "uninstall": {
    const svc = await import("./service.js");
    svc.uninstall();
    break;
  }

  case "start": {
    const svc = await import("./service.js");
    svc.start();
    break;
  }

  case "stop": {
    const svc = await import("./service.js");
    svc.stop();
    break;
  }

  case "restart": {
    const svc = await import("./service.js");
    svc.restart();
    break;
  }

  case "status": {
    const svc = await import("./service.js");
    svc.status();
    break;
  }

  case "logs": {
    const svc = await import("./service.js");
    svc.logs();
    break;
  }

  case "--help":
  case "-h":
    console.log(`
  EasyOref — Telegram alert bot for Israeli civil defense

  Usage:
    easyoref              Run the bot (foreground)
    easyoref init         Interactive setup wizard
    easyoref update       Update to latest version

  Service management:
    easyoref install      Create systemd service & start
    easyoref uninstall    Remove systemd service
    easyoref start        Start service
    easyoref stop         Stop service
    easyoref restart      Restart service
    easyoref status       Show service status
    easyoref logs         Follow service logs
`);
    break;

  case "run":
  default:
    await import("./bot.js");
}
