import type { DataValue } from "@/types";

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function displayValue(value: DataValue): string {
  if (value === null) return "null";
  if (value === undefined) return "";
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function asNumber(value: DataValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function inferValueType(value: DataValue) {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "bigint") return "integer";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  if (value instanceof Date) return "timestamp";
  if (typeof value === "string") {
    const date = Date.parse(value);
    return Number.isNaN(date) ? "string" : "timestamp";
  }
  return "unknown";
}
