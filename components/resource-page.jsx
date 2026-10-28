"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { hasRole, useAuth } from "@/components/auth/auth-provider";
import { ConfirmDialog, PageHeader, RoleGate } from "@/components/common";
import { ResourceFormDialog } from "@/components/forms/resource-form";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, errorMessage } from "@/lib/api";

/**
 * Generic list + create/edit/delete page for simple reference data.
 * `rowActions(row, reload)` can add extra menu items.
 */
export function ResourcePage({
  title, description, endpoint, columns, fields, filters, singular, readRoles, writeRoles, searchPlaceholder,
  defaultOrdering, rowActions, rowHref, allowDelete = true, transform, params, headerActions, hideHeader = false,
  tableProps, refreshKey = 0,
}) {
  const { user } = useAuth();
  const canWrite = hasRole(user, ...writeRoles);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const reload = () => setRefresh((n) => n + 1);

  const actionColumn = {
    key: "_actions",
    header: <span className="sr-only">Actions</span>,
    className: "w-12 text-right",
    cell: (row) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${row.code || row.name || row.id}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(row)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          {rowActions?.(row, reload)}
          {allowDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(row)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  };

  return (
    <RoleGate roles={readRoles}>
      <PageHeader
        title={title}
        description={description}
        className={hideHeader ? "mb-3 [&_h1]:text-lg" : undefined}
        actions={
          <>
            {headerActions}
            {canWrite && (
              <Button onClick={() => setEditing({})}>
                <Plus /> New {singular}
              </Button>
            )}
          </>
        }
      />
      <DataTable
        endpoint={endpoint}
        params={params}
        columns={canWrite ? [...columns, actionColumn] : columns}
        filters={filters}
        refreshKey={refresh + refreshKey}
        {...tableProps}
        searchPlaceholder={searchPlaceholder}
        defaultOrdering={defaultOrdering}
        rowHref={rowHref}
        emptyTitle={`No ${singular}s yet`}
      />
      {canWrite && (
        <ResourceFormDialog
          open={editing !== null}
          onOpenChange={(open) => !open && setEditing(null)}
          title={editing?.id ? `Edit ${singular}` : `New ${singular}`}
          endpoint={endpoint}
          fields={fields}
          record={editing}
          onSaved={reload}
          transform={transform}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete this ${singular}?`}
        description="Records that are referenced elsewhere cannot be deleted; deactivate them instead. This action is logged."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            await api.delete(`${endpoint}${deleting.id}/`);
            toast.success("Deleted.");
            reload();
          } catch (error) {
            toast.error(errorMessage(error));
            throw error;
          }
        }}
      />
    </RoleGate>
  );
}
