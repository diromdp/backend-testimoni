ALTER TABLE "order_subscriptions" ALTER COLUMN "status" SET DEFAULT 'Pending';--> statement-breakpoint
ALTER TABLE "current_subscriptions" ADD COLUMN "feature_limit" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "current_subscriptions" ADD COLUMN "start_date" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "current_subscriptions" ADD COLUMN "end_date" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "current_subscriptions" ADD COLUMN "next_billing_date" timestamp NOT NULL;