import { Test, TestingModule } from '@nestjs/testing';
import { CurrentSubscriptionService } from './current-subscription.service';

describe('CurrentSubscriptionService', () => {
  let service: CurrentSubscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CurrentSubscriptionService],
    }).compile();

    service = module.get<CurrentSubscriptionService>(CurrentSubscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
