import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';
import * as schema from './schema'; // Adjust the path to your schema file
import 'dotenv/config';

async function runMigrations() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("Turso database URL and auth token are required for migrations.");
    process.exit(1); // Or handle the error appropriately
  }

  try {
    const client = createClient({
      url: dbUrl,
      authToken: authToken,
    });

    const db = drizzle(client, { schema });

    console.log("Starting database migration...");
    await migrate(db, { migrationsFolder: './src/lib/db/migrations' }); // Adjust path if needed
    console.log("Database migration finished successfully.");

  } catch (error) {
    console.error("Database migration failed:", error);
    process.exit(1); // Or handle the error appropriately
  } finally {
    // It's generally a good practice to close the client connection in a dedicated migration script
    // In a long-running application, you would manage the client lifecycle differently
    // client.close(); // The client might not have a close method depending on the implementation
  }
}

runMigrations();