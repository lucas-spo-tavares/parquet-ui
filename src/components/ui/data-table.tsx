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
import { useMemo, useState } from "react";
import type { DataRow } from "../../types";
import { displayValue } from "../../lib/formatters/formatters";
import { Button } from "./button";
import { Input } from "./input";

type DataTableProps = {
  rows: DataRow[];
  columns?: string[];
  searchable?: boolean;
  pageSize?: number;
};

export function DataTable({ rows, columns, searchable = true, pageSize = 25 }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
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

  if (!rows.length) {
    return <div className="rounded-md border border-border p-8 text-center text-sm text-muted-foreground">Nenhuma linha para exibir.</div>;
  }

  return (
    <div className="space-y-3">
      {searchable && (
        <Input
          aria-label="Buscar na tabela"
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder="Buscar nas linhas visiveis..."
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
        <span>
          Pagina {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
        </span>
        <div className="flex gap-2">
          <Button disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} size="sm" type="button" variant="outline">
            Anterior
          </Button>
          <Button disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} size="sm" type="button" variant="outline">
            Proxima
          </Button>
        </div>
      </div>
    </div>
  );
}
