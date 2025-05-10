import { Module } from '@nestjs/common';
import { WigdetService } from './wigdet.service';
import { WigdetController } from './wigdet.controller';
import { DatabaseModule } from '../database/database.module';


@Module({
  imports: [DatabaseModule],
  controllers: [WigdetController],
  providers: [WigdetService],
  exports: [WigdetService]
})
export class WigdetModule {}
