import { createClient } from '@libsql/client';
import 'dotenv/config';

async function resetDatabase() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("Missing Turso credentials");
    process.exit(1);
  }

  try {
    const client = createClient({
      url: dbUrl,
      authToken: authToken,
    });

    console.log("Resetting database...");
    
    // Get all tables except system tables
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const tableNames = tables.rows.map(row => row[0] as string);
    
    console.log("Found tables:", tableNames);
    
    if (tableNames.length === 0) {
      console.log("No tables to drop.");
      client.close();
      return;
    }
    
    // Disable foreign key constraints temporarily
    await client.execute("PRAGMA foreign_keys = OFF");
    
    // Drop all tables
    for (const tableName of tableNames) {
      console.log(`Dropping table: ${tableName}`);
      await client.execute(`DROP TABLE IF EXISTS "${tableName}"`);
    }
    
    // Re-enable foreign key constraints
    await client.execute("PRAGMA foreign_keys = ON");
    
    // Verify all tables are dropped
    const remainingTables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    
    if (remainingTables.rows.length === 0) {
      console.log("✅ All tables dropped successfully!");
    } else {
      console.log("⚠️ Some tables remain:", remainingTables.rows.map(row => row[0]));
    }
    
    client.close();

  } catch (error) {
    console.error("Database reset failed:", error);
    process.exit(1);
  }
}

resetDatabase();