import type { Config } from "drizzle-kit";
import "dotenv/config";

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL is not set");
}

if (!process.env.TURSO_AUTH_TOKEN) {
    throw new Error("TURSO_AUTH_TOKEN is not set");
}

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  driver: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
  tablesFilter: ["!libsql_wasm_func_table"],
} satisfies Config;
