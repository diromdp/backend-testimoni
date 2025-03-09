import { PartialType } from '@nestjs/mapped-types';
import { CreateTestimoniDto } from './create-testimoni.dto';

export class UpdateTestimoniDto extends PartialType(CreateTestimoniDto) {} 