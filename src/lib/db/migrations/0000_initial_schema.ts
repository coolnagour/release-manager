
import { Transaction } from "@libsql/client";

export async function up(tx: Transaction, executeAndLog: (tx: Transaction, sql: string) => Promise<void>) {
    await executeAndLog(tx, `
        CREATE TABLE users (
            uid TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            display_name TEXT,
            photo_url TEXT,
            role TEXT NOT NULL,
            created_at DATETIME NOT NULL
        );
    `);

    await executeAndLog(tx, `
        CREATE TABLE applications (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            package_name TEXT NOT NULL,
            owner_id TEXT NOT NULL,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (owner_id) REFERENCES users(uid) ON DELETE CASCADE
        );
    `);

    await executeAndLog(tx, `
        CREATE TABLE releases (
            id TEXT PRIMARY KEY,
            application_id TEXT NOT NULL,
            version_name TEXT NOT NULL,
            version_code TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
        );
    `);

    await executeAndLog(tx, `
        CREATE TABLE conditions (
            id TEXT PRIMARY KEY,
            application_id TEXT NOT NULL,
            name TEXT NOT NULL,
            rules_countries TEXT,
            rules_company_ids TEXT,
            rules_driver_ids TEXT,
            rules_vehicle_ids TEXT,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
        );
    `);

    await executeAndLog(tx, `
        CREATE TABLE release_conditions (
            release_id TEXT NOT NULL,
            condition_id TEXT NOT NULL,
            PRIMARY KEY (release_id, condition_id),
            FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
            FOREIGN KEY (condition_id) REFERENCES conditions(id) ON DELETE CASCADE
        );
    `);
}
