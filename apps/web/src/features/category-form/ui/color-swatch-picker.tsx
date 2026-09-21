'use client';

import { CATEGORY_COLORS } from '@/features/category-form/model/palette';

interface ColorSwatchPickerProps {
  value: string;
  onChange: (color: string) => void;
}

/** Палитра свотчей цвета категории (D-03) — свободного ввода hex в UI нет. */
export function ColorSwatchPicker({ value, onChange }: ColorSwatchPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORY_COLORS.map((hex) => (
        <button
          key={hex}
          type="button"
          aria-pressed={value === hex}
          aria-label={hex}
          onClick={() => onChange(hex)}
          style={{ backgroundColor: hex }}
          className={
            value === hex
              ? 'size-7 rounded-full ring-2 ring-ring ring-offset-2'
              : 'size-7 rounded-full'
          }
        />
      ))}
    </div>
  );
}
