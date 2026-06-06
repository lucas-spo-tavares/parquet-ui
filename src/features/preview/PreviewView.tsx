import { Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
      setError(previewError instanceof Error ? previewError.message : "Nao foi possivel carregar o preview.");
    } finally {
      setLoading(false);
    }
  };

  if (!file) {
    return <Empty title="Preview" message="Carregue um arquivo .parquet para visualizar as primeiras linhas." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Preview</h2>
          <p className="text-sm text-muted-foreground">{rows.length.toLocaleString("pt-BR")} linha(s) visiveis</p>
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
                {option} linhas
              </option>
            ))}
          </Select>
          <Button onClick={() => downloadCsv(`${file.name}-preview.csv`, rows)} type="button" variant="outline">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>
      {(file.schema.rowCount > rows.length || file.isLarge) && (
        <Alert>Este preview e limitado para proteger a UI. Para arquivos grandes, a visualizacao inicial usa amostra.</Alert>
      )}
      {error && <Alert className="border-destructive/30 bg-red-50 text-red-950">{error}</Alert>}
      {loading ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center gap-2 pt-5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando preview...
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
