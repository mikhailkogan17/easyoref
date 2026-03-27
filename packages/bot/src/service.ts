/**
 * EasyOref — systemd service management (multi-instance aware)
 *
 * Discovers all config files in ~/.easyoref/:
 *   config.yaml           → service "easyoref"          (legacy / single-instance)
 *   config.{name}.yaml    → service "easyoref-{name}"   (named instances)
 *
 * Commands:
 *   easyoref install              — install all discovered instances
 *   easyoref uninstall [name]     — uninstall all (or one)
 *   easyoref start    [name]      — start all (or one)
 *   easyoref stop     [name]      — stop all (or one)
 *   easyoref restart  [name]      — restart all (or one)
 *   easyoref status   [name]      — show status for all (or one)
 *   easyoref logs     [name]      — follow logs for one (or first discovered)
 */

import { execSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const CONFIG_DIR = join(homedir(), ".easyoref");
const SYSTEMD_DIR = "/etc/systemd/system";

// ── Instance discovery ────────────────────────────────────

export interface ServiceInstance {
  /** systemd service name, e.g. "easyoref" or "easyoref-ru_tlv-south" */
  serviceName: string;
  /** absolute path to config file */
  configPath: string;
}

/**
 * Scans ~/.easyoref/ and returns one ServiceInstance per config file found.
 * config.yaml          → { serviceName: "easyoref", ... }
 * config.{name}.yaml   → { serviceName: "easyoref-{name}", ... }
 */
export function discoverInstances(): ServiceInstance[] {
  if (!existsSync(CONFIG_DIR)) return [];

  const instances: ServiceInstance[] = [];

  // Named configs first: config.*.yaml
  try {
    const files = readdirSync(CONFIG_DIR);
    for (const f of files.sort()) {
      const m = f.match(/^config\.(.+)\.ya?ml$/);
      if (m) {
        instances.push({
          serviceName: `easyoref-${m[1]}`,
          configPath: join(CONFIG_DIR, f),
        });
      }
    }
  } catch {
    // ignore read errors
  }

  // Legacy single-instance: config.yaml (only if no named configs)
  const legacyPath = join(CONFIG_DIR, "config.yaml");
  const legacyPathYml = join(CONFIG_DIR, "config.yml");
  const legacyExists = existsSync(legacyPath) || existsSync(legacyPathYml);

  if (legacyExists && instances.length === 0) {
    instances.push({
      serviceName: "easyoref",
      configPath: existsSync(legacyPath) ? legacyPath : legacyPathYml,
    });
  }

  return instances;
}

// ── Helpers ───────────────────────────────────────────────

function whichBin(): string {
  try {
    return execSync("which easyoref", { encoding: "utf-8" }).trim();
  } catch {
    try {
      return execSync("npm bin -g", { encoding: "utf-8" }).trim() + "/easyoref";
    } catch {
      return "/usr/bin/easyoref";
    }
  }
}

function whichNode(): string {
  try {
    return execSync("which node", { encoding: "utf-8" }).trim();
  } catch {
    return "/usr/bin/node";
  }
}

function sudoExec(cmd: string): void {
  const parts = cmd.split(" ");
  const result = spawnSync("sudo", parts, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`❌ Command failed: sudo ${cmd}`);
    process.exit(1);
  }
}

function unitPath(serviceName: string): string {
  return join(SYSTEMD_DIR, `${serviceName}.service`);
}

function isInstalled(serviceName: string): boolean {
  return existsSync(unitPath(serviceName));
}

function generateUnit(instance: ServiceInstance): string {
  const bin = whichBin();
  const node = whichNode();
  const user = process.env.USER || process.env.LOGNAME || "pi";
  const home = homedir();

  return `[Unit]
Description=EasyOref — ${instance.serviceName}
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${user}
Environment=HOME=${home}
Environment=NODE_ENV=production
Environment=EASYOREF_CONFIG=${instance.configPath}
ExecStart=${node} ${bin} run
WorkingDirectory=${home}
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
`;
}

function filterByName(
  instances: ServiceInstance[],
  name: string | undefined,
): ServiceInstance[] {
  if (!name) return instances;
  // Accept short name ("ru_tlv-south") or full service name ("easyoref-ru_tlv-south")
  const fullName = name.startsWith("easyoref") ? name : `easyoref-${name}`;
  const found = instances.filter((i) => i.serviceName === fullName);
  if (found.length === 0) {
    console.error(`❌ No instance found for: ${name}`);
    console.error(
      `   Known instances: ${instances.map((i) => i.serviceName).join(", ")}`,
    );
    process.exit(1);
  }
  return found;
}

// ── Commands ──────────────────────────────────────────────

