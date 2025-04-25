import { Module } from '@nestjs/common';
import { SubscriptionReminderService } from './subscription-reminder.service';
import { DatabaseModule } from '../database/database.module';
import { MailModule } from '../mail/mail.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    DatabaseModule,
    MailModule,
    ScheduleModule.forRoot(),
  ],
  providers: [SubscriptionReminderService],
  exports: [SubscriptionReminderService],
})
export class SubscriptionReminderModule {} 