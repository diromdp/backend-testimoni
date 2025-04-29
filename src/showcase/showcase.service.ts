import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { PaginateQuery, Paginated } from 'nestjs-paginate';
import { CurrentSubscriptionService } from '../current-subscription/current-subscription.service';
import { ForbiddenException } from '@nestjs/common';

interface CustomPaginated<T> {
    items: T[];
    meta: {
        totalItems: number;
        itemCount: number;
        itemsPerPage: number;
        totalPages: number;
        currentPage: number;
    };
    links: {
        first: number | null;
        previous: number | null;
        next: number | null;
        last: number | null;
    };
}

@Injectable()
export class ShowcaseService {
    constructor(
        @Inject(DATABASE_CONNECTION)
        private readonly db: NodePgDatabase<typeof schema>,
        private readonly currentSubscriptionService: CurrentSubscriptionService,
    ) { }

    async createWithNameAndSlug(userId: number, name: string, slug: string, projectId: number) {
        try {
            // Check if slug already exists
            const currentSubscription = await this.currentSubscriptionService.getCurrentSubscription(userId);
            const showcaseLimit = currentSubscription.featureUsage?.showcase_page || 0;

            if (showcaseLimit === 0) {
                throw new ForbiddenException({
                    message: 'Silakan tingkatkan paket langganan Anda untuk membuat showcase lebih banyak',
                });
            }

            const existingShowcase = await this.db
                .select()
                .from(schema.showcase)
                .where(eq(schema.showcase.slug, slug))
                .limit(1)
                .then(rows => rows[0]);

            if (existingShowcase) {
                throw new BadRequestException('Slug sudah digunakan');
            }

            // Create new showcase
            const [showcase] = await this.db
                .insert(schema.showcase)
                .values({
                    projectId,
                    title: name,
                    slug,
                    status: 'draft',
                    createdAt: new Date(),
                    updatedAt: new Date()
                })
                .returning();

            await this.currentSubscriptionService.updateFeatureUsage(userId, {
                showcase_page: currentSubscription.featureUsage.showcase_page - 1
            });


            return {
                message: 'Showcase berhasil dibuat',
                showcase
            };
        } catch (error) {
            throw new Error(`Gagal membuat showcase: ${error.message}`);
        }
    }

    async findBySlug(slug: string) {
        try {
            const showcase = await this.db
                .select()
                .from(schema.showcase)
                .where(eq(schema.showcase.slug, slug))
                .limit(1)
                .then(rows => rows[0]);

            if (!showcase) {
                throw new BadRequestException('Showcase tidak ditemukan');
            }

            return showcase;
        } catch (error) {
            throw new Error(`Gagal menemukan showcase: ${error.message}`);
        }
    }

    async updateBySlug(slug: string, updateData: Partial<typeof schema.showcase.$inferInsert>) {
        try {
            // Find showcase by slug
            const existingShowcase = await this.db
                .select()
                .from(schema.showcase)
                .where(eq(schema.showcase.slug, slug))
                .limit(1)
                .then(rows => rows[0]);

            if (!existingShowcase) {
                throw new BadRequestException('Showcase tidak ditemukan');
            }

            // Update showcase
            const [updatedShowcase] = await this.db
                .update(schema.showcase)
                .set({
                    ...updateData,
                    updatedAt: new Date()
                })
                .where(eq(schema.showcase.slug, slug))
                .returning();
            return {
                message: 'Showcase berhasil diperbarui',
                showcase: updatedShowcase
            };
        } catch (error) {
            throw new Error(`Gagal memperbarui showcase: ${error.message}`);
        }
    }

    async deleteById(userId: number, id: number) {
        try {
            const currentSubscription = await this.currentSubscriptionService.getCurrentSubscription(userId);

            // Find showcase by id
            const existingShowcase = await this.db
                .select()
                .from(schema.showcase)
                .where(eq(schema.showcase.id, id))
                .limit(1)
                .then(rows => rows[0]);

            if (!existingShowcase) {
                throw new BadRequestException('Showcase tidak ditemukan');
            }

            // Delete showcase
            await this.db
                .delete(schema.showcase)
                .where(eq(schema.showcase.id, id));

            await this.currentSubscriptionService.updateFeatureUsage(userId, {
                showcase_page: currentSubscription.featureUsage.showcase_page + 1
            });

            return {
                message: 'Showcase berhasil dihapus'
            };
        } catch (error) {
            throw new Error(`Gagal menghapus showcase: ${error.message}`);
        }
    }