export function install(): void {
  const instances = discoverInstances();

  if (instances.length === 0) {
    console.error(`❌ No config files found in ${CONFIG_DIR}`);
    console.error(`   Run: easyoref init`);
    process.exit(1);
  }

  console.log(
    `📦 Installing ${instances.length} EasyOref service(s)...\n`,
  );

  // Stop + disable any stale installed easyoref* units not in current set
  try {
    const installed = readdirSync(SYSTEMD_DIR).filter(
      (f) => f.startsWith("easyoref") && f.endsWith(".service"),
    );
    const newNames = new Set(instances.map((i) => `${i.serviceName}.service`));
    for (const stale of installed) {
      if (!newNames.has(stale)) {
        const name = stale.replace(".service", "");
        console.log(`  🗑  Removing stale service: ${name}`);
        try {
          sudoExec(`systemctl stop ${name}`);
        } catch {
          // ignore if not running
        }
        sudoExec(`systemctl disable ${name}`);
        sudoExec(`rm ${join(SYSTEMD_DIR, stale)}`);
      }
    }
  } catch {
    // /etc/systemd/system may not be readable without sudo — skip stale cleanup
  }

  for (const instance of instances) {
    const unit = generateUnit(instance);
    const tmpPath = `/tmp/${instance.serviceName}.service`;
    writeFileSync(tmpPath, unit);

    sudoExec(`cp ${tmpPath} ${unitPath(instance.serviceName)}`);
    console.log(`  ✓ Unit written: ${unitPath(instance.serviceName)}`);
  }

  sudoExec("systemctl daemon-reload");

  for (const instance of instances) {
    sudoExec(`systemctl enable ${instance.serviceName}`);
    sudoExec(`systemctl restart ${instance.serviceName}`);
    console.log(`  ✓ ${instance.serviceName} enabled & started`);
    console.log(`    Config: ${instance.configPath}`);
  }

  console.log(`\n✅ All services installed and running`);
  console.log(`   Logs:   easyoref logs`);
  console.log(`   Status: easyoref status`);
}

export function uninstall(name?: string): void {
  const all = discoverInstances();
  const targets = name ? filterByName(all, name) : all;

  if (targets.length === 0) {
    // Fall back to any installed easyoref* units even if configs are missing
    console.log("ℹ️  No config-based instances found. Nothing to uninstall.");
    return;
  }

  for (const instance of targets) {
    if (!isInstalled(instance.serviceName)) {
      console.log(`ℹ️  ${instance.serviceName}: not installed`);
      continue;
    }
    console.log(`🗑  Removing ${instance.serviceName}...`);
    sudoExec(`systemctl stop ${instance.serviceName}`);
    sudoExec(`systemctl disable ${instance.serviceName}`);
    sudoExec(`rm ${unitPath(instance.serviceName)}`);
    console.log(`  ✓ Removed`);
  }

  sudoExec("systemctl daemon-reload");
  console.log("✅ Done");
}

export function start(name?: string): void {
  const all = discoverInstances();
  if (all.length === 0) {
    console.log("Service not installed — run: easyoref install");
    return;
  }
  const targets = filterByName(all, name);
  for (const instance of targets) {
    if (!isInstalled(instance.serviceName)) {
      console.log(`  ${instance.serviceName}: not installed, skipping`);
      continue;
    }
    sudoExec(`systemctl start ${instance.serviceName}`);
    console.log(`  ✓ Started: ${instance.serviceName}`);
  }
}

export function stop(name?: string): void {
  const all = discoverInstances();
  if (all.length === 0) {
    console.log("ℹ️  No instances configured");
    return;
  }
  const targets = filterByName(all, name);
  for (const instance of targets) {
    if (!isInstalled(instance.serviceName)) {
      console.log(`  ${instance.serviceName}: not installed, skipping`);
      continue;
    }
    sudoExec(`systemctl stop ${instance.serviceName}`);
    console.log(`  ✓ Stopped: ${instance.serviceName}`);
  }
}

export function restart(name?: string): void {
  const all = discoverInstances();
  if (all.length === 0) {
    console.log("No instances configured — run: easyoref install");
    return;
  }
  const targets = filterByName(all, name);
  for (const instance of targets) {
    if (!isInstalled(instance.serviceName)) {
      console.log(`  ${instance.serviceName}: not installed, skipping`);
      continue;
    }
    sudoExec(`systemctl restart ${instance.serviceName}`);
    console.log(`  ✓ Restarted: ${instance.serviceName}`);
  }
}

export function status(name?: string): void {
  const all = discoverInstances();
  if (all.length === 0) {
    console.log("ℹ️  No instances configured. Run: easyoref install");
    return;
  }
  const targets = filterByName(all, name);
  const names = targets.map((i) => i.serviceName);
  spawnSync("systemctl", ["status", ...names, "--no-pager", "-l"], {
    stdio: "inherit",
  });
}

export function logs(name?: string): void {
  const all = discoverInstances();
  if (all.length === 0) {
    console.log("ℹ️  No instances configured. Run: easyoref install");
    return;
  }
  // logs follows a single unit; pick the specified one or the first
  const target = name ? filterByName(all, name)[0] : all[0];
  spawnSync(
    "journalctl",
    ["-u", target.serviceName, "-f", "--no-pager", "-o", "cat"],
    { stdio: "inherit" },
  );
}
