import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Request,
  HttpStatus,
  HttpCode,
  Query,
  ParseIntPipe
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { ApiTags, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PaginatedResult } from '../common/types/pagination.type';
import { Paginate, PaginateQuery, Paginated } from 'nestjs-paginate';
import { UserId } from '../common/decorators/user-id.decorator';
import * as schema from './schema';

type Project = typeof schema.projects.$inferSelect;


@ApiTags('api/projects')
@Controller('api/projects')
@Auth()
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Project created successfully' })
  async create(@Body() createProjectDto: CreateProjectDto, @Request() req) {
    try {
      const result = await this.projectService.create(req.user.sub, createProjectDto);
      return { status: 200, ...result };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }

  @Get('all')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Projects retrieved successfully',
    type: PaginatedResult<Project>
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'lastId', required: false, type: Number })
  async findAll(
    @UserId() userId: number,
    @Paginate() query: PaginateQuery
  ): Promise<Paginated<Project>> {
    try {
      const result = await this.projectService.findAll(userId, query);
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Project retrieved successfully' })
  async findOne(@Param('id') id: string, @Request() req) {
    try {
      const result = await this.projectService.findOne(+id, req.user.sub);
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Project updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req
  ) {
    return this.projectService.update(+id, req.user.sub, updateProjectDto);
  }

  @Delete(':id')
  @Auth()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Project deleted successfully' })
  remove(@Param('id') id: string, @Request() req) {
    return this.projectService.remove(+id, req.user.sub);
  }

  @Delete('by-project/:projectId')
  @Auth()
  @ApiResponse({ status: HttpStatus.OK, description: 'Proyek berhasil dihapus' })
  async removeByProjectId(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Request() req
  ) {
    try {
      const userId = req.user.sub;
      const result = await this.projectService.removeByProjectId(projectId, userId);
      
      return {
        status: 200,
        message: result.message
      };
    } catch (error) {
      return {
        status: 500,
        message: error.message
      };
    }
  }

  @Delete('complete/:projectId')
  @Auth()
  @ApiResponse({ status: HttpStatus.OK, description: 'Proyek dan data terkait berhasil dihapus' })
  async removeProjectAndRelated(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Request() req
  ) {
    try {
      const userId = req.user.sub;
      const result = await this.projectService.removeProjectAndRelated(projectId, userId);
      
      return {
        status: 200,
        message: result.message
      };
    } catch (error) {
      return {
        status: 500,
        message: error.message
      };
    }
  }
}
