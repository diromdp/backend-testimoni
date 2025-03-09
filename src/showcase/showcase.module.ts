import { Module } from '@nestjs/common';
import { ShowcaseService } from './showcase.service';
import { ShowcaseController } from './showcase.controller';
import { DatabaseModule } from '../database/database.module';
import { CurrentSubscriptionService } from '../current-subscription/current-subscription.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ShowcaseController],
  providers: [ShowcaseService, CurrentSubscriptionService],
  exports: [ShowcaseService]
  
})
export class ShowcaseModule {}
