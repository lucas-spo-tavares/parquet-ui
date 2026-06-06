import { useMemo } from "react";
import { sql } from "@codemirror/lang-sql";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import type { UploadedParquetFile } from "@/types";

type SqlEditorProps = {
  defaultTable?: string;
  files: UploadedParquetFile[];
  onChange: (value: string) => void;
  value: string;
};

function buildSchema(files: UploadedParquetFile[]) {
  return Object.fromEntries(files.map((file) => [file.sqlAlias, file.schema.columns.map((column) => column.name)]));
}

export function SqlEditor({ defaultTable, files, onChange, value }: SqlEditorProps) {
  const extensions = useMemo(
    () => [
      sql({
        defaultTable,
        schema: buildSchema(files),
        upperCaseKeywords: true,
      }),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": {
          fontSize: "0.875rem",
          border: "1px solid hsl(var(--input))",
          borderRadius: "calc(var(--radius) - 2px)",
          backgroundColor: "hsl(var(--background))",
        },
        ".cm-content": {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
          minHeight: "260px",
          padding: "0.75rem",
        },
        ".cm-scroller": {
          overflow: "auto",
        },
        ".cm-focused": {
          outline: "none",
        },
        ".cm-editor.cm-focused": {
          outline: "2px solid hsl(var(--ring))",
          outlineOffset: "2px",
        },
        ".cm-gutters": {
          backgroundColor: "hsl(var(--muted) / 0.35)",
          color: "hsl(var(--muted-foreground))",
          border: "none",
          borderTopLeftRadius: "calc(var(--radius) - 2px)",
          borderBottomLeftRadius: "calc(var(--radius) - 2px)",
        },
        ".cm-activeLine, .cm-activeLineGutter": {
          backgroundColor: "hsl(var(--muted) / 0.5)",
        },
        ".cm-tooltip.cm-tooltip-autocomplete": {
          border: "1px solid hsl(var(--border))",
          borderRadius: "calc(var(--radius) - 2px)",
          backgroundColor: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
        },
      }),
    ],
    [defaultTable, files],
  );

  return (
    <CodeMirror
      basicSetup={{
        autocompletion: true,
        bracketMatching: true,
        closeBrackets: true,
        foldGutter: false,
        highlightActiveLine: true,
        lineNumbers: true,
      }}
      className="overflow-hidden"
      extensions={extensions}
      height="260px"
      indentWithTab
      onChange={onChange}
      placeholder="SELECT * FROM data1 LIMIT 100;"
      theme="light"
      value={value}
    />
  );
}

export default SqlEditor;
