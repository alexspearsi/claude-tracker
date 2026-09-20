import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
      }),
    });
  }

  // подключаемся явно, чтобы невалидный DATABASE_URL валил старт приложения,
  // а не всплывал на первом запросе (Prisma по умолчанию коннектится лениво)
  async onModuleInit() {
    await this.$connect();
  }
}
