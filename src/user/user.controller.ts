import { Controller, Get, Post, Body, Patch, Param, Delete, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Auth } from '../auth/decorators/auth.decorator';

@Controller('api/user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    try {
      const result = await this.userService.register(createUserDto);
      return { status: 200, ...result };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }

  @Get('verify/:token')
  async verifyEmail(@Param('token') token: string) {
    try {
      const result = await this.userService.verifyEmail(token);
      return { status: 200, ...result };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }

  @Auth()
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
