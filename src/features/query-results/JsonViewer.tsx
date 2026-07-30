import { useEffect, useMemo, useRef, useState } from "react";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

hljs.registerLanguage("json", json);

export function JsonViewer({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const jsonText = useMemo(() => JSON.stringify(data, null, 2), [data]);

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.textContent = jsonText;
      hljs.highlightElement(codeRef.current);
    }
  }, [jsonText]);

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
      <pre className="h-full overflow-auto p-4 text-xs leading-relaxed">
        <code ref={codeRef} className="language-json" />
      </pre>
    </div>
  );
}
