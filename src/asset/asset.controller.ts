import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile,
  Delete,
  Body,
  Query,
  UseGuards
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssetService } from './asset.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
@ApiTags('api/assets')
@Controller('api/assets')
@Auth()
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post('upload/image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    try {
      const result = await this.assetService.uploadImage(file, folder);
      return {
        status: 200,
        message: 'Image uploaded successfully',
        data: result,
      };
    } catch (error) {
      return {
        status: 500,
        message: error.message,
      };
    }
  }

  @Delete('upload/image')
  @ApiOperation({ summary: 'Delete an image by URL' })
  async deleteImage(@Body() body: { url: string }) {
    try {
      await this.assetService.deleteImage(body.url);
      return {
        status: 200,
        message: 'Image deleted successfully',
      };
    } catch (error) {
      return {
        status: 500,
        message: error.message,
      };
    }
  }

  @Post('upload/video')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a video file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    try {
      const result = await this.assetService.uploadVideo(file, folder);
      return {
        status: 200,
        message: 'Video uploaded successfully',
        data: result,
      };
    } catch (error) {
      return {
        status: 500,
        message: error.message,
      };
    }
  }

  @Delete('upload/video')
  @ApiOperation({ summary: 'Delete a video by URL' })
  async deleteVideo(@Body() body: { url: string }) {
    try {
      await this.assetService.deleteVideo(body.url);
      return {
        status: 200,
        message: 'Video deleted successfully',
      };
    } catch (error) {
      return {
        status: 500,
        message: error.message,
      };
    }
  }
}
