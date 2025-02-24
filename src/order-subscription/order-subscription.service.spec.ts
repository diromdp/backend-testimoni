import { Test, TestingModule } from '@nestjs/testing';
import { OrderSubscriptionService } from './order-subscription.service';

describe('OrderSubscriptionService', () => {
  let service: OrderSubscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderSubscriptionService],
    }).compile();

    service = module.get<OrderSubscriptionService>(OrderSubscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
