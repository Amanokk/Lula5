import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors transition-transform duration-[var(--motion-quick)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-fg hover:bg-accent/90",
        secondary: "bg-surface-2 text-fg border border-border hover:bg-surface",
        outline: "border border-border bg-transparent text-fg hover:bg-surface-2",
        ghost: "text-fg hover:bg-surface-2",
        lula: "bg-lula text-fg hover:bg-lula/90",
        flavio: "bg-flavio text-fg hover:bg-flavio/90",
        danger: "bg-lula text-fg hover:bg-lula/85",
      },
      size: {
        default: "h-11 rounded-[var(--radius-sm)] px-4 text-sm",
        sm: "h-9 rounded-[var(--radius-xs)] px-3 text-sm",
        lg: "h-12 rounded-[var(--radius-md)] px-5 text-base",
        icon: "size-11 rounded-[var(--radius-sm)]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
