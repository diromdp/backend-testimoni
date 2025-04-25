ALTER TABLE "order_subscriptions" ADD COLUMN "payment_base" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "order_subscriptions" DROP COLUMN "payment";