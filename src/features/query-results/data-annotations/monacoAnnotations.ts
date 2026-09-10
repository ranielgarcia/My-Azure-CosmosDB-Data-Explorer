import type {
  editor,
  IMarkdownString,
} from "monaco-editor/esm/vs/editor/editor.api";
import { formatUtcInTimeZone } from "@/lib/dateFormat";

export interface AnnotationPattern {
  regex: RegExp;
  inlineClassName: string;
  buildContent: (match: RegExpExecArray) => string | null;
  buildHoverMessage?: (match: RegExpExecArray) => IMarkdownString | null;
}

export interface UtcDateAnnotationOptions {
  displayTimeZone: string;
  localTimeZone?: string;
  inlineClassName?: string;
}

export interface EnumFieldAnnotationOptions {
  fieldName: string;
  labels: readonly string[];
  inlineClassName?: string;
}

export interface LookupFieldAnnotationOptions {
  fieldName: string;
  labelsByValue: ReadonlyMap<string, string>;
  inlineClassName?: string;
}

/** Matches a JSON-quoted ISO 8601 timestamp with UTC or offset, e.g.
 * "2025-04-30T17:00:00Z", "2026-08-05T11:03:11.1082258Z" or "2026-08-05T11:03:11.0953424+00:00".
 */
const UTC_DATE_FORMAT_REGEX =
  /"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})"/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toGlobalRegex(regex: RegExp): RegExp {
  if (regex.global) {
    return new RegExp(regex.source, regex.flags);
  }
  return new RegExp(regex.source, `${regex.flags}g`);
}

export function generatePatternDecorations(
  model: editor.ITextModel,
  text: string,
  pattern: AnnotationPattern,
): editor.IModelDeltaDecoration[] {
  const scanRe = toGlobalRegex(pattern.regex);
  const decorations: editor.IModelDeltaDecoration[] = [];
  let match: RegExpExecArray | null;

  while ((match = scanRe.exec(text)) !== null) {
    const content = pattern.buildContent(match);

    // Guard against infinite loops with zero-length regex matches.
    if (match[0].length === 0) {
      scanRe.lastIndex += 1;
    }

    if (!content) continue;

    const startPos = model.getPositionAt(match.index);
    const endPos = model.getPositionAt(match.index + match[0].length);
    const hoverMessage = pattern.buildHoverMessage?.(match) ?? undefined;

    decorations.push({
      range: {
        startLineNumber: startPos.lineNumber,
        startColumn: startPos.column,
        endLineNumber: endPos.lineNumber,
        endColumn: endPos.column,
      },
      options: {
        after: {
          content,
          inlineClassName: pattern.inlineClassName,
        },
        ...(hoverMessage ? { hoverMessage } : {}),
      },
    });
  }

  return decorations;
}

export function generateUtcDateDecorations(
  model: editor.ITextModel,
  text: string,
  options: UtcDateAnnotationOptions,
): editor.IModelDeltaDecoration[] {
  const localTimeZone =
    options.localTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  return generatePatternDecorations(model, text, {
    regex: UTC_DATE_FORMAT_REGEX,
    inlineClassName: options.inlineClassName ?? "data-annotation",
    buildContent: (match) => {
      const dateStr = match[0].slice(1, -1); // strip surrounding JSON quotes
      const label = formatUtcInTimeZone(dateStr, options.displayTimeZone);
      if (!label) return null;

      const localLabel = formatUtcInTimeZone(dateStr, localTimeZone);
      return `  ${label}${localLabel ? ` (Local: ${localLabel})` : ""}`;
    },
  });
}

/** Renders the full label list for a field's hover tooltip, bolding the currently matched value. */
function buildEnumHoverMarkdown(
  fieldName: string,
  labels: readonly string[],
  currentValue: number,
): IMarkdownString {
  const lines = labels.map((label, index) =>
    index === currentValue
      ? `- **${index} - ${label}**`
      : `- ${index} - ${label}`,
  );
  return { value: `**${fieldName}**\n\n${lines.join("\n")}` };
}

/** Annotates a numeric enum-valued JSON field with its label, e.g. `"documentType": 2` -> `StockroomTransaction`. */
export function generateEnumFieldDecorations(
  model: editor.ITextModel,
  text: string,
  options: EnumFieldAnnotationOptions,
): editor.IModelDeltaDecoration[] {
  const fieldRegex = new RegExp(
    `"${escapeRegExp(options.fieldName)}":\\s*(-?\\d+)`,
    "g",
  );

  return generatePatternDecorations(model, text, {
    regex: fieldRegex,
    inlineClassName: options.inlineClassName ?? "data-annotation",
    buildContent: (match) => {
      const label = options.labels[Number(match[1])];
      return label ? `  \u2192 ${label}` : null;
    },
    buildHoverMessage: (match) => {
      const value = Number(match[1]);
      return options.labels[value]
        ? buildEnumHoverMarkdown(options.fieldName, options.labels, value)
        : null;
    },
  });
}

/** Annotates a string-valued JSON field from a dynamic lookup map. */
export function generateLookupFieldDecorations(
  model: editor.ITextModel,
  text: string,
  options: LookupFieldAnnotationOptions,
): editor.IModelDeltaDecoration[] {
  const fieldRegex = new RegExp(
    `"${escapeRegExp(options.fieldName)}":\\s*"([^"\\\\]+)"`,
    "gi",
  );

  return generatePatternDecorations(model, text, {
    regex: fieldRegex,
    inlineClassName: options.inlineClassName ?? "data-annotation",
    buildContent: (match) => {
      const label = options.labelsByValue.get(match[1].toLowerCase());
      return label ? `  \u2192 ${label}` : null;
    },
  });
}
