import { Module } from '@nestjs/common';
import { FormService } from './form.service';
import { FormController } from './form.controller';
import { DatabaseModule } from '../database/database.module';
import { CurrentSubscriptionService } from 'src/current-subscription/current-subscription.service';
import { CurrentProjectService } from 'src/current-project/current-project.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FormController],
  providers: [FormService, CurrentSubscriptionService, CurrentProjectService],
  exports: [FormService],
})
export class FormModule {}
