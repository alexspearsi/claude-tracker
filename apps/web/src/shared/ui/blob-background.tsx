import { cn } from '@/shared/lib/utils';

/**
 * Фоновый слой Liquid Glass: лавандовая заливка + 4 размытых цветных пятна.
 * Фиксированные позиции/цвета — 1:1 из макета (не рандомизируются и не зависят
 * от контента), рендерится один раз в layout поверх которого лежат стеклянные карточки.
 */
export function BlobBackground({ className }: { className?: string }) {
  return (
    <div className={cn('lg-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)}>
      <div className="lg-blob" style={{ left: -160, top: -200, width: 720, height: 720, background: '#c7b3ff' }} />
      <div className="lg-blob" style={{ right: -120, top: 60, width: 560, height: 560, background: '#b7d7ff' }} />
      <div className="lg-blob" style={{ left: 420, bottom: -260, width: 680, height: 680, background: '#ffd1e8' }} />
      <div className="lg-blob" style={{ right: 320, bottom: -180, width: 420, height: 420, background: '#c4f3e2' }} />
    </div>
  );
}
