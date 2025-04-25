import { pgTable, serial, integer, timestamp, varchar, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../user/schema';
import { subscriptions } from '../subscription/schema';
import { currentSubscriptions } from '../current-subscription/schema';

export const orderSubscriptions = pgTable('order_subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  subscriptionId: integer('subscription_id').references(() => subscriptions.id).notNull(),
  orderPayment: varchar('order_payment', { length: 255 }),
  transactionStatus: varchar('transaction_status', { length: 225 }).notNull().default('PENDING'),
  paymentBase: jsonb('payment_base').default({}),
  grossAmount: integer('gross_amount').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const orderSubscriptionRelations = relations(orderSubscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [orderSubscriptions.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [orderSubscriptions.subscriptionId],
    references: [subscriptions.id],
  }),
  currentSubscription: many(currentSubscriptions),
})); 

