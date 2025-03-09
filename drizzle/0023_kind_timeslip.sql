ALTER TABLE "testimonials" ALTER COLUMN "type" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "testimonials" ALTER COLUMN "type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "testimonials" ALTER COLUMN "source" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "testimonials" ALTER COLUMN "source" DROP DEFAULT;--> statement-breakpoint
DROP TYPE "public"."testimonial_type";