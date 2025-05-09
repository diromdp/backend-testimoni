import { Test, TestingModule } from '@nestjs/testing';
import { WigdetController } from './wigdet.controller';
import { WigdetService } from './wigdet.service';

describe('WigdetController', () => {
  let controller: WigdetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WigdetController],
      providers: [WigdetService],
    }).compile();

    controller = module.get<WigdetController>(WigdetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
