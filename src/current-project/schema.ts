import { pgTable, serial, text, varchar, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { users } from '../user/schema';
import { relations } from 'drizzle-orm';
import { projects } from '../project/schema';


export const currentProject = pgTable('current_project', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    projectId: integer('project_id').references(() => projects.id).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const currentProjectRelations = relations(currentProject, ({ one }) => ({
    user: one(users, {
        fields: [currentProject.userId],
        references: [users.id],
    }),
    project: one(projects, {
        fields: [currentProject.projectId],
        references: [projects.id],
    }),
}));
