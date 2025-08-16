
import { createClient, Transaction } from "@libsql/client";
import "dotenv/config";
import fs from "fs/promises";
import path from "path";

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function executeAndLog(tx: Transaction, sql: string) {
    console.log(`  > Executing: ${sql.substring(0, 80)}...`);
    await tx.execute(sql);
}

async function runMigration(tx: Transaction, file: string) {
    console.log(`- Running migration: ${file}`);
    const filePath = path.join(MIGRATIONS_DIR, file);
    const migration = await import(filePath);
    
    if (typeof migration.up !== 'function') {
        throw new Error(`Migration file ${file} must export an 'up' function.`);
    }

    await migration.up(tx, executeAndLog);

    await tx.execute({
        sql: "INSERT INTO _migrations (name, applied_at) VALUES (?, ?)",
        args: [file, new Date().toISOString()]
    });
    console.log(`- Finished migration: ${file}`);
}


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

    try {
        // 1. Ensure migrations directory exists
        await fs.mkdir(MIGRATIONS_DIR, { recursive: true });

        // 2. Ensure migrations table exists
        await client.execute(`
            CREATE TABLE IF NOT EXISTS _migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                applied_at DATETIME NOT NULL
            );
        `);
        console.log("Checked `_migrations` table.");

        // 3. Get applied migrations
        const appliedMigrationsResult = await client.execute("SELECT name FROM _migrations ORDER BY name");
        const appliedMigrations = new Set(appliedMigrationsResult.rows.map((r: any) => r.name as string));
        console.log(`Found ${appliedMigrations.size} applied migrations.`);

        // 4. Get available migration files
        const availableMigrations = (await fs.readdir(MIGRATIONS_DIR)).filter(f => f.endsWith('.ts'));
        console.log(`Found ${availableMigrations.length} available migrations.`);

        // 5. Determine and run new migrations
        const newMigrations = availableMigrations.filter(m => !appliedMigrations.has(m));

        if (newMigrations.length === 0) {
            console.log("Database is up to date. No new migrations to run.");
            return;
        }

        console.log(`Found ${newMigrations.length} new migrations to apply.`);
        
        for (const migrationFile of newMigrations) {
            const tx = await client.transaction("write");
            try {
                await runMigration(tx, migrationFile);
                await tx.commit();
            } catch (e) {
                console.error(`Migration ${migrationFile} failed. Rolling back.`);
                await tx.rollback();
                throw e; // Stop execution on failure
            }
        }
        
        console.log("All new migrations applied successfully!");

    } catch (e) {
        console.error("Migration process failed:");
        console.error(e);
        process.exit(1);
    } finally {
        client.close();
        console.log("Database connection closed.");
    }
}

migrate();
