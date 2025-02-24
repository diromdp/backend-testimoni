import { Test, TestingModule } from '@nestjs/testing';
import { CurrentProjectController } from './current-project.controller';
import { CurrentProjectService } from './current-project.service';

describe('CurrentProjectController', () => {
  let controller: CurrentProjectController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CurrentProjectController],
      providers: [CurrentProjectService],
    }).compile();

    controller = module.get<CurrentProjectController>(CurrentProjectController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
