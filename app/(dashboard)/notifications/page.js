"use client";

import { useState } from "react";
import { CheckCheck } from "lucide-react";

import { ErrorState, LoadingBlock, PageHeader } from "@/components/common";
import { NotificationList } from "@/components/notifications/notification-list";
import { useNotifications } from "@/components/notifications/notification-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/hooks/use-api";

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const { unread, version, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const params = { page, page_size: PAGE_SIZE, ...(filter === "unread" ? { unread: 1 } : {}), v: version };
  const { data, error, loading, reload } = useApi("/notifications/", params);

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Updates about results, registration and other work that needs your attention."
        actions={
          <Button variant="outline" onClick={markAllRead} disabled={!unread}>
            <CheckCheck /> Mark all as read
          </Button>
        }
      />
      <Tabs
        value={filter}
        onValueChange={(value) => {
          setFilter(value);
          setPage(1);
        }}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread{unread ? ` (${unread})` : ""}</TabsTrigger>
        </TabsList>
      </Tabs>
      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && !data && <LoadingBlock rows={5} />}
      {data && (
        <Card className="overflow-hidden py-0">
          <NotificationList items={data.results} onOpen={(item) => !item.is_read && markRead(item.id)} />
        </Card>
      )}
      {data?.total_pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">
            Page {data.page} of {data.total_pages}
          </span>
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= data.total_pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </>
  );
}
