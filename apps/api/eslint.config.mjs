import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // сгенерированный Prisma-клиент и сборка линтером не проверяются
  { ignores: ['dist/**', 'node_modules/**', 'src/generated/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // типизированный разбор только для исходников: prisma.config.ts, seed.ts
    // и сам конфиг линтера в tsconfig не входят
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    rules: {
      // заготовки сервисов принимают параметры, которые пока не используются
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
