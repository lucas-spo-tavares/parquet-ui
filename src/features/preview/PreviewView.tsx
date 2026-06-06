import { Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MAX_PREVIEW_ROWS } from "@/app/constants";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { downloadCsv } from "@/lib/export/csv";
import { readParquetPreview } from "@/lib/parquet/readParquet";
import type { DataRow, UploadedParquetFile } from "@/types";

const rowOptions = [100, 500, 1_000, 5_000];

export function PreviewView({
  file,
  files,
  onSelectFile,
}: {
  file?: UploadedParquetFile;
  files: UploadedParquetFile[];
  onSelectFile: (fileId: string) => void;
}) {
  const { t } = useTranslation();
  const [rowLimit, setRowLimit] = useState(100);
  const [rows, setRows] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setRows(file?.previewRows ?? []);
    setRowLimit(100);
    setError("");
  }, [file]);

  const loadRows = async (limit: number) => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      setRows(await readParquetPreview(file, Math.min(limit, MAX_PREVIEW_ROWS)));
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : t("preview.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (!file) {
    return <Empty title={t("app.sections.preview")} message={t("preview.empty")} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("app.sections.preview")}</h2>
          <p className="text-sm text-muted-foreground">{t("preview.visibleRows", { count: rows.length })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select className="w-[240px]" onChange={(event) => onSelectFile(event.target.value)} value={file.id}>
            {files.map((item) => (
              <option key={item.id} value={item.id}>
                {item.sqlAlias} - {item.name}
              </option>
            ))}
          </Select>
          <Select
            className="w-[170px]"
            onChange={(event) => {
              const next = Number(event.target.value);
              setRowLimit(next);
              void loadRows(next);
            }}
            value={rowLimit}
          >
            {rowOptions.map((option) => (
              <option key={option} value={option}>
                {t("preview.rowLimit", { count: option })}
              </option>
            ))}
          </Select>
          <Button onClick={() => downloadCsv(`${file.name}-preview.csv`, rows)} type="button" variant="outline">
            <Download className="h-4 w-4" />
            {t("common.exportCsv")}
          </Button>
        </div>
      </div>
      {(file.schema.rowCount > rows.length || file.isLarge) && (
        <Alert>{t("preview.previewLimited")}</Alert>
      )}
      {error && <Alert className="border-destructive/30 bg-red-50 text-red-950">{error}</Alert>}
      {loading ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center gap-2 pt-5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("preview.loading")}
          </CardContent>
        </Card>
      ) : (
        <DataTable rows={rows} pageSize={25} />
      )}
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
