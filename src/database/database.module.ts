import { Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from './database-connection';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { schema, setupRelations } from './db-schema';

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
        
        const db = drizzle(pool, { schema });
        
        // Setup relations that couldn't be defined directly due to circular dependencies
        setupRelations(db);
        
        return db;
      },
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
