import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetadata {
  @ApiProperty()
  total: number;

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  lastPage: number;

  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty({ required: false })
  lastId?: number;
}

export class PaginatedResult<T> {
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty()
  metadata: PaginationMetadata;
}

export type PaginationParams = {
  page: number;
  limit: number;
  lastId?: number;
} 