/**
 * Dangerfile — PR quality checks for EasyOref
 *
 * Checks:
 * - No secrets in diff
 * - Package.json changes have lockfile update
 * - PR description exists
 */

import { danger, fail, warn } from "danger";

// ── No secrets in diff ───────────────────────────────────
const SECRET_PATTERNS = [
  /BOT_TOKEN=[0-9]+:/,
  /LOGTAIL_TOKEN=[a-zA-Z0-9]{10,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /ghp_[a-zA-Z0-9]{36}/,
];

const allFiles = [...danger.git.created_files, ...danger.git.modified_files];

for (const file of allFiles) {
  const diff = danger.git.diffForFile(file);
  if (diff) {
    diff.then((d) => {
      if (!d) return;
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(d.added)) {
          fail(`🚨 Possible secret in \`${file}\`. Remove before merging.`);
        }
      }
    });
  }
}

// ── PR description ───────────────────────────────────────
if (!danger.github.pr.body || danger.github.pr.body.length < 10) {
  warn("PR description is empty or too short. Please describe your changes.");
}

// ── Lockfile sync ────────────────────────────────────────
const packageChanged = allFiles.some((f) => f.includes("package.json"));
const lockChanged = allFiles.includes("package-lock.json");

if (packageChanged && !lockChanged) {
  warn(
    "package.json changed but package-lock.json wasn't updated. Run `npm install`.",
  );
}
