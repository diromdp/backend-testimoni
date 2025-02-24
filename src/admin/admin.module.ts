import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { DatabaseModule } from '../database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { AdminAuthGuard } from './guards/admin-auth.guard';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'f601fc1584d0be8cb1dab0208bac80a5eb92f8872ed893862da489e37a32f711',
      signOptions: { expiresIn: '2d' },
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthGuard],
})
export class AdminModule {}
