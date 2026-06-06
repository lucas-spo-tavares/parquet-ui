import * as duckdb from "@duckdb/duckdb-wasm";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import ehWasm from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import mvpWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import { MAX_QUERY_RESULT_ROWS } from "@/app/constants";
import type { DataRow, QueryResult } from "@/types";

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: mvpWasm,
    mainWorker: mvpWorker,
  },
  eh: {
    mainModule: ehWasm,
    mainWorker: ehWorker,
  },
};

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;
let registeredParquetPath: string | undefined;

async function getDb() {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
    const worker = new Worker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    return db;
  })();

  return dbPromise;
}

function cleanSql(sql: string) {
  return sql.trim().replace(/;+$/, "");
}

function shouldWrapWithLimit(sql: string) {
  const normalized = cleanSql(sql).toLowerCase();
  return normalized.startsWith("select") || normalized.startsWith("with");
}

function limitedSql(sql: string) {
  const cleaned = cleanSql(sql);
  if (!shouldWrapWithLimit(cleaned)) return cleaned;
  return `SELECT * FROM (${cleaned}) AS parquet_ui_query LIMIT ${MAX_QUERY_RESULT_ROWS + 1}`;
}

function arrowTableToRows(table: unknown): DataRow[] {
  const arrowTable = table as {
    schema?: { fields?: Array<{ name: string }> };
    toArray?: () => unknown[];
  };
  const columns = arrowTable.schema?.fields?.map((field) => field.name) ?? [];
  const rows = arrowTable.toArray?.() ?? [];

  return rows.map((row) => {
    const rowWithJson = row as { toJSON?: () => Record<string, unknown>; get?: (key: string) => unknown };
    if (rowWithJson.toJSON) return rowWithJson.toJSON() as DataRow;

    return Object.fromEntries(columns.map((column) => [column, rowWithJson.get?.(column)])) as DataRow;
  });
}

function createVirtualParquetPath() {
  return `parquet-ui-${crypto.randomUUID()}.parquet`;
}

function sqlString(value: string) {
  return value.replace(/'/g, "''");
}

export async function registerParquetWithDuckDb(file: File) {
  const db = await getDb();
  const conn = await db.connect();
  const previousParquetPath = registeredParquetPath;
  const parquetPath = createVirtualParquetPath();

  try {
    await conn.query("DROP VIEW IF EXISTS data");
    await conn.query("DROP TABLE IF EXISTS data");

    try {
      await db.registerFileHandle(parquetPath, file, duckdb.DuckDBDataProtocol.BROWSER_FILEREADER, true);
    } catch {
      await db.registerFileBuffer(parquetPath, new Uint8Array(await file.arrayBuffer()));
    }

    await conn.query(`CREATE OR REPLACE VIEW data AS SELECT * FROM read_parquet('${sqlString(parquetPath)}')`);
    registeredParquetPath = parquetPath;

    if (previousParquetPath && previousParquetPath !== parquetPath) {
      await db.dropFile(previousParquetPath).catch(() => undefined);
    }
    await db.dropFile("uploaded.parquet").catch(() => undefined);
  } finally {
    await conn.close();
  }
}

export async function runDuckDbQuery(sql: string): Promise<QueryResult> {
  const db = await getDb();
  const conn = await db.connect();
  const startedAt = performance.now();

  try {
    const table = await conn.query(limitedSql(sql));
    const rows = arrowTableToRows(table);
    const truncated = rows.length > MAX_QUERY_RESULT_ROWS;
    const visibleRows = truncated ? rows.slice(0, MAX_QUERY_RESULT_ROWS) : rows;
    const columns = Object.keys(visibleRows[0] ?? {});

    return {
      rows: visibleRows,
      columns,
      executionMs: performance.now() - startedAt,
      rowCount: visibleRows.length,
      truncated,
    };
  } finally {
    await conn.close();
  }
}
