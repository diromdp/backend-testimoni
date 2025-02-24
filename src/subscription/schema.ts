import { pgTable, serial, text, varchar, timestamp, pgEnum, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { admins } from '../admin/schema';
import { relations } from 'drizzle-orm';
import { orderSubscriptions } from '../order-subscription/schema';

export const subscriptions = pgTable('subscriptions', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    adminId: integer('admin_id').references(() => admins.id).notNull(),
    features: jsonb('features').notNull(),
    description: text('description'),
    position: integer('position').notNull(),
    price: integer('price').notNull(),
    planType: varchar('plan_type', { length: 50 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  });

  export const subscriptionRelations = relations(subscriptions, ({ one, many }) => ({
    admin: one(admins, {
      fields: [subscriptions.adminId],
      references: [admins.id],
    }),
    orderSubscription: many(orderSubscriptions),
  }));
  
