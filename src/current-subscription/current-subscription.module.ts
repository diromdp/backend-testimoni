import { Module } from '@nestjs/common';
import { CurrentSubscriptionService } from './current-subscription.service';
import { CurrentSubscriptionController } from './current-subscription.controller';
import { DatabaseModule } from 'src/database/database.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { OrderSubscriptionModule } from 'src/order-subscription/order-subscription.module';

@Module({
  imports: [DatabaseModule, SubscriptionModule, OrderSubscriptionModule],
  controllers: [CurrentSubscriptionController],
  providers: [CurrentSubscriptionService],
  exports: [CurrentSubscriptionService],
})
export class CurrentSubscriptionModule {}
