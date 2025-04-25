import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TestimoniType {
  TEXT = 'text',
  VIDEO = 'video',
  IMPORT = 'import'
}

export class CreatePublicTestimoniDto {
  @ApiProperty({
    description: 'The name of the person giving the testimonial',
    example: 'John Doe'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The email of the person',
    example: 'john@example.com'
  })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'The job title of the person',
    example: 'Software Engineer'
  })
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiProperty({
    description: 'The company of the person',
    example: 'Acme Inc'
  })
  @IsString()
  @IsOptional()
  company?: string;

  @ApiProperty({
    description: 'The content of the testimonial',
    example: 'This product is amazing!'
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'The avatar/photo URL of the person',
    example: 'https://example.com/avatar.jpg'
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({
    description: 'The type of testimonial',
    enum: TestimoniType,
    default: TestimoniType.TEXT
  })
  @IsEnum(TestimoniType)
  @IsOptional()
  type?: TestimoniType = TestimoniType.TEXT;

  @ApiProperty({
    description: 'The ID of the project',
    example: 1
  })
  @IsNumber()
  @IsNotEmpty()
  projectId: number;

  @ApiProperty({
    description: 'The ID of the form',
    example: 1
  })
  @IsNumber()
  @IsNotEmpty()
  formId: number;
  @IsNumber()
  @IsNotEmpty()
  userId: number;
}
