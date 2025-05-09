import { PartialType } from '@nestjs/swagger';
import { CreateWigdetDto } from './create-wigdet.dto';

export class UpdateWigdetDto extends PartialType(CreateWigdetDto) {} 