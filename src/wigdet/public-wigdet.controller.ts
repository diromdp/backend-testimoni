import { Controller, Get, HttpStatus, HttpCode, Query, BadRequestException } from '@nestjs/common';
import { TestimonialService } from '../testimoni/testimoni.service';
import { ApiTags, ApiResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('public/widgets')
@Controller('public/widgets')
export class PublicWigdetController {
  constructor(private readonly testimonialService: TestimonialService) {}

  @Get('testimonials')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Public widgets retrieved by testimonial IDs' })
  @ApiQuery({ 
    name: 'ids', 
    description: 'Comma-separated list of testimonial IDs',
    required: true,
    type: String 
  })
  @ApiOperation({ summary: 'Public endpoint to find widgets by testimonial IDs' })
  async getPublicTestimonialWidgets(@Query('ids') ids: string) {
    try {
      if (!ids) {
        throw new BadRequestException('Parameter IDs testimonial diperlukan');
      }
      
      const testimoniIds = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      
      if (testimoniIds.length === 0) {
        throw new BadRequestException('Daftar ID testimonial tidak valid');
      }
      
      const result = await this.testimonialService.findMultiple(testimoniIds.join(','));
      return result.testimonials; // Return only the data array directly
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
} 