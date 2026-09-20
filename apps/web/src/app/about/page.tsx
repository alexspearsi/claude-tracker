import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'О сервисе — Трекер расходов',
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">О сервисе</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Текст о сервисе будет добавлен позже.
      </p>
    </main>
  );
}
