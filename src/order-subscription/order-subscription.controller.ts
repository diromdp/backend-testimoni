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
  BadRequestException,
  Res
} from '@nestjs/common';
import { OrderSubscriptionService } from './order-subscription.service';
import { CreateOrderSubscriptionDto } from './dto/create-order-subscription.dto';
import { UpdateOrderSubscriptionDto } from './dto/update-order-subscription.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { AdminAuth } from '../admin/decorators/admin-auth.decorator';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { UserId } from '../common/decorators/user-id.decorator';
import { ConfigService } from '@nestjs/config';


@ApiTags('api/order-subscriptions')
@Controller('api/order-subscriptions')
export class OrderSubscriptionController {
  constructor(
    private readonly orderSubscriptionService: OrderSubscriptionService,
    private readonly configService: ConfigService
  ) { }

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

  @Auth()
  @Get('history')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Riwayat order subscription berhasil ditemukan' })
  async getUserOrderHistory(@Request() req) {
    try {
      const userId = req.user.sub;
      const result = await this.orderSubscriptionService.getUserOrderHistory(userId);

      return {
        status: 200,
        message: result.message,
        data: result.orders
      };
    } catch (error) {
      return {
        status: error.status || 500,
        message: error.message
      };
    }
  }

  // Midtrans Payment Integration
  @Auth()
  @Post('payment/create-token')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment token created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Failed to create payment token' })
  async createPaymentToken(@Body() body: { subscriptionId: number }, @Request() req) {
    try {
      const { subscriptionId } = body;
      const userId = req.user.sub;

      if (!subscriptionId) {
        throw new BadRequestException('Subscription ID is required');
      }

      const result = await this.orderSubscriptionService.generateSnapToken({
        userId,
        subscriptionId,
        userName: req.user.name,
        userEmail: req.user.email
      });

      return {
        status: 200,
        message: 'Payment token created successfully',
        data: result
      };
    } catch (error) {
      return {
        status: error.status || 500,
        message: error.message
      };
    }
  }

  @Post('payment/notification')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment notification processed successfully' })
  async handlePaymentNotification(@Body() notification: any) {
    try {
      // Verify the notification from Midtrans
      const verificationResult = await this.orderSubscriptionService.verifyPaymentNotification(notification);

      // Extract order ID and parse to get user and subscription info
      const { orderId, paymentStatus } = verificationResult;
      const orderParts = orderId.split('-');
      const userId = parseInt(orderParts[orderParts.length - 1]);


      // Extract subscription ID from the transaction
      const subscriptionId = notification.item_details &&
        notification.item_details[0] &&
        notification.item_details[0].id ?
        parseInt(notification.item_details[0].id.replace('SUB-', '')) :
        null;

      if (!subscriptionId) {
        throw new BadRequestException('Could not determine subscription ID from notification');
      }

      if (paymentStatus === 'SUCCESS') {
        // Create subscription order
        await this.orderSubscriptionService.create(
          userId,
          { subscriptionId },
          'system'
        );

        // Send success email
        const user = await this.orderSubscriptionService.getUserByOrderId(orderId);

        await this.orderSubscriptionService.sendPaymentSuccessEmail(user.email, {
          name: user.name,
          subscriptionName: notification.item_details[0].name,
          amount: notification.transaction_details.gross_amount,
          orderId: orderId
        });
      } else if (paymentStatus === 'PENDING') {
        // Send pending email
        const user = await this.orderSubscriptionService.getUserByOrderId(orderId);

        await this.orderSubscriptionService.sendPaymentPendingEmail(user.email, {
          name: user.name,
          subscriptionName: notification.item_details[0].name,
          orderId: orderId
        });
      } else {
        // Send failure email
        const user = await this.orderSubscriptionService.getUserByOrderId(orderId);

        await this.orderSubscriptionService.sendPaymentFailedEmail(user.email, {
          name: user.name,
          subscriptionName: notification.item_details[0].name,
          orderId: orderId
        });
      }

      return {
        status: 200,
        message: 'Payment notification processed successfully'
      };
    } catch (error) {
      console.error('Error handling payment notification:', error);
      return {
        status: error.status || 500,
        message: error.message
      };
    }
  }

  @Auth()
  @Get('payment/finish')
  async handleFinishRedirect(
    @Query('order_id') orderId: string,
    @Res() res: any,
    @Request() req
  ) {
    try {
      // Parse order ID to get user ID
      const userId = req.user.sub;

      const transactionStatus = await this.orderSubscriptionService.checkTransactionStatus(orderId);

      if ((transactionStatus.transaction_status === 'settlement' ||
        transactionStatus.transaction_status === 'capture') &&
        transactionStatus.fraud_status === 'accept') {

        // Extract subscription ID from the transaction
        const subscriptionId = transactionStatus.item_details &&
          transactionStatus.item_details[0] &&
          transactionStatus.item_details[0].id ?
          parseInt(transactionStatus.item_details[0].id.replace('SUB-', '')) :
          null;

        if (subscriptionId) {
          // Create subscription
          await this.orderSubscriptionService.create(
            userId,
            { subscriptionId },
            status:transactionStatus.transaction_status
          );

          // Send success email
          const user = await this.orderSubscriptionService.getUserByOrderId(orderId);

          await this.orderSubscriptionService.sendPaymentSuccessEmail(user.email, {
            name: user.name,
            subscriptionName: transactionStatus.item_details[0].name,
            amount: transactionStatus.transaction_details.gross_amount,
            orderId: orderId
          });
          return res.redirect(`${this.configService.get('BASE_URL')}/dashboard?payment=success`);
        }
      }
    } catch (error) {
      console.error('Error handling finish redirect:', error);
      return res.redirect(`${this.configService.get('BASE_URL')}/subscription?payment=error`);
    }
  }

  @Get('payment/error')
  async handleErrorRedirect(
    @Query('order_id') orderId: string,
    @Res() res: any
  ) {
    try {
      // Get user details
      const user = await this.orderSubscriptionService.getUserByOrderId(orderId);

      // Send notification email to customer
      await this.orderSubscriptionService.sendPaymentFailedEmail(user.email, {
        name: user.name,
        subscriptionName: 'Subscription', // Generic as we don't know which one
        orderId: orderId
      });

      return res.redirect(`${this.configService.get('BASE_URL')}/subscription?payment=failed`);
    } catch (error) {
      console.error('Error handling error redirect:', error);
      return res.redirect(`${this.configService.get('BASE_URL')}/subscription?payment=error`);
    }
  }

  @Get('payment/unfinish')
  async handleUnfinishRedirect(
    @Query('order_id') orderId: string,
    @Res() res: any
  ) {
    try {
      // Get user details
      const user = await this.orderSubscriptionService.getUserByOrderId(orderId);

      // Send notification email to customer
      await this.orderSubscriptionService.sendPaymentPendingEmail(user.email, {
        name: user.name,
        subscriptionName: 'Subscription', // Generic as we don't know which one
        orderId: orderId
      });

      return res.redirect(`${this.configService.get('BASE_URL')}/subscription?payment=pending`);
    } catch (error) {
      console.error('Error handling unfinish redirect:', error);
      return res.redirect(`${this.configService.get('BASE_URL')}/subscription?payment=error`);
    }
  }
}