    async findAll(query: PaginateQuery, projectId?: number): Promise<CustomPaginated<typeof schema.showcase.$inferSelect>> {
        const { limit = 10, page = 1 } = query;
        const offset = (page - 1) * limit;

        try {
            // Build where condition
            const whereCondition = projectId ? eq(schema.showcase.projectId, projectId) : undefined;

            // Get total count
            const countResult = await this.db
                .select({ count: sql<number>`count(*)` })
                .from(schema.showcase)
                .where(whereCondition);
            const totalItems = Number(countResult[0]?.count || 0);

            // Get paginated data
            const items = await this.db
                .select()
                .from(schema.showcase)
                .where(whereCondition)
                .limit(limit)
                .offset(offset)
                .orderBy(desc(schema.showcase.createdAt));

            // Calculate pagination metadata
            const totalPages = Math.ceil(totalItems / limit);

            return {
                items,
                meta: {
                    totalItems,
                    itemCount: items.length,
                    itemsPerPage: limit,
                    totalPages,
                    currentPage: page,
                },
                links: {
                    first: page > 1 ? 1 : null,
                    previous: page > 1 ? page - 1 : null,
                    next: page < totalPages ? page + 1 : null,
                    last: totalPages > 0 ? totalPages : null,
                },
            };
        } catch (error) {
            throw new Error(`Gagal mendapatkan daftar showcase: ${error.message}`);
        }
    }
    
    async findBySlugPublic(slug: string) {
        try {
            const showcase = await this.db
                .select()
                .from(schema.showcase)
                .where(eq(schema.showcase.slug, slug))
                .limit(1)
                .then(rows => rows[0]);

            if (!showcase) {
                throw new BadRequestException('Showcase tidak ditemukan');
            }

            // Only return published showcases to the public
            if (showcase.status !== 'published') {
                throw new BadRequestException('Showcase tidak ditemukan');
            }

            return showcase;
        } catch (error) {
            throw new Error(`Gagal menemukan showcase: ${error.message}`);
        }
    }

    async findApprovedTestimoniByProjectId(projectId: number, query: PaginateQuery): Promise<Paginated<any>> {
        const { limit = 10, page = 1 } = query;
        const offset = (page - 1) * limit;

        try {
            // Import testimoni schema
            const testimoniSchema = await import('../testimoni/schema');
            
            // Build where condition
            const whereCondition = and(
                eq(testimoniSchema.testimonials.projectId, projectId),
                eq(testimoniSchema.testimonials.status, 'approved')
            );

            const [data, total] = await Promise.all([
                this.db.select()
                    .from(testimoniSchema.testimonials)
                    .where(whereCondition)
                    .orderBy(desc(testimoniSchema.testimonials.createdAt))
                    .limit(limit)
                    .offset(offset),
                this.db.select({ count: sql<number>`count(*)` })
                    .from(testimoniSchema.testimonials)
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
                    first: `${process.env.BASE_URL}/public/showcase/project/${projectId}/testimonials?page=${1}&limit=${limit}`,
                    last: `${process.env.BASE_URL}/public/showcase/project/${projectId}/testimonials?page=${Math.ceil(total / limit)}&limit=${limit}`,
                    previous: `${process.env.BASE_URL}/public/showcase/project/${projectId}/testimonials?page=${page - 1}&limit=${limit}`,
                    next: `${process.env.BASE_URL}/public/showcase/project/${projectId}/testimonials?page=${page + 1}&limit=${limit}`,
                    current: `${process.env.BASE_URL}/public/showcase/project/${projectId}/testimonials?page=${page}&limit=${limit}`
                }
            };
        } catch (error) {
            throw new Error(`Gagal mendapatkan testimonial untuk project ${projectId}: ${error.message}`);
        }
    }
}
