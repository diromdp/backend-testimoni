ALTER TABLE "forms" ALTER COLUMN "title" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "title" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "description" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "thank_you_title" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "thank_you_title" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "thank_you_description" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "thank_you_description" DROP NOT NULL;