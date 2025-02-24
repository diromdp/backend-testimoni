import { Injectable, UnauthorizedException, ForbiddenException, Inject, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { AdminSignInDto } from './dto/admin-signin.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { isValidEmail } from '../utils/validation';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private jwtService: JwtService,
  ) {}

  async signIn(signInDto: AdminSignInDto) {
    if (!isValidEmail(signInDto.email)) {
      throw new BadRequestException('Invalid email format');
    }

    const admin = await this.db
      .select()
      .from(schema.admins)
      .where(eq(schema.admins.email, signInDto.email))
      .limit(1)
      .then(rows => rows[0]);

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      signInDto.password,
      admin.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    await this.db
      .update(schema.admins)
      .set({ accessToken })
      .where(eq(schema.admins.id, admin.id));

    return {
      access_token: accessToken,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  async logout(adminId: number) {
    await this.db
      .update(schema.admins)
      .set({ accessToken: null })
      .where(eq(schema.admins.id, adminId));

    return {
      message: 'Logged out successfully',
    };
  }

  async createAdmin(createAdminDto: CreateAdminDto, currentAdminRole: string) {
    if (!isValidEmail(createAdminDto.email)) {
      throw new BadRequestException('Invalid email format');
    }

    if (currentAdminRole !== 'superadmin') {
      throw new ForbiddenException('Only superadmin can create new admins');
    }

    const existingAdmin = await this.db
      .select()
      .from(schema.admins)
      .where(eq(schema.admins.email, createAdminDto.email))
      .limit(1)
      .then(rows => rows[0]);

    if (existingAdmin) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);

    const newAdmin = await this.db.insert(schema.admins).values({
      ...createAdminDto,
      password: hashedPassword,
    }).returning();

    return {
      message: 'Admin created successfully',
      admin: {
        id: newAdmin[0].id,
        name: newAdmin[0].name,
        email: newAdmin[0].email,
        role: newAdmin[0].role,
      },
    };
  }

  async updateAdmin(id: number, updateAdminDto: UpdateAdminDto, currentAdminRole: string) {
    if (updateAdminDto.email && !isValidEmail(updateAdminDto.email)) {
      throw new BadRequestException('Invalid email format');
    }

    if (currentAdminRole !== 'superadmin') {
      throw new ForbiddenException('Only superadmin can update admins');
    }

    if (updateAdminDto.email) {
      const existingAdmin = await this.db
        .select()
        .from(schema.admins)
        .where(eq(schema.admins.email, updateAdminDto.email))
        .limit(1)
        .then(rows => rows[0]);

      if (existingAdmin && existingAdmin.id !== id) {
        throw new BadRequestException('Email already exists');
      }
    }

    const updateData: Partial<typeof updateAdminDto> = { ...updateAdminDto };
    
    if (updateAdminDto.password) {
      updateData.password = await bcrypt.hash(updateAdminDto.password, 10);
    }

    const updatedAdmin = await this.db
      .update(schema.admins)
      .set(updateData)
      .where(eq(schema.admins.id, id))
      .returning();

    return {
      message: 'Admin updated successfully',
      admin: {
        id: updatedAdmin[0].id,
        name: updatedAdmin[0].name,
        email: updatedAdmin[0].email,
        role: updatedAdmin[0].role,
      },
    };
  }

  async deleteAdmin(id: number, currentAdminRole: string) {
    if (currentAdminRole !== 'superadmin') {
      throw new ForbiddenException('Only superadmin can delete admins');
    }

    await this.db.delete(schema.admins).where(eq(schema.admins.id, id));

    return {
      message: 'Admin deleted successfully',
    };
  }

  async findAll(currentAdminRole: string) {
    if (currentAdminRole !== 'superadmin') {
      throw new ForbiddenException('Only superadmin can view all admins');
    }

    const admins = await this.db.query.admins.findMany();
    return admins.map(admin => ({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    }));
  }

  async getOwnProfile(adminId: number) {
    const admin = await this.db
      .select({
        id: schema.admins.id,
        name: schema.admins.name,
        email: schema.admins.email,
        role: schema.admins.role,
      })
      .from(schema.admins)
      .where(eq(schema.admins.id, adminId))
      .limit(1)
      .then(rows => rows[0]);

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    return {
      message: 'Profile retrieved successfully',
      admin
    };
  }
}
