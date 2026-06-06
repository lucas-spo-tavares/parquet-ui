import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { displayValue, formatPercent } from "@/lib/formatters/formatters";
import type { ColumnType, UploadedParquetFile } from "@/types";

type SchemaViewProps = {
  files: UploadedParquetFile[];
  file?: UploadedParquetFile;
  onSelectFile: (fileId: string) => void;
};

const columnTypes: Array<ColumnType | "all"> = ["all", "string", "number", "integer", "boolean", "date", "timestamp", "decimal", "unknown"];

export function SchemaView({ files, file, onSelectFile }: SchemaViewProps) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<ColumnType | "all">("all");

  const columns = useMemo(() => {
    if (!file) return [];
    return [...file.schema.columns]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((column) => {
        const matchesSearch = column.name.toLowerCase().includes(search.toLowerCase());
        const matchesType = type === "all" || column.uiType === type;
        return matchesSearch && matchesType;
      });
  }, [file, search, type]);

  if (!file) {
    return <EmptySection title="Schema" message="Carregue um arquivo .parquet para visualizar schema e tipos inferidos." />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Colunas" value={file.schema.columns.length.toString()} />
        <StatCard label="Linhas no metadata" value={file.schema.rowCount.toLocaleString("pt-BR")} />
        <StatCard label="Amostra analisada" value={file.sampleRows.length.toLocaleString("pt-BR")} />
      </div>
      <Alert>Null count, percentual de nulos e exemplos sao estimados com base na amostra inicial.</Alert>
      <div className="grid gap-3 md:grid-cols-[1fr_220px_240px]">
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
        <Select onChange={(event) => onSelectFile(event.target.value)} value={file.id}>
          {files.map((item) => (
            <option key={item.id} value={item.id}>
              {item.sqlAlias} - {item.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="overflow-auto rounded-lg border border-border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/70">
            <tr>
              {["Coluna", "Parquet", "UI", "Nullable", "Exemplo", "Nulos estimados", "% nulos"].map((header) => (
                <th className="border-b border-border px-3 py-3 text-left font-medium" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {columns.map((column) => (
              <tr className="border-b border-border last:border-b-0" key={column.name}>
                <td className="px-3 py-3 font-medium">{column.name}</td>
                <td className="px-3 py-3">
                  <div>{column.parquetType}</div>
                  <div className="text-xs text-muted-foreground">{column.convertedType ?? column.logicalType ?? ""}</div>
                </td>
                <td className="px-3 py-3">
                  <Badge>{column.uiType}</Badge>
                </td>
                <td className="px-3 py-3">{column.nullable === null ? "N/D" : column.nullable ? "sim" : "nao"}</td>
                <td className="max-w-[240px] truncate px-3 py-3">{displayValue(column.example)}</td>
                <td className="px-3 py-3">{column.nullCount ?? "N/D"}</td>
                <td className="px-3 py-3">{column.nullPercent === undefined ? "N/D" : formatPercent(column.nullPercent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
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

function EmptySection({ title, message }: { title: string; message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{message}</CardContent>
    </Card>
  );
}
