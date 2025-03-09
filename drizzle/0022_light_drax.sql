CREATE TYPE "public"."testimonial_source" AS ENUM('text', 'video', 'instagram', 'linkedin', 'whatsapp', 'facebook', 'tiktok', 'youtube', 'playstore', 'appstore', 'website', 'email', 'google_map', 'other');--> statement-breakpoint
CREATE TYPE "public"."testimonial_type" AS ENUM('text', 'video');--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_picture_path" varchar(255),
	"name" varchar(100) NOT NULL,
	"email" varchar(255),
	"position" varchar(100),
	"company" varchar(100),
	"website" varchar(255),
	"testimonial_text" text NOT NULL,
	"rating" integer DEFAULT 5,
	"type" "testimonial_type" DEFAULT 'text',
	"source" "testimonial_source" DEFAULT 'text',
	"path" varchar(255),
	"project_id" integer,
	"form_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;