CREATE TABLE "showcase" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" varchar(255) DEFAULT '',
	"description" text DEFAULT '',
	"logo" text DEFAULT '',
	"selected_template" text DEFAULT '',
	"primary_color" text DEFAULT '',
	"highlight_color" text DEFAULT '',
	"font" text DEFAULT '',
	"content" jsonb DEFAULT '{}'::jsonb,
	"hero_content" jsonb DEFAULT '{}'::jsonb,
	"navigation" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "showcase" ADD CONSTRAINT "showcase_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;