import { Test, TestingModule } from '@nestjs/testing';
import { CurrentSubscriptionController } from './current-subscription.controller';
import { CurrentSubscriptionService } from './current-subscription.service';

describe('CurrentSubscriptionController', () => {
  let controller: CurrentSubscriptionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CurrentSubscriptionController],
      providers: [CurrentSubscriptionService],
    }).compile();

    controller = module.get<CurrentSubscriptionController>(CurrentSubscriptionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
