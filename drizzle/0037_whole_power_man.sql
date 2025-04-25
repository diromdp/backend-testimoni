ALTER TABLE "order_subscriptions" RENAME COLUMN "payment_type" TO "payment";--> statement-breakpoint
ALTER TABLE "order_subscriptions" ALTER COLUMN "gross_amount" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "order_subscriptions" DROP COLUMN "va_number";