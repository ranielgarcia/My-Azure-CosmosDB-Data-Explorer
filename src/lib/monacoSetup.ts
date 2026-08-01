// Configure Monaco's web worker for Vite. SQL is a Monarch-tokenized "basic"
// language with no dedicated language service, so the base editor worker is all
// we need. Importing this module once (from main.tsx) wires the environment
// before any editor is created.
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};
