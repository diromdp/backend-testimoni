import { Injectable, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { CreateTestimoniDto } from './dto/create-testimoni.dto';
import { UpdateTestimoniDto } from './dto/update-testimoni.dto';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { eq, and, inArray } from 'drizzle-orm';
import { PaginateQuery, Paginated } from 'nestjs-paginate'
import { sql, desc } from 'drizzle-orm';
import { CurrentSubscriptionService } from '../current-subscription/current-subscription.service';

type Testimonial = typeof schema.testimonials.$inferSelect;

@Injectable()
export class TestimonialService {
    constructor(
        @Inject(DATABASE_CONNECTION)
        private readonly db: NodePgDatabase<typeof schema>,
        private readonly currentSubscriptionService: CurrentSubscriptionService,
    ) { }

    async create(userId: number, projectId: number, createTestimonialDto: CreateTestimoniDto, formId?: number) {
        try {
            // Get current subscription feature usage
            const currentSubscription = await this.currentSubscriptionService.getCurrentSubscription(userId);
            
            // Check limits based on testimonial type
            const { type } = createTestimonialDto;
            
            // Determine which feature to check and update
            let featureToUpdate = '';
            let featureLimit = 0;
            
            if (type === 'import') {
                featureToUpdate = 'import_social_media';
                featureLimit = currentSubscription.featureUsage?.import_social_media || 0;
            } else if (type === 'video') {
                featureToUpdate = 'video';
                featureLimit = currentSubscription.featureUsage?.video || 0;
            } else {
                // Default for 'text' or any other type
                featureToUpdate = 'max_testimoni';
                featureLimit = currentSubscription.featureUsage?.max_testimoni || 0;
            }
            
            if (featureLimit === 0) {
                throw new ForbiddenException({
                    message: `Silakan tingkatkan paket langganan Anda untuk membuat testimonial ${type} lebih banyak`,
                });
            }

            const result = await this.db.transaction(async (tx) => {
                // Create the testimonial
                const [testimonial] = await tx
                   .insert(schema.testimonials)
                   .values({
                      ...createTestimonialDto,
                      projectId,
                      formId,
                   })
                   .returning();

                // Update the appropriate feature usage count
                const updateData = {
                    [featureToUpdate]: currentSubscription.featureUsage[featureToUpdate] - 1
                };
                
                await this.currentSubscriptionService.updateFeatureUsage(userId, updateData);

                return testimonial;
            });
            
            return {
                message: 'Testimonial berhasil dibuat',
                testimonial: result,
            };
        } catch (error) {
            throw new Error(`Gagal membuat testimonial untuk project ${projectId}: ${error.message}`);
        }
    }

    async findAll(
        query: PaginateQuery,
        projectId: number,
        type?: string
    ): Promise<Paginated<Testimonial>> {
        const { limit = 10, page = 1 } = query;
        const offset = (page - 1) * limit;

        try {
            // Build where condition based on project ID
            let whereCondition;
            let defaultCondition = eq(schema.testimonials.projectId, projectId);
            if (type) {
                whereCondition = and(defaultCondition, eq(schema.testimonials.type, type));
            } else {
                whereCondition = defaultCondition;
            }

            const [data, total] = await Promise.all([
                this.db.select()
                    .from(schema.testimonials)
                    .where(whereCondition)
                    .orderBy(desc(schema.testimonials.createdAt))
                    .limit(limit)
                    .offset(offset),
                this.db.select({ count: sql<number>`count(*)` })
                    .from(schema.testimonials)
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
                    first: `${process.env.BASE_URL}/api/testimonials/all?page=${1}&limit=${limit}`,
                    last: `${process.env.BASE_URL}/api/testimonials/all?page=${Math.ceil(total / limit)}&limit=${limit}`,
                    previous: `${process.env.BASE_URL}/api/testimonials/all?page=${page - 1}&limit=${limit}`,
                    next: `${process.env.BASE_URL}/api/testimonials/all?page=${page + 1}&limit=${limit}`,
                    current: `${process.env.BASE_URL}/api/testimonials/all?page=${page}&limit=${limit}`
                }
            };
        } catch (error) {
            throw new Error(`Failed to find all testimonials for project ${projectId}: ${error.message}`);
        }
    }

    async findOne(id: number, projectId: number) {
        try {
            if (isNaN(id) || !Number.isInteger(id)) {
                throw new BadRequestException('ID testimonial tidak valid');
            }

            const testimonial = await this.db
                .select()
                .from(schema.testimonials)
                .where(
                    and(
                        eq(schema.testimonials.id, id),
                        eq(schema.testimonials.projectId, projectId)
                    )
                )
                .limit(1)
                .then(rows => rows[0]);

            if (!testimonial) {
                throw new BadRequestException('Testimonial tidak ditemukan');
            }

            return testimonial;
        } catch (error) {
            throw new Error(`Gagal menemukan testimonial ${id} untuk project ${projectId}: ${error.message}`);
        }
    }

    async update(id: number, projectId: number, updateTestimonialDto: UpdateTestimoniDto) {
        try {
            const existingTestimonial = await this.findOne(id, projectId);

            if (!existingTestimonial) {
                throw new BadRequestException('Testimonial tidak ditemukan');
            }

            const updatedTestimonial = await this.db
                .update(schema.testimonials)
                .set({
                    ...updateTestimonialDto,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(schema.testimonials.id, id),
                        eq(schema.testimonials.projectId, projectId)
                    )
                )
                .returning();

            return {
                message: 'Testimonial berhasil diperbarui',
                testimonial: updatedTestimonial[0],
            };
        } catch (error) {
            throw new Error(`Gagal memperbarui testimonial ${id} untuk project ${projectId}: ${error.message}`);
        }
    }

    async remove(id: number) {
        try {
            // Find testimonial by ID only
            const testimonial = await this.db
                .select()
                .from(schema.testimonials)
                .where(eq(schema.testimonials.id, id))
                .limit(1)
                .then(rows => rows[0]);

            if (!testimonial) {
                throw new BadRequestException('Testimonial tidak ditemukan');
            }

            await this.db
                .delete(schema.testimonials)
                .where(eq(schema.testimonials.id, id));

            return {
                message: 'Testimonial berhasil dihapus',
            };
        } catch (error) {
            throw new Error(`Gagal menghapus testimonial ${id}: ${error.message}`);
        }
    }

    async countNonImportTestimonials(projectId: number): Promise<number> {
        try {
            const result = await this.db
                .select({ count: sql<number>`count(*)` })
                .from(schema.testimonials)
                .where(
                    and(
                        eq(schema.testimonials.projectId, projectId),
                        sql`${schema.testimonials.type} != 'import'`
                    )
                );
            
            return Number(result[0].count);
        } catch (error) {
            throw new Error(`Failed to count non-import testimonials for project ${projectId}: ${error.message}`);
        }
    }

    async updateTestimonialStatus(id: number, status: 'approved' | 'unapproved'): Promise<any> {
        try {
            // Find testimonial by ID only
            const testimonial = await this.db
                .select()
                .from(schema.testimonials)
                .where(eq(schema.testimonials.id, id))
                .limit(1)
                .then(rows => rows[0]);

            if (!testimonial) {
                throw new BadRequestException('Testimonial tidak ditemukan');
            }

            const updatedTestimonial = await this.db
                .update(schema.testimonials)
                .set({
                    status,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(schema.testimonials.id, id),
                    )
                )
                .returning();

            return {
                message: `Status testimonial berhasil diubah menjadi ${status}`,
                testimonial: updatedTestimonial[0],
            };
        } catch (error) {
            throw new Error(`Gagal memperbarui status testimonial ${id}: ${error.message}`);
        }
    }

    async updateMultipleTestimonialStatus(ids: number[], status: 'approved' | 'unapproved'): Promise<any> {
        try {
            if (!ids || ids.length === 0) {
                throw new BadRequestException('Daftar ID testimonial tidak boleh kosong');
            }

            // Verify all testimonials exist
            const existingTestimonials = await this.db
                .select()
                .from(schema.testimonials)
                .where(inArray(schema.testimonials.id, ids));

            if (existingTestimonials.length !== ids.length) {
                const foundIds = existingTestimonials.map(t => t.id);
                const missingIds = ids.filter(id => !foundIds.includes(id));
                throw new BadRequestException(`Beberapa testimonial tidak ditemukan: ${missingIds.join(', ')}`);
            }

            // Update all testimonials
            const updatedTestimonials = await this.db
                .update(schema.testimonials)
                .set({
                    status,
                    updatedAt: new Date(),
                })
                .where(inArray(schema.testimonials.id, ids))
                .returning();

            return {
                message: `Status ${updatedTestimonials.length} testimonial berhasil diubah menjadi ${status}`,
                testimonials: updatedTestimonials,
            };
        } catch (error) {
            throw new Error(`Gagal memperbarui status testimonial: ${error.message}`);
        }
    }

    async removeMultiple(ids: number[], userId: number): Promise<any> {
        try {
            if (!ids || ids.length === 0) {
                throw new BadRequestException('Daftar ID testimonial tidak boleh kosong');
            }

            // Verify all testimonials exist
            const existingTestimonials = await this.db
                .select()
                .from(schema.testimonials)
                .where(inArray(schema.testimonials.id, ids));

            if (existingTestimonials.length !== ids.length) {
                const foundIds = existingTestimonials.map(t => t.id);
                const missingIds = ids.filter(id => !foundIds.includes(id));
                throw new BadRequestException(`Beberapa testimonial tidak ditemukan: ${missingIds.join(', ')}`);
            }

            // Get current subscription
            const currentSubscription = await this.currentSubscriptionService.getCurrentSubscription(userId);

            // Delete all testimonials
            const deletedCount = await this.db
                .delete(schema.testimonials)
                .where(inArray(schema.testimonials.id, ids))
                .returning()
                .then(rows => rows.length);

            // Update feature usage based on types
            const updateData = {};
            
            // Count testimonials by type and update feature usage accordingly
            const importCount = existingTestimonials.filter(t => t.type === 'import').length;
            const videoCount = existingTestimonials.filter(t => t.source === 'video').length;
            const textCount = existingTestimonials.filter(t => t.source === 'text').length;
            
            if (importCount > 0) {
                updateData['import_social_media'] = currentSubscription.featureUsage.import_social_media + importCount;
            } else {
                if (videoCount > 0) {
                    updateData['video'] = currentSubscription.featureUsage.video + videoCount;
                }
                if (textCount > 0) {
                    updateData['max_testimoni'] = currentSubscription.featureUsage.max_testimoni + textCount;
                }
            }
            
            if (Object.keys(updateData).length > 0) {
                await this.currentSubscriptionService.updateFeatureUsage(userId, updateData);
            }

            return {
                message: `${deletedCount} testimonial berhasil dihapus`,
            };
        } catch (error) {
            throw new Error(`Gagal menghapus testimonial: ${error.message}`);
        }
    }

    async createPublic(userId: number, projectId: number, createTestimonialDto: any, formId: number) {
        try {
            // Verify form and project exist
            if (!projectId) {
                throw new BadRequestException('ID proyek diperlukan');
            }

            if (!formId) {
                throw new BadRequestException('ID form diperlukan');
            }
            if (!userId) {
                throw new BadRequestException('ID user diperlukan');
            }

            // Get current subscription feature usage
            const currentSubscription = await this.currentSubscriptionService.getCurrentSubscription(userId);
            
            // Check limits based on testimonial type
            const { type, source } = createTestimonialDto;
            
            // Determine which feature to check and update
            let featureToUpdate = '';
            let featureLimit = 0;
            
            if (type === 'import') {
                featureToUpdate = 'import_social_media';
                featureLimit = currentSubscription.featureUsage?.import_social_media || 0;
            } else if (type === 'video' || source === 'video') {
                featureToUpdate = 'video';
                featureLimit = currentSubscription.featureUsage?.video || 0;
            } else if (source === 'text') {
                // Default for 'text' or any other type
                featureToUpdate = 'max_testimoni';
                featureLimit = currentSubscription.featureUsage?.max_testimoni || 0;
            }
            
            if (featureLimit === 0) {
                throw new ForbiddenException({
                    message: `Gagal membuat testimoni, sudah mencapai batas maksimal`,
                });
            }

            // Create the testimonial directly without checking subscription limits
            const [testimonial] = await this.db
                .insert(schema.testimonials)
                .values({
                    ...createTestimonialDto,
                    projectId,
                    formId,
                    // Set default status as needed, e.g., 'pending' for moderation
                    status: 'pending',
                })
                .returning();

            // Update the appropriate feature usage count
            const updateData = {
                [featureToUpdate]: currentSubscription.featureUsage[featureToUpdate] - 1
            };
            
            await this.currentSubscriptionService.updateFeatureUsage(userId, updateData);

            return {
                message: 'Testimonial berhasil dibuat',
                testimonial: testimonial,
            };
        } catch (error) {
            throw new Error(`${error.message}`);
        }
    }
}