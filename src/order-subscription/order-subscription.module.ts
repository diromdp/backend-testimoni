import { Module } from '@nestjs/common';
import { OrderSubscriptionService } from './order-subscription.service';
import { OrderSubscriptionController } from './order-subscription.controller';
import { DatabaseModule } from '../database/database.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [DatabaseModule, SubscriptionModule, MailModule],
  controllers: [OrderSubscriptionController],
  providers: [OrderSubscriptionService],
})
export class OrderSubscriptionModule {}
