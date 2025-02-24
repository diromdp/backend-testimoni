export class CreateUserDto {
  name: string;
  email: string;
  phone: string;
  password: string;
  verificationToken: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class VerifyEmailDto {
  token: string;
}
