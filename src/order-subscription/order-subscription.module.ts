import { Module } from '@nestjs/common';
import { OrderSubscriptionService } from './order-subscription.service';
import { OrderSubscriptionController } from './order-subscription.controller';
import { DatabaseModule } from '../database/database.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [DatabaseModule, SubscriptionModule],
  controllers: [OrderSubscriptionController],
  providers: [OrderSubscriptionService],
})
export class OrderSubscriptionModule {}
