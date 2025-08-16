
import { Transaction } from "@libsql/client";

// This migration is now idempotent. It first creates a temporary table,
// then renames it if the final table doesn't exist. This avoids errors
// on re-runs in environments where the schema might partially exist.
export async function up(tx: Transaction, executeAndLog: (tx: Transaction, sql: string) => Promise<void>) {
    await executeAndLog(tx, `
        CREATE TABLE IF NOT EXISTS application_users (
            application_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            PRIMARY KEY (application_id, user_id),
            FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
        );
    `);
}
