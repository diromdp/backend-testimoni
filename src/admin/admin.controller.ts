import { Controller, Post, Body, Get, Put, Delete, Param, Request, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminSignInDto } from './dto/admin-signin.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminAuth } from './decorators/admin-auth.decorator';

@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('signin')
  async signIn(@Body() signInDto: AdminSignInDto) {
    try {
      const result = await this.adminService.signIn(signInDto);
      return { status: 200, ...result };
    } catch (error) {
      return { status: 401, message: error.message };
    }
  }

  @AdminAuth()
  @Post('logout')
  async logout(@Request() req) {
    try {
      const result = await this.adminService.logout(req.user.sub);
      return { status: 200, ...result };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }

  @AdminAuth()
  @Post('create')
  async createAdmin(@Body() createAdminDto: CreateAdminDto, @Request() req) {
    try {
      const result = await this.adminService.createAdmin(createAdminDto, req.user.role);
      return { status: 200, ...result };
    } catch (error) {
      return { status: error.status || 500, message: error.message };
    }
  }

  @AdminAuth()
  @Get()
  async findAll(@Request() req) {
    try {
      const admins = await this.adminService.findAll(req.user.role);
      return { status: 200, data: admins };
    } catch (error) {
      return { status: error.status || 500, message: error.message };
    }
  }

  @AdminAuth()
  @Put(':id')
  async updateAdmin(
    @Param('id') id: string,
    @Body() updateAdminDto: UpdateAdminDto,
    @Request() req,
  ) {
    try {
      const result = await this.adminService.updateAdmin(+id, updateAdminDto, req.user.role);
      return { status: 200, ...result };
    } catch (error) {
      return { status: error.status || 500, message: error.message };
    }
  }

  @AdminAuth()
  @Delete(':id')
  async deleteAdmin(@Param('id') id: string, @Request() req) {
    try {
      const result = await this.adminService.deleteAdmin(+id, req.user.role);
      return { status: 200, ...result };
    } catch (error) {
      return { status: error.status || 500, message: error.message };
    }
  }

  @AdminAuth()
  @Get('profile')
  async getOwnProfile(@Request() req) {
    return this.adminService.getOwnProfile(req.user.sub);
  }
}
