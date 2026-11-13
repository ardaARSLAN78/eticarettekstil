import "dotenv/config";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || new URL(databaseUrl).pathname !== "/quantia_test")
  throw new Error(
    "Testler yalnızca /quantia_test veritabanında çalıştırılır. TEST_DATABASE_URL ayarlayın.",
  );
const cli = fileURLToPath(new URL("../../node_modules/prisma/build/index.js", import.meta.url));
const result = spawnSync(process.execPath, [cli, "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: databaseUrl },
});
process.exit(result.status ?? 1);
