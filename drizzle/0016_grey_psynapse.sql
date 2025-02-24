CREATE TABLE "forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"logo" varchar(255) NOT NULL,
	"primary_color" varchar(50) NOT NULL,
	"background_color" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"collection_email" jsonb,
	"collection_job_title" jsonb,
	"collection_user_photo" jsonb,
	"collection_website_url" jsonb,
	"collection_company" jsonb,
	"thank_you_title" varchar(255) NOT NULL,
	"thank_you_description" text NOT NULL,
	"remove_testimonial_branding" boolean DEFAULT false,
	"auto_approve_testimonials" boolean DEFAULT false,
	"stop_new_submissions" boolean DEFAULT false,
	"pause_message" text,
	"automatic_tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;