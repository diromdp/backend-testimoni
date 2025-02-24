import { Injectable, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import * as orderSubscriptions from '../order-subscription/schema';
import { eq, and, gt } from 'drizzle-orm';
import { PaginateQuery, Paginated } from 'nestjs-paginate'
import { sql } from 'drizzle-orm';
import { CurrentSubscriptionService } from '../current-subscription/current-subscription.service';

type Project = typeof schema.projects.$inferSelect;

@Injectable()
export class ProjectService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly currentSubscriptionService: CurrentSubscriptionService,
  ) {}

  async create(userId: number, createProjectDto: CreateProjectDto) {
    try {
      // Get current subscription feature usage
      const currentSubscription = await this.currentSubscriptionService.getCurrentSubscription(userId);
      const projectLimit = currentSubscription.featureUsage?.project || 0;

      if (projectLimit === 0) {
        throw new ForbiddenException({
          message: 'Silakan tingkatkan paket langganan Anda untuk membuat proyek lebih banyak',
        });
      }

      const newProject = await this.db
        .insert(schema.projects)
        .values({
          ...createProjectDto,
          userId,
        })
        .returning();

      return {
        message: 'Proyek berhasil dibuat',
        project: newProject[0],
      };
    } catch (error) {
      throw new Error(`Gagal membuat proyek untuk pengguna ${userId}: ${error.message}`);
    }
  }

  async findAll(
    userId: number,
    query: PaginateQuery
  ): Promise<Paginated<Project>> {
    const { limit = 10, page = 1 } = query;
    const offset = (page - 1) * limit;

    try {
      const [data, total] = await Promise.all([
        this.db.select()
        .from(schema.projects)
        .where(eq(schema.projects.userId, userId))
        .limit(limit)
        .offset(offset),
      this.db.select({ count: sql<number>`count(*)` })
        .from(schema.projects)
        .where(eq(schema.projects.userId, userId))
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
        first: `${process.env.BASE_URL}/api/projects/all?page=${1}&limit=${limit}`,
        last: `${process.env.BASE_URL}/api/projects/all?page=${Math.ceil(total / limit)}&limit=${limit}`,
        previous: `${process.env.BASE_URL}/api/projects/all?page=${page - 1}&limit=${limit}`,
        next: `${process.env.BASE_URL}/api/projects/all?page=${page + 1}&limit=${limit}`,
        current: `${process.env.BASE_URL}/api/projects/all?page=${page}&limit=${limit}`
      }
    };
    } catch (error) {
      throw new Error(`Failed to find all projects for user ${userId}: ${error.message}`);
    }
  }

  async findOne(id: number, userId: number) {
    try {
      if (isNaN(id) || !Number.isInteger(id)) {
        throw new BadRequestException('ID proyek tidak valid');
      }

    const project = await this.db
      .select()
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.id, id),
          eq(schema.projects.userId, userId)
        )
      )
      .limit(1)
      .then(rows => rows[0]);

    if (!project) {
      throw new BadRequestException('Proyek tidak ditemukan');
    }

    return project;
    } catch (error) {
      throw new Error(`Gagal menemukan proyek ${id} untuk pengguna ${userId}: ${error.message}`);
    }
  }


  async update(id: number, userId: number, updateProjectDto: UpdateProjectDto) {
    try {
      const existingProject = await this.findOne(id, userId);

    if (!existingProject) {
      throw new BadRequestException('Proyek tidak ditemukan');
    }

    const updatedProject = await this.db
      .update(schema.projects)
      .set({
        ...updateProjectDto,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.projects.id, id),
          eq(schema.projects.userId, userId)
        )
      )
      .returning();

    return {
      message: 'Proyek berhasil diperbarui',
      project: updatedProject[0],
    };
    } catch (error) {
      throw new Error(`Gagal memperbarui proyek ${id} untuk pengguna ${userId}: ${error.message}`);
    }
  }

  async remove(id: number, userId: number) {
    try {
      const existingProject = await this.findOne(id, userId);

    if (!existingProject) {
      throw new BadRequestException('Proyek tidak ditemukan');
    }

    await this.db
      .delete(schema.projects)
      .where(
        and(
          eq(schema.projects.id, id),
          eq(schema.projects.userId, userId)
        )
      );

    return {
      message: 'Proyek berhasil dihapus',
    };
    } catch (error) {
      throw new Error(`Gagal menghapus proyek ${id} untuk pengguna ${userId}: ${error.message}`);
    }
  }
}
