import type { FileMetaData, SchemaElement, SchemaTree } from "hyparquet";
import { parquetSchema } from "hyparquet";
import type { ColumnSchema, ColumnType, DataRow } from "@/types";

function logicalTypeToString(logicalType: SchemaElement["logical_type"]) {
  if (!logicalType) return undefined;
  return Object.keys(logicalType).join(", ");
}

function inferColumnType(element: SchemaElement, example: unknown): ColumnType {
  const converted = element.converted_type;
  const logical = logicalTypeToString(element.logical_type)?.toLowerCase() ?? "";

  if (converted === "UTF8" || element.type === "BYTE_ARRAY") return "string";
  if (converted === "DECIMAL" || logical.includes("decimal")) return "decimal";
  if (converted === "DATE" || logical.includes("date")) return "date";
  if (converted?.startsWith("TIMESTAMP") || logical.includes("timestamp")) return "timestamp";
  if (element.type === "BOOLEAN") return "boolean";
  if (element.type === "INT32" || element.type === "INT64" || converted?.startsWith("INT_")) return "integer";
  if (element.type === "FLOAT" || element.type === "DOUBLE") return "number";

  if (typeof example === "boolean") return "boolean";
  if (typeof example === "bigint") return "integer";
  if (typeof example === "number") return Number.isInteger(example) ? "integer" : "number";
  if (example instanceof Date) return "timestamp";
  if (typeof example === "string") return Number.isNaN(Date.parse(example)) ? "string" : "timestamp";

  return "unknown";
}

function findExample(rows: DataRow[], columnName: string) {
  return rows.find((row) => row[columnName] !== null && row[columnName] !== undefined)?.[columnName];
}

export function getColumnNames(metadata: FileMetaData) {
  const schemaTree = parquetSchema(metadata) as SchemaTree;
  return schemaTree.children.map((child) => child.element.name);
}

export function buildTableSchema(metadata: FileMetaData, sampleRows: DataRow[]) {
  const schemaTree = parquetSchema(metadata) as SchemaTree;
  const columns: ColumnSchema[] = schemaTree.children.map((child) => {
    const element = child.element;
    const nullCount = sampleRows.filter((row) => row[element.name] === null || row[element.name] === undefined).length;
    const example = findExample(sampleRows, element.name);
    return {
      name: element.name,
      parquetType: element.type ?? "group",
      convertedType: element.converted_type,
      logicalType: logicalTypeToString(element.logical_type),
      uiType: inferColumnType(element, example),
      nullable: element.repetition_type ? element.repetition_type !== "REQUIRED" : null,
      example,
      nullCount,
      nullPercent: sampleRows.length > 0 ? (nullCount / sampleRows.length) * 100 : undefined,
      estimated: true,
    };
  });

  return {
    columns,
    rowCount: Number(metadata.num_rows),
    estimated: sampleRows.length < Number(metadata.num_rows),
  };
}
