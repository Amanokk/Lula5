import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: ComponentProps<"span"> & { tone?: "neutral" | "ok" | "warn" | "lula" | "flavio" | "live" }) {
  const tones = {
    neutral: "bg-surface-2 text-muted border-border",
    ok: "bg-ok/15 text-ok border-ok/30",
    warn: "bg-warn/15 text-warn border-warn/30",
    lula: "bg-lula/15 text-lula border-lula/30",
    flavio: "bg-flavio/20 text-fg border-flavio/40",
    live: "bg-lula text-fg border-lula",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
