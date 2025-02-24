CREATE TABLE "current_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subscription_id" integer NOT NULL,
	"order_subscription_id" integer NOT NULL,
	"feature_usage" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "current_subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "current_subscriptions" ADD CONSTRAINT "current_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "current_subscriptions" ADD CONSTRAINT "current_subscriptions_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "current_subscriptions" ADD CONSTRAINT "current_subscriptions_order_subscription_id_order_subscriptions_id_fk" FOREIGN KEY ("order_subscription_id") REFERENCES "public"."order_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_subscriptions" DROP COLUMN "remaining_features";--> statement-breakpoint
DROP TYPE "public"."subscription_plan_type";