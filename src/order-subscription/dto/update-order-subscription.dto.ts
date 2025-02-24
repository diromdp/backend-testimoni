import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderSubscriptionDto } from './create-order-subscription.dto';

export class UpdateOrderSubscriptionDto extends PartialType(CreateOrderSubscriptionDto) {
  status?: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  isAutoRenew?: boolean;
} 