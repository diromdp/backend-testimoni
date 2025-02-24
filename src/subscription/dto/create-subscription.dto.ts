
export class CreateSubscriptionDto {
  name: string;
  features: {
    project: number;
    showcase: number;
    form: number;
    remove_brand: boolean;
    max_testimoni: number;
    video: number;
    unlimited_tag: boolean;
  };
  description: string;
  price: number;
  position: number;
  planType: 'MONTHLY' | 'YEARLY';
  type: 'free' | 'premium';
}
