import { Textarea } from "@/components/ui/textarea";

interface QueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
}

export function QueryEditor({ value, onChange, onRun }: QueryEditorProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          onRun();
        }
      }}
      spellCheck={false}
      placeholder="SELECT * FROM c"
      className="h-full resize-none rounded-none border-0 font-mono text-sm leading-relaxed shadow-none focus-visible:ring-0"
    />
  );
}
