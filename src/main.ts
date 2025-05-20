import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  process.env.TZ = 'Asia/Jakarta';

  const corsOptions = {
    origin: [
      'https://syafaq-fe.vercel.app', // Domain frontend Anda
      'https://syafaq.com',
      'http://localhost:3000', // Contoh untuk pengembangan frontend lokal
      'http://127.0.0.1:3000', // Contoh lain untuk pengembangan frontend lokal
    ],
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
