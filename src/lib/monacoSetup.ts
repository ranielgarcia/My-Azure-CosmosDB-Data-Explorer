// Configure Monaco's web worker for Vite. SQL is a Monarch-tokenized "basic"
// language with no dedicated language service, so the base editor worker is all
// we need. Importing this module once (from main.tsx) wires the environment
// before any editor is created.
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
// react-monaco-editor imports the bare `editor.api`, which ships the core editor
// + tokenizer but OMITS the standalone editor contributions (autocomplete/
// suggest widget, hover, parameter hints, find) and the
// `editor.action.triggerSuggest` command. Loading `editor.main` registers those
// contributions onto the same shared Monaco singleton so IntelliSense works.
import "monaco-editor/esm/vs/editor/editor.main";
// Side-effect import: registers the cosmos-sql language + completion provider
// at startup, before any editor mounts.
import "./cosmosSql";

self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};
