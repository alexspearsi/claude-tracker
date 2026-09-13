import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Политика обработки данных — Трекер расходов',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Политика обработки данных</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Текст политики будет добавлен позже.
      </p>
    </main>
  );
}
