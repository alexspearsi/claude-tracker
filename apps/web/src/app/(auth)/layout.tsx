import { BlobBackground } from '@/shared/ui/blob-background';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <BlobBackground />
      <div className="relative w-full max-w-[440px]">{children}</div>
    </main>
  );
}
