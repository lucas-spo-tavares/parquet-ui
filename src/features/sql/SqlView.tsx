import { ChevronDown, ChevronUp, CircleHelp, Download, FileArchive, Loader2, Play, Plus, RotateCcw, X } from "lucide-react";
import { Suspense, lazy, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardStore } from "@/features/dashboard/store/dashboardStore";
import { downloadBlob, downloadCsv } from "@/lib/export/csv";
import { exportDuckDbQueryToParquet, runDuckDbQuery } from "@/lib/duckdb/client";
import type { UploadedParquetFile } from "@/types";
import { useSqlStore } from "./store/sqlStore";

const queryResultLimitOptions = [100, 1_000, 5_000, 10_000];

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

const SqlEditor = lazy(() => import("./SqlEditor"));

export function SqlView({ file, files, duckDbStatus }: SqlViewProps) {
  const { t } = useTranslation();
  const tabs = useSqlStore((state) => state.tabs);
  const activeTabId = useSqlStore((state) => state.activeTabId);
  const addTab = useSqlStore((state) => state.addTab);
  const closeTab = useSqlStore((state) => state.closeTab);
  const renameTab = useSqlStore((state) => state.renameTab);
  const setActiveTab = useSqlStore((state) => state.setActiveTab);
  const setQueryError = useSqlStore((state) => state.setQueryError);
  const setQueryOpen = useSqlStore((state) => state.setQueryOpen);
  const setQueryResult = useSqlStore((state) => state.setQueryResult);
  const setResultLimit = useSqlStore((state) => state.setResultLimit);
  const setSql = useSqlStore((state) => state.setSql);
  const countChartsBySource = useDashboardStore((state) => state.countChartsBySource);
  const removeChartsBySource = useDashboardStore((state) => state.removeChartsBySource);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  const primaryAlias = files[0]?.sqlAlias ?? "data1";
  const defaultSql = useMemo(() => buildDefaultSql(primaryAlias), [primaryAlias]);
  const suggestions = useMemo(
    () => [
      {
        label: t("sql.suggestions.preview", { alias: primaryAlias }),
        sql: buildDefaultSql(primaryAlias),
      },
      {
        label: t("sql.suggestions.schema", { alias: primaryAlias }),
        sql: `DESCRIBE ${primaryAlias};`,
      },
      {
        label: t("sql.suggestions.count", { alias: primaryAlias }),
        sql: `SELECT COUNT(*) AS total_rows
FROM ${primaryAlias};`,
      },
    ],
    [primaryAlias, t],
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [closingTabId, setClosingTabId] = useState<string>();
  const [exportingParquetTabId, setExportingParquetTabId] = useState<string>();
  const [runningTabId, setRunningTabId] = useState<string>();

  if (!activeTab) {
    return null;
  }

  const canRun = files.length > 0 && duckDbStatus === "ready" && runningTabId !== activeTab.id;
  const isRunning = runningTabId === activeTab.id;
  const closingTab = tabs.find((tab) => tab.id === closingTabId);
  const closingTabLinkedCharts = closingTab ? countChartsBySource("sql", closingTab.sourceId) : 0;
  const isExportingParquet = exportingParquetTabId === activeTab.id;

  const run = async () => {
    if (!canRun) return;

    const tabId = activeTab.id;
    setRunningTabId(tabId);
    setQueryError(tabId, undefined);
    try {
      const nextResult = await runDuckDbQuery(activeTab.sql, activeTab.resultLimit);
      setQueryResult(tabId, nextResult);
      setQueryError(tabId, undefined);
    } catch (error) {
      setQueryError(tabId, { message: error instanceof Error ? error.message : t("sql.runError") });
      setQueryResult(tabId, undefined);
    } finally {
      setRunningTabId((current) => (current === tabId ? undefined : current));
    }
  };

  const exportParquet = async () => {
    const tabId = activeTab.id;
    setExportingParquetTabId(tabId);
    try {
      const parquetBuffer = await exportDuckDbQueryToParquet(activeTab.sql);
      const blobBuffer = new Uint8Array(parquetBuffer);
      downloadBlob(`${activeTab.name}.parquet`, new Blob([blobBuffer], { type: "application/octet-stream" }));
    } catch (error) {
      setQueryError(tabId, { message: error instanceof Error ? error.message : t("sql.exportError") });
    } finally {
      setExportingParquetTabId((current) => (current === tabId ? undefined : current));
    }
  };

  if (!file) {
    return <Empty title={t("app.sections.sql")} message={t("sql.empty")} />;
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
                    <Select className="w-[210px]" onChange={(event) => setResultLimit(tab.id, Number(event.target.value))} value={String(tab.resultLimit)}>
                      {queryResultLimitOptions.map((limit) => (
                        <option key={limit} value={limit}>
                          {t("sql.resultLimit", { count: limit })}
                        </option>
                      ))}
                    </Select>
                    <Button onClick={() => setQueryOpen(tab.id, !tab.queryOpen)} type="button" variant="outline">
                      {tab.queryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {tab.queryOpen ? t("sql.collapse") : t("sql.expand")}
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
                      {t("sql.run")}
                    </Button>
                    <Button onClick={() => setSql(tab.id, "")} type="button" variant="outline">
                      <RotateCcw className="h-4 w-4" />
                      {t("sql.clear")}
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
                      {t("sql.help")}
                    </Button>
                  </div>
                </CardHeader>
                {tab.queryOpen && (
                  <CardContent className="space-y-4">
                    <Suspense fallback={<div className="min-h-[260px] rounded-md border border-input bg-background p-3 font-mono text-sm text-muted-foreground">{t("sql.editorLoading")}</div>}>
                      <SqlEditor defaultTable={primaryAlias} files={files} onChange={(value) => setSql(tab.id, value)} value={tab.sql} />
                    </Suspense>
                    {duckDbStatus === "registering" && <Alert>{t("sql.registering")}</Alert>}
                    {duckDbStatus === "error" && <Alert className="border-destructive/30 bg-red-50 text-red-950">{t("sql.initFailed")}</Alert>}
                  </CardContent>
                )}
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {activeTab.queryError && <Alert className="border-destructive/30 bg-red-50 text-red-950">{activeTab.queryError.message}</Alert>}
      {activeTab.result?.truncated && (
        <Alert>
          {t("sql.resultLimited", { count: activeTab.resultLimit })}
        </Alert>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{t("sql.resultTitle")}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={isExportingParquet || duckDbStatus !== "ready" || !activeTab.result?.rows.length}
              onClick={() => void exportParquet()}
              type="button"
              variant="outline"
            >
              {isExportingParquet ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />}
              {t("sql.exportParquet")}
            </Button>
            <Button
              disabled={!activeTab.result?.rows.length}
              onClick={() => activeTab.result && downloadCsv(`${activeTab.name}.csv`, activeTab.result.rows, activeTab.result.columns)}
              type="button"
              variant="outline"
            >
              <Download className="h-4 w-4" />
              {t("common.exportCsv")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="min-w-0">
          {!activeTab.result ? (
            <div className="rounded-md border border-border p-8 text-sm text-muted-foreground">{t("sql.executeHint")}</div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>{t("sql.rowsCount", { count: activeTab.result.rowCount })}</span>
                <span>{activeTab.result.executionMs.toFixed(1)} ms</span>
              </div>
              <DataTable columns={activeTab.result.columns} rows={activeTab.result.rows} pageSize={25} />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        description={t("sql.helpDialog.description")}
        onOpenChange={setHelpOpen}
        open={helpOpen}
        title={t("sql.helpDialog.title")}
      >
        <div className="space-y-4 text-sm">
          {!!files.length && (
            <Alert>
              {t("sql.helpDialog.aliases", { aliases: files.map((item) => item.sqlAlias).join(", ") })}
            </Alert>
          )}
          <Alert>
            <Trans components={[<strong key="shortcut" />]} i18nKey="sql.helpDialog.editor" />
          </Alert>
          <Alert>{t("sql.helpDialog.local")}</Alert>
          <div className="space-y-2">
            <p className="font-medium">{t("sql.helpDialog.examples")}</p>
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
        description={
          closingTabLinkedCharts
            ? t("sql.closeDialog.withCharts", { count: closingTabLinkedCharts })
            : t("sql.closeDialog.withoutCharts")
        }
        onOpenChange={(open) => setClosingTabId(open ? closingTabId : undefined)}
        open={Boolean(closingTab)}
        title={t("sql.closeDialog.title", { name: closingTab?.name ?? t("common.close") })}
        footer={
          <>
            <Button onClick={() => setClosingTabId(undefined)} type="button" variant="outline">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (!closingTab) return;
                const removedSourceId = closeTab(closingTab.id);
                if (removedSourceId) {
                  removeChartsBySource("sql", removedSourceId);
                }
                setClosingTabId(undefined);
              }}
              type="button"
            >
              {t("sql.closeDialog.confirm")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          <Trans components={[<code key="plus" />]} i18nKey="sql.closeDialog.hint" />
        </p>
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
