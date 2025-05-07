import { Controller, Get, HttpCode, HttpStatus, Body, Param, Put, UseGuards, Post } from '@nestjs/common';
import { CurrentSubscriptionService } from './current-subscription.service';
import { UserId } from 'src/common/decorators/user-id.decorator';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/auth/decorators/auth.decorator';

@ApiTags('api/current-subscription')
@Controller('api/current-subscription')
export class CurrentSubscriptionController {
  constructor(private readonly currentSubscriptionService: CurrentSubscriptionService) {}

  @Get()
  @Auth()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Current subscription retrieved successfully' })
  async getCurrentSubscription( @UserId() userId: number) {
    try {
      const subscription = await this.currentSubscriptionService.getCurrentSubscription(userId);
      return { status: 200, data: subscription };
    } catch (error) {
      return { status: error.status || 500, message: error.message };
    }
  }

  @Put()
  @Auth()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Feature usage updated successfully' })
  async updateFeatureUsage(
    @UserId() userId: number,
    @Body() featureUsage: Record<string, any>
  ) {
    try {
      const subscriptionOwn = await this.currentSubscriptionService.updateFeatureUsage(userId, featureUsage);
      return { status: 200, data: subscriptionOwn };
    } catch (error) {
      return { status: error.status || 500, message: error.message };
    }
  }

  @Get('premium-status/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Premium status retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async checkPremiumStatus(@Param('userId') userId: number) {
    try {
      const status = await this.currentSubscriptionService.checkPremiumStatus(userId);
      return { status: 200, data: status };
    } catch (error) {
      return { status: error.status || 500, message: error.message };
    }
  }

  @Get('premium-service')
  @Auth()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Premium status retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async checkPremiumService(@UserId() userId: number) {
    try {
      const status = await this.currentSubscriptionService.checkPremiumStatus(userId);
      return { status: 200, data: status };
    } catch (error) {
      return { status: error.status || 500, message: error.message };
    }
  }

  @Get('check-expiration')
  @Auth()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Subscription expiration check completed' })
  async checkSubscriptionExpiration(@UserId() userId: number) {
    try {
      const result = await this.currentSubscriptionService.checkAndUpdateSubscriptionExpiration(userId);
      return { 
        status: 200, 
        data: result,
        message: result.isExpiredAccount ? 'Subscription(s) status expired' : 'No expired subscriptions found' 
      };
    } catch (error) {
      return { status: error.status || 500, message: error.message };
    }
  }

  @Post('set-default')
  @Auth()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Default subscription set successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Failed to set default subscription' })
  async setDefaultSubscription(@UserId() userId: number) {
    console.log('userId', userId);
    try {
      const subscription = await this.currentSubscriptionService.setDefaultSubscription(userId);
      return { 
        status: 200, 
        data: subscription,
        message: 'Default subscription set successfully' 
      };
    } catch (error) {
      return { status: error.status || 500, message: error.message };
    }
  }
}
