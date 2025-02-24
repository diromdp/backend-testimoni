import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import * as projectSchema from '../project/schema';
import { eq, and } from 'drizzle-orm';
import { PaginateQuery, Paginated } from 'nestjs-paginate';
import { sql } from 'drizzle-orm';
import { CurrentSubscriptionService } from '../current-subscription/current-subscription.service';
import { CurrentProjectService } from '../current-project/current-project.service';

type Form = typeof schema.forms.$inferSelect;

@Injectable()
export class FormService {
   constructor(
      @Inject(DATABASE_CONNECTION)
      private readonly db: NodePgDatabase<typeof schema & typeof projectSchema >,
      private readonly currentSubscriptionService: CurrentSubscriptionService,
      private readonly currentProjectService: CurrentProjectService,
   ) { }

   async create(userId: number, projectId: number) {
      try {
         // Verify project belongs to user
         const project = await this.db
            .select({
               id: projectSchema.projects.id,
            })
            .from(projectSchema.projects)
            .where(
               and(
                  eq(projectSchema.projects.id, projectId),
                  eq(projectSchema.projects.userId, userId)
               )
            )
            .limit(1)
            .then(rows => rows[0]);

         if (!project) {
            throw new BadRequestException('Proyek tidak ditemukan');
         }

         // Check subscription feature usage
         const currentSubscription = await this.currentSubscriptionService.getCurrentSubscription(userId);
         if (!currentSubscription.featureUsage?.form || currentSubscription.featureUsage.form <= 0) {
            throw new BadRequestException('Batas penggunaan form telah habis, silahkan upgrade ke paket yang lebih besar');
         }

         // Generate random slug (8 characters)
         const slug = Math.random().toString(36).substring(2, 10);

         // Create initial form and update feature usage in transaction
         const result = await this.db.transaction(async (tx) => {
            // Create the form
            const [form] = await tx
               .insert(schema.forms)
               .values({
                  projectId,
                  slug,
                  status: 'DRAFT',
               })
               .returning();

            // Update feature usage count
            await this.currentSubscriptionService.updateFeatureUsage(userId, {
               form: currentSubscription.featureUsage.form - 1
            });

            return form;
         });

         return {
            message: 'Form berhasil dibuat',
            data: result,
            slug,
         };
      } catch (error) {
         throw new Error(`Gagal membuat form untuk proyek ${projectId}: ${error.message}`);
      }
   }

   // async update(userId: number, projectId: number, formId: number, updateFormDto: any) {
   //    try {
   //       const existingForm = await this.findOne(userId, projectId, formId);

   //       if (!existingForm) {
   //          throw new BadRequestException('Form tidak ditemukan');
   //       }

   //       const updatedForm = await this.db
   //          .update(schema.forms)
   //          .set({
   //             ...updateFormDto,
   //             updatedAt: new Date(),
   //          })
   //          .where(
   //             and(
   //                eq(schema.forms.id, formId),
   //                eq(schema.forms.projectId, projectId)
   //             )
   //          )
   //          .returning();

   //       return {
   //          message: 'Form berhasil diperbarui',
   //          form: updatedForm[0],
   //       };
   //    } catch (error) {
   //       throw new Error(`Gagal memperbarui form ${formId}: ${error.message}`);
   //    }
   // }

   async updateBySlug(slug: string, updateFormDto: any) {
      try {
         const existingForm = await this.db
            .select()
            .from(schema.forms)
            .where(eq(schema.forms.slug, slug))
            .limit(1)
            .then(rows => rows[0]);

         if (!existingForm) {
            throw new BadRequestException('Form tidak ditemukan');
         }

         const updatedForm = await this.db
            .update(schema.forms)
            .set({
               ...updateFormDto,
               updatedAt: new Date(),
            })
            .where(eq(schema.forms.slug, slug))
            .returning();

         return {
            message: 'Form berhasil diperbarui',
            form: updatedForm[0],
         };
      } catch (error) {
         throw new Error(`Gagal memperbarui form dengan slug ${slug}: ${error.message}`);
      }
   }

   async findAll(
      userId: number,
      query: PaginateQuery
   ): Promise<Paginated<Form>> {
      const { limit = 10, page = 1 } = query;
      const offset = (page - 1) * limit;
      const currentProject = await this.currentProjectService.findCurrentProjectByUserId(userId.toString());

      console.log(currentProject);
      if (!currentProject) {
         throw new BadRequestException('Proyek tidak ditemukan');
      }

      try {
         // Verify project belongs to user
         const project = await this.db
            .select()
            .from(projectSchema.projects)
            .where(
               and(
                  eq(projectSchema.projects.id, currentProject.projectId),
                  eq(projectSchema.projects.userId, userId)
               )
            )
            .limit(1)
            .then(rows => rows[0]);

         if (!project) {
            throw new BadRequestException('Proyek tidak ditemukan');
         }

         const [data, total] = await Promise.all([
            this.db.select()
               .from(schema.forms)
               .where(eq(schema.forms.projectId, currentProject.projectId))
               .limit(limit)
               .offset(offset),
            this.db.select({ count: sql<number>`count(*)` })
               .from(schema.forms)
               .where(eq(schema.forms.projectId, currentProject.projectId))
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
               first: `${process.env.BASE_URL}/api/forms?page=1&limit=${limit}`,
               last: `${process.env.BASE_URL}/api/forms?page=${Math.ceil(total / limit)}&limit=${limit}`,
               previous: `${process.env.BASE_URL}/api/forms?page=${page - 1}&limit=${limit}`,
               next: `${process.env.BASE_URL}/api/forms?page=${page + 1}&limit=${limit}`,
               current: `${process.env.BASE_URL}/api/forms?page=${page}&limit=${limit}`
            }
         };
      } catch (error) {
         throw new Error(`Gagal mengambil daftar form untuk proyek ${currentProject.projectId}: ${error.message}`);
      }
   }

   async findOne(userId: number, projectId: number, formId: number) {
      try {
         // Verify project belongs to user
         const project = await this.db
            .select()
            .from(projectSchema.projects)
            .where(
               and(
                  eq(projectSchema.projects.id, projectId),
                  eq(projectSchema.projects.userId, userId)
               )
            )
            .limit(1)
            .then(rows => rows[0]);

         if (!project) {
            throw new BadRequestException('Proyek tidak ditemukan');
         }

         const form = await this.db
            .select()
            .from(schema.forms)
            .where(
               and(
                  eq(schema.forms.id, formId),
                  eq(schema.forms.projectId, projectId)
               )
            )
            .limit(1)
            .then(rows => rows[0]);

         if (!form) {
            throw new BadRequestException('Form tidak ditemukan');
         }

         return form;
      } catch (error) {
         throw new Error(`Gagal menemukan form ${formId}: ${error.message}`);
      }
   }

   async remove(userId: number, projectId: number, formId: number) {
      try {
         const existingForm = await this.findOne(userId, projectId, formId);

         if (!existingForm) {
            throw new BadRequestException('Form tidak ditemukan');
         }

         await this.db
            .delete(schema.forms)
            .where(
               and(
                  eq(schema.forms.id, formId),
                  eq(schema.forms.projectId, projectId)
               )
            );

         return {
            message: 'Form berhasil dihapus',
         };
      } catch (error) {
         throw new Error(`Gagal menghapus form ${formId}: ${error.message}`);
      }
   }
}
