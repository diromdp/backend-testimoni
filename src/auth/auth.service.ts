import { Injectable, UnauthorizedException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SignInDto } from './dto/signin.dto';
import * as bcrypt from 'bcrypt';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../user/schema';
import * as subscriptionSchema from '../subscription/schema';
import * as currentSubscriptionSchema from '../current-subscription/schema';
import { eq } from 'drizzle-orm';
import { isValidEmail } from '../utils/validation';
import { CurrentSubscriptionService } from 'src/current-subscription/current-subscription.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private jwtService: JwtService,
    private readonly currentSubscriptionService: CurrentSubscriptionService,
  ) {}

  async signIn(signInDto: SignInDto) {
    if (!isValidEmail(signInDto.email)) {
      throw new BadRequestException('Format email tidak valid');
    }

    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, signInDto.email),
    });

    if (!user) {
      throw new UnauthorizedException('Email tidak ditemukan, silahkan cek kembali email Anda');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Silahkan verifikasi email terlebih dahulu');
    }

    const isPasswordValid = await bcrypt.compare(
      signInDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Password salah, silahkan coba lagi');
    }

    // Get current subscription information
    const currentSubscription = await this.db
      .select()
      .from(currentSubscriptionSchema.currentSubscriptions)
      .where(eq(currentSubscriptionSchema.currentSubscriptions.userId, user.id))
      .leftJoin(subscriptionSchema.subscriptions, eq(currentSubscriptionSchema.currentSubscriptions.subscriptionId, subscriptionSchema.subscriptions.id))
      .limit(1)
      .then(rows => rows[0]);

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      planType: currentSubscription?.subscriptions?.planType || null,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    // Update user's access token in database
    await this.db
      .update(schema.users)
      .set({ accessToken })
      .where(eq(schema.users.id, user.id));

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        planType: currentSubscription?.current_subscriptions.type || null,
        isVerified: user.isVerified,
      },
    };
  }

  async logout(userId: number) {
    // Clear the access token in the database
    await this.db
      .update(schema.users)
      .set({ accessToken: null })
      .where(eq(schema.users.id, userId));

    return {
      message: 'Logged out successfully'
    };
  }

  async googleLogin(req) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('No user data from Google');
      }

      const { email, firstName, lastName, picture } = req.user;

      if (!email) {
        throw new BadRequestException('Email is required from Google authentication');
      }

      // Check if user exists in database
      let user = await this.db.query.users.findFirst({
        where: eq(schema.users.email, email),
      });

      // If user doesn't exist, create new user
      if (!user) {
        this.logger.log(`Creating new user from Google authentication: ${email}`);
        const newUser = await this.db.insert(schema.users).values({
          email: email,
          name: `${firstName || ''} ${lastName || ''}`.trim(),
          phone: Math.random().toString().substring(2, 12),
          path: picture,
          password: await bcrypt.hash(Math.random().toString(36).substring(2, 15), 10), // Generate random password
          isVerified: true, // Google users are automatically verified
        }).returning();
        user = newUser[0];
        await this.currentSubscriptionService.setDefaultSubscription(user.id);
      }

      // Get current subscription information
      const currentSubscription = await this.db
        .select()
        .from(currentSubscriptionSchema.currentSubscriptions)
        .where(eq(currentSubscriptionSchema.currentSubscriptions.userId, user.id))
        .leftJoin(subscriptionSchema.subscriptions, eq(currentSubscriptionSchema.currentSubscriptions.subscriptionId, subscriptionSchema.subscriptions.id))
        .limit(1)
        .then(rows => rows[0]);

      const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        path: user.path,
        planType: currentSubscription?.subscriptions?.planType || null,
      };

      const accessToken = await this.jwtService.signAsync(payload);

      // Update user's access token in database
      await this.db
        .update(schema.users)
        .set({ accessToken })
        .where(eq(schema.users.id, user.id));

      return {
        access_token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          path: user.path,
          planType: currentSubscription?.current_subscriptions?.type || null,
          isVerified: user.isVerified,
        },
      };
    } catch (error) {
      this.logger.error(`Google authentication error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Failed to authenticate with Google: ' + error.message);
    }
  }
}
