import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject, IsArray } from 'class-validator';

export class CreateFormDto {
  @IsString()
  name: string;

  @IsString()
  logo: string;

  @IsString()
  primaryColor: string;

  @IsString()
  backgroundColor: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsObject()
  @IsOptional()
  collectionEmail?: {
    enabled: boolean;
    required: boolean;
  };

  // Add other fields following the same pattern...

  @IsBoolean()
  @IsOptional()
  removeTestimonialBranding?: boolean;

  @IsArray()
  @IsOptional()
  automaticTags?: { id: string; name: string; }[];
} 