import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MailService } from '../mail/mail.service';
import { DatabaseModule } from '../database/database.module';
import { MailModule } from '../mail/mail.module';
import { CurrentSubscriptionModule } from 'src/current-subscription/current-subscription.module';

@Module({
  imports: [
    DatabaseModule,
    MailModule,
    CurrentSubscriptionModule,
  ],
  controllers: [UserController],
  providers: [UserService, MailService],
  exports: [UserService],
})
export class UserModule {}
