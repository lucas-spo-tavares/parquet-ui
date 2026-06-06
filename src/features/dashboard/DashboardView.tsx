import { BarChart3, Download, Info, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSqlStore } from "@/features/sql/store/sqlStore";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { aggregateChartData } from "@/lib/charts/aggregate";
import { downloadCsv } from "@/lib/export/csv";
import type { AggregationType, ChartConfig, ChartType, DataRow, UploadedParquetFile } from "@/types";
import { useDashboardStore } from "./store/dashboardStore";

const colors = ["#09090b", "#0f766e", "#2563eb", "#a16207", "#be123c", "#6d28d9", "#047857", "#b45309", "#64748b"];
const chartTypes: ChartType[] = ["bar", "line", "pie"];
const aggregations: AggregationType[] = ["none", "count", "sum", "avg", "min", "max"];
const emptyCharts: ChartConfig[] = [];

type DashboardViewProps = {
  files: UploadedParquetFile[];
};

type DashboardSource = {
  columns: string[];
  id: string;
  kind: "parquet" | "sql";
  label: string;
  metricColumns: string[];
  rows: DataRow[];
};

function getColumns(rows: DataRow[]) {
  return Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
}

function getMetricColumns(rows: DataRow[], columns: string[]) {
  return columns.filter((column) => rows.some((row) => typeof row[column] === "number" || typeof row[column] === "bigint"));
}

