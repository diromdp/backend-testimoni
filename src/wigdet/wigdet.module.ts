import { Module } from '@nestjs/common';
import { WigdetService } from './wigdet.service';
import { WigdetController } from './wigdet.controller';

@Module({
  controllers: [WigdetController],
  providers: [WigdetService],
  exports: [WigdetService]
})
export class WigdetModule {}
