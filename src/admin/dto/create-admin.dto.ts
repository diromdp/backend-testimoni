import { adminRoleEnum } from '../schema';

export class CreateAdminDto {
  name: string;
  email: string;
  password: string;
  role: typeof adminRoleEnum.enumValues[number];
} 