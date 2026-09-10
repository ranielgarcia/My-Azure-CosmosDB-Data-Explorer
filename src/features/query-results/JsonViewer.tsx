import { useEffect, useMemo, useRef, useState } from "react";
import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { Check, Copy, RefreshCw, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { generateUtcDateDecorations } from "@/features/query-results/data-annotations/monacoAnnotations";
import { generateTabFieldDecorations } from "@/features/query-results/data-annotations/tabAnnotations";
import { useStockroomZoneAnnotations } from "@/hooks/useStockroomZoneAnnotations";
import { useSelectedStoreStore } from "@/store/selectedStoreStore";
import { useThemeStore } from "@/store/themeStore";
import { THEME_DARK, THEME_LIGHT, registerCosmosSql } from "@/lib/cosmosSql";

const JSON_VIEWER_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions =
  {
    readOnly: true,
    automaticLayout: true,
    minimap: { enabled: true },
    fontFamily: '"JetBrains Mono Variable", "JetBrains Mono", monospace',
    fontSize: 12.5,
    lineNumbers: "on",
    glyphMargin: false,
    folding: true,
    scrollBeyondLastLine: false,
    wordWrap: "off",
    renderLineHighlight: "all",
    padding: { top: 16, bottom: 16 },
    scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
    overviewRulerLanes: 0,
    contextmenu: false,
    fixedOverflowWidgets: true,
    quickSuggestions: { other: false, comments: false, strings: false },
    suggestOnTriggerCharacters: false,
    tabCompletion: "off",
  };

export function JsonViewer({ data, tabId }: { data: unknown; tabId: string }) {
  const [copied, setCopied] = useState(false);
  const [monacoEditor, setMonacoEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const isDark = useThemeStore((s) => s.isDark);
  const timeZone = useSelectedStoreStore((s) => s.timeZone);
  const jsonText = useMemo(() => JSON.stringify(data, null, 2), [data]);
  const {
    labelsByZoneId,
    isFetching: isFetchingZones,
    error: zoneError,
    refetch: refetchZones,
  } = useStockroomZoneAnnotations(data, tabId);

  // Re-apply date annotations as Monaco after-injected-text decorations
  // whenever the JSON content, timezone, or editor instance changes.
  useEffect(() => {
    if (!monacoEditor) return;
    const model = monacoEditor.getModel();
    if (!model) return;

    const decorations = [
      ...(timeZone
        ? generateUtcDateDecorations(model, jsonText, {
            displayTimeZone: timeZone,
          })
        : []),
      ...generateTabFieldDecorations(model, jsonText, tabId, {
        lookupLabels: labelsByZoneId,
      }),
    ];

    decorationsRef.current?.clear();
    decorationsRef.current =
      monacoEditor.createDecorationsCollection(decorations);

    return () => {
      decorationsRef.current?.clear();
    };
  }, [jsonText, timeZone, monacoEditor, tabId, labelsByZoneId]);

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
    <div className="flex h-full flex-col overflow-hidden">
      {zoneError ? (
        <Alert
          variant="destructive"
          className="shrink-0 rounded-none border-x-0 border-t-0 py-2 pr-12 [&>svg]:top-3"
        >
          <TriangleAlert className="h-4 w-4" />
          <div>
            <AlertTitle>Zone annotations unavailable</AlertTitle>
            <AlertDescription className="wrap-break-word text-xs">
              {zoneError.message}
            </AlertDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => void refetchZones()}
            disabled={isFetchingZones}
            title="Retry zone annotations"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetchingZones ? "animate-spin" : ""}`}
            />
          </Button>
        </Alert>
      ) : null}
      <div className="relative min-h-0 flex-1">
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
    </div>
  );
}
