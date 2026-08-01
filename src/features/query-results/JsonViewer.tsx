import { useEffect, useMemo, useRef, useState } from "react";
import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatUtcInTimeZone } from "@/lib/dateFormat";
import { useSelectedStoreStore } from "@/store/selectedStoreStore";
import { useThemeStore } from "@/store/themeStore";
import { THEME_DARK, THEME_LIGHT, registerCosmosSql } from "@/lib/cosmosSql";

const JSON_VIEWER_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions =
  {
    readOnly: true,
    automaticLayout: true,
    minimap: { enabled: false },
    fontFamily: '"JetBrains Mono Variable", "JetBrains Mono", monospace',
    fontSize: 12.5,
    lineNumbers: "off",
    glyphMargin: false,
    folding: true,
    scrollBeyondLastLine: false,
    wordWrap: "off",
    renderLineHighlight: "none",
    padding: { top: 16, bottom: 16 },
    scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
    overviewRulerLanes: 0,
    contextmenu: false,
  };

/** Matches a JSON-quoted UTC ISO 8601 timestamp, e.g. "2025-04-30T17:00:00Z". */
const DATE_SCAN_SOURCE = /"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z"/
  .source;

export function JsonViewer({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);
  const [monacoEditor, setMonacoEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const isDark = useThemeStore((s) => s.isDark);
  const timeZone = useSelectedStoreStore((s) => s.timeZone);
  const jsonText = useMemo(() => JSON.stringify(data, null, 2), [data]);

  // Re-apply date annotations as Monaco after-injected-text decorations
  // whenever the JSON content, timezone, or editor instance changes.
  useEffect(() => {
    if (!monacoEditor) return;
    const model = monacoEditor.getModel();
    if (!model) return;

    const decorations: monaco.editor.IModelDeltaDecoration[] = [];

    if (timeZone) {
      const scanRe = new RegExp(DATE_SCAN_SOURCE, "g");
      let match: RegExpExecArray | null;

      while ((match = scanRe.exec(jsonText)) !== null) {
        const dateStr = match[0].slice(1, -1); // strip surrounding JSON quotes
        const label = formatUtcInTimeZone(dateStr, timeZone);
        if (!label) continue;

        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const localLabel = formatUtcInTimeZone(dateStr, userTimeZone);
        const content = `  ${label}${localLabel ? ` (Local: ${localLabel})` : ""}`;

        const startPos = model.getPositionAt(match.index);
        const endPos = model.getPositionAt(match.index + match[0].length);

        decorations.push({
          range: new monaco.Range(
            startPos.lineNumber,
            startPos.column,
            endPos.lineNumber,
            endPos.column,
          ),
          options: {
            after: {
              content,
              inlineClassName: "date-annotation",
            },
          },
        });
      }
    }

    decorationsRef.current?.clear();
    decorationsRef.current =
      monacoEditor.createDecorationsCollection(decorations);

    return () => {
      decorationsRef.current?.clear();
    };
  }, [jsonText, timeZone, monacoEditor]);

  const handleBeforeMount: BeforeMount = () => {
    registerCosmosSql();
  };

  const handleMount: OnMount = (editorInstance, m) => {
    setMonacoEditor(editorInstance);
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => m.editor.remeasureFonts());
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative h-full overflow-hidden">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="absolute right-3 top-3 z-10"
        title="Copy JSON"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {copied ? "Copied" : "Copy"}
      </Button>
      <Editor
        language="json"
        theme={isDark ? THEME_DARK : THEME_LIGHT}
        value={jsonText}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        options={JSON_VIEWER_OPTIONS}
        width="100%"
        height="100%"
      />
    </div>
  );
}
