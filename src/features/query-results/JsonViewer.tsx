import { useEffect, useMemo, useRef, useState } from "react";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatUtcInTimeZone } from "@/lib/dateFormat";
import { useSelectedStoreStore } from "@/store/selectedStoreStore";

hljs.registerLanguage("json", json);

/**
 * Walk the highlighted JSON and append a grayed-out, humanised local-time
 * annotation next to every UTC ISO date string value. The underlying JSON text
 * is never modified — annotations are extra DOM nodes only.
 */
function annotateDates(root: HTMLElement, timeZone: string): void {
  const stringSpans = root.querySelectorAll<HTMLElement>(".hljs-string");
  stringSpans.forEach((span) => {
    // highlight.js keeps the surrounding quotes in the token text.
    const raw = span.textContent?.replace(/^"|"$/g, "") ?? "";
    const label = formatUtcInTimeZone(raw, timeZone);
    if (!label) return;
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localTimeZoneLabel = formatUtcInTimeZone(raw, userTimeZone);

    const note = document.createElement("span");
    note.className = "ml-2 select-none italic text-muted-foreground/60";
    note.setAttribute("data-date-annotation", "");
    note.textContent = `${label}${localTimeZoneLabel ? ` (Local: ${localTimeZoneLabel})` : ""}`;
    span.after(note);
  });
}

export function JsonViewer({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  const timeZone = useSelectedStoreStore((s) => s.timeZone);

  const jsonText = useMemo(() => JSON.stringify(data, null, 2), [data]);

  useEffect(() => {
    if (!codeRef.current) return;
    codeRef.current.innerHTML = hljs.highlight(jsonText, {
      language: "json",
    }).value;
    if (timeZone) {
      annotateDates(codeRef.current, timeZone);
    }
  }, [jsonText, timeZone]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative h-full">
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
      <pre className="h-full overflow-auto p-4 font-mono text-[12.5px] leading-relaxed">
        <code ref={codeRef} className="language-json" />
      </pre>
    </div>
  );
}
