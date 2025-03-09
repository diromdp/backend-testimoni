import { relations } from "drizzle-orm";
import { 
  pgTable, 
  serial, 
  varchar, 
  text, 
  integer, 
  timestamp, 
  pgEnum,
} from "drizzle-orm/pg-core";
import { projects } from "../project/schema";
import { forms } from "../form/schema";

// Enum for testimonial types
// export const testimonialTypeEnum = pgEnum('testimonial_type', [
//   'text',
//   'video',
//   'import',
// ]);

// Enum for testimonial sources
export const testimonialSourceEnum = pgEnum('testimonial_source', [
  'text',
  'video',
  'instagram',
  'linkedin',
  'whatsapp',
  'facebook',
  'tiktok',
  'youtube',
  'playstore',
  'appstore',
  'website',
  'email',
  'google_map',
  'other'
]);

// Testimonial table
export const testimonials = pgTable('testimonials', {
  id: serial('id').primaryKey(),
  profilePicturePath: varchar('profile_picture_path', { length: 255 }),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  position: varchar('position', { length: 100 }),
  company: varchar('company', { length: 100 }),
  website: varchar('website', { length: 255 }),
  testimonialText: text('testimonial_text').notNull(),
  rating: integer('rating').default(5), // Assuming a 1-5 rating scale
  type: varchar('type', { length: 100 }),
  source: varchar('source', { length: 100 }),
  path: varchar('path', { length: 255 }),
  status: varchar('status', { length: 100 }),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
  formId: integer('form_id').references(() => forms.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const testimonialRelations = relations(testimonials, ({ one }) => ({
  project: one(projects, {
    fields: [testimonials.projectId],
    references: [projects.id],
  }),
  form: one(forms, {
    fields: [testimonials.formId],
    references: [forms.id],
  }),
}));
