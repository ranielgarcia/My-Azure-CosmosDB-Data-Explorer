import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./lib/monacoSetup";
import App from "./App.tsx";
import "./index.css";
import { initTheme } from "./store/themeStore";

// Sync the theme store with the class the inline <head> script already applied,
// and start listening for system preference changes.
initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
