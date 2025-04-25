import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { FormService } from './form.service';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('api/public/forms')
@Controller('api/public/forms')
export class PublicFormController {
  constructor(private readonly formService: FormService) {}

  @Get(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Form retrieved successfully' })
  async findBySlug(@Param('slug') slug: string) {
    try {
      const result = await this.formService.findBySlug(slug);
      return result;
    } catch (error) {
      return { status: 404, message: error.message };
    }
  }
} 