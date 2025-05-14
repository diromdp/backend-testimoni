import { Module } from '@nestjs/common';
import { WigdetService } from './wigdet.service';
import { WigdetController } from './wigdet.controller';
import { PublicWigdetController } from './public-wigdet.controller';
import { DatabaseModule } from '../database/database.module';
import { TestimonialService } from '../testimoni/testimoni.service';
import { TestimoniModule } from '../testimoni/testimoni.module';
import { CurrentSubscriptionModule } from '../current-subscription/current-subscription.module';
@Module({
  imports: [DatabaseModule, TestimoniModule, CurrentSubscriptionModule],
  controllers: [WigdetController, PublicWigdetController],
  providers: [WigdetService, TestimonialService],
  exports: [WigdetService]
})
export class WigdetModule {}
