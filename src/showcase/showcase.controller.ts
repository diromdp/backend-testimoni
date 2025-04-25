import { Controller, Post, Get, Body, Param, BadRequestException, HttpStatus, Put, Delete, ParseIntPipe, Query, Request } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { ShowcaseService } from './showcase.service';
import { Auth } from '../auth/decorators/auth.decorator';
import * as schema from './schema';
import { PaginateQuery, Paginated } from 'nestjs-paginate';

class CreateShowcaseDto {
    name: string;
    slug: string;
    projectId: number;
}

@ApiTags('api/showcase')
@Controller('api/showcase')
export class ShowcaseController {
    constructor(private readonly showcaseService: ShowcaseService) {}

    @Post()
    @Auth()
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Showcase berhasil dibuat' })
    async create(@Body() createShowcaseDto: CreateShowcaseDto, @Request() req) {
        try {
            const { name, slug, projectId } = createShowcaseDto;
            
            if (!name || !slug) {
                throw new BadRequestException('Nama dan slug harus diisi');
            }
            
            // Validate slug format (alphanumeric and hyphens only)
            if (!/^[a-z0-9-]+$/.test(slug)) {
                throw new BadRequestException('Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung');
            }
            
            const result = await this.showcaseService.createWithNameAndSlug(req.user.sub, name, slug, projectId);
            
            return {
                status: 200,
                message: result.message,
                data: result.showcase
            };
        } catch (error) {
            return {  
                status: 500,
                message: error.message
            }
        }
    }

    @Get(':slug')
    @ApiResponse({ status: HttpStatus.OK, description: 'Showcase berhasil ditemukan' })
    async findBySlug(@Param('slug') slug: string) {
        try {
            const showcase = await this.showcaseService.findBySlug(slug);
            
            return {
                status: 200,
                message: 'Showcase berhasil ditemukan',
                data: showcase
            };
        } catch (error) {
            return {
                status: 500,
                message: error.message
            }
        }
    }

    @Put(':slug')
    @Auth()
    @ApiResponse({ status: HttpStatus.OK, description: 'Showcase berhasil diperbarui' })
    async update(@Param('slug') slug: string, @Body() updateShowcaseDto: Partial<typeof schema.showcase.$inferInsert>) {
        try {
            // Remove fields that shouldn't be updated directly
            const { id, createdAt, ...updateData } = updateShowcaseDto;
            
            const result = await this.showcaseService.updateBySlug(slug, updateData);

            return {
                status: 200,
                message: result.message,
                data: result.showcase
            };
        } catch (error) {
            return {
                status: 500,
                message: error.message
            }
        }
    }

    @Delete(':id')
    @Auth()
    @ApiResponse({ status: HttpStatus.OK, description: 'Showcase berhasil dihapus' })
    async delete(@Param('id', ParseIntPipe) id: number, @Request() req) {
        try {
            const result = await this.showcaseService.deleteById(req.user.sub, id);
            
            return {
                status: 200,
                message: result.message
            };
        } catch (error) {
            return {
                status: 500,
                message: error.message
            }
        }
    }

    @Get()
    @ApiResponse({ status: HttpStatus.OK, description: 'Daftar showcase berhasil didapatkan' })
    async findAll(
        @Query() query: PaginateQuery,
        @Query('projectId', new ParseIntPipe({ optional: true })) projectId?: number
    ) {
        try {
            const paginatedShowcases = await this.showcaseService.findAll(query, projectId);
            
            return {
                status: 200,
                message: 'Daftar showcase berhasil didapatkan',
                data: paginatedShowcases.items,
                meta: paginatedShowcases.meta,
                links: paginatedShowcases.links
            };
        } catch (error) {
            return {
                status: 500,
                message: error.message
            }
        }
    }
}
