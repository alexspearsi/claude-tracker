// Наполнение локальной БД демо-данными: npm run db:seed -w apps/api
// Импорт указывает на сгенерированный клиент — появится после `prisma generate`.
import { PrismaClient } from '../src/generated/prisma/client.ts';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // TODO: демо-пользователь, базовые категории (Еда, Транспорт, Жильё) и пара трат.
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
