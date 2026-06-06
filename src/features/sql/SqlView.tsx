import { Download, Loader2, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MAX_QUERY_RESULT_ROWS } from "@/app/constants";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { downloadCsv } from "@/lib/export/csv";
import { runDuckDbQuery } from "@/lib/duckdb/client";
import type { QueryError, QueryResult, UploadedParquetFile } from "@/types";

type SqlViewProps = {
  file?: UploadedParquetFile;
  files: UploadedParquetFile[];
  duckDbStatus: "idle" | "registering" | "ready" | "error";
  onQueryResult: (result: QueryResult | undefined) => void;
};

export function SqlView({ file, files, duckDbStatus, onQueryResult }: SqlViewProps) {
  const primaryAlias = files[0]?.sqlAlias ?? "data1";
  const suggestions = useMemo(
    () => [
      `SELECT *
FROM ${primaryAlias}
LIMIT 100;`,
      `DESCRIBE ${primaryAlias};`,
      `SELECT COUNT(*) AS total_rows
FROM ${primaryAlias};`,
    ],
    [primaryAlias],
  );
  const [sql, setSql] = useState(suggestions[0]);
  const [result, setResult] = useState<QueryResult>();
  const [queryError, setQueryError] = useState<QueryError>();
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setSql((current) => (current.trim() ? current : suggestions[0]));
  }, [suggestions]);

  const canRun = Boolean(file) && duckDbStatus === "ready" && !running;

  const run = async () => {
    if (!canRun) return;
    setRunning(true);
    setQueryError(undefined);
    try {
      const nextResult = await runDuckDbQuery(sql);
      setResult(nextResult);
      onQueryResult(nextResult);
    } catch (error) {
      const nextError = { message: error instanceof Error ? error.message : "Erro ao executar SQL." };
      setQueryError(nextError);
      setResult(undefined);
      onQueryResult(undefined);
    } finally {
      setRunning(false);
    }
  };

  if (!file) {
    return <Empty title="SQL" message="Carregue um arquivo .parquet para consultar os aliases SQL gerados para cada arquivo." />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.35fr]">
      <Card>
        <CardHeader>
          <CardTitle>SQL local</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            className="min-h-[260px] w-full rounded-md border border-input bg-background p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
            onChange={(event) => setSql(event.target.value)}
            spellCheck={false}
            value={sql}
          />
          <div className="flex flex-wrap gap-2">
            <Button disabled={!canRun} onClick={() => void run()} type="button">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run query
            </Button>
            <Button onClick={() => setSql("")} type="button" variant="outline">
              <RotateCcw className="h-4 w-4" />
              Clear
            </Button>
            <Button disabled={!result?.rows.length} onClick={() => result && downloadCsv(`${file.name}-query.csv`, result.rows, result.columns)} type="button" variant="outline">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <button
                className="block w-full rounded-md border border-border bg-background p-3 text-left font-mono text-xs transition hover:bg-muted"
                key={suggestion}
                onClick={() => setSql(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
          {duckDbStatus === "registering" && <Alert>Registrando aliases dos arquivos Parquet no DuckDB-WASM...</Alert>}
          {duckDbStatus === "error" && <Alert className="border-destructive/30 bg-red-50 text-red-950">Nao foi possivel inicializar DuckDB-WASM para este arquivo.</Alert>}
          {!!files.length && (
            <Alert>
              Alias disponiveis: {files.map((item) => item.sqlAlias).join(", ")}. Use esses nomes diretamente nas queries e joins entre Parquets.
            </Alert>
          )}
          <Alert>Queries rodam no navegador via DuckDB-WASM. Nenhum dado e enviado para backend.</Alert>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {queryError && <Alert className="border-destructive/30 bg-red-50 text-red-950">{queryError.message}</Alert>}
        {result?.truncated && <Alert>Resultado limitado a {MAX_QUERY_RESULT_ROWS} linhas para proteger a interface.</Alert>}
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="rounded-md border border-border p-8 text-sm text-muted-foreground">Execute uma query para ver os resultados.</div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span>{result.rowCount.toLocaleString("pt-BR")} linha(s)</span>
                  <span>{result.executionMs.toFixed(1)} ms</span>
                </div>
                <DataTable columns={result.columns} rows={result.rows} pageSize={25} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Empty({ title, message }: { title: string; message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{message}</CardContent>
    </Card>
  );
}
