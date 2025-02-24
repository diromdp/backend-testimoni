export class CreateProjectDto {
  title: string;
  description?: string;
  status?: string;
  slug: string;
  metadata?: Record<string, any>;
}
