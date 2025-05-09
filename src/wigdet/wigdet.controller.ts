import { Controller, Get, Post, Body, Param, ParseIntPipe, HttpStatus, HttpCode, Request, Query, BadRequestException, Put, Delete } from '@nestjs/common';
import { WigdetService } from './wigdet.service';
import { ApiTags, ApiResponse, ApiBody, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { Paginate, PaginateQuery, Paginated } from 'nestjs-paginate';
import { CreateWigdetDto } from './dto/create-wigdet.dto';
import { UpdateWigdetDto } from './dto/update-wigdet.dto';

@ApiTags('api/widget')
@Controller('api/widget')
@Auth()
export class WigdetController {
  constructor(private readonly wigdetService: WigdetService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Widget created successfully' })
  @ApiBody({ type: CreateWigdetDto })
  @ApiOperation({ summary: 'Create a new widget' })
  async create(@Body() createWidgetDto: CreateWigdetDto, @Request() req) {
    const projectId = createWidgetDto.projectId;
    try {
      const widget = await this.wigdetService.create(projectId, createWidgetDto);
      return { status: 200, data: widget };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }

  @Get('all')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Widgets retrieved successfully',
    type: Paginated
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filter widgets by type' })
  async findAll(
    @Paginate() query: PaginateQuery,
    @Query('projectId', ParseIntPipe) projectId: number,
    @Query('type') type?: string
  ) {
    try {
      const result = await this.wigdetService.findAll(query, projectId, type);
      return {
        status: 200,
        message: 'Widgets retrieved successfully',
        result
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Widget retrieved successfully' })
  @ApiParam({ name: 'id', description: 'Widget ID' })
  @ApiQuery({ name: 'projectId', description: 'Project ID' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('projectId', ParseIntPipe) projectId: number
  ) {
    try {
      const widget = await this.wigdetService.findOne(id, projectId);
      return {
        status: 200,
        message: 'Widget retrieved successfully',
        data: widget
      };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Widget updated successfully' })
  @ApiParam({ name: 'id', description: 'Widget ID' })
  @ApiBody({ type: UpdateWigdetDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWidgetDto: UpdateWigdetDto,
    @Query('projectId', ParseIntPipe) projectId: number
  ) {
    try {
      const widget = await this.wigdetService.update(id, projectId, updateWidgetDto);
      return {
        status: 200,
        message: 'Widget updated successfully',
        data: widget
      };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Widget deleted successfully' })
  @ApiParam({ name: 'id', description: 'Widget ID' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('projectId', ParseIntPipe) projectId: number
  ) {
    try {
      const result = await this.wigdetService.remove(id, projectId);
      return {
        status: 200,
        message: result.message
      };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }

  @Get('testimonials')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Widgets retrieved by testimonial IDs successfully' })
  @ApiQuery({ 
    name: 'ids', 
    description: 'Comma-separated list of testimonial IDs',
    required: true,
    type: String 
  })
  @ApiOperation({ summary: 'Find widgets by testimonial IDs (GET method)' })
  async getByTestimonialIds(@Query('ids') ids: string) {
    try {
      // Parse and validate testimonial IDs from query string
      if (!ids) {
        throw new BadRequestException('Parameter IDs testimonial diperlukan');
      }
      
      const testimoniIds = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      
      if (testimoniIds.length === 0) {
        throw new BadRequestException('Daftar ID testimonial tidak valid');
      }
      
      const result = await this.wigdetService.findByTestimonialIds(testimoniIds);
      return {
        status: 200,
        message: result.message,
        data: result.data
      };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }
}
