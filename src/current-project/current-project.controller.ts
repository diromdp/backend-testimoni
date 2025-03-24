import { Controller, Post, Body, HttpCode, HttpStatus, Get, Delete, Param, Request, ParseIntPipe } from '@nestjs/common';
import { CurrentProjectService } from './current-project.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { ApiTags, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UserId } from '../common/decorators/user-id.decorator';

@ApiTags('api/current-project')
@Controller('api/current-project')
@Auth()
export class CurrentProjectController {
  constructor(private readonly currentProjectService: CurrentProjectService) {}

  @Post('update')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Current project updated successfully' })
  @ApiBody({ schema: { type: 'object', properties: { projectId: { type: 'string' } } } })
  async updateOrCreateCurrentProject(
    @UserId() userId: number,
    @Body() body: { projectId: string }
  ) {
    try {
      const result = await this.currentProjectService.updateOrCreateCurrentProject(body.projectId, userId.toString());
      return { status: 200, ...result };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }

  @Get('current')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Current project retrieved successfully' })
  async getCurrentProject(@UserId() userId: number) {
    try {
      const result = await this.currentProjectService.getCurrentProject(userId);
      return { status: 200, ...result };
    } catch (error) {
      return { status: 500, message: error.message };
    }
  }

  @Delete('by-project/:projectId')
  @Auth()
  @ApiResponse({ status: HttpStatus.OK, description: 'Current project berhasil dihapus' })
  async removeByProjectId(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Request() req
  ) {
    try {
      const userId = req.user.sub;
      const result = await this.currentProjectService.removeByProjectId(projectId, userId);
      
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
