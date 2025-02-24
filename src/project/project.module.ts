import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { DatabaseModule } from '../database/database.module';
import { CurrentSubscriptionService } from '../current-subscription/current-subscription.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProjectController],
  providers: [
    ProjectService,
    CurrentSubscriptionService,
  ],
})
export class ProjectModule {}
