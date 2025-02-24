import { pgTable, serial, text, varchar, timestamp, pgEnum, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { subscriptions } from '../subscription/schema';

// Create role enum
export const adminRoleEnum = pgEnum('admin_role', ['superadmin', 'admin', 'inputer']);


export const admins = pgTable('admins', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  password: text('password').notNull(),
  role: adminRoleEnum('role').notNull().default('inputer'),
  accessToken: text('access_token'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Default superadmin account
export const defaultSuperAdmin = {
  name: 'Super Admin',
  email: 'infohijra4@gmail.com',
  password: '1234lupa', // Note: This should be hashed before insertion
  role: 'superadmin',
} as const;


export const adminRelations = relations(admins, ({ many }) => ({
  subscriptions: many(subscriptions),
}));