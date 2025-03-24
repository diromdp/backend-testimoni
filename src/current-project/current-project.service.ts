import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import * as projectsSchema from '../project/schema';

@Injectable()
export class CurrentProjectService {
    constructor(
        @Inject(DATABASE_CONNECTION) 
        private db: NodePgDatabase<typeof schema>,
    ) { }

    async findCurrentProjectByUserId(userId: string) {
        try {
            const result = await this.db
                .select()
                .from(schema.currentProject)
                .where(eq(schema.currentProject.userId, Number(userId)));

            return result[0];
        } catch (error) {
            throw new Error(`Failed to find current project for user ${userId}: ${error.message}`);
        }
    }

    async updateOrCreateCurrentProject(projectId: string, userId: string) {
        const existing = await this.findCurrentProjectByUserId(userId);
        try {
            if (existing) {
                // Update existing record
                const updated = await this.db
                    .update(schema.currentProject)
                    .set({
                        projectId: Number(projectId),
                        updatedAt: new Date()
                    })
                    .where(eq(schema.currentProject.userId, Number(userId)))
                    .returning();

                // Get project with title
                const result = await this.db
                    .select({
                        data: { ...schema.currentProject, title: projectsSchema.projects.title },
                    })
                    .from(schema.currentProject)
                    .leftJoin(
                        projectsSchema.projects,
                        eq(schema.currentProject.projectId, projectsSchema.projects.id)
                    )
                    .where(eq(schema.currentProject.userId, Number(userId)));

                return result[0];
            }  

            // Create new record and get title
            const inserted = await this.db
                .insert(schema.currentProject)
                .values({
                    userId: Number(userId),
                    projectId: Number(projectId),
                    createdAt: new Date(),
                    updatedAt: new Date()
                })
                .returning();

            // Get project with title
            const result = await this.db
                .select({
                    data: { ...schema.currentProject, title: projectsSchema.projects.title },
                })
                .from(schema.currentProject)
                .leftJoin(
                    projectsSchema.projects,
                    eq(schema.currentProject.projectId, projectsSchema.projects.id)
                )
                .where(eq(schema.currentProject.userId, Number(userId)));

            return result[0];

        } catch (error) {
            throw new Error(`Failed to update or create current project for user ${userId}: ${error.message}`);
        }
    }

    async getCurrentProject(userId: number) {
        try {
            const result = await this.db
                .select({
                    data: {...schema.currentProject, title: projectsSchema.projects.title},
                })
                .from(schema.currentProject)
                .leftJoin(
                    projectsSchema.projects,
                    eq(schema.currentProject.projectId, projectsSchema.projects.id)
                )
                .where(eq(schema.currentProject.userId, userId));
            return result[0] || { data: null };
        } catch (error) {
            throw new Error(`Failed to get current project for user ${userId}: ${error.message}`);
        }
    }
    
    async removeByProjectId(projectId: number, userId: number) {
        try {
            // Verify current project exists and belongs to the user
            const existingCurrentProject = await this.db
                .select()
                .from(schema.currentProject)
                .where(
                    and(
                        eq(schema.currentProject.projectId, projectId),
                        eq(schema.currentProject.userId, userId)
                    )
                )
                .limit(1)
                .then(rows => rows[0]);

            if (!existingCurrentProject) {
                throw new BadRequestException('Current project tidak ditemukan');
            }

            // Delete the current project
            await this.db
                .delete(schema.currentProject)
                .where(
                    and(
                        eq(schema.currentProject.projectId, projectId),
                        eq(schema.currentProject.userId, userId)
                    )
                );

            return {
                message: 'Current project berhasil dihapus',
            };
        } catch (error) {
            throw new Error(`Gagal menghapus current project untuk project ${projectId}: ${error.message}`);
        }
    }
}
