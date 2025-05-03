import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  process.env.TZ = 'Asia/Jakarta';

  const app = await NestFactory.create(AppModule, { cors: true });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
