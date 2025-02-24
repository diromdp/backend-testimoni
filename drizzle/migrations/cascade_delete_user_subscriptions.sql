-- Update order_subscriptions foreign key to cascade on delete
ALTER TABLE "order_subscriptions" DROP CONSTRAINT "order_subscriptions_user_id_users_id_fk";
ALTER TABLE "order_subscriptions" ADD CONSTRAINT "order_subscriptions_user_id_users_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Update current_subscriptions foreign key to cascade on delete
ALTER TABLE "current_subscriptions" DROP CONSTRAINT "current_subscriptions_user_id_users_id_fk";
ALTER TABLE "current_subscriptions" ADD CONSTRAINT "current_subscriptions_user_id_users_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE; 