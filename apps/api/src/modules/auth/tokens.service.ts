import { createHash, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import type { AuthTokens } from '@expense/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { JwtPayload } from './jwt.strategy.js';

interface RefreshPayload extends JwtPayload {
  jti: string;
}

/**
 * Refresh-токен — сам по себе высокоэнтропийный секрет (не пароль), поэтому для его
 * хеширования используется SHA-256, а не bcrypt: bcrypt обрезает вход до 72 байт, а у всех
 * refresh-токенов одного пользователя первые 72 байта совпадают (общий префикс JWT-заголовка
 * и полей sub/email) — bcrypt.compare ложно засчитывал бы чужой токен как совпадающий.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Выпуск, проверка и отзыв пары access/refresh JWT-токенов. Refresh-токены хранятся в БД
 * только в виде SHA-256-хеша (см. {@link hashToken}), что позволяет отзывать их по записи
 * и не даёт восстановить исходный токен при утечке базы.
 */
@Injectable()
export class TokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Выпускает пару access + refresh и сохраняет хеш refresh-токена в БД.
   * @param userId id пользователя, для которого выпускаются токены
   * @param email email пользователя — кладётся в payload обоих токенов
   */
  async issue(userId: string, email: string): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync({ sub: userId, email } satisfies JwtPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.getOrThrow<string>('JWT_ACCESS_TTL') as JwtSignOptions['expiresIn'],
    });

    const jti = randomUUID();
    const refreshTtl = this.config.getOrThrow<string>('JWT_REFRESH_TTL');
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, email, jti } satisfies RefreshPayload,
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtl as JwtSignOptions['expiresIn'],
      },
    );

    const decoded = this.jwt.decode<{ exp: number }>(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(decoded.exp * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Проверяет подпись refresh-токена и находит соответствующую неотозванную,
   * непросроченную запись в БД по хешу.
   * @throws UnauthorizedException если подпись неверна, срок истёк, токен отозван
   *   или запись не найдена
   */
  async verify(refreshToken: string): Promise<{ userId: string; email: string; recordId: string }> {
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Недействительный refresh-токен');
    }

    const record = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash: hashToken(refreshToken),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      throw new UnauthorizedException('Недействительный refresh-токен');
    }

    return { userId: payload.sub, email: payload.email, recordId: record.id };
  }

  /**
   * Отзывает refresh-токен по его id записи.
   * @param recordId id записи `RefreshToken`, полученный из {@link verify}
   */
  async revokeById(recordId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: recordId },
      data: { revokedAt: new Date() },
    });
  }
}
