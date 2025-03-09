import { Test, TestingModule } from '@nestjs/testing';
import { TestimonialService } from './testimoni.service';

describe('TestimoniService', () => {
  let service: TestimonialService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TestimonialService],
    }).compile();

    service = module.get<TestimonialService>(TestimonialService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
