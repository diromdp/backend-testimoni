import { Test, TestingModule } from '@nestjs/testing';
import { WigdetService } from './wigdet.service';

describe('WigdetService', () => {
  let service: WigdetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WigdetService],
    }).compile();

    service = module.get<WigdetService>(WigdetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
