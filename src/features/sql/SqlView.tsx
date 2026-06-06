import { ChevronDown, ChevronUp, CircleHelp, Download, Loader2, Play, Plus, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import { MAX_QUERY_RESULT_ROWS } from "@/app/constants";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCsv } from "@/lib/export/csv";
import { runDuckDbQuery } from "@/lib/duckdb/client";
import type { UploadedParquetFile } from "@/types";
import { useSqlStore } from "./store/sqlStore";

type SqlViewProps = {
  file?: UploadedParquetFile;
  files: UploadedParquetFile[];
  duckDbStatus: "idle" | "registering" | "ready" | "error";
};

function buildDefaultSql(primaryAlias: string) {
  return `SELECT *
FROM ${primaryAlias}
LIMIT 100;`;
}

export function SqlView({ file, files, duckDbStatus }: SqlViewProps) {
  const tabs = useSqlStore((state) => state.tabs);
  const activeTabId = useSqlStore((state) => state.activeTabId);
  const addTab = useSqlStore((state) => state.addTab);
  const closeTab = useSqlStore((state) => state.closeTab);
  const renameTab = useSqlStore((state) => state.renameTab);
  const setActiveTab = useSqlStore((state) => state.setActiveTab);
  const setQueryError = useSqlStore((state) => state.setQueryError);
  const setQueryOpen = useSqlStore((state) => state.setQueryOpen);
  const setQueryResult = useSqlStore((state) => state.setQueryResult);
  const setSql = useSqlStore((state) => state.setSql);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  const primaryAlias = files[0]?.sqlAlias ?? "data1";
  const defaultSql = useMemo(() => buildDefaultSql(primaryAlias), [primaryAlias]);
  const suggestions = useMemo(
    () => [
      {
        label: `Preview de ${primaryAlias}`,
        sql: buildDefaultSql(primaryAlias),
      },
      {
        label: `Schema de ${primaryAlias}`,
        sql: `DESCRIBE ${primaryAlias};`,
      },
      {
        label: `Contagem de ${primaryAlias}`,
        sql: `SELECT COUNT(*) AS total_rows
FROM ${primaryAlias};`,
      },
    ],
    [primaryAlias],
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [closingTabId, setClosingTabId] = useState<string>();
  const [runningTabId, setRunningTabId] = useState<string>();

  if (!activeTab) {
    return null;
  }

  const canRun = files.length > 0 && duckDbStatus === "ready" && runningTabId !== activeTab.id;
  const isRunning = runningTabId === activeTab.id;
  const closingTab = tabs.find((tab) => tab.id === closingTabId);

  const run = async () => {
    if (!canRun) return;

    const tabId = activeTab.id;
    setRunningTabId(tabId);
    setQueryError(tabId, undefined);
    try {
      const nextResult = await runDuckDbQuery(activeTab.sql);
      setQueryResult(tabId, nextResult);
      setQueryError(tabId, undefined);
    } catch (error) {
      setQueryError(tabId, { message: error instanceof Error ? error.message : "Erro ao executar SQL." });
      setQueryResult(tabId, undefined);
    } finally {
      setRunningTabId((current) => (current === tabId ? undefined : current));
    }
  };

  if (!file) {
    return <Empty title="SQL" message="Carregue um arquivo .parquet para consultar os aliases SQL gerados para cada arquivo." />;
  }

  return (
    <div className="space-y-4">
      <Tabs onValueChange={setActiveTab} value={activeTab.id}>
        <div className="flex items-end gap-2">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger className="group gap-1" key={tab.id} value={tab.id}>
                <span className="max-w-[160px] truncate">{tab.name}</span>
                <span
                  aria-label={`Fechar ${tab.name}`}
                  className="rounded p-0.5 transition hover:bg-background/80 hover:text-foreground"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setClosingTabId(tab.id);
                  }}
                  role="button"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          <Button onClick={() => addTab(defaultSql)} size="icon" type="button" variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {tabs.map((tab) => {
          const tabCanRun = files.length > 0 && duckDbStatus === "ready" && runningTabId !== tab.id;
          const tabIsRunning = runningTabId === tab.id;

          return (
            <TabsContent className="space-y-4" key={tab.id} value={tab.id}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Input className="max-w-[280px] font-medium" onChange={(event) => renameTab(tab.id, event.target.value)} value={tab.name} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={() => setQueryOpen(tab.id, !tab.queryOpen)} type="button" variant="outline">
                      {tab.queryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {tab.queryOpen ? "Recolher" : "Expandir"}
                    </Button>
                    <Button
                      disabled={!tabCanRun}
                      onClick={() => {
                        if (tab.id !== activeTab.id) {
                          setActiveTab(tab.id);
                        }
                        void run();
                      }}
                      type="button"
                    >
                      {tabIsRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Run query
                    </Button>
                    <Button onClick={() => setSql(tab.id, "")} type="button" variant="outline">
                      <RotateCcw className="h-4 w-4" />
                      Clear
                    </Button>
                    <Button
                      onClick={() => {
                        if (tab.id !== activeTab.id) {
                          setActiveTab(tab.id);
                        }
                        setHelpOpen(true);
                      }}
                      type="button"
                      variant="outline"
                    >
                      <CircleHelp className="h-4 w-4" />
                      Ajuda
                    </Button>
                  </div>
                </CardHeader>
                {tab.queryOpen && (
                  <CardContent className="space-y-4">
                    <textarea
                      className="min-h-[260px] w-full rounded-md border border-input bg-background p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
                      onChange={(event) => setSql(tab.id, event.target.value)}
                      spellCheck={false}
                      value={tab.sql}
                    />
                    {duckDbStatus === "registering" && <Alert>Registrando aliases dos arquivos Parquet no DuckDB-WASM...</Alert>}
                    {duckDbStatus === "error" && <Alert className="border-destructive/30 bg-red-50 text-red-950">Nao foi possivel inicializar DuckDB-WASM para este arquivo.</Alert>}
                  </CardContent>
                )}
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {activeTab.queryError && <Alert className="border-destructive/30 bg-red-50 text-red-950">{activeTab.queryError.message}</Alert>}
      {activeTab.result?.truncated && <Alert>Resultado limitado a {MAX_QUERY_RESULT_ROWS} linhas para proteger a interface.</Alert>}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Resultado</CardTitle>
          <Button
            disabled={!activeTab.result?.rows.length}
            onClick={() => activeTab.result && downloadCsv(`${activeTab.name}.csv`, activeTab.result.rows, activeTab.result.columns)}
            type="button"
            variant="outline"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent className="min-w-0">
          {!activeTab.result ? (
            <div className="rounded-md border border-border p-8 text-sm text-muted-foreground">Execute uma query para ver os resultados.</div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>{activeTab.result.rowCount.toLocaleString("pt-BR")} linha(s)</span>
                <span>{activeTab.result.executionMs.toFixed(1)} ms</span>
              </div>
              <DataTable columns={activeTab.result.columns} rows={activeTab.result.rows} pageSize={25} />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        description="Atalhos rapidos para consultar os Parquets carregados."
        onOpenChange={setHelpOpen}
        open={helpOpen}
        title="Ajuda SQL"
      >
        <div className="space-y-4 text-sm">
          {!!files.length && (
            <Alert>
              Alias disponiveis: {files.map((item) => item.sqlAlias).join(", ")}. Use esses nomes diretamente nas queries e joins entre Parquets.
            </Alert>
          )}
          <Alert>Queries rodam no navegador via DuckDB-WASM. Nenhum dado e enviado para backend.</Alert>
          <div className="space-y-2">
            <p className="font-medium">Exemplos uteis</p>
            {suggestions.map((suggestion) => (
              <button
                className="block w-full rounded-md border border-border bg-background p-3 text-left font-mono text-xs transition hover:bg-muted"
                key={suggestion.label}
                onClick={() => {
                  setSql(activeTab.id, suggestion.sql);
                  setHelpOpen(false);
                }}
                type="button"
              >
                {suggestion.sql}
              </button>
            ))}
          </div>
        </div>
      </Dialog>

      <Dialog
        description="Essa aba e o resultado atual dela serao fechados."
        onOpenChange={(open) => setClosingTabId(open ? closingTabId : undefined)}
        open={Boolean(closingTab)}
        title={`Fechar ${closingTab?.name ?? "aba"}`}
        footer={
          <>
            <Button onClick={() => setClosingTabId(undefined)} type="button" variant="outline">
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!closingTab) return;
                closeTab(closingTab.id, defaultSql);
                setClosingTabId(undefined);
              }}
              type="button"
            >
              Fechar aba
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Voce pode criar outra aba depois pelo botao <code>+</code>.</p>
      </Dialog>
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
