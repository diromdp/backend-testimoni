import { Test, TestingModule } from '@nestjs/testing';
import { OrderSubscriptionController } from './order-subscription.controller';
import { OrderSubscriptionService } from './order-subscription.service';

describe('OrderSubscriptionController', () => {
  let controller: OrderSubscriptionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderSubscriptionController],
      providers: [OrderSubscriptionService],
    }).compile();

    controller = module.get<OrderSubscriptionController>(OrderSubscriptionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
