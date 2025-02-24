import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { admins, defaultSuperAdmin } from '../src/admin/schema';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function seed() {
  // Ensure DATABASE_URL is defined
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not defined');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const db = drizzle(pool);

    // Hash the password
    const hashedPassword = await bcrypt.hash(defaultSuperAdmin.password, 10);

    // Insert default superadmin if it doesn't exist
    await db.insert(admins).values({
      ...defaultSuperAdmin,
      password: hashedPassword,
    }).onConflictDoNothing({ target: admins.email });

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});