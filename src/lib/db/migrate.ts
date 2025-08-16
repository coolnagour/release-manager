
import { createClient } from "@libsql/client";
import "dotenv/config";

const schemaQueries = [
    `CREATE TABLE IF NOT EXISTS users (
      uid TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      display_name TEXT,
      photo_url TEXT,
      role TEXT NOT NULL,
      created_at DATETIME NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      package_name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(uid) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS application_users (
      application_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      PRIMARY KEY (application_id, user_email),
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS releases (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      version_name TEXT NOT NULL,
      version_code TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS conditions (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        name TEXT NOT NULL,
        rules_countries TEXT,
        rules_company_ids TEXT,
        rules_driver_ids TEXT,
        rules_vehicle_ids TEXT,
        created_at DATETIME NOT NULL,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS release_conditions (
        release_id TEXT NOT NULL,
        condition_id TEXT NOT NULL,
        PRIMARY KEY (release_id, condition_id),
        FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
        FOREIGN KEY (condition_id) REFERENCES conditions(id) ON DELETE CASCADE
    );`
];

async function migrate() {
    const dbUrl = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!dbUrl || !authToken) {
        console.error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in your environment variables.");
        process.exit(1);
    }
    
    console.log("Connecting to Turso database...");
    const client = createClient({
        url: dbUrl,
        authToken: authToken,
    });
    
    console.log("Applying schema migrations...");
    try {
        await client.batch(schemaQueries, "write");
        console.log("Schema migration successful!");
    } catch (e) {
        console.error("Schema migration failed:");
        console.error(e);
        process.exit(1);
    } finally {
        client.close();
    }
}

migrate();
