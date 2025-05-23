import { Injectable, ConflictException, BadRequestException, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { isValidEmail } from '../utils/validation';

import { CreateUserDto } from './dto/create-user.dto';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { eq } from 'drizzle-orm';
import { CurrentSubscriptionService } from 'src/current-subscription/current-subscription.service';


@Injectable()
export class UserService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly mailService: MailService,
    private readonly currentSubscriptionService: CurrentSubscriptionService,
  ) { }


  async register(createUserDto: CreateUserDto) {
    if (!isValidEmail(createUserDto.email)) {
      throw new BadRequestException('Format email tidak valid');
    }

    if (!createUserDto.phone) {
      throw new BadRequestException('Nomor telepon dibutuhkan');
    }

    // Validate Indonesian phone number
    const phoneRegex = /^(?:\+62|62|0)8[1-9][0-9]{6,10}$/;
    if (!phoneRegex.test(createUserDto.phone)) {
      throw new BadRequestException('Format nomor telepon Indonesia tidak valid. Harus diawali dengan +62, 62, atau 0, diikuti oleh 8 dan 7-11 digit');
    }

    // Normalize phone number to +62 format
    let normalizedPhone = createUserDto.phone;
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+62' + normalizedPhone.substring(1);
    } else if (normalizedPhone.startsWith('62')) {
      normalizedPhone = '+' + normalizedPhone;
    }
    createUserDto.phone = normalizedPhone;

    // Check if user already exists with same email
    const existingUserByEmail = await this.db.query.users.findFirst({
      where: eq(schema.users.email, createUserDto.email),
    });

    if (existingUserByEmail) {
      throw new ConflictException('Pengguna dengan email ini sudah ada');
    }

    // Check if user already exists with same phone
    const existingUserByPhone = await this.db.query.users.findFirst({
      where: eq(schema.users.phone, createUserDto.phone),
    });

    if (existingUserByPhone) {
      throw new ConflictException('Pengguna dengan nomor telepon ini sudah ada');
    }

    const verificationToken = uuidv4();
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create new user
    const [user] = await this.db.insert(schema.users).values({
      name: createUserDto.name,
      email: createUserDto.email,
      phone: createUserDto.phone,
      password: hashedPassword,
      verificationToken,
      isVerified: false,
    }).returning();

    await this.currentSubscriptionService.setDefaultSubscription(user.id);

    // Send verification email
    try {
      await this.mailService.sendVerificationEmail(
        createUserDto.email,
        verificationToken,
      );
      return {
        message: 'Pendaftaran berhasil. Silahkan cek email untuk verifikasi akun Anda.',
      };
    } catch (error) {
      // Rollback user creation if email fails
      await this.db.delete(schema.users)
        .where(eq(schema.users.email, createUserDto.email));
      throw new BadRequestException('Gagal mengirim email verifikasi. Silahkan coba lagi.');
    }
  }

  async verifyEmail(token: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.verificationToken, token),
    });

    if (!user) {
      throw new BadRequestException('Token verifikasi tidak valid');
    }

    try {
      user.isVerified = true;
      user.verificationToken = null;
      await this.db.update(schema.users).set({
        isVerified: true,
        verificationToken: null,
      }).where(eq(schema.users.id, user.id));


      return {
        message: 'Email berhasil diverifikasi',
      };
    } catch (error) {
      throw new Error(`Gagal memverifikasi email untuk pengguna ${user.id}: ${error.message}`);
    }
  }

  async updateProfile(userId: number, data: { name?: string, email?: string, phone?: string }) {
    // Validate email if provided
    if (data.email && !isValidEmail(data.email)) {
      throw new BadRequestException('Format email tidak valid');
    }

    // Validate and normalize phone if provided
    if (data.phone) {
      // Validate Indonesian phone number
      const phoneRegex = /^(?:\+62|62|0)8[1-9][0-9]{6,10}$/;
      if (!phoneRegex.test(data.phone)) {
        throw new BadRequestException('Format nomor telepon Indonesia tidak valid. Harus diawali dengan +62, 62, atau 0, diikuti oleh 8 dan 7-11 digit');
      }

      // Normalize phone number to +62 format
      let normalizedPhone = data.phone;
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '+62' + normalizedPhone.substring(1);
      } else if (normalizedPhone.startsWith('62')) {
        normalizedPhone = '+' + normalizedPhone;
      }
      data.phone = normalizedPhone;

      // Check if phone number is already used by another user
      const existingUserByPhone = await this.db.query.users.findFirst({
        where: eq(schema.users.phone, data.phone),
      });

      if (existingUserByPhone && existingUserByPhone.id !== userId) {
        throw new ConflictException('Nomor telepon ini sudah digunakan oleh pengguna lain');
      }
    }

    // Check if email is already used by another user
    if (data.email) {
      const existingUserByEmail = await this.db.query.users.findFirst({
        where: eq(schema.users.email, data.email),
      });

      if (existingUserByEmail && existingUserByEmail.id !== userId) {
        throw new ConflictException('Email ini sudah digunakan oleh pengguna lain');
      }
    }

    try {
      // Update user profile
      const [updatedUser] = await this.db.update(schema.users)
        .set({
          name: data.name !== undefined ? data.name : undefined,
          email: data.email !== undefined ? data.email : undefined,
          phone: data.phone !== undefined ? data.phone : undefined,
        })
        .where(eq(schema.users.id, userId))
        .returning();

      return {
        message: 'Profil berhasil diperbarui',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
        }
      };
    } catch (error) {
      throw new BadRequestException(`Gagal memperbarui profil: ${error.message}`);
    }
  }

  async updatePassword(userId: number, data: { oldPassword: string, newPassword: string }) {
    // Find the user
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      throw new BadRequestException('Pengguna tidak ditemukan');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(data.oldPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Password saat ini tidak valid');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    try {
      // Update the password
      await this.db.update(schema.users)
        .set({ password: hashedPassword })
        .where(eq(schema.users.id, userId));

      return {
        message: 'Password berhasil diperbarui',
      };
    } catch (error) {
      throw new BadRequestException(`Gagal memperbarui password: ${error.message}`);
    }
  }
}
