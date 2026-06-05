import { parquetMetadataAsync, parquetReadObjects } from "hyparquet";
import { DEFAULT_SAMPLE_SIZE, INITIAL_PREVIEW_ROWS, LARGE_FILE_SIZE_MB } from "../../app/constants";
import type { DataRow, UploadedParquetFile } from "../../types";
import { asyncBufferFromBrowserFile } from "./browserFile";
import { buildTableSchema } from "./schema";

export async function readParquetFile(file: File): Promise<UploadedParquetFile> {
  const buffer = asyncBufferFromBrowserFile(file);
  const metadata = await parquetMetadataAsync(buffer);
  const rowCount = Number(metadata.num_rows);
  const sampleSize = Math.min(rowCount, DEFAULT_SAMPLE_SIZE);
  const sampleRows = (await parquetReadObjects({
    file: buffer,
    metadata,
    rowStart: 0,
    rowEnd: sampleSize,
  })) as DataRow[];

  const schema = buildTableSchema(metadata, sampleRows);

  return {
    id: crypto.randomUUID(),
    file,
    name: file.name,
    size: file.size,
    loadedAt: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date()),
    metadata,
    schema,
    sampleRows,
    previewRows: sampleRows.slice(0, INITIAL_PREVIEW_ROWS),
    isLarge: file.size > LARGE_FILE_SIZE_MB * 1024 * 1024,
  };
}

export async function readParquetPreview(file: UploadedParquetFile, rowCount: number) {
  const buffer = asyncBufferFromBrowserFile(file.file);
  return (await parquetReadObjects({
    file: buffer,
    metadata: file.metadata,
    rowStart: 0,
    rowEnd: Math.min(rowCount, file.schema.rowCount),
  })) as DataRow[];
}
