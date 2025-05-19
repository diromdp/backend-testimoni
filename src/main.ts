import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  process.env.TZ = 'Asia/Jakarta';

  const app = await NestFactory.create(AppModule,
    {
      cors: true,
      logger: ['error', 'warn', 'log', 'verbose', 'debug']
    }
  );
  await app.listen(5019);
}
bootstrap();
