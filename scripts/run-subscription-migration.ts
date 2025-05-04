import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config();

async function runMigration() {
  // Ensure DATABASE_URL is defined
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not defined');
  }

  console.log('Running subscription data migration...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const db = drizzle(pool);

    // Run the migration
    await migrate(db, { migrationsFolder: resolve(__dirname, '../drizzle') });

    console.log('Subscription data migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
}); 