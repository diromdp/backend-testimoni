import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './user/user.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { OrderSubscriptionModule } from './order-subscription/order-subscription.module';
import { ProjectModule } from './project/project.module';
import { CurrentProjectModule } from './current-project/current-project.module';
import { CurrentSubscriptionModule } from './current-subscription/current-subscription.module';
import { FormModule } from './form/form.module';
import { AssetModule } from './asset/asset.module';
import { TagModule } from './tag/tag.module';
import { TestimoniModule } from './testimoni/testimoni.module';
import { ShowcaseModule } from './showcase/showcase.module';
import { SubscriptionReminderModule } from './subscription-reminder/subscription-reminder.module';
import { WigdetModule } from './wigdet/wigdet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    DatabaseModule,
    UserModule,
    AuthModule,
    AdminModule,
    SubscriptionModule,
    OrderSubscriptionModule,
    ProjectModule,
    CurrentProjectModule,
    CurrentSubscriptionModule,
    FormModule,
    AssetModule,
    TagModule,
    TestimoniModule,
    ShowcaseModule,
    SubscriptionReminderModule,
    WigdetModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
