
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from "@libsql/client";
import "dotenv/config";
import path from "path";

async function runMigrations() {
    const dbUrl = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!dbUrl || !authToken) {
        console.error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in your environment variables.");
        process.exit(1);
    }
    
    console.log("Connecting to Turso database for migration...");
    const client = createClient({
        url: dbUrl,
        authToken: authToken,
    });

    const db = drizzle(client);

    try {
        console.log("Starting database migration...");
        const migrationsFolder = path.join(__dirname, "migrations");
        await migrate(db, { migrationsFolder });
        console.log("Database migration completed successfully!");
    } catch (e) {
        console.error("Migration process failed:");
        console.error(e);
        process.exit(1);
    } finally {
        client.close();
        console.log("Database connection closed.");
    }
}

runMigrations();
