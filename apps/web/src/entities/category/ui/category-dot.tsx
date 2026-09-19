interface CategoryDotProps {
  color: string;
  className?: string;
}

/** Цветная точка категории рядом с её названием. */
export function CategoryDot({ color, className }: CategoryDotProps) {
  return (
    <span
      aria-hidden="true"
      className={className ?? 'inline-block size-2.5 shrink-0 rounded-full'}
      style={{ backgroundColor: color }}
    />
  );
}
