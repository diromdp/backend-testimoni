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
import { SubscriptionService } from '../subscription/subscription.service';
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
    private readonly configService: ConfigService,
    private readonly subscriptionService: SubscriptionService
  ) { }

  @Auth()
  @Get('payment/finish')
  async handleFinishRedirect(
    @Query('order_id') orderId: string,
    @Query('subscription_id') subscriptionId: number,
    @Request() req
  ) {
    try {
      // Parse order ID to get user ID
      const userId = req.user.sub;
      
      console.log('Received params:', { orderId, subscriptionId, userId });
  
      // Check if this orderPayment has already been processed
      const existingOrder = await this.orderSubscriptionService.getOrderPayment(orderId);
      const transactionStatus = await this.orderSubscriptionService.checkTransactionStatus(orderId);

      if (existingOrder) {
        return {
          status: 200,
          message: 'Payment has already been processed',
          data: {
            orderId: orderId,
            subscriptionId: subscriptionId,
            orderSubscriptionId: existingOrder.id,
            transaction_status: transactionStatus.transaction_status,
            payment_type: transactionStatus.payment_type,
            va_number: transactionStatus.va_number,
            gross_amount: transactionStatus.gross_amount,
          }
        };
      }
  
      // Periksa transactionStatus dari Midtrans
      console.log('Transaction status from Midtrans:', transactionStatus);
      
      const subscriptionName = await this.subscriptionService.findOnePublic(subscriptionId);
  
      // Perubahan kondisi: periksa lebih banyak status valid
      if (transactionStatus.transaction_status === 'settlement' || 
          transactionStatus.transaction_status === 'capture' || 
          transactionStatus.transaction_status === 'success') {
        
        if (subscriptionId) {
          console.log('Creating subscription for user:', userId, 'with subscription:', subscriptionId);

          const paymentBase = {
            payment_type: transactionStatus.payment_type,
            va_number: transactionStatus.va_number,
            gross_amount: transactionStatus.gross_amount,
          }
          
          // Set status ACTIVE untuk transaksi yang berhasil
          const newOrderSubscription = await this.orderSubscriptionService.create(
            userId,
            { subscriptionId, paymentBase },
            transactionStatus.transaction_status,
            orderId
          );
  
          console.log('New order subscription created:', newOrderSubscription);
  
          // Set subscription di current_subscriptions
          const result = await this.orderSubscriptionService.setSubscription(
            userId,
            subscriptionId,
            newOrderSubscription.orderSubscription.id
          );
          
          console.log('Subscription set result:', result);
  
          // Kirim email sukses
          const user = await this.orderSubscriptionService.getUserByOrderId(orderId);
          
          await this.orderSubscriptionService.sendPaymentSuccessEmail(user.email, {
            name: user.name,
            subscriptionName: `${subscriptionName.name} (${subscriptionName.type})`,
            amount: transactionStatus.gross_amount,
            orderId: orderId
          });
          
          return {
            status: 200,
            message: 'Payment successful',
            data: {
              orderId: orderId,
              subscriptionId: subscriptionId,
              transaction_status: transactionStatus.transaction_status,
              payment_type: transactionStatus.payment_type,
              va_number: transactionStatus.va_number,
              gross_amount: transactionStatus.gross_amount,
            }
          };
        } else {
          throw new BadRequestException('Subscription ID is required');
        }
      } else if (transactionStatus.transaction_status === 'pending') {
        // Untuk status pending, kembalikan informasi yang sesuai
        return {
          status: 202,
          message: 'Payment is pending',
          data: {
            orderId: orderId,
            subscriptionId: subscriptionId,
            transaction_status: transactionStatus.transaction_status,
            payment_type: transactionStatus.payment_type,
            va_number: transactionStatus.va_number,
            gross_amount: transactionStatus.gross_amount,
          }
        };
      } else {
        // Untuk status lain (deny, cancel, expire, dll)
        return {
          status: 400,
          message: `Payment failed with status: ${transactionStatus.transaction_status}`,
          data: {
            orderId: orderId,
            subscriptionId: subscriptionId,
            transaction_status: transactionStatus.transaction_status,
            payment_type: transactionStatus.payment_type,
            va_number: transactionStatus.va_number,
            gross_amount: transactionStatus.gross_amount,
          }
        };
      }
    } catch (error) {
      console.error('Error handling finish redirect:', error);
      return {
        status: 500,
        message: `Payment processing error: ${error.message}`,
        data: {
          orderId: orderId,
          error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      };
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
}
