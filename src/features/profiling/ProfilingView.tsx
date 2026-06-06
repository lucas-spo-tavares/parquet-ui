import { Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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

export function ProfilingView({
  file,
  files,
  onSelectFile,
}: {
  file?: UploadedParquetFile;
  files: UploadedParquetFile[];
  onSelectFile: (fileId: string) => void;
}) {
  const { t } = useTranslation();
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
    return <Empty title={t("app.sections.profiling")} message={t("profiling.empty")} />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label={t("profiling.stats.fileRows")} value={profile.rowCount.toLocaleString()} />
        <Stat label={t("profiling.stats.sampledRows")} value={profile.sampleSize.toLocaleString()} />
        <Stat label={t("profiling.stats.columns")} value={profile.columns.length.toString()} />
        <Stat label={t("profiling.stats.mode")} value={profile.isSampled ? t("profiling.stats.sample") : t("profiling.stats.full")} />
      </div>
      <Alert>{t("profiling.alert")}</Alert>
      <div className="grid gap-3 md:grid-cols-[1fr_220px_240px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" onChange={(event) => setSearch(event.target.value)} placeholder={t("common.searchColumn")} value={search} />
        </div>
        <Select onChange={(event) => setType(event.target.value as ColumnType | "all")} value={type}>
          {columnTypes.map((columnType) => (
            <option key={columnType} value={columnType}>
              {columnType === "all" ? t("common.allTypes") : columnType}
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
        <Button onClick={() => downloadCsv(`${file.name}-profiling.csv`, profileRowsToCsvRows(profile))} type="button" variant="outline">
          <Download className="h-4 w-4" />
          {t("common.exportCsv")}
        </Button>
      </div>
      <div className="overflow-auto rounded-lg border border-border">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-muted/70">
            <tr>
              {[
                t("profiling.headers.column"),
                t("profiling.headers.type"),
                t("profiling.headers.nulls"),
                t("profiling.headers.distinct"),
                t("profiling.headers.min"),
                t("profiling.headers.max"),
                t("profiling.headers.mean"),
                t("profiling.headers.median"),
                t("profiling.headers.booleans"),
                t("profiling.headers.topValues"),
              ].map((header) => (
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
                  {column.type === "boolean" ? t("profiling.booleanCounts", { trueCount: column.trueCount ?? 0, falseCount: column.falseCount ?? 0 }) : ""}
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
