import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'f601fc1584d0be8cb1dab0208bac80a5eb92f8872ed893862da489e37a32f711',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '3d' },
    }),
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
  ],
})
export class AuthModule {}
