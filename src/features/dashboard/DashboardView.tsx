import { BarChart3, Download, Info, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { aggregateChartData } from "@/lib/charts/aggregate";
import { downloadCsv } from "@/lib/export/csv";
import type { AggregationType, ChartConfig, ChartType, QueryResult, UploadedParquetFile } from "@/types";
import { useDashboardStore } from "./store/dashboardStore";

const colors = ["#09090b", "#0f766e", "#2563eb", "#a16207", "#be123c", "#6d28d9", "#047857", "#b45309", "#64748b"];

type DashboardViewProps = {
  file?: UploadedParquetFile;
  queryResult?: QueryResult;
};

const chartTypes: ChartType[] = ["bar", "line", "pie"];
const aggregations: AggregationType[] = ["count", "sum", "avg", "min", "max"];
const emptyCharts: ChartConfig[] = [];

export function DashboardView({ file, queryResult }: DashboardViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [source, setSource] = useState<"sample" | "query">("sample");
  const charts = useDashboardStore((state) => (file ? state.chartsByFileId[file.id] ?? emptyCharts : emptyCharts));
  const upsertChartInStore = useDashboardStore((state) => state.upsertChart);
  const removeChart = useDashboardStore((state) => state.removeChart);

  const rows = useMemo(
    () => (source === "query" && queryResult?.rows.length ? queryResult.rows : file?.sampleRows ?? []),
    [file?.sampleRows, queryResult?.rows, source],
  );
  const columns = useMemo(() => Array.from(new Set(rows.flatMap((row) => Object.keys(row)))), [rows]);
  const numericColumns = useMemo(
    () =>
      columns.filter((column) => rows.some((row) => typeof row[column] === "number" || typeof row[column] === "bigint")),
    [columns, rows],
  );

  const openNew = () => {
    setEditingId(undefined);
    setDialogOpen(true);
  };

  const upsertChart = (config: ChartConfig) => {
    if (!file) return;
    upsertChartInStore(file.id, config);
    setDialogOpen(false);
    setEditingId(undefined);
  };

  if (!file) {
    return <Empty title="Dashboard" message="Carregue um arquivo .parquet para criar graficos." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Graficos baseados em amostra ou no resultado atual da query.</p>
        </div>
        <div className="flex gap-2">
          <Select className="w-[220px]" onChange={(event) => setSource(event.target.value as "sample" | "query")} value={source}>
            <option value="sample">Amostra do Parquet</option>
            <option disabled={!queryResult?.rows.length} value="query">
              Resultado SQL atual
            </option>
          </Select>
          <Button disabled={!columns.length} onClick={openNew} type="button">
            <Plus className="h-4 w-4" />
            Adicionar grafico
          </Button>
        </div>
      </div>

      <Alert>
        {source === "sample"
          ? "Graficos usam a amostra inicial do arquivo. Para agregacoes completas, execute uma query SQL agregada e use o resultado atual."
          : "Graficos usam o resultado da ultima query SQL retornada pela tela SQL."}
      </Alert>

      {!charts.length ? (
        <Card>
          <CardContent className="flex min-h-[260px] flex-col items-center justify-center gap-3 pt-5 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Nenhum grafico adicionado</p>
              <p className="mt-1 text-sm text-muted-foreground">Configure barra, linha ou pizza a partir das colunas carregadas.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {charts.map((chart) => {
            const data = aggregateChartData(rows, chart);
            return (
              <Card key={chart.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle>{chart.title}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {chart.aggregation} de {chart.metricColumn} por {chart.categoryColumn}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      aria-label="Exportar dados agregados"
                      onClick={() => downloadCsv(`${chart.title}-chart.csv`, data)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label="Editar grafico"
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
                    <Button aria-label="Remover grafico" onClick={() => removeChart(file.id, chart.id)} size="icon" type="button" variant="ghost">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    <ChartRenderer config={chart} data={data} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ChartDialog
        chart={charts.find((chart) => chart.id === editingId)}
        columns={columns}
        numericColumns={numericColumns}
        onOpenChange={setDialogOpen}
        onSubmit={upsertChart}
        open={dialogOpen}
      />
    </div>
  );
}

function ChartRenderer({ config, data }: { config: ChartConfig; data: Array<{ category: string; value: number }> }) {
  if (!data.length) {
    return <div className="grid h-full place-items-center rounded-md border border-border text-sm text-muted-foreground">Sem dados agregados.</div>;
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
  columns,
  numericColumns,
  open,
  onOpenChange,
  onSubmit,
}: {
  chart?: ChartConfig;
  columns: string[];
  numericColumns: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: ChartConfig) => void;
}) {
  const [title, setTitle] = useState(chart?.title ?? "Novo grafico");
  const [type, setType] = useState<ChartType>(chart?.type ?? "bar");
  const [categoryColumn, setCategoryColumn] = useState(chart?.categoryColumn ?? columns[0] ?? "");
  const [metricColumn, setMetricColumn] = useState(chart?.metricColumn ?? numericColumns[0] ?? columns[0] ?? "");
  const [aggregation, setAggregation] = useState<AggregationType>(chart?.aggregation ?? "count");

  useEffect(() => {
    if (!open) return;

    setTitle(chart?.title ?? "Novo grafico");
    setType(chart?.type ?? "bar");
    setCategoryColumn(chart?.categoryColumn ?? columns[0] ?? "");
    setMetricColumn(chart?.metricColumn ?? numericColumns[0] ?? columns[0] ?? "");
    setAggregation(chart?.aggregation ?? "count");
  }, [chart, columns, numericColumns, open]);

  if (!open) return null;

  const submit = () => {
    onSubmit({
      id: chart?.id ?? crypto.randomUUID(),
      title,
      type,
      categoryColumn,
      metricColumn,
      aggregation,
    });
  };

  return (
    <Dialog
      description="Configure os dados agregados usados pelo grafico."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Cancelar
          </Button>
          <Button disabled={!title || !categoryColumn || !metricColumn} onClick={submit} type="button">
            Salvar
          </Button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={chart ? "Editar grafico" : "Adicionar grafico"}
    >
      <div className="grid gap-4">
        <Input onChange={(event) => setTitle(event.target.value)} placeholder="Titulo" value={title} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            <LabelWithInfo label="Tipo" info="Define a visualizacao: barra para comparacoes, linha para series ordenadas e pizza para participacao por categoria." />
            <Select onChange={(event) => setType(event.target.value as ChartType)} value={type}>
              {chartTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            <LabelWithInfo label="Agregacao" info="Operacao aplicada aos valores de cada categoria: count, sum, avg, min ou max." />
            <Select onChange={(event) => setAggregation(event.target.value as AggregationType)} value={aggregation}>
              {aggregations.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            <LabelWithInfo label="Categoria / eixo X" info="Coluna usada para agrupar os dados. Em barras e linhas aparece no eixo X; em pizza vira o nome das fatias." />
            <Select onChange={(event) => setCategoryColumn(event.target.value)} value={categoryColumn}>
              {columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            <LabelWithInfo label="Metrica / eixo Y" info="Coluna numerica usada como valor agregado. Em barras e linhas vira o eixo Y; em pizza define o tamanho das fatias. Com count, qualquer coluna pode ser contada." />
            <Select onChange={(event) => setMetricColumn(event.target.value)} value={metricColumn}>
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
