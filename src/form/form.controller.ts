import { Controller, Post, Body, Request, HttpCode, HttpStatus, Get, Put, Delete } from '@nestjs/common';
import { FormService } from './form.service';
import { CreateFormDto } from './dto/create-form.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserId } from 'src/common/decorators/user-id.decorator';
import { PaginateQuery, Paginated } from 'nestjs-paginate';
import { Paginate } from 'nestjs-paginate';
import * as schema from './schema';
import { PaginatedResult } from 'src/common/types/pagination.type';
import { ApiQuery } from '@nestjs/swagger';
import { Param } from '@nestjs/common';
import { UpdateFormDto } from './dto/update-form.dto';
type Form = typeof schema.forms.$inferSelect;

@ApiTags('api/forms')
@Controller('api/forms')
@Auth()
export class FormController {
  constructor(private readonly formService: FormService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Form created successfully' })
  async create(@UserId() userId: number, @Request() req) {
    const projectId = req.body.projectId;
    try {
      const result = await this.formService.create(userId, projectId);
      return { status: 200, ...result };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }

  @Get('all')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Forms retrieved successfully',
    type: PaginatedResult<Form>
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'lastId', required: false, type: Number })
  async findAll(
    @UserId() userId: number,
    @Paginate() query: PaginateQuery
  ): Promise<Paginated<Form>> {
    try {
      const result = await this.formService.findAll(userId, query);

      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  @Get(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Form retrieved successfully' })
  async findOne(@UserId() userId: number, @Param('slug') slug: string, @Request() req) {
    try {
      const result = await this.formService.findBySlug(slug);
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Form updated successfully' })
  async updateBySlug(
    @Param('id') id: string,
    @Body() updateFormDto: UpdateFormDto
  ) {
    try {
      const result = await this.formService.updateById(id, updateFormDto);
      return { status: 200, ...result };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Form deleted successfully' })
  remove(@UserId() userId: number, @Param('id') id: string) {
    return this.formService.remove(userId, +id);
  }
  @Put(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Form paused successfully' })
  async pause(
    @UserId() userId: number, 
    @Param('id') id: string, 
    @Body() pauseFormDto: { stopNewSubmissions: boolean }
  ) {
    try {
      const result = await this.formService.pause(userId, +id, pauseFormDto);
      return { status: 200, ...result };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }
  
}
