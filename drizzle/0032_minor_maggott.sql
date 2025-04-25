ALTER TABLE "order_subscriptions" ALTER COLUMN "status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "order_subscriptions" ADD COLUMN "order_id" varchar(255) NOT NULL;