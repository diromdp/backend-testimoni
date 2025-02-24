import { pgTable, serial, text, varchar, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../user/schema';
import { currentProject } from '../current-project/schema';
import { forms } from '../form/schema';

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  slug: varchar('slug', { length: 255 }).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const projectRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],

  }),
  currentProject: one(currentProject, {
    fields: [projects.id],
    references: [currentProject.projectId],
  }),
  forms: many(forms),
}));
