export class CreateOrderSubscriptionDto {
  subscriptionId: number;
  paymentBase: {
    payment_type: string;
    va_number: string;
    gross_amount: number;
  };
  isAutoRenew?: boolean;
} 