ALTER TABLE "order_subscriptions" ALTER COLUMN "transaction_status" SET DATA TYPE varchar(225);--> statement-breakpoint
ALTER TABLE "order_subscriptions" ALTER COLUMN "gross_amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "order_subscriptions" ADD CONSTRAINT "order_subscriptions_order_payment_unique" UNIQUE("order_payment");