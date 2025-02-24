ALTER TABLE "current_subscriptions" DROP CONSTRAINT "current_subscriptions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "order_subscriptions" DROP CONSTRAINT "order_subscriptions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "current_subscriptions" ADD CONSTRAINT "current_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_subscriptions" ADD CONSTRAINT "order_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;