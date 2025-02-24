ALTER TABLE "forms" ALTER COLUMN "slug" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "slug" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "name" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "logo" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "logo" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "primary_color" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "primary_color" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "background_color" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "background_color" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "status" varchar(50) DEFAULT '';