import { pgTable, serial, text, varchar, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { projects } from "../project/schema";
import { relations } from 'drizzle-orm';


export const showcase = pgTable('showcase', {
    id: serial('id').primaryKey(),
    projectId: integer('project_id').references(() => projects.id).notNull(),
    title: varchar('title', { length: 255 }).default(''),
    slug: varchar('slug', { length: 255 }).default(''),
    description: text('description').default(''),
    logo: text('logo').default(''),
    selectedTemplate: text('selected_template').default(''),
    primaryColor: text('primary_color').default(''),
    highlightColor: text('highlight_color').default(''),
    font: text('font').default(''),
    content: jsonb('content').default({}),
    heroContent: jsonb('hero_content').default({}),
    navigation: jsonb('navigation').default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    status: varchar('status', { length: 255 }).default('not-active'),
});

export const showcaseRelations = relations(showcase, ({ one }) => ({
    project: one(projects, {
        fields: [showcase.projectId],
        references: [projects.id],
    }),
}));