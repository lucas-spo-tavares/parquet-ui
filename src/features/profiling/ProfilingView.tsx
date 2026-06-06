import { Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { downloadCsv } from "@/lib/export/csv";
import { displayValue, formatPercent } from "@/lib/formatters/formatters";
import { buildProfile, profileRowsToCsvRows } from "@/lib/profiling/profile";
import type { ColumnType, UploadedParquetFile } from "@/types";

const columnTypes: Array<ColumnType | "all"> = ["all", "string", "number", "integer", "boolean", "date", "timestamp", "decimal", "unknown"];

export function ProfilingView({ file }: { file?: UploadedParquetFile }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<ColumnType | "all">("all");
  const profile = useMemo(() => (file ? buildProfile(file.sampleRows, file.schema) : undefined), [file]);

  const columns = useMemo(() => {
    if (!profile) return [];
    return profile.columns.filter((column) => {
      const matchesSearch = column.columnName.toLowerCase().includes(search.toLowerCase());
      const matchesType = type === "all" || column.type === type;
      return matchesSearch && matchesType;
    });
  }, [profile, search, type]);

  if (!file || !profile) {
    return <Empty title="Profiling" message="Carregue um arquivo .parquet para calcular estatisticas por coluna." />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Linhas no arquivo" value={profile.rowCount.toLocaleString("pt-BR")} />
        <Stat label="Linhas amostradas" value={profile.sampleSize.toLocaleString("pt-BR")} />
        <Stat label="Colunas" value={profile.columns.length.toString()} />
        <Stat label="Modo" value={profile.isSampled ? "Amostra" : "Completo"} />
      </div>
      <Alert>O profiling inicial usa a amostra carregada do Parquet. Arquivos pequenos podem ser analisados por inteiro.</Alert>
      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" onChange={(event) => setSearch(event.target.value)} placeholder="Buscar coluna..." value={search} />
        </div>
        <Select onChange={(event) => setType(event.target.value as ColumnType | "all")} value={type}>
          {columnTypes.map((columnType) => (
            <option key={columnType} value={columnType}>
              {columnType === "all" ? "Todos os tipos" : columnType}
            </option>
          ))}
        </Select>
        <Button onClick={() => downloadCsv(`${file.name}-profiling.csv`, profileRowsToCsvRows(profile))} type="button" variant="outline">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
      <div className="overflow-auto rounded-lg border border-border">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-muted/70">
            <tr>
              {["Coluna", "Tipo", "Nulos", "Distintos", "Min", "Max", "Media", "Mediana", "Booleanos", "Top valores"].map((header) => (
                <th className="border-b border-border px-3 py-3 text-left font-medium" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {columns.map((column) => (
              <tr className="border-b border-border last:border-b-0" key={column.columnName}>
                <td className="px-3 py-3 font-medium">{column.columnName}</td>
                <td className="px-3 py-3">
                  <Badge>{column.type}</Badge>
                </td>
                <td className="px-3 py-3">
                  {column.nullCount} · {formatPercent(column.nullPercent)}
                </td>
                <td className="px-3 py-3">{column.distinctCount}</td>
                <td className="max-w-[160px] truncate px-3 py-3">{displayValue(column.min)}</td>
                <td className="max-w-[160px] truncate px-3 py-3">{displayValue(column.max)}</td>
                <td className="px-3 py-3">{column.mean?.toFixed(2) ?? ""}</td>
                <td className="px-3 py-3">{column.median?.toFixed(2) ?? ""}</td>
                <td className="px-3 py-3">
                  {column.type === "boolean" ? `true ${column.trueCount ?? 0} / false ${column.falseCount ?? 0}` : ""}
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground">
                  {column.topValues.map((value) => `${value.value} (${value.count})`).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
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
