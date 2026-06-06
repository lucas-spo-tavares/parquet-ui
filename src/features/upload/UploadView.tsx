import { AlertTriangle, CheckCircle2, FileUp, HardDrive, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { LARGE_FILE_SIZE_MB } from "@/app/constants";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes } from "@/lib/formatters/formatters";
import { readParquetFile } from "@/lib/parquet/readParquet";
import type { UploadedParquetFile } from "@/types";

type UploadViewProps = {
  files: UploadedParquetFile[];
  activeFile?: UploadedParquetFile;
  duckDbStatus: "idle" | "registering" | "ready" | "error";
  onFileLoaded: (file: UploadedParquetFile) => Promise<void>;
  onRemoveFile: (fileId: string) => void;
  onRenameFileAlias: (fileId: string, alias: string) => void;
  onSelectFile: (fileId: string) => void;
};

function browserSupportMessage() {
  if (!("WebAssembly" in window)) return "Seu navegador nao oferece WebAssembly, necessario para DuckDB-WASM.";
  if (!("File" in window) || !("Blob" in window)) return "Seu navegador nao oferece File API suficiente para ler Parquet localmente.";
  if (typeof BigInt === "undefined") return "Seu navegador nao oferece BigInt, necessario para metadados Parquet modernos.";
  return "";
}

function truncateFileName(name: string) {
  return name.length > 30 ? `${name.slice(0, 30)}...` : name;
}

export function UploadView({ files, activeFile, duckDbStatus, onFileLoaded, onRemoveFile, onRenameFileAlias, onSelectFile }: UploadViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState(browserSupportMessage());
  const [aliasDrafts, setAliasDrafts] = useState<Record<string, string>>({});

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;

    const selectedFiles = Array.from(fileList);
    const invalidFiles = selectedFiles.filter((file) => !file.name.toLowerCase().endsWith(".parquet"));
    const parquetFiles = selectedFiles.filter((file) => file.name.toLowerCase().endsWith(".parquet"));

    if (invalidFiles.length) {
      setError("Apenas arquivos .parquet sao aceitos. CSV, JSON, Excel e outros formatos nao sao importados.");
    } else {
      setError("");
    }

    if (!parquetFiles.length) return;

    setLoading(true);
    try {
      for (const file of parquetFiles) {
        if (file.size > LARGE_FILE_SIZE_MB * 1024 * 1024) {
          setWarning(`Arquivo grande detectado: acima de ${LARGE_FILE_SIZE_MB} MB. Preview e profiling usam amostragem inicial.`);
        }
        const loadedFile = await readParquetFile(file);
        await onFileLoaded(loadedFile);
      }
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : "Nao foi possivel ler o arquivo Parquet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="space-y-4">
        {warning && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-950">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{warning}</span>
            </div>
          </Alert>
        )}
        {error && (
          <Alert className="border-destructive/30 bg-red-50 text-red-950">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </Alert>
        )}

        <div
          className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center shadow-subtle transition hover:border-primary"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void handleFiles(event.dataTransfer.files);
          }}
        >
          <input
            className="sr-only"
            ref={fileInputRef}
            type="file"
            accept=".parquet"
            multiple
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-md border bg-background">
            {loading ? <Loader2 className="h-7 w-7 animate-spin text-primary" /> : <FileUp className="h-7 w-7 text-primary" />}
          </div>
          <span className="text-lg font-semibold">{loading ? "Lendo Parquet localmente..." : "Arraste arquivos .parquet ou selecione"}</span>
          <span className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            A aplicacao aceita exclusivamente Parquet. O processamento acontece no navegador e nenhum arquivo e enviado para servidores.
          </span>
          <Button className="mt-5" disabled={loading} onClick={() => fileInputRef.current?.click()} type="button">
            Selecionar Parquet
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Arquivos da sessao
            </CardTitle>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>{files.length ? `${files.length} arquivo(s) carregado(s)` : "Estado vazio"}</span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                SPA local. Os arquivos Parquet nao saem do navegador.
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!files.length ? (
              <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
                Nenhum Parquet carregado ainda. Apos selecionar um arquivo, schema, preview, profiling, SQL e dashboard ficam ativos.
              </div>
            ) : (
              files.map((file) => {
                const aliasValue = aliasDrafts[file.id] ?? file.sqlAlias;
                const isActive = activeFile?.id === file.id;

                return (
                  <div className={`rounded-md border p-3 transition ${isActive ? "border-primary bg-muted" : "border-border"}`} key={file.id}>
                    <div className="flex items-start justify-between gap-3">
                      <button className="min-w-0 flex-1 text-left" onClick={() => onSelectFile(file.id)} type="button">
                        <p className="text-sm font-medium" title={file.name}>
                          {truncateFileName(file.name)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(file.size)} · {file.loadedAt}
                        </p>
                      </button>
                      <div className="flex items-center gap-2">
                        {isActive && <Badge>ativo</Badge>}
                        <Button
                          aria-label={`Remover ${file.name} da sessao`}
                          onClick={() => onRemoveFile(file.id)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Alias SQL</span>
                      <input
                        className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                        onBlur={() => {
                          onRenameFileAlias(file.id, aliasValue);
                          setAliasDrafts((current) => {
                            const next = { ...current };
                            delete next[file.id];
                            return next;
                          });
                        }}
                        onChange={(event) =>
                          setAliasDrafts((current) => ({
                            ...current,
                            [file.id]: event.target.value,
                          }))
                        }
                        spellCheck={false}
                        type="text"
                        value={aliasValue}
                      />
                    </div>
                  </div>
                );
              })
            )}
            {duckDbStatus === "registering" && <Badge>Registrando aliases SQL no DuckDB...</Badge>}
            {duckDbStatus === "ready" && (
              <Badge className="bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                DuckDB pronto
              </Badge>
            )}
            {!!files.length && (
              <div className="text-xs leading-5 text-muted-foreground">
                Use os aliases nas queries, por exemplo: <code>SELECT * FROM data1</code> ou <code>SELECT * FROM data1 JOIN data2 ...</code>.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
