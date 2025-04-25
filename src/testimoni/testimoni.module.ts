import { Module } from '@nestjs/common';
import { TestimonialService } from './testimoni.service';
import { TestimoniController } from './testimoni.controller';
import { PublicTestimoniController } from './public-testimoni.controller';
import { DatabaseModule } from '../database/database.module';
import { CurrentSubscriptionService } from '../current-subscription/current-subscription.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TestimoniController, PublicTestimoniController],
  providers: [TestimonialService, CurrentSubscriptionService],
  exports: [TestimonialService],
})
export class TestimoniModule {}
