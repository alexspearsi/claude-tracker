"use client"

import * as React from "react"
import { cn } from "@/shared/lib/utils"
import { CheckIcon } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    // Chrome на некоторых машинах принудительно обнуляет border/background у <button>
    // (см. память "chrome-overrides-button-colors") — asChild рендерит div вместо button,
    // Radix навешивает role="checkbox" и обработчики клика/клавиатуры на него сам.
    <CheckboxPrimitive.Root asChild {...props}>
      <div
        data-slot="checkbox"
        className={cn(
          "peer size-4 shrink-0 rounded-[4px] border-2 border-muted-foreground shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary",
          className
        )}
      >
        <CheckboxPrimitive.Indicator
          data-slot="checkbox-indicator"
          className="grid place-content-center text-current transition-none"
        >
          <CheckIcon className="size-3.5" />
        </CheckboxPrimitive.Indicator>
      </div>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
