import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { displayValue } from "@/lib/formatters/formatters";
import type { DataRow } from "@/types";
import { Button } from "./button";
import { Input } from "./input";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./pagination";
import { Select } from "./select";

type DataTableProps = {
  rows: DataRow[];
  columns?: string[];
  searchable?: boolean;
  pageSize?: number;
};

export function DataTable({ rows, columns, searchable = true, pageSize = 25 }: DataTableProps) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pageInput, setPageInput] = useState("1");
  const resolvedColumns = useMemo(() => columns ?? Array.from(new Set(rows.flatMap((row) => Object.keys(row)))), [columns, rows]);
  const tableColumns = useMemo<ColumnDef<DataRow>[]>(
    () =>
      resolvedColumns.map((column) => ({
        accessorKey: column,
        header: ({ column: tableColumn }) => (
          <Button className="h-8 px-2" onClick={() => tableColumn.toggleSorting(tableColumn.getIsSorted() === "asc")} type="button" variant="ghost">
            <span className="max-w-[180px] truncate">{column}</span>
            <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ getValue }) => <span className="block max-w-[260px] truncate">{displayValue(getValue() as DataRow[string])}</span>,
      })),
    [resolvedColumns],
  );

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    state: { sorting, globalFilter },
    initialState: { pagination: { pageSize } },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const visiblePages = useMemo(() => {
    if (pageCount <= 5) return Array.from({ length: pageCount }, (_, index) => index + 1);

    const pages = new Set<number>([1, pageCount, currentPage - 1, currentPage, currentPage + 1]);
    return [...pages].filter((page) => page >= 1 && page <= pageCount).sort((a, b) => a - b);
  }, [currentPage, pageCount]);

  if (!rows.length) {
    return <div className="rounded-md border border-border p-8 text-center text-sm text-muted-foreground">{t("dataTable.noRows")}</div>;
  }

  return (
    <div className="space-y-3">
      {searchable && (
        <Input
          aria-label={t("dataTable.searchAria")}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder={t("dataTable.searchPlaceholder")}
          value={globalFilter}
        />
      )}
      <div className="overflow-auto rounded-md border border-border">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-muted/70">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th className="h-10 border-b border-border px-2 text-left font-medium" key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr className="border-b border-border last:border-b-0" key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td className="px-3 py-2 align-top" key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <span>{t("dataTable.pageOf", { page: currentPage, total: pageCount })}</span>
          <Select
            className="w-[190px]"
            onChange={(event) => table.setPageSize(Number(event.target.value))}
            value={String(table.getState().pagination.pageSize)}
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {t("dataTable.pageSize", { count: size })}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-2">
            <Input
              aria-label={t("dataTable.goToPage")}
              className="w-20"
              inputMode="numeric"
              onChange={(event) => setPageInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                const parsed = Number(pageInput);
                if (!Number.isFinite(parsed)) return;
                const nextPage = Math.min(Math.max(1, parsed), pageCount);
                table.setPageIndex(nextPage - 1);
                setPageInput(String(nextPage));
              }}
              placeholder={t("dataTable.pagePlaceholder")}
              value={pageInput}
            />
            <Button
              onClick={() => {
                const parsed = Number(pageInput);
                if (!Number.isFinite(parsed)) return;
                const nextPage = Math.min(Math.max(1, parsed), pageCount);
                table.setPageIndex(nextPage - 1);
                setPageInput(String(nextPage));
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              {t("dataTable.go")}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Pagination className="mx-0 w-auto justify-start">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} type="button" />
              </PaginationItem>
              {visiblePages.map((page, index) => {
                const previousPage = visiblePages[index - 1];
                const showEllipsis = previousPage && page - previousPage > 1;

                return (
                  <Fragment key={page}>
                    {showEllipsis ? (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : null}
                    <PaginationItem>
                      <PaginationLink isActive={currentPage === page} onClick={() => table.setPageIndex(page - 1)} type="button">
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  </Fragment>
                );
              })}
              <PaginationItem>
                <PaginationNext disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} type="button" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}
