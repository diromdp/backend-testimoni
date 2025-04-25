import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { TestimonialService } from './testimoni.service';
import { CreatePublicTestimoniDto } from './dto/create-public-testimoni.dto';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('api/public/testimoni')
@Controller('api/public/testimoni')
export class PublicTestimoniController {
  constructor(private readonly testimonialService: TestimonialService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Testimonial created successfully' })
  async createPublic(@Body() createPublicTestimoniDto: CreatePublicTestimoniDto) {
    try {
      const { userId, projectId, formId, ...testimonialData } = createPublicTestimoniDto;
      const result = await this.testimonialService.createPublic(userId, projectId, testimonialData, formId);
      return { status: 200, ...result };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }
} 