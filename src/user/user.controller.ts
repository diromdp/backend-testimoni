import { Controller, Get, Post, Body, Patch, Param, Request, BadRequestException, UseGuards, Put } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('api/user')
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
  @Put('profile')
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    try {
      if (!updateProfileDto.name && !updateProfileDto.email && !updateProfileDto.phone) {
        throw new BadRequestException('Setidaknya satu field (nama, email, atau nomor telepon) harus diisi');
      }
      const result = await this.userService.updateProfile(req.user.sub, updateProfileDto);
      return { status: 200, ...result };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }

  @Auth()
  @Put('password')
  async updatePassword(@Request() req, @Body() updatePasswordDto: UpdatePasswordDto) {
    try {
      const result = await this.userService.updatePassword(req.user.sub, updatePasswordDto);
      return { status: 200, ...result };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }
}
