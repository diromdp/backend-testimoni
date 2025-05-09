import * as userSchema from '../user/schema';
import * as projectSchema from '../project/schema';
import * as testimonialSchema from '../testimoni/schema';
import * as widgetSchema from '../wigdet/schema';
import * as formSchema from '../form/schema';
import * as showcaseSchema from '../showcase/schema';
import * as currentProjectSchema from '../current-project/schema';

// Export all schemas to be imported in database.module.ts
export const schema = {
  ...userSchema,
  ...projectSchema,
  ...testimonialSchema,
  ...widgetSchema,
  ...formSchema,
  ...showcaseSchema,
  ...currentProjectSchema,
};

// Additional setup for foreign keys that can't be defined due to circular imports
export const setupRelations = (db) => {
  // Add foreign key constraint between widgets and projects
  widgetSchema.addForeignKeyConstraint(db, projectSchema.projects);
}; 