import { Controller, Get, Param, NotFoundException, Query, ParseIntPipe } from '@nestjs/common';
import { ShowcaseService } from './showcase.service';
import { Public } from '../admin/decorators/public.decorator';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';

@ApiTags('api/public/showcase')
@Controller('api/public/showcase')
export class ShowcasePublicController {
  constructor(private readonly showcaseService: ShowcaseService) {}

  @Public()
  @Get('testimonials/:projectId')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filter testimonials by type' })
  @ApiResponse({ status: 200, description: 'Testimonial berhasil didapatkan' })
  @ApiResponse({ status: 404, description: 'Testimonial tidak ditemukan' })
  async getApprovedTestimonials(
    @Paginate() query: PaginateQuery,
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    try {
      const result = await this.showcaseService.findApprovedTestimoniByProjectId(projectId, query);
      
      return {
        status: 200,
        message: 'Testimonial berhasil didapatkan',
        data: result.data,
        meta: result.meta,
        links: result.links
      };
    } catch (error) {
      if (error.message.includes('Testimonial tidak ditemukan')) {
        throw new NotFoundException('Testimonial tidak ditemukan');
      }
      throw error;
    }
  }

  @Public()
  @Get(':slug')
  @ApiResponse({ status: 200, description: 'Project berhasil didapatkan' })
  @ApiResponse({ status: 404, description: 'Project tidak ditemukan' })
  async getShowcaseBySlug(@Param('slug') slug: string) {
    try {
      const showcase = await this.showcaseService.findBySlugPublic(slug);
      return showcase;
    } catch (error) {
      if (error.message.includes('Project tidak ditemukan')) {
        throw new NotFoundException('Project tidak ditemukan');
      }
      throw error;
    }
  }
} 