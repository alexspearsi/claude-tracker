import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7: connection string больше не живёт в schema.prisma.
 * Здесь его читает Migrate/CLI; рантайм-клиент получает строку через driver adapter
 * в src/prisma/prisma.service.ts.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
