import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  process.env.TZ = 'Asia/Jakarta';

  const corsOptions = {
    origin: '*', // Mengizinkan semua origin
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // Jika Anda menggunakan cookies atau header Authorization
    allowedHeaders: 'Content-Type, Accept, Authorization',
  };

  const app = await NestFactory.create(AppModule,
    {
      cors: corsOptions,
      logger: ['error', 'warn', 'log', 'verbose', 'debug']
    }
  );
  await app.listen(5019);
}
bootstrap();
