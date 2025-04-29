import { Controller, Get, Param, NotFoundException, Query, ParseIntPipe } from '@nestjs/common';
import { ShowcaseService } from './showcase.service';
import { Public } from '../admin/decorators/public.decorator';
import { PaginateQuery } from 'nestjs-paginate';

@Controller('api/public/showcase')

export class ShowcasePublicController {
  constructor(private readonly showcaseService: ShowcaseService) {}

  @Public()
  @Get('testimonials/:projectId')
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
  async getShowcaseBySlug(@Param('slug') slug: string) {
    try {
      const showcase = await this.showcaseService.findBySlugPublic(slug);
      return showcase;
    } catch (error) {
      if (error.message.includes('Showcase tidak ditemukan')) {
        throw new NotFoundException('Showcase tidak ditemukan');
      }
      throw error;
    }
  }
} 