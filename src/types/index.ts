import type { FileMetaData } from "hyparquet";

export type ColumnType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "date"
  | "timestamp"
  | "decimal"
  | "unknown";

export type DataValue = string | number | boolean | bigint | Date | null | undefined | Record<string, unknown> | unknown[];
export type DataRow = Record<string, DataValue>;

export type ColumnSchema = {
  name: string;
  parquetType: string;
  convertedType?: string;
  logicalType?: string;
  uiType: ColumnType;
  nullable: boolean | null;
  example?: DataValue;
  nullCount?: number;
  nullPercent?: number;
  estimated: boolean;
};

export type TableSchema = {
  columns: ColumnSchema[];
  rowCount: number;
  estimated: boolean;
};

export type UploadedParquetFile = {
  id: string;
  file: File;
  name: string;
  sqlAlias: string;
  size: number;
  loadedAt: string;
  metadata: FileMetaData;
  schema: TableSchema;
  sampleRows: DataRow[];
  previewRows: DataRow[];
  isLarge: boolean;
};

export type ColumnProfile = {
  columnName: string;
  type: ColumnType;
  nullCount: number;
  nullPercent: number;
  distinctCount: number;
  min?: DataValue;
  max?: DataValue;
  mean?: number;
  median?: number;
  trueCount?: number;
  falseCount?: number;
  averageLength?: number;
  topValues: Array<{ value: string; count: number }>;
};

export type ProfileResult = {
  rowCount: number;
  sampleSize: number;
  isSampled: boolean;
  columns: ColumnProfile[];
};

export type ChartType = "bar" | "line" | "pie";
export type AggregationType = "none" | "count" | "sum" | "avg" | "min" | "max";

export type ChartConfig = {
  id: string;
  title: string;
  sourceId: string;
  sourceKind: "parquet" | "sql";
  type: ChartType;
  categoryColumn: string;
  metricColumn: string;
  aggregation: AggregationType;
};

export type AggregatedChartRow = {
  category: string;
  value: number;
};

export type QueryResult = {
  rows: DataRow[];
  columns: string[];
  executionMs: number;
  rowCount: number;
  truncated: boolean;
};

export type QueryError = {
  message: string;
};
