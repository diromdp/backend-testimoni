import { pgTable, serial, integer, boolean, timestamp, jsonb, varchar } from 'drizzle-orm/pg-core';
import { users } from '../user/schema';
import { subscriptions } from '../subscription/schema';
import { orderSubscriptions } from '../order-subscription/schema';
import { relations } from 'drizzle-orm';
export const currentSubscriptions = pgTable('current_subscriptions', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
    subscriptionId: integer('subscription_id').references(() => subscriptions.id).notNull(),
    orderSubscriptionId: integer('order_subscription_id').references(() => orderSubscriptions.id).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    nameSubscription: varchar('name_subscription', { length: 255 }),
    featureUsage: jsonb('feature_usage').notNull(),
    featureLimit: jsonb('feature_limit').notNull(),
    startDate: timestamp('start_date', { withTimezone: true, mode: 'date' }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true, mode: 'date' }).notNull(),
    nextBillingDate: timestamp('next_billing_date', { withTimezone: true, mode: 'date' }).notNull(),  
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
});

export const currentSubscriptionRelations = relations(currentSubscriptions, ({ one }) => ({
    user: one(users, {
        fields: [currentSubscriptions.userId],
        references: [users.id],
    }),
    subscription: one(subscriptions, {
        fields: [currentSubscriptions.subscriptionId],
        references: [subscriptions.id],
    }),
    orderSubscription: one(orderSubscriptions, {
        fields: [currentSubscriptions.orderSubscriptionId],
        references: [orderSubscriptions.id],
    }),
}));