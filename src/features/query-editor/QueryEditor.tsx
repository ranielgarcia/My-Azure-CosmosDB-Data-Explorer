import { useEffect, useRef } from "react";
import MonacoEditor, {
  EditorWillMount,
  type EditorDidMount,
} from "react-monaco-editor";
import type { editor } from "monaco-editor";
import { useThemeStore } from "@/store/themeStore";

interface QueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onCursorChange?: (line: number, col: number) => void;
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
};

export function QueryEditor({
  value,
  onChange,
  onRun,
  onCursorChange,
}: QueryEditorProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const onRunRef = useRef(onRun);
  const onCursorChangeRef = useRef(onCursorChange);

  useEffect(() => {
    onRunRef.current = onRun;
    onCursorChangeRef.current = onCursorChange;
  }, [onRun, onCursorChange]);

  const handleMount: EditorDidMount = (editorInstance, monaco) => {
    editorInstance.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        onRunRef.current();
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

  const handleEditorBeforeMount: EditorWillMount = (monaco) => {
    // Define the custom theme
    monaco.editor.defineTheme("my-custom-theme", {
      base: "hc-black", // Can be 'vs', 'vs-dark', or 'hc-black'
      inherit: true, // Inherit base styles
      rules: [
        { token: "comment", foreground: "ffa500", fontStyle: "italic" },
        { token: "keyword", foreground: "00ff00" },
        { token: "identifier", foreground: "ffffff" },
      ],
      colors: {
        "editor.background": "#1e1e24", // Main background color
        "editor.foreground": "#ffffff", // Default text color
        "editorCursor.foreground": "#aeafad",
        "editor.lineHighlightBackground": "#2d2d30",
      },
    });
  };

  return (
    <div className="h-full overflow-hidden bg-card/30">
      <MonacoEditor
        language="sql"
        theme={isDark ? "my-custom-theme" : "vs"}
        value={value}
        onChange={onChange}
        editorDidMount={handleMount}
        editorWillMount={handleEditorBeforeMount}
        options={EDITOR_OPTIONS}
        width="100%"
        height="100%"
      />
    </div>
  );
}
