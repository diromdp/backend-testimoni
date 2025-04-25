ALTER TABLE "order_subscriptions" RENAME COLUMN "start_date" TO "transaction_status";--> statement-breakpoint
ALTER TABLE "order_subscriptions" RENAME COLUMN "end_date" TO "payment_type";--> statement-breakpoint
ALTER TABLE "order_subscriptions" RENAME COLUMN "next_billing_date" TO "va_number";--> statement-breakpoint
ALTER TABLE "order_subscriptions" RENAME COLUMN "status" TO "gross_amount";--> statement-breakpoint
ALTER TABLE "order_subscriptions" DROP COLUMN "is_auto_renew";