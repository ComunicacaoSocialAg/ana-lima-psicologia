import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.execPath,
  [
    "--test",
    "functions/test/billing.test.mjs",
    "functions/test/vault.test.mjs",
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
