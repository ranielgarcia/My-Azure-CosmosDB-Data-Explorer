import { useEffect, useRef } from "react";
import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useThemeStore } from "@/store/themeStore";
import {
  LANGUAGE_ID,
  THEME_DARK,
  THEME_LIGHT,
  registerCosmosSql,
  setModelFields,
} from "@/lib/cosmosSql";

interface QueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: (overrideQuery?: string) => void;
  onCursorChange?: (line: number, col: number) => void;
  /** Document field names offered as schema-aware completions. */
  fields?: string[];
  /** Called once on mount with a function that returns the current editor selection text (or undefined if nothing is selected). */
  registerGetSelectedText?: (fn: () => string | undefined) => void;
}

const EDITOR_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  minimap: { enabled: false },
  fontFamily: '"JetBrains Mono Variable", "JetBrains Mono", monospace',
  fontSize: 13,
  lineNumbers: "on",
  scrollBeyondLastLine: false,
  wordWrap: "on",
  renderLineHighlight: "line",
  tabSize: 2,
  padding: { top: 8, bottom: 8 },
  scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
  overviewRulerLanes: 0,
  fixedOverflowWidgets: true,
  quickSuggestions: { other: true, comments: false, strings: false },
  suggestOnTriggerCharacters: true,
  tabCompletion: "on",
};

export function QueryEditor({
  value,
  onChange,
  onRun,
  onCursorChange,
  fields,
  registerGetSelectedText,
}: QueryEditorProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const onRunRef = useRef(onRun);
  const onCursorChangeRef = useRef(onCursorChange);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    onRunRef.current = onRun;
    onCursorChangeRef.current = onCursorChange;
  }, [onRun, onCursorChange]);

  // Keep the completion provider's field list in sync as query results change.
  useEffect(() => {
    setModelFields(editorRef.current?.getModel() ?? null, fields ?? []);
  }, [fields]);

  const handleMount: OnMount = (editorInstance, monaco) => {
    editorRef.current = editorInstance;
    setModelFields(editorInstance.getModel(), fields ?? []);

    registerGetSelectedText?.(() => {
      const selection = editorInstance.getSelection();
      if (!selection || selection.isEmpty()) return undefined;
      return editorInstance.getModel()?.getValueInRange(selection);
    });

    editorInstance.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        const selection = editorInstance.getSelection();
        const selectedText =
          selection && !selection.isEmpty()
            ? (editorInstance.getModel()?.getValueInRange(selection) ??
              undefined)
            : undefined;
        onRunRef.current(selectedText);
      },
    );
    editorInstance.onDidChangeCursorPosition((e) => {
      onCursorChangeRef.current?.(e.position.lineNumber, e.position.column);
    });

    // Monaco caches character-width metrics on mount. If the web font
    // ("JetBrains Mono Variable") isn't loaded yet, those metrics are stale and
    // the caret drifts out of sync with the text. Remeasure once fonts settle.
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => monaco.editor.remeasureFonts());
    }
  };

  const handlerEditorWillMount: BeforeMount = () => {
    registerCosmosSql();
  };

  return (
    <div className="h-full overflow-hidden bg-card/30">
      <Editor
        language={LANGUAGE_ID}
        theme={isDark ? THEME_DARK : THEME_LIGHT}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        onMount={handleMount}
        beforeMount={handlerEditorWillMount}
        options={EDITOR_OPTIONS}
        width="100%"
        height="100%"
      />
    </div>
  );
}
