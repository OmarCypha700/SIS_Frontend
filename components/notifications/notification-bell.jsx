"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";

import { NotificationList } from "@/components/notifications/notification-list";
import { useNotifications } from "@/components/notifications/notification-provider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export function NotificationBell() {
  const { unread, version, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    api
      .get("/notifications/", { params: { page_size: 10 }, signal: controller.signal })
      .then(({ data }) => setItems(data.results))
      .catch(() => {});
    return () => controller.abort();
  }, [open, version]);

  const label = unread ? `Notifications, ${unread} unread` : "Notifications";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={label}>
          <Bell />
          {unread > 0 && (
            <span
              data-testid="unread-count"
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-white"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          <Button variant="ghost" size="sm" disabled={!unread} onClick={markAllRead}>
            <CheckCheck /> Mark all as read
          </Button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {items === null ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : (
            <NotificationList
              compact
              items={items}
              onOpen={(item) => {
                setOpen(false);
                if (!item.is_read) markRead(item.id);
              }}
            />
          )}
        </div>
        <div className="border-t p-2">
          <Button asChild variant="ghost" size="sm" className="w-full" onClick={() => setOpen(false)}>
            <Link href="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
