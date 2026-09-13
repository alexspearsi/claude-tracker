import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:3001'),
    credentials: true,
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  // Проверяет DTO-классы на class-validator. Тела с типом из `import type` (Zod-роуты auth)
  // в рантайме имеют метатип Object — пайп их пропускает, их валидирует ZodValidationPipe.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      errorFormat: 'grouped',
    }),
  );

  const port = config.get<number>('PORT', 4001);
  await app.listen(port);
  Logger.log(`API слушает http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
