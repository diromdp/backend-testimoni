import { Controller, Post, Body, Request, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/signin.dto';
import { Auth } from './decorators/auth.decorator';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  async signIn(@Body() signInDto: SignInDto) {
    try {
      const result = await this.authService.signIn(signInDto);
      return { status: 200, ...result };
    } catch (error) {
      return { status: 401, message: error.message };
    }
  }

  @Auth()
  @Post('logout')
  async logout(@Request() req) {
    try {
      const result = await this.authService.logout(req.user.sub);
      return { status: 200, ...result };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Request() req) {
    // Guard will handle the authentication
    
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Request() req) {
    try {
      const result = await this.authService.googleLogin(req);
      return { status: 200, ...result };
    } catch (error) {
      return { status: 401, message: error.message };
    }
  }
}
