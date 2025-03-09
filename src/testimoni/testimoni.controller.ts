import { Controller, Get, Post, Body, Param, ParseIntPipe, HttpStatus, HttpCode, Request, Query, BadRequestException, Patch, Put, Delete } from '@nestjs/common';
import { TestimonialService } from './testimoni.service';
import { CreateTestimoniDto } from './dto/create-testimoni.dto';
import { ApiTags, ApiResponse, ApiBody, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { Paginate, PaginateQuery, Paginated } from 'nestjs-paginate';
import { UseGuards } from '@nestjs/common';

@ApiTags('api/testimoni')
@Controller('api/testimoni')
@Auth()
export class TestimoniController {
  constructor(private readonly testimonialService: TestimonialService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Testimoni created successfully' })
  @ApiBody({ type: CreateTestimoniDto })
  @ApiOperation({ summary: 'Create a new testimoni' })
  async create(@Body() createTestimoniDto: CreateTestimoniDto, @Request() req) {
    const projectId = req.body.projectId;
    const formId = req.body.formId;
    try {
      const testimonial = await this.testimonialService.create(req.user.sub, projectId, createTestimoniDto, formId);
      return { status: 200, data: testimonial };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }

  @Get('all')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Testimonials retrieved successfully',
    type: Paginated
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filter testimonials by type' })
  async findAll(
    @Paginate() query: PaginateQuery,
    @Query('projectId', ParseIntPipe) projectId: number,
    @Query('type') type?: string
  ) {
    try {
      const result = await this.testimonialService.findAll(query, projectId, type);
      return {
        status: 200,
        message: 'Testimonials retrieved successfully',
        result
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Param('projectId', ParseIntPipe) projectId: number, @Param('formId', ParseIntPipe) formId: number) {
    try {
      const testimonial = await this.testimonialService.findOne(id, projectId);
      return { status: 200, data: testimonial };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }

  @Get('count')
  @Auth()
  @ApiResponse({ status: HttpStatus.OK, description: 'Jumlah testimonial non-import berhasil didapatkan' })
  async countNonImportTestimonials(
    @Query('projectId', ParseIntPipe) projectId: number
  ) {
    try {
      const count = await this.testimonialService.countNonImportTestimonials(projectId);
      return {
        status: 200,
        message: 'Jumlah testimonial non-import berhasil didapatkan',
        count
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Put('status/:id')
  @Auth()
  @ApiResponse({ status: HttpStatus.OK, description: 'Status testimonial berhasil diubah' })
  async updateTestimonialStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: 'approved' | 'unapproved'
  ) {
    try {
      // Validate status
      if (status !== 'approved' && status !== 'unapproved') {
        throw new BadRequestException('Status harus berupa "approved" atau "unapproved"');
      }
      
      const result = await this.testimonialService.updateTestimonialStatus(id, status);
      return {
        status: 200,
        message: 'Status testimonial berhasil diubah',
        result
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Put('status')
  @Auth()
  @ApiResponse({ status: HttpStatus.OK, description: 'Status testimonial berhasil diubah' })
  async updateMultipleTestimonialStatus(
    @Body() body: { ids: number[], status: 'approved' | 'unapproved' }
  ) {
    try {
      const { ids, status } = body;
      
      // Validate status
      if (status !== 'approved' && status !== 'unapproved') {
        throw new BadRequestException('Status harus berupa "approved" atau "unapproved"');
      }
      
      // Validate ids
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new BadRequestException('Daftar ID testimonial tidak valid');
      }
      
      const result = await this.testimonialService.updateMultipleTestimonialStatus(ids, status);
      return {
        status: 200,
        message: 'Status testimonial berhasil diubah',
        result
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete('/selected')
  @Auth()
  @ApiResponse({ status: HttpStatus.OK, description: 'Testimonial berhasil dihapus' })
  async removeMultiple(
    @Body() body: { ids: number[] },
    @Request() req
  ) {
    try {
      const { ids } = body;
      
      // Validate ids array
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new BadRequestException('Daftar ID testimonial tidak valid');
      }
      
      const result = await this.testimonialService.removeMultiple(ids, req.user.sub);
      return {
        status: 200,
        message: result.message,
      };
    } catch (error) {
      return {
        status: 500,
        message: error.message
      }
    }
  }
}
