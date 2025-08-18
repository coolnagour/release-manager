import type { Config } from "drizzle-kit";
import "dotenv/config";

const provider = process.env.DATABASE_PROVIDER || 'turso';

let config: Config;
console.log(`Using database provider: ${provider}`);
if (provider === 'supabase') {
  console.log("Using Supabase as the database provider");
  if (!process.env.SUPABASE_DATABASE_URL) {
    throw new Error("SUPABASE_DATABASE_URL is required when DATABASE_PROVIDER=supabase");
  }
console.log(process.env.SUPABASE_DATABASE_URL);
  config = {
    schema: "./src/lib/db/schema-pg.ts",
    out: "./src/lib/db/migrations-pg",
    dialect: "postgresql",
    dbCredentials: {
      url: process.env.SUPABASE_DATABASE_URL,
    },
    schemaFilter: ['public'],
    verbose: true,
    strict: true,
  } satisfies Config;
} else {
  // Default to Turso
  if (!process.env.TURSO_DATABASE_URL) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }

  if (!process.env.TURSO_AUTH_TOKEN) {
    throw new Error("TURSO_AUTH_TOKEN is not set");
  }

  config = {
    schema: "./src/lib/db/schema/index.ts",
    out: "./src/lib/db/migrations",
    dialect: "sqlite",
    driver: "turso",
    dbCredentials: {
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    },
    tablesFilter: ["!libsql_wasm_func_table"],
  } satisfies Config;
}

export default config;
