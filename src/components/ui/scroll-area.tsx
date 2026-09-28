import * as Scroll from "@radix-ui/react-scroll-area";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ScrollArea({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Scroll.Root className={cn("overflow-hidden", className)}>
      <Scroll.Viewport className="h-full w-full">{children}</Scroll.Viewport>
      <Scroll.Scrollbar
        className="flex w-2 touch-none select-none bg-transparent p-0.5"
        orientation="vertical"
      >
        <Scroll.Thumb className="relative flex-1 rounded-full bg-border" />
      </Scroll.Scrollbar>
    </Scroll.Root>
  );
}
