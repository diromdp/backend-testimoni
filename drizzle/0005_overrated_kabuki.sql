CREATE TYPE "public"."subscription_plan_type" AS ENUM('MONTHLY', 'YEARLY');--> statement-breakpoint
ALTER TABLE "subscriptions" RENAME COLUMN "duration" TO "plan_type";