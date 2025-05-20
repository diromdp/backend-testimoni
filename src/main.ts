import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  process.env.TZ = 'Asia/Jakarta';

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'verbose', 'debug']
  });
  
  // Konfigurasi CORS spesifik untuk Vercel dan Cloudflare
  const allowedOrigins = [
    'https://syafaq-fe.vercel.app',
    'https://syafaq.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // Tambahkan semua domain frontend yang mungkin mengakses API
  ];

  app.enableCors({
    origin: function (origin, callback) {
      // Izinkan request dari non-browser (seperti curl, Postman)
      if (!origin) return callback(null, true);
      
      // Izinkan semua origin yang terdaftar
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      
      // Atau izinkan semua origin untuk debugging
      return callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authentication, Authorization, Access-control-allow-credentials, Access-control-allow-headers, Access-control-allow-methods, Access-control-allow-origin, User-Agent, Referer, Accept-Encoding, Accept-Language, Access-Control-Request-Headers, Cache-Control, Pragma',
    exposedHeaders: ['Content-Length', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 3600,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  
  // Middleware untuk mengatasi CORS di lingkungan serverless Vercel
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Untuk request OPTIONS (preflight), kirim header yang diperlukan dan selesai
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authentication, Authorization, Access-control-allow-credentials, Access-control-allow-headers, Access-control-allow-methods, Access-control-allow-origin, User-Agent, Referer, Accept-Encoding, Accept-Language, Access-Control-Request-Headers, Cache-Control, Pragma');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '3600');
      return res.status(204).end();
    }
    
    // Untuk request non-OPTIONS, tambahkan header CORS saja
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
  });
  
  await app.listen(5019);
}
bootstrap();
