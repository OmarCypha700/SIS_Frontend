"use client";

import { useRouter } from "next/navigation";

import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/** One list used by the bell popover and the notifications page. */
export function NotificationList({ items, onOpen, compact = false }) {
  const router = useRouter();
  if (!items?.length) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">You&rsquo;re all caught up.</p>;
  }
  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => {
              onOpen?.(item);
              if (item.link) router.push(item.link);
            }}
            className={cn(
              "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none",
              !item.is_read && "bg-primary/5",
            )}
          >
            <span
              className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.is_read ? "bg-transparent" : "bg-primary")}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className={cn("block text-sm", !item.is_read && "font-medium")}>{item.title}</span>
              {item.body && (
                <span className={cn("block text-sm text-muted-foreground", compact && "line-clamp-2")}>{item.body}</span>
              )}
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {item.kind_display} · {timeAgo(item.created_at)}
              </span>
            </span>
            {!item.is_read && <span className="sr-only">Unread</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
