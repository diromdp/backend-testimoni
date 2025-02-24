import { Controller, Get, Post, Body, Patch, Param, Delete, Request, HttpCode, HttpException, HttpStatus } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { AdminAuth } from '../admin/decorators/admin-auth.decorator';
import { AdminId, Role } from '../common/decorators/admin-id.decorator';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('api/subscriptions')
@Controller('api/subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @AdminAuth()
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Subscription created successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only superadmin can create subscriptions' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Internal server error' })
  async create(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
     @AdminId() adminId: number, 
     @Role() role: string
  ) {
    try {
      if (role !== 'superadmin') {
        throw new HttpException(
          'Only superadmin can create subscriptions',
          HttpStatus.FORBIDDEN
        );
      }
      const result = await this.subscriptionService.create(
        createSubscriptionDto,
        adminId
      );
      return { status: 200, ...result };
    } catch (error) {
      return { status: error.status || 500, message: error.message };
    }
  }

  @AdminAuth()
  @Get('all')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Subscriptions fetched successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only superadmin can fetch subscriptions' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Internal server error' })
  async findAll(@Request() req) {
    try {
      const subscriptions = await this.subscriptionService.findAll(req.user.role);
      return { status: 200, data: subscriptions };
    } catch (error) {
      return { status: error.status || 500, message: error.message };
    }
  }

  @AdminAuth()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Subscription fetched successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only superadmin can fetch subscriptions' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Subscription not found' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Internal server error' })
  async findOne(@Param('id') id: string, @Request() req) {
    try {
      const subscription = await this.subscriptionService.findOne(+id, req.user.role);
      return { status: 200, data: subscription };
    } catch (error) {
      return { status: error.status || 500, message: error.message };
    }
  }

  @AdminAuth()
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Subscription updated successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only superadmin can update subscriptions' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Subscription not found' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Internal server error' })
  async update(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
    @Request() req,
  ) {
    try {
      const result = await this.subscriptionService.update(
        +id,
        updateSubscriptionDto,
        req.user.role,
      );
      return result;
    } catch (error) {
      throw new HttpException(
        {
          status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @AdminAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Subscription deleted successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only superadmin can delete subscriptions' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Subscription not found' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Internal server error' })
  async remove(@Param('id') id: string, @Request() req) {
    try {
      const result = await this.subscriptionService.remove(+id, req.user.role);
      return { status: 200, ...result };
    } catch (error) {
      return { status: error.status || 500, message: error.message };
    }
  }

  @Get('public/all')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Public subscriptions fetched successfully' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Internal server error' })
  async findAllPublic() {
    try {
      const subscriptions = await this.subscriptionService.findAllPublic();
      if (!subscriptions || subscriptions.length === 0) {
        return {
          status: HttpStatus.OK,
          message: 'No subscriptions found',
          data: []
        };
      }
      return {
        status: HttpStatus.OK,
        message: 'Subscriptions fetched successfully',
        data: subscriptions
      };
    } catch (error) {
      throw new HttpException(
        {
          status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Internal server error',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
