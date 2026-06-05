import type { DataRow } from "../../types";
import { displayValue } from "../formatters/formatters";

export function rowsToCsv(rows: DataRow[], columns?: string[]) {
  const headers = columns ?? Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escapeCell = (value: string) => {
    if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };

  return [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(displayValue(row[header]))).join(",")),
  ].join("\n");
}

export function downloadCsv(filename: string, rows: DataRow[], columns?: string[]) {
  const csv = rowsToCsv(rows, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
