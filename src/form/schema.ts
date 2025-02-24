import { pgTable, serial, text, varchar, boolean, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects } from '../project/schema';

export const forms = pgTable('forms', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  slug: varchar('slug', { length: 255 }).default(''),
  name: varchar('name', { length: 255 }).default(''),
  logo: varchar('logo', { length: 255 }).default(''),
  status: varchar('status', { length: 50 }).default(''),
  primaryColor: varchar('primary_color', { length: 50 }).default(''),
  backgroundColor: varchar('background_color', { length: 50 }).default(''),
  title: varchar('title', { length: 255 }).default(''),
  description: text('description').default(''),
  
  // Collection fields as JSON
  collectionEmail: jsonb('collection_email').$type<{
    enabled: boolean;
    required: boolean;
  }>(),
  collectionJobTitle: jsonb('collection_job_title').$type<{
    enabled: boolean;
    required: boolean;
  }>(),
  collectionUserPhoto: jsonb('collection_user_photo').$type<{
    enabled: boolean;
    required: boolean;
  }>(),
  collectionWebsiteUrl: jsonb('collection_website_url').$type<{
    enabled: boolean;
    required: boolean;
  }>(),
  collectionCompany: jsonb('collection_company').$type<{
    enabled: boolean;
    required: boolean;
  }>(),

  // Thank you page fields
  thankYouTitle: varchar('thank_you_title', { length: 255 }).default(''),
  thankYouDescription: text('thank_you_description').default(''),

  // Settings
  removeTestimonialBranding: boolean('remove_testimonial_branding').default(false),
  autoApproveTestimonials: boolean('auto_approve_testimonials').default(false),
  stopNewSubmissions: boolean('stop_new_submissions').default(false),
  pauseMessage: text('pause_message'),

  // Tags
  automaticTags: jsonb('automatic_tags').$type<{
    id: string;
    name: string;
  }[]>().default([]),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Add relations if needed
export const formRelations = relations(forms, ({ one }) => ({
  project: one(projects, {
    fields: [forms.projectId],
    references: [projects.id],
  }),
}));
