import { Test, TestingModule } from '@nestjs/testing';
import { ShowcaseController } from './showcase.controller';
import { ShowcaseService } from './showcase.service';

describe('ShowcaseController', () => {
  let controller: ShowcaseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShowcaseController],
      providers: [ShowcaseService],
    }).compile();

    controller = module.get<ShowcaseController>(ShowcaseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
