import { pgTable, serial, text, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { projects } from '../project/schema';  // Make sure to import projects schema
import { relations } from 'drizzle-orm';
import { orderSubscriptions } from '../order-subscription/schema';  // Adjust the path as needed
import { currentProject } from '../current-project/schema';
import { currentSubscriptions } from '../current-subscription/schema';
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    phone: varchar('phone', { length: 255 }).unique().notNull(),
    verificationToken: text('verification_token'),
    isVerified: boolean('is_verified').default(false),
    password: text('password').notNull(),
    accessToken: text('access_token'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
    projects: many(projects),
    orderSubscription: many(orderSubscriptions),
    currentProject: one(currentProject),
    currentSubscription: one(currentSubscriptions, {
        fields: [users.id],
        references: [currentSubscriptions.userId],
    }),
}));

