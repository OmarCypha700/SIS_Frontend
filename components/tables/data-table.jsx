"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { EmptyState, ErrorState } from "@/components/common";
import { NativeSelect } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi, useDebounced } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

/**
 * Server-side paginated table.
 *
 * columns: [{ key, header, cell?: (row) => node, sortKey?, className? }]
 * filters: [{ key, label, options?: [{value,label}], endpoint?, optionValue?, optionLabel? }]
 */
export function DataTable({
  endpoint, columns, filters = [], params = {}, searchPlaceholder = "Search…", defaultOrdering, rowHref,
  toolbar, refreshKey = 0, emptyTitle = "No records found", emptyDescription, pageSize = 25, onData,
  searchable = true,
}) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState(defaultOrdering);
  const [filterValues, setFilterValues] = useState({});
  const debouncedSearch = useDebounced(search);

  const apiParams = useMemo(() => {
    const q = { page, page_size: pageSize, ...params };
    if (debouncedSearch) q.search = debouncedSearch;
    if (ordering) q.ordering = ordering;
    for (const [key, value] of Object.entries(filterValues)) if (value !== "" && value != null) q[key] = value;
    return q;
  }, [page, pageSize, params, debouncedSearch, ordering, filterValues]);

  const { data, error, loading, reload } = useApi(endpoint, apiParams);
  const rows = Array.isArray(data) ? data : (data?.results ?? []);

  useEffect(() => {
    if (refreshKey) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);
  useEffect(() => {
    if (data && onData) onData(data, apiParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function toggleSort(key) {
    if (!key) return;
    setOrdering((current) => (current === key ? `-${key}` : current === `-${key}` ? undefined : key));
  }

  return (
    <div className="rounded-xl border bg-card">
      {(searchable || filters.length > 0 || toolbar) && (
        <div className="flex flex-col gap-2 border-b p-3 md:flex-row md:items-center">
          {searchable && (
            <div className="relative md:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="pl-8"
                aria-label="Search"
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <FilterSelect
                key={filter.key}
                filter={filter}
                value={filterValues[filter.key] ?? ""}
                onChange={(value) => {
                  setFilterValues((prev) => ({ ...prev, [filter.key]: value }));
                  setPage(1);
                }}
              />
            ))}
          </div>
          {toolbar && <div className="flex flex-wrap gap-2 md:ml-auto">{toolbar}</div>}
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={cn("whitespace-nowrap", column.className)}>
                  {column.sortKey ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.sortKey)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {column.header}
                      {ordering === column.sortKey ? (
                        <ArrowUp className="size-3.5" />
                      ) : ordering === `-${column.sortKey}` ? (
                        <ArrowDown className="size-3.5" />
                      ) : (
                        <ArrowUpDown className="size-3.5 opacity-40" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((column) => (
                      <TableCell key={column.key}>
                        <Skeleton className="h-5 w-full max-w-40" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow
                    key={row.id ?? JSON.stringify(row)}
                    className={cn(rowHref && "cursor-pointer", loading && "opacity-60")}
                    onClick={rowHref ? (e) => {
                      if (e.target.closest("a,button,input,select,[role=menuitem]")) return;
                      router.push(rowHref(row));
                    } : undefined}
                  >
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        {column.cell ? column.cell(row) : (row[column.key] ?? "—")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        {error && <ErrorState error={error} onRetry={reload} />}
        {!error && !loading && rows.length === 0 && <EmptyState title={emptyTitle} description={emptyDescription} />}
      </div>
      {data && data.count > 0 && (
        <div className="flex flex-col items-center justify-between gap-2 border-t px-3 py-2 text-sm text-muted-foreground sm:flex-row">
          <span>
            {(data.page - 1) * data.page_size + 1}–{Math.min(data.page * data.page_size, data.count)} of {data.count}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
              <ChevronLeft />
            </Button>
            <span className="px-2 tabular-nums">
              Page {data.page} of {data.total_pages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= data.total_pages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ filter, value, onChange }) {
  const { data } = useApi(filter.endpoint || null, { page_size: 200 });
  const options = filter.options
    ?? (Array.isArray(data) ? data : data?.results ?? []).map((item) => ({
      value: String(filter.optionValue ? filter.optionValue(item) : item.id),
      label: filter.optionLabel ? filter.optionLabel(item) : item.name,
    }));
  return (
    <NativeSelect
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={filter.label}
      className="w-auto min-w-36"
    >
      <option value="">{filter.label}: All</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </NativeSelect>
  );
}
