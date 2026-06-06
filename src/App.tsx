import {
  BadgeCheck,
  Database,
  Download,
  FileSpreadsheet,
  FolderOpen,
  LayoutDashboard,
  TableProperties,
  WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "./components/ui/alert";
import { Button } from "./components/ui/button";
import { DashboardView } from "./features/dashboard/DashboardView";
import { PreviewView } from "./features/preview/PreviewView";
import { ProfilingView } from "./features/profiling/ProfilingView";
import { SchemaView } from "./features/schema/SchemaView";
import { useSqlStore } from "./features/sql/store/sqlStore";
import { SqlView } from "./features/sql/SqlView";
import { UploadView } from "./features/upload/UploadView";
import { syncDuckDbFiles } from "./lib/duckdb/client";
import type { UploadedParquetFile } from "./types";

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

function normalizeSqlAlias(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!normalized) return "data1";
  if (/^[0-9]/.test(normalized)) return `data_${normalized}`;
  return normalized;
}

function createUniqueSqlAlias(baseAlias: string, usedAliases: Set<string>) {
  const base = normalizeSqlAlias(baseAlias);
  if (!usedAliases.has(base)) return base;

  let index = 2;
  while (usedAliases.has(`${base}_${index}`)) {
    index += 1;
  }

  return `${base}_${index}`;
}

function App() {
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const [files, setFiles] = useState<UploadedParquetFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>();
  const [activeSection, setActiveSection] = useState<Section>("upload");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(window.matchMedia("(display-mode: standalone)").matches || iosStandalone);
  const [duckDbStatus, setDuckDbStatus] = useState<DuckDbStatus>("idle");
  const filesRef = useRef<UploadedParquetFile[]>([]);
  const activeQueryResult = useSqlStore((state) => state.tabs.find((tab) => tab.id === state.activeTabId)?.result);

  const activeFile = useMemo(() => files.find((file) => file.id === activeFileId), [activeFileId, files]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

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
  };

  const handleFileLoaded = async (file: UploadedParquetFile) => {
    const currentFiles = filesRef.current;
    const usedAliases = new Set(currentFiles.map((item) => item.sqlAlias));
    const aliasSeed = `data${currentFiles.length + 1}`;
    const sqlAlias = createUniqueSqlAlias(aliasSeed, usedAliases);
    const nextFiles = [{ ...file, sqlAlias }, ...currentFiles];

    setFiles(nextFiles);
    filesRef.current = nextFiles;
    setDuckDbStatus("registering");
    try {
      await syncDuckDbFiles(nextFiles);
      setDuckDbStatus("ready");
      await activateFile(nextFiles[0]);
    } catch (error) {
      console.warn("DuckDB registration failed", error);
      setDuckDbStatus("error");
    }
    setActiveSection("schema");
  };

  const handleSelectFile = (fileId: string) => {
    const file = files.find((item) => item.id === fileId);
    if (!file) return;
    void activateFile(file);
  };

  const handleRenameFileAlias = (fileId: string, alias: string) => {
    const nextFiles = files.map((file) => {
      if (file.id !== fileId) return file;

      const usedAliases = new Set(files.filter((item) => item.id !== fileId).map((item) => item.sqlAlias));
      return {
        ...file,
        sqlAlias: createUniqueSqlAlias(alias, usedAliases),
      };
    });

    const renamedFile = nextFiles.find((file) => file.id === fileId);
    if (!renamedFile) return;

    setFiles(nextFiles);
    filesRef.current = nextFiles;
    setDuckDbStatus("registering");
    void (async () => {
      try {
        await syncDuckDbFiles(nextFiles);
        setDuckDbStatus("ready");
      } catch (error) {
        console.warn("DuckDB alias update failed", error);
        setDuckDbStatus("error");
      }
    })();
  };

  const handleRemoveFile = (fileId: string) => {
    const currentFiles = filesRef.current;
    const nextFiles = currentFiles.filter((file) => file.id !== fileId);
    const nextActiveFile = activeFileId === fileId ? nextFiles[0] : nextFiles.find((file) => file.id === activeFileId);

    setFiles(nextFiles);
    filesRef.current = nextFiles;
    setActiveFileId(nextActiveFile?.id);

    if (!nextFiles.length) {
      setDuckDbStatus("idle");
      void syncDuckDbFiles([]);
      if (activeSection !== "upload") {
        setActiveSection("upload");
      }
      return;
    }

    setDuckDbStatus("registering");
    void (async () => {
      try {
        await syncDuckDbFiles(nextFiles);
        setDuckDbStatus("ready");
      } catch (error) {
        console.warn("DuckDB file removal failed", error);
        setDuckDbStatus("error");
      }
    })();
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
              <Alert>
                <div className="space-y-1 text-sm">
                  <div>
                    Arquivo ativo: <strong>{activeFile.sqlAlias}</strong>
                  </div>
                  <div className="truncate text-muted-foreground" title={activeFile.name}>
                    {activeFile.name}
                  </div>
                  <div className="text-muted-foreground">Schema, Preview e Profiling usam esse parquet.</div>
                </div>
              </Alert>
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
              onRemoveFile={handleRemoveFile}
              onRenameFileAlias={handleRenameFileAlias}
              onSelectFile={handleSelectFile}
            />
          )}
          {activeSection === "schema" && <SchemaView file={activeFile} files={files} onSelectFile={handleSelectFile} />}
          {activeSection === "preview" && <PreviewView file={activeFile} files={files} onSelectFile={handleSelectFile} />}
          {activeSection === "profiling" && <ProfilingView file={activeFile} files={files} onSelectFile={handleSelectFile} />}
          {activeSection === "sql" && <SqlView duckDbStatus={duckDbStatus} file={activeFile} files={files} />}
          {activeSection === "dashboard" && <DashboardView file={activeFile} queryResult={activeQueryResult} />}
        </section>
      </div>
    </main>
  );
}

export default App;
