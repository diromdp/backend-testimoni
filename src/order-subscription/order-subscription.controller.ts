import { 
  Controller, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Request, 
  Get,
  Query,
  HttpStatus,
  HttpCode,
  BadRequestException
} from '@nestjs/common';
import { OrderSubscriptionService } from './order-subscription.service';
import { CreateOrderSubscriptionDto } from './dto/create-order-subscription.dto';
import { UpdateOrderSubscriptionDto } from './dto/update-order-subscription.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { AdminAuth } from '../admin/decorators/admin-auth.decorator';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { UserId } from '../common/decorators/user-id.decorator';


@ApiTags('api/order-subscriptions')
@Controller('api/order-subscriptions')
export class OrderSubscriptionController {
  constructor(private readonly orderSubscriptionService: OrderSubscriptionService) {}

  // User endpoints
  @Auth()
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Order subscription created successfully' })
  create(@Body() createOrderSubscriptionDto: CreateOrderSubscriptionDto, @Request() req) {
    try {

      return this.orderSubscriptionService.create(req.user.sub, createOrderSubscriptionDto);
    } catch (error) {
      return { status: error.status || 500, message: error.message };
    }
  }

  @Auth()
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Order subscription updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Subscription not found' })
  
  update(@Param('id') id: string, @Body() updateOrderSubscriptionDto: UpdateOrderSubscriptionDto, @UserId() userId: number) {
    try {
      return this.orderSubscriptionService.update(+id, updateOrderSubscriptionDto, userId);
    } catch (error) {
      return { status: error.status || 500, message: error.message };
    }
  }

  // Admin endpoints
  @AdminAuth()
  @Post('admin/create')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Order subscription created by admin successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only superadmin can create order subscriptions' })
  async adminCreate(
    @Body() createOrderSubscriptionDto: CreateOrderSubscriptionDto & { userId: number },
    @Request() req
  ) {
    try {
      if (!createOrderSubscriptionDto.userId) {
        throw new BadRequestException('User ID is required');
      }
      return await this.orderSubscriptionService.create(
        createOrderSubscriptionDto.userId,
        createOrderSubscriptionDto
      );
    } catch (error) {
      return { status: error.status || 500, message: error.message };
    }
  }

  // @AdminAuth()
  // @Patch('admin/:id')
  // @ApiResponse({ status: HttpStatus.OK, description: 'Order subscription updated by admin successfully' })
  // @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only superadmin can update order subscriptions' })
  // async adminUpdate(
  //   @Param('id') id: string,
  //   @Body() updateOrderSubscriptionDto: UpdateOrderSubscriptionDto,
  //   @Request() req
  // ) {
  //   try {
  //     return await this.orderSubscriptionService.update(+id, updateOrderSubscriptionDto, req.user.role);
  //   } catch (error) {
  //     return { status: error.status || 500, message: error.message };
  //   }
  // }

  @AdminAuth()
  @Get('admin/list')
  @ApiResponse({ status: HttpStatus.OK, description: 'Order subscriptions retrieved successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only superadmin can view order subscriptions' })
  async adminList(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string
  ) {
    try {
      if (req.user.role !== 'superadmin') {
        throw new BadRequestException('Only superadmin can view order subscriptions');
      }
      return await this.orderSubscriptionService.findAll(page, limit, status);
    } catch (error) {
      return { status: error.status || 500, message: error.message };
    }
  }

  @AdminAuth()
  @Get('admin/:id')
  @ApiResponse({ status: HttpStatus.OK, description: 'Order subscription retrieved successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only superadmin can view order subscriptions' })
  async adminFindOne(@Param('id') id: string, @Request() req) {
    try {
      if (req.user.role !== 'superadmin') {
        throw new BadRequestException('Only superadmin can view order subscriptions');
      }
      return await this.orderSubscriptionService.findOne(+id);
    } catch (error) {
      return { status: error.status || 500, message: error.message };
    }
  }

  @AdminAuth()
  @Delete(':id')
  @ApiResponse({ status: HttpStatus.OK, description: 'Order subscription deleted successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only superadmin can delete order subscriptions' })
  remove(@Param('id') id: string, @Request() req) {
    return this.orderSubscriptionService.remove(+id, req.user.role);
  }
}
