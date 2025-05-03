import { Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from './database-connection';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import * as userSchema from '../user/schema';
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: (configService: ConfigService) => {
        const pool = new Pool({
          connectionString: configService.getOrThrow('DATABASE_URL'),
        });
        
        // Execute a query to set timezone for all connections
        pool.on('connect', (client) => {
          client.query('SET timezone = "Asia/Jakarta"');
        });
        
        return drizzle(pool, {
          schema: {
            ...userSchema,
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
