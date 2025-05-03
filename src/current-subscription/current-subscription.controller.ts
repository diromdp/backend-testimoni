import { Controller, Get, HttpCode, HttpStatus, Body, Param, Put, UseGuards } from '@nestjs/common';
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
}
