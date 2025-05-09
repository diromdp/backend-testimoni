import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { PaginateQuery, Paginated } from 'nestjs-paginate';
import { sql as sqlConstructor, desc } from 'drizzle-orm';
import { CreateWigdetDto } from './dto/create-wigdet.dto';
import { UpdateWigdetDto } from './dto/update-wigdet.dto';

type Widget = typeof schema.widgets.$inferSelect;

@Injectable()
export class WigdetService {
    constructor(
        @Inject(DATABASE_CONNECTION)
        private readonly db: NodePgDatabase<typeof schema>,
    ) { }

    async create(projectId: number, createWidgetDto: CreateWigdetDto) {
        try {
            const [widget] = await this.db
                .insert(schema.widgets)
                .values({
                    ...createWidgetDto,
                    projectId,
                })
                .returning();

            return {
                message: 'Widget berhasil dibuat',
                widget: widget,
            };
        } catch (error) {
            throw new Error(`Gagal membuat widget untuk project ${projectId}: ${error.message}`);
        }
    }

    async findAll(
        query: PaginateQuery,
        projectId: number,
        type?: string
    ): Promise<Paginated<Widget>> {
        const { limit = 10, page = 1 } = query;
        const offset = (page - 1) * limit;

        try {
            // Build where condition based on project ID
            let whereCondition;
            let defaultCondition = eq(schema.widgets.projectId, projectId);
            if (type) {
                whereCondition = and(defaultCondition, eq(schema.widgets.type, type));
            } else {
                whereCondition = defaultCondition;
            }

            const [data, total] = await Promise.all([
                this.db.select()
                    .from(schema.widgets)
                    .where(whereCondition)
                    .orderBy(desc(schema.widgets.createdAt))
                    .limit(limit)
                    .offset(offset),
                this.db.select({ count: sql<number>`count(*)` })
                    .from(schema.widgets)
                    .where(whereCondition)
                    .then(result => Number(result[0].count))
            ]);

            return {
                data: data.length === 0 ? [] : data,
                meta: {
                    itemsPerPage: limit,
                    totalItems: total,
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    sortBy: [],
                    searchBy: [],
                    search: '',
                    select: []
                },
                links: {
                    first: `${process.env.BASE_URL}/api/widgets/all?page=${1}&limit=${limit}`,
                    last: `${process.env.BASE_URL}/api/widgets/all?page=${Math.ceil(total / limit)}&limit=${limit}`,
                    previous: `${process.env.BASE_URL}/api/widgets/all?page=${page - 1}&limit=${limit}`,
                    next: `${process.env.BASE_URL}/api/widgets/all?page=${page + 1}&limit=${limit}`,
                    current: `${process.env.BASE_URL}/api/widgets/all?page=${page}&limit=${limit}`
                }
            };
        } catch (error) {
            throw new Error(`Failed to find all widgets for project ${projectId}: ${error.message}`);
        }
    }

    async findOne(id: number, projectId: number) {
        try {
            if (isNaN(id) || !Number.isInteger(id)) {
                throw new BadRequestException('ID widget tidak valid');
            }

            const widget = await this.db
                .select()
                .from(schema.widgets)
                .where(
                    and(
                        eq(schema.widgets.id, id),
                        eq(schema.widgets.projectId, projectId)
                    )
                )
                .limit(1)
                .then(rows => rows[0]);

            if (!widget) {
                throw new BadRequestException('Widget tidak ditemukan');
            }

            return widget;
        } catch (error) {
            throw new Error(`Gagal menemukan widget ${id} untuk project ${projectId}: ${error.message}`);
        }
    }

    async update(id: number, projectId: number, updateWidgetDto: UpdateWigdetDto) {
        try {
            const existingWidget = await this.findOne(id, projectId);

            if (!existingWidget) {
                throw new BadRequestException('Widget tidak ditemukan');
            }

            const updatedWidget = await this.db
                .update(schema.widgets)
                .set({
                    ...updateWidgetDto,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(schema.widgets.id, id),
                        eq(schema.widgets.projectId, projectId)
                    )
                )
                .returning();

            return {
                message: 'Widget berhasil diperbarui',
                widget: updatedWidget[0],
            };
        } catch (error) {
            throw new Error(`Gagal memperbarui widget ${id} untuk project ${projectId}: ${error.message}`);
        }
    }

    async remove(id: number, projectId: number) {
        try {
            const existingWidget = await this.findOne(id, projectId);

            if (!existingWidget) {
                throw new BadRequestException('Widget tidak ditemukan');
            }

            await this.db
                .delete(schema.widgets)
                .where(
                    and(
                        eq(schema.widgets.id, id),
                        eq(schema.widgets.projectId, projectId)
                    )
                );

            return {
                message: 'Widget berhasil dihapus',
            };
        } catch (error) {
            throw new Error(`Gagal menghapus widget ${id} untuk project ${projectId}: ${error.message}`);
        }
    }

    async findByTestimonialIds(testimoniIds: number[]) {
        try {
            if (!testimoniIds || testimoniIds.length === 0) {
                throw new BadRequestException('Daftar ID testimonial tidak boleh kosong');
            }

            // Find widgets that contain any of the testimonial IDs in their showTestimonials array
            const widgets = await this.db
                .select()
                .from(schema.widgets)
                .where(
                    sql`EXISTS (
                        SELECT 1 FROM jsonb_array_elements_text(${schema.widgets.showTestimonials}) as tid
                        WHERE CAST(tid AS INTEGER) IN (${sqlConstructor.join(testimoniIds)})
                    )`
                );

            if (widgets.length === 0) {
                return {
                    message: 'Tidak ada widget yang terkait dengan testimonial yang dipilih',
                    data: []
                };
            }

            return {
                message: `Berhasil menemukan ${widgets.length} widget yang terkait dengan testimonial`,
                data: widgets
            };
        } catch (error) {
            throw new Error(`Gagal mencari widget berdasarkan ID testimonial: ${error.message}`);
        }
    }
}
