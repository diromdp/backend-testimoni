import { Controller, Get, Param, NotFoundException, Query, ParseIntPipe } from '@nestjs/common';
import { ShowcaseService } from './showcase.service';
import { Public } from '../admin/decorators/public.decorator';
import { PaginateQuery } from 'nestjs-paginate';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('api/public/showcase')
@Controller('api/public/showcase')
export class ShowcasePublicController {
  constructor(private readonly showcaseService: ShowcaseService) {}

  @Public()
  @Get('testimonials/:projectId')
  @ApiResponse({ status: 200, description: 'Testimonial berhasil didapatkan' })
  @ApiResponse({ status: 404, description: 'Testimonial tidak ditemukan' })
  async getApprovedTestimonials(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() query: PaginateQuery
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