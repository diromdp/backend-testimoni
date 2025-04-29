import { Test, TestingModule } from '@nestjs/testing';
import { TestimonialService } from './testimoni.service';
import { CreateTestimoniDto } from './dto/create-testimoni.dto';
import { PaginateQuery } from 'nestjs-paginate';

describe('TestimonialService', () => {
  let service: TestimonialService;
  let mockDb: any;
  let mockCurrentSubscriptionService: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: 1, name: 'Test Testimonial' }]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue([{ count: 10 }]),
      transaction: jest.fn().mockImplementation(callback => callback(mockDb)),
    };

    mockCurrentSubscriptionService = {
      getCurrentSubscription: jest.fn().mockResolvedValue({
        featureUsage: {
          max_testimoni: 10,
          import_social_media: 5,
          video: 3
        }
      }),
      updateFeatureUsage: jest.fn().mockResolvedValue(true)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestimonialService,
        {
          provide: 'DB',
          useValue: mockDb
        },
        {
          provide: 'CurrentSubscriptionService',
          useValue: mockCurrentSubscriptionService
        }
      ],
    }).compile();

    service = module.get<TestimonialService>(TestimonialService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a testimonial and update feature usage', async () => {
      const userId = 1;
      const projectId = 2;
      const formId = 3;
      const createTestimonialDto = {
        name: 'John Doe',
        content: 'Great service!',
        source: 'text',
        type: 'manual',
        testimonialText: 'Great service!'
      };

      const result = await service.create(userId, projectId, createTestimonialDto as CreateTestimoniDto, formId);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockCurrentSubscriptionService.getCurrentSubscription).toHaveBeenCalledWith(userId);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
        ...createTestimonialDto,
        projectId,
        formId
      }));
      expect(mockCurrentSubscriptionService.updateFeatureUsage).toHaveBeenCalled();
      expect(result).toHaveProperty('message', 'Testimonial berhasil dibuat');
      expect(result).toHaveProperty('testimonial');
    });
  });

  describe('findAll', () => {
    it('should return paginated testimonials', async () => {
      const query = { limit: 10, page: 1 };
      const projectId = 1;
      const type = 'manual';

      mockDb.then.mockResolvedValueOnce([{ id: 1, name: 'Test' }]);
      
      const result = await service.findAll(query as PaginateQuery, projectId, type);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result).toHaveProperty('links');
    });
  });

  describe('findOne', () => {
    it('should return a testimonial by id', async () => {
      const id = 1;
      const projectId = 2;

      const result = await service.findOne(id, projectId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(1);
    });
  });

  describe('updateTestimonialStatus', () => {
    it('should update testimonial status', async () => {
      const id = 1;
      const status = 'approved';

      mockDb.returning.mockResolvedValueOnce([{ id: 1, status: 'approved' }]);

      const result = await service.updateTestimonialStatus(id, status);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
        status
      }));
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('testimonial');
    });
  });

  describe('updateMultipleTestimonialStatus', () => {
    it('should update multiple testimonial statuses', async () => {
      const ids = [1, 2, 3];
      const status = 'approved';

      mockDb.returning.mockResolvedValueOnce([
        { id: 1, status: 'approved' },
        { id: 2, status: 'approved' },
        { id: 3, status: 'approved' }
      ]);

      const result = await service.updateMultipleTestimonialStatus(ids, status);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
        status
      }));
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('testimonials');
    });
  });

  describe('removeMultiple', () => {
    it('should remove multiple testimonials', async () => {
      const ids = [1, 2, 3];
      const userId = 1;

      mockDb.returning.mockResolvedValueOnce([{ id: 1 }, { id: 2 }, { id: 3 }]);

      const result = await service.removeMultiple(ids, userId);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockCurrentSubscriptionService.updateFeatureUsage).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
    });
  });

  describe('createPublic', () => {
    it('should create a public testimonial', async () => {
      const userId = 1;
      const projectId = 2;
      const formId = 3;
      const createTestimonialDto = {
        name: 'John Doe',
        content: 'Great service!',
        source: 'text',
        type: 'manual',
        testimonialText: 'Great service!'
      };

      const result = await service.createPublic(userId, projectId, createTestimonialDto, formId);

      expect(mockCurrentSubscriptionService.getCurrentSubscription).toHaveBeenCalledWith(userId);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
        ...createTestimonialDto,
        projectId,
        formId,
        status: 'pending'
      }));
      expect(mockCurrentSubscriptionService.updateFeatureUsage).toHaveBeenCalled();
      expect(result).toHaveProperty('message', 'Testimonial berhasil dibuat');
      expect(result).toHaveProperty('testimonial');
    });
  });
});
