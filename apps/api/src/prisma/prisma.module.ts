import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { PRISMA, prismaProvider, type Prisma } from './prisma.provider.js';

@Global()
@Module({
  providers: [prismaProvider],
  exports: [PRISMA],
})
export class PrismaModule implements OnApplicationShutdown {
  constructor(@Inject(PRISMA) private readonly prisma: Prisma) {}

  async onApplicationShutdown(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
