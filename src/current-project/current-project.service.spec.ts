import { Test, TestingModule } from '@nestjs/testing';
import { CurrentProjectService } from './current-project.service';

describe('CurrentProjectService', () => {
  let service: CurrentProjectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CurrentProjectService],
    }).compile();

    service = module.get<CurrentProjectService>(CurrentProjectService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
