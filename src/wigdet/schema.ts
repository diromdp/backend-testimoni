import { pgTable, serial, text, varchar, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { testimonials } from '../testimoni/schema';

export const widgets = pgTable('widgets', {
    id: serial('id').primaryKey(),
    projectId: integer('project_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 255 }).notNull(),
    showTestimonials: jsonb('show_testimonials').default([]),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
});

export const widgetsRelations = relations(widgets, ({ many }) => ({
    testimonials: many(testimonials),
}));

// This will be set up after all schemas are imported
export const setUpProjectRelations = (projects) => {
    return relations(projects, ({ many }) => ({
        widgets: many(widgets),
    }));
};

// Initialize foreign keys in a separate function to avoid circular dependencies
export const addForeignKeyConstraint = (db, projects) => {
    // This should be called after database initialization
    // Example usage: 
    // import { db } from './db';
    // import { projects } from './project/schema';
    // import { addForeignKeyConstraint } from './wigdet/schema';
    // addForeignKeyConstraint(db, projects);
    return db.execute(
      `ALTER TABLE widgets 
       ADD CONSTRAINT widget_project_fk 
       FOREIGN KEY (project_id) 
       REFERENCES projects(id) 
       ON DELETE CASCADE`
    );
};

