import { cn } from "@/lib/utils";

const svg = "h-5 w-5";

export function GiftIcon({ id, className }: { id: string; className?: string }) {
  const cls = cn(svg, className);
  switch (id) {
    case "rose":
    case "white-rose":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 21c0-4 4-6 4-10a4 4 0 1 0-8 0c0 4 4 6 4 10Z" />
          <path d="M12 11c2-2 3.5-2.5 5-2" />
          <path d="M12 21V11" />
        </svg>
      );
    case "heart":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10Z" />
        </svg>
      );
    case "fireworks":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 13V4m0 9-3 7m3-7 3 7M12 13 5 9m7 4 7-4" />
          <circle cx="12" cy="13" r="1.4" fill="currentColor" />
        </svg>
      );
    case "donut":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <circle cx="8" cy="9" r="0.7" fill="currentColor" />
          <circle cx="15" cy="10" r="0.7" fill="currentColor" />
          <circle cx="10" cy="16" r="0.7" fill="currentColor" />
        </svg>
      );
    case "capybara":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="4" y="9" width="16" height="9" rx="4.5" />
          <circle cx="9" cy="13" r="0.8" fill="currentColor" />
          <circle cx="14" cy="13" r="0.8" fill="currentColor" />
          <path d="M7 9V7m10 2V7" />
        </svg>
      );
    case "dino":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M5 18h3l1-4 4 1 2-5 5 1-2 4 3 3h-4l-2-2-6 1-1 3H5Z" />
          <circle cx="16.5" cy="8.5" r="0.6" fill="currentColor" />
        </svg>
      );
    case "perfume":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="7" y="9" width="10" height="11" rx="2" />
          <path d="M10 9V6h4v3M12 4v2" />
        </svg>
      );
    case "sunglasses":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 12h3l2 4h4l2-4h7" />
          <rect x="5" y="12" width="6" height="5" rx="2" />
          <rect x="13" y="12" width="6" height="5" rx="2" />
        </svg>
      );
    case "galaxy":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v2m0 14v2M3 12h2m14 0h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="5" y="8" width="14" height="11" rx="2" />
          <path d="M12 8V5m-3 3c0-2 6-2 6 0" />
        </svg>
      );
  }
}
