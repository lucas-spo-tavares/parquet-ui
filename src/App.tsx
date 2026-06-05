import {
  BadgeCheck,
  BarChart3,
  Database,
  Download,
  FileSpreadsheet,
  FolderOpen,
  LayoutDashboard,
  ShieldCheck,
  TableProperties,
  WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "./components/ui/alert";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { DashboardView } from "./features/dashboard/DashboardView";
import { PreviewView } from "./features/preview/PreviewView";
import { ProfilingView } from "./features/profiling/ProfilingView";
import { SchemaView } from "./features/schema/SchemaView";
import { SqlView } from "./features/sql/SqlView";
import { UploadView } from "./features/upload/UploadView";
import { registerParquetWithDuckDb } from "./lib/duckdb/client";
import type { QueryResult, UploadedParquetFile } from "./types";

type Section = "upload" | "schema" | "preview" | "profiling" | "sql" | "dashboard";
type DuckDbStatus = "idle" | "registering" | "ready" | "error";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const navItems: Array<{ id: Section; label: string; icon: typeof FolderOpen }> = [
  { id: "upload", label: "Upload", icon: FolderOpen },
  { id: "schema", label: "Schema", icon: TableProperties },
  { id: "preview", label: "Preview", icon: FileSpreadsheet },
  { id: "profiling", label: "Profiling", icon: BadgeCheck },
  { id: "sql", label: "SQL", icon: Database },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
];

function App() {
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const [files, setFiles] = useState<UploadedParquetFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>();
  const [activeSection, setActiveSection] = useState<Section>("upload");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(window.matchMedia("(display-mode: standalone)").matches || iosStandalone);
  const [duckDbStatus, setDuckDbStatus] = useState<DuckDbStatus>("idle");
  const [queryResult, setQueryResult] = useState<QueryResult>();

  const activeFile = useMemo(() => files.find((file) => file.id === activeFileId), [activeFileId, files]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const activateFile = async (file: UploadedParquetFile) => {
    setActiveFileId(file.id);
    setQueryResult(undefined);
    setDuckDbStatus("registering");
    try {
      await registerParquetWithDuckDb(file.file);
      setDuckDbStatus("ready");
    } catch (error) {
      console.warn("DuckDB registration failed", error);
      setDuckDbStatus("error");
    }
  };

  const handleFileLoaded = async (file: UploadedParquetFile) => {
    setFiles((current) => [file, ...current]);
    await activateFile(file);
    setActiveSection("schema");
  };

  const handleSelectFile = (fileId: string) => {
    const file = files.find((item) => item.id === fileId);
    if (!file) return;
    void activateFile(file);
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {isOffline && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <div className="mx-auto flex max-w-[1500px] items-center gap-2">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>Voce esta offline. A SPA continua abrindo apos o primeiro acesso; arquivos Parquet seguem locais no navegador.</span>
          </div>
        </div>
      )}

      <div className="mx-auto grid min-h-screen max-w-[1500px] grid-cols-1 lg:grid-cols-[270px_1fr]">
        <aside className="border-b border-border bg-card px-4 py-4 lg:border-b-0 lg:border-r">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Database className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-tight">Parquet UI</h1>
              <p className="text-xs text-muted-foreground">Local Parquet Explorer</p>
            </div>
          </div>

          <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1" aria-label="Secoes">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  className={`flex h-10 items-center gap-2 rounded-md border px-3 text-left text-sm transition ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
                  }`}
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  type="button"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-6 space-y-3">
            <Alert>
              <div className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>Parquet-only. CSV existe apenas como exportacao. Nenhum dado e enviado para servidores.</span>
              </div>
            </Alert>
            <Button
              className="w-full"
              disabled={!installPrompt || isStandalone}
              onClick={() => void handleInstall()}
              type="button"
              variant="outline"
            >
              <Download className="h-4 w-4" />
              {isStandalone ? "App instalado" : "Instalar PWA"}
            </Button>
            {activeFile && (
              <div className="rounded-md border border-border p-3 text-sm">
                <p className="truncate font-medium">{activeFile.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {activeFile.schema.rowCount.toLocaleString("pt-BR")} linhas · {activeFile.schema.columns.length} colunas
                </p>
                <Badge className="mt-2">
                  <BarChart3 className="mr-1 h-3 w-3" />
                  {duckDbStatus === "ready" ? "SQL pronto" : duckDbStatus}
                </Badge>
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">SPA frontend, local e instalavel</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal">{navItems.find((item) => item.id === activeSection)?.label}</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Leitura Parquet, SQL com DuckDB-WASM, profiling, preview e graficos rodam no navegador.
            </p>
          </div>

          {activeSection === "upload" && (
            <UploadView
              activeFile={activeFile}
              duckDbStatus={duckDbStatus}
              files={files}
              onFileLoaded={handleFileLoaded}
              onSelectFile={handleSelectFile}
            />
          )}
          {activeSection === "schema" && <SchemaView file={activeFile} />}
          {activeSection === "preview" && <PreviewView file={activeFile} />}
          {activeSection === "profiling" && <ProfilingView file={activeFile} />}
          {activeSection === "sql" && <SqlView duckDbStatus={duckDbStatus} file={activeFile} onQueryResult={setQueryResult} />}
          {activeSection === "dashboard" && <DashboardView file={activeFile} queryResult={queryResult} />}
        </section>
      </div>
    </main>
  );
}

export default App;
