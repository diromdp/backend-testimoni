import { Module } from '@nestjs/common';
import { CurrentProjectService } from './current-project.service';
import { CurrentProjectController } from './current-project.controller';
import { DatabaseModule } from '../database/database.module';
import { ProjectModule } from '../project/project.module';
import { UserModule } from '../user/user.module';
@Module({
  imports: [DatabaseModule, ProjectModule, UserModule], 
  controllers: [CurrentProjectController],
  providers: [CurrentProjectService],
})
export class CurrentProjectModule {}
