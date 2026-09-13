import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Пользовательское соглашение — Трекер расходов',
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Пользовательское соглашение</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Текст соглашения будет добавлен позже.
      </p>
    </main>
  );
}
