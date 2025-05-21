import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
      scope: ['profile', 'email', 'https://www.googleapis.com/auth/user.phonenumbers.read'],
      passReqToCallback: true,
    });
  }

  async validate(
    request: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { name, emails, photos, phoneNumbers } = profile;
      
      if (!emails || emails.length === 0) {
        this.logger.error('No email found in Google profile');
        return done(new Error('No email found in Google profile'), false);
      }

      // Note: Phone numbers won't be directly available in the profile object
      // You'll need to make a separate API call to the People API
      const user = {
        email: emails[0].value,
        firstName: name?.givenName || '',
        lastName: name?.familyName || '',
        picture: photos && photos.length > 0 ? photos[0].value : null,
        accessToken, // You'll need this token to make additional API calls
        phone: phoneNumbers && phoneNumbers.length > 0 ? phoneNumbers[0].value : null,
      };
      
      this.logger.log(`Successfully authenticated Google user: ${user.email}`);
      done(null, user);
    } catch (error) {
      this.logger.error(`Error validating Google auth: ${error.message}`, error.stack);
      done(error, false);
    }
  }
} 