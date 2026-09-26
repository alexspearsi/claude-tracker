'use client';

import { CheckIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { CATEGORY_COLORS } from '@/features/category-form/model/palette';

interface ColorSwatchPickerProps {
  value: string;
  onChange: (color: string) => void;
}

/** Палитра свотчей цвета категории (D-03) — свободного ввода hex в UI нет. */
export function ColorSwatchPicker({ value, onChange }: ColorSwatchPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {CATEGORY_COLORS.map((hex) => {
        const selected = value === hex;
        return (
          <button
            key={hex}
            type="button"
            aria-pressed={selected}
            aria-label={hex}
            onClick={() => onChange(hex)}
            style={{ backgroundColor: hex, boxShadow: selected ? `0 0 0 3px #fff, 0 0 0 6px ${hex}` : undefined }}
            className={cn('flex size-11 items-center justify-center rounded-full transition-shadow')}
          >
            {selected && <CheckIcon className="size-4 stroke-[3] text-white" />}
          </button>
        );
      })}
    </div>
  );
}
