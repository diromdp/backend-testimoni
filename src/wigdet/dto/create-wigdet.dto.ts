import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreateWigdetDto {
    @ApiProperty({
        description: 'Project ID',
        example: 1,
    })
    @IsNumber()
    @IsNotEmpty()
    projectId: number;

    @ApiProperty({
        description: 'Widget name',
        example: 'Testimonial Carousel',
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        description: 'Widget type',
        example: 'carousel',
    })
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty({
        description: 'Testimonials to show in widget',
        example: [1, 2, 3],
        required: false,
    })
    @IsArray()
    @IsOptional()
    showTestimonials?: any[];
} 