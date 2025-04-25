import { Injectable, UnauthorizedException, BadRequestException, Inject } from '@nestjs/common';
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

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private jwtService: JwtService,
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
    if (!req.user) {
      throw new UnauthorizedException('No user from Google');
    }

    // Check if user exists in database
    let user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, req.user.email),
    });

    

    // If user doesn't exist, create new user
    if (!user) {
      const newUser = await this.db.insert(schema.users).values({
        email: req.user.email,
        name: `${req.user.firstName} ${req.user.lastName}`,
        phone: req.user.phone,
        password: await bcrypt.hash(Math.random().toString(36), 10), // Generate random password
        isVerified: true, // Google users are automatically verified
      }).returning();
      user = newUser[0];
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
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
      },
    };
  }
}
