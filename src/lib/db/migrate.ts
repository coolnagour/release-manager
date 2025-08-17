import { createClient } from '@libsql/client';
import 'dotenv/config';

async function runMigrations() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("Turso database URL and auth token are required for migrations.");
    process.exit(1);
  }

  try {
    const client = createClient({
      url: dbUrl,
      authToken: authToken,
    });

    console.log("Starting database migration...");
    
    // Check if all tables exist
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables.rows.map(row => row[0] as string);
    
    const requiredTables = ['applications', 'application_users', 'conditions', 'releases', 'release_conditions', 'users'];
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length === 0) {
      console.log("All tables exist. Migration has been applied successfully.");
      client.close();
      return;
    }
    
    console.log(`Missing tables: ${missingTables.join(', ')}`);
    console.log("Creating missing tables...");
    
    // Create all tables with IF NOT EXISTS
    const statements = [
      `CREATE TABLE IF NOT EXISTS applications (
        id text PRIMARY KEY NOT NULL,
        name text NOT NULL,
        package_name text NOT NULL,
        owner_id text NOT NULL,
        created_at integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        FOREIGN KEY (owner_id) REFERENCES users(uid) ON UPDATE no action ON DELETE cascade
      )`,
      
      `CREATE TABLE IF NOT EXISTS application_users (
        application_id text NOT NULL,
        user_id text NOT NULL,
        PRIMARY KEY(application_id, user_id),
        FOREIGN KEY (application_id) REFERENCES applications(id) ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY (user_id) REFERENCES users(uid) ON UPDATE no action ON DELETE cascade
      )`,
      
      `CREATE TABLE IF NOT EXISTS conditions (
        id text PRIMARY KEY NOT NULL,
        application_id text NOT NULL,
        name text NOT NULL,
        rules_countries text,
        rules_company_ids text,
        rules_driver_ids text,
        rules_vehicle_ids text,
        created_at integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON UPDATE no action ON DELETE cascade
      )`,
      
      `CREATE TABLE IF NOT EXISTS releases (
        id text PRIMARY KEY NOT NULL,
        application_id text NOT NULL,
        version_name text NOT NULL,
        version_code text NOT NULL,
        status text DEFAULT 'active' NOT NULL,
        created_at integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON UPDATE no action ON DELETE cascade
      )`,
      
      `CREATE TABLE IF NOT EXISTS release_conditions (
        release_id text NOT NULL,
        condition_id text NOT NULL,
        PRIMARY KEY(condition_id, release_id),
        FOREIGN KEY (release_id) REFERENCES releases(id) ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY (condition_id) REFERENCES conditions(id) ON UPDATE no action ON DELETE cascade
      )`,
      
      `CREATE TABLE IF NOT EXISTS users (
        uid text PRIMARY KEY NOT NULL,
        email text,
        display_name text,
        photo_url text,
        role text DEFAULT 'user' NOT NULL,
        created_at integer DEFAULT (strftime('%s', 'now')) NOT NULL
      )`,
      
      `CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)`
    ];
    
    for (const statement of statements) {
      await client.execute(statement);
    }
    
    console.log("Database migration finished successfully.");
    client.close();

  } catch (error) {
    console.error("Database migration failed:", error);
    process.exit(1);
  }
}

runMigrations();