export function DashboardView({ files }: DashboardViewProps) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const sqlTabs = useSqlStore((state) => state.tabs);
  const charts = useDashboardStore((state) => state.charts ?? emptyCharts);
  const upsertChartInStore = useDashboardStore((state) => state.upsertChart);
  const removeChart = useDashboardStore((state) => state.removeChart);

  const sources = useMemo<DashboardSource[]>(
    () => [
      ...files.map((file) => {
        const columns = getColumns(file.sampleRows);
        return {
          id: file.id,
          kind: "parquet" as const,
          label: t("dashboard.labels.parquetSource", { alias: file.sqlAlias }),
          columns,
          metricColumns: getMetricColumns(file.sampleRows, columns),
          rows: file.sampleRows,
        };
      }),
      ...sqlTabs
        .filter((tab) => tab.result?.rows.length)
        .map((tab) => {
          const rows = tab.result?.rows ?? [];
          const columns = tab.result?.columns?.length ? tab.result.columns : getColumns(rows);
          return {
            id: tab.sourceId,
            kind: "sql" as const,
            label: t("dashboard.labels.sqlSource", { name: tab.name }),
            columns,
            metricColumns: getMetricColumns(rows, columns),
            rows,
          };
        }),
    ],
    [files, sqlTabs, t],
  );

  const sourcesByKey = useMemo(
    () => Object.fromEntries(sources.map((source) => [`${source.kind}:${source.id}`, source])),
    [sources],
  );

  const openNew = () => {
    setEditingId(undefined);
    setDialogOpen(true);
  };

  const upsertChart = (config: ChartConfig) => {
    upsertChartInStore(config);
    setDialogOpen(false);
    setEditingId(undefined);
  };

  if (!files.length) {
    return <Empty title={t("dashboard.title")} message={t("dashboard.empty")} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("dashboard.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <Button disabled={!sources.length} onClick={openNew} type="button">
          <Plus className="h-4 w-4" />
          {t("dashboard.addChart")}
        </Button>
      </div>

      <Alert>{t("dashboard.alert")}</Alert>

      {!charts.length ? (
        <Card>
          <CardContent className="flex min-h-[260px] flex-col items-center justify-center gap-3 pt-5 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">{t("dashboard.noCharts")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.noChartsHint")}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {charts.map((chart) => {
            const source = sourcesByKey[`${chart.sourceKind}:${chart.sourceId}`];
            const data = aggregateChartData(source?.rows ?? [], chart);
            return (
              <Card key={chart.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle>{chart.title}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {source?.label ?? t("common.sourceRemoved")} ·{" "}
                      {chart.aggregation === "none"
                        ? `${chart.metricColumn} por ${chart.categoryColumn}`
                        : `${chart.aggregation} de ${chart.metricColumn} por ${chart.categoryColumn}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      aria-label={t("dashboard.aria.exportChart")}
                      onClick={() => downloadCsv(`${chart.title}-chart.csv`, data)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label={t("dashboard.aria.editChart")}
                      onClick={() => {
                        setEditingId(chart.id);
                        setDialogOpen(true);
                      }}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button aria-label={t("dashboard.aria.removeChart")} onClick={() => removeChart(chart.id)} size="icon" type="button" variant="ghost">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!source ? (
                    <Alert className="border-destructive/30 bg-red-50 text-red-950">{t("dashboard.sourceRemovedAlert")}</Alert>
                  ) : (
                    <div className="h-[320px]">
                      <ChartRenderer config={chart} data={data} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ChartDialog
        chart={charts.find((chart) => chart.id === editingId)}
        onOpenChange={setDialogOpen}
        onSubmit={upsertChart}
        open={dialogOpen}
        sources={sources}
      />
    </div>
  );
}

function ChartRenderer({ config, data }: { config: ChartConfig; data: Array<{ category: string; value: number }> }) {
  const { t } = useTranslation();
  if (!data.length) {
    return <div className="grid h-full place-items-center rounded-md border border-border text-sm text-muted-foreground">{t("dashboard.noData")}</div>;
  }

  if (config.type === "pie") {
    return (
      <ResponsiveContainer height="100%" width="100%">
        <RechartsPieChart>
          <Pie data={data} dataKey="value" nameKey="category" outerRadius={105}>
            {data.map((row, index) => (
              <Cell fill={colors[index % colors.length]} key={row.category} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </RechartsPieChart>
      </ResponsiveContainer>
    );
  }

  if (config.type === "line") {
    return (
      <ResponsiveContainer height="100%" width="100%">
        <RechartsLineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip />
          <Line dataKey="value" stroke="#09090b" strokeWidth={2} type="monotone" />
        </RechartsLineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer height="100%" width="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="category" tick={{ fontSize: 12 }} />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#09090b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChartDialog({
  chart,
  open,
  onOpenChange,
  onSubmit,
  sources,
}: {
  chart?: ChartConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: ChartConfig) => void;
  sources: DashboardSource[];
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(chart?.title ?? "Novo grafico");
  const [sourceKey, setSourceKey] = useState("");
  const [type, setType] = useState<ChartType>(chart?.type ?? "bar");
  const [categoryColumn, setCategoryColumn] = useState("");
  const [metricColumn, setMetricColumn] = useState("");
  const [aggregation, setAggregation] = useState<AggregationType>(chart?.aggregation ?? "count");

  const source = sources.find((item) => `${item.kind}:${item.id}` === sourceKey);
  const columns = source?.columns ?? [];
  const numericColumns = source?.metricColumns ?? [];

  useEffect(() => {
    if (!open) return;

    const nextSource = chart ? sources.find((item) => item.id === chart.sourceId && item.kind === chart.sourceKind) : sources[0];
    setTitle(chart?.title ?? t("dashboard.dialog.newChart"));
    setSourceKey(nextSource ? `${nextSource.kind}:${nextSource.id}` : "");
    setType(chart?.type ?? "bar");
    setCategoryColumn(chart?.categoryColumn ?? nextSource?.columns[0] ?? "");
    setMetricColumn(chart?.metricColumn ?? nextSource?.metricColumns[0] ?? nextSource?.columns[0] ?? "");
    setAggregation(chart?.aggregation ?? "count");
  }, [chart, open, sources, t]);

  useEffect(() => {
    if (!source) return;
    const nextColumns = source.columns;
    const nextMetricColumns = aggregation === "count" ? nextColumns : source.metricColumns;

    if (!nextColumns.includes(categoryColumn)) {
      setCategoryColumn(nextColumns[0] ?? "");
    }

    if (!nextMetricColumns.includes(metricColumn)) {
      setMetricColumn(nextMetricColumns[0] ?? nextColumns[0] ?? "");
    }
  }, [aggregation, categoryColumn, metricColumn, source]);

  if (!open) return null;

  const submit = () => {
    if (!source) return;
    onSubmit({
      id: chart?.id ?? crypto.randomUUID(),
      title,
      sourceId: source.id,
      sourceKind: source.kind,
      type,
      categoryColumn,
      metricColumn,
      aggregation,
    });
  };

  return (
    <Dialog
      description={t("dashboard.dialog.description")}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            {t("common.cancel")}
          </Button>
          <Button disabled={!title || !source || !categoryColumn || !metricColumn} onClick={submit} type="button">
            {t("common.save")}
          </Button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={chart ? t("dashboard.dialog.editTitle") : t("dashboard.dialog.addTitle")}
    >
      <div className="grid gap-4">
        <Input onChange={(event) => setTitle(event.target.value)} placeholder={t("dashboard.dialog.titlePlaceholder")} value={title} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium sm:col-span-2">
            <LabelWithInfo label={t("dashboard.labels.sourceData")} info={t("dashboard.dialog.sourceInfo")} />
            <Select onChange={(event) => setSourceKey(event.target.value)} value={sourceKey}>
              {sources.map((item) => (
                <option key={`${item.kind}:${item.id}`} value={`${item.kind}:${item.id}`}>
                  {item.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            <LabelWithInfo label={t("dashboard.labels.type")} info={t("dashboard.dialog.typeInfo")} />
            <Select onChange={(event) => setType(event.target.value as ChartType)} value={type}>
              {chartTypes.map((item) => (
                <option key={item} value={item}>
                  {t(`dashboard.chartTypes.${item}`)}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            <LabelWithInfo label={t("dashboard.labels.aggregation")} info={t("dashboard.dialog.aggregationInfo")} />
            <Select onChange={(event) => setAggregation(event.target.value as AggregationType)} value={aggregation}>
              {aggregations.map((item) => (
                <option key={item} value={item}>
                  {t(`dashboard.aggregations.${item}`)}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            <LabelWithInfo label={t("dashboard.labels.category")} info={t("dashboard.dialog.categoryInfo")} />
            <Select disabled={!columns.length} onChange={(event) => setCategoryColumn(event.target.value)} value={categoryColumn}>
              {columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            <LabelWithInfo label={t("dashboard.labels.metric")} info={t("dashboard.dialog.metricInfo")} />
            <Select disabled={!columns.length} onChange={(event) => setMetricColumn(event.target.value)} value={metricColumn}>
              {(aggregation === "count" ? columns : numericColumns).map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </div>
    </Dialog>
  );
}

function LabelWithInfo({ label, info }: { label: string; info: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span>{label}</span>
      <span
        aria-label={info}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        role="img"
        tabIndex={0}
        title={info}
      >
        <Info className="h-3.5 w-3.5" />
      </span>
    </span>
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
