// Import the exact Monaco singleton that react-monaco-editor uses (it imports
// from "monaco-editor/esm/vs/editor/editor.api"). Registering our language and
// completion provider against this singleton at module load — see the
// registerCosmosSql() call at the bottom — guarantees the editors it creates
// can see our completions, independent of any editor lifecycle hook.
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { childFieldNames } from "./queryFields";

export const LANGUAGE_ID = "cosmos-sql";
export const THEME_DARK = "cosmos-dark";
export const THEME_LIGHT = "cosmos-light";

/**
 * Cosmos DB SQL query keywords. These drive both syntax highlighting (via the
 * Monarch tokenizer) and keyword completions.
 */
const KEYWORDS = [
  "SELECT",
  "FROM",
  "WHERE",
  "ORDER",
  "BY",
  "GROUP",
  "HAVING",
  "JOIN",
  "IN",
  "AS",
  "ASC",
  "DESC",
  "DISTINCT",
  "TOP",
  "VALUE",
  "OFFSET",
  "LIMIT",
  "AND",
  "OR",
  "NOT",
  "BETWEEN",
  "EXISTS",
  "LIKE",
  "IS",
  "NULL",
  "TRUE",
  "FALSE",
  "UNDEFINED",
];

/**
 * Cosmos DB SQL built-in functions (scalar, aggregate, type-checking, array,
 * string, spatial). Rendered as `predefined` tokens and offered as snippet
 * completions that insert `NAME()`.
 */
const BUILTIN_FUNCTIONS = [
  // Aggregate
  "COUNT",
  "SUM",
  "MIN",
  "MAX",
  "AVG",
  // Type checking
  "IS_DEFINED",
  "IS_NULL",
  "IS_BOOL",
  "IS_NUMBER",
  "IS_STRING",
  "IS_ARRAY",
  "IS_OBJECT",
  "IS_PRIMITIVE",
  // Array
  "ARRAY_CONTAINS",
  "ARRAY_LENGTH",
  "ARRAY_CONCAT",
  "ARRAY_SLICE",
  "SetIntersect",
  "SetUnion",
  // String
  "CONTAINS",
  "STARTSWITH",
  "ENDSWITH",
  "UPPER",
  "LOWER",
  "LENGTH",
  "SUBSTRING",
  "CONCAT",
  "REPLACE",
  "TRIM",
  "LTRIM",
  "RTRIM",
  "INDEX_OF",
  "REVERSE",
  "REGEXMATCH",
  "STRINGEQUALS",
  "TOSTRING",
  // Math
  "ABS",
  "CEILING",
  "FLOOR",
  "ROUND",
  "SQRT",
  "POWER",
  "EXP",
  "LOG",
  // Date/time
  "GetCurrentDateTime",
  "GetCurrentTimestamp",
  "DateTimeAdd",
  "DateTimeDiff",
  "DateTimePart",
  // Spatial
  "ST_DISTANCE",
  "ST_WITHIN",
  "ST_INTERSECTS",
  "ST_ISVALID",
];

/** Per-model field names for schema-aware completions. */
const modelFields = new WeakMap<monaco.editor.ITextModel, string[]>();

/**
 * Registers the container document fields associated with an editor model so
 * the completion provider can suggest them. Passing an empty array clears them.
 */
export function setModelFields(
  model: monaco.editor.ITextModel | null,
  fields: string[],
): void {
  if (!model) return;
  modelFields.set(model, fields);
}

function getModelFields(model: monaco.editor.ITextModel): string[] {
  return modelFields.get(model) ?? [];
}

let registered = false;

/**
 * Registers the `cosmos-sql` language, its Monarch tokenizer, language
 * configuration, light/dark themes, and a completion provider. Idempotent — safe
 * to call from every editor mount.
 */
export function registerCosmosSql(): void {
  if (registered) return;
  registered = true;

  monaco.languages.register({ id: LANGUAGE_ID });

  monaco.languages.setLanguageConfiguration(LANGUAGE_ID, {
    comments: {
      lineComment: "--",
      blockComment: ["/*", "*/"],
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "'", close: "'" },
      { open: '"', close: '"' },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "'", close: "'" },
      { open: '"', close: '"' },
    ],
  });

  monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, {
    ignoreCase: true,
    keywords: KEYWORDS,
    builtinFunctions: BUILTIN_FUNCTIONS,
    operators: [
      "=",
      "<>",
      "!=",
      "<",
      ">",
      "<=",
      ">=",
      "+",
      "-",
      "*",
      "/",
      "%",
      "??",
    ],
    tokenizer: {
      root: [
        [/--.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/"([^"\\]|\\.)*"/, "identifier.quoted"],
        [/'([^'\\]|\\.)*'/, "string"],
        [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
        [/\d+/, "number"],
        [
          /[a-zA-Z_]\w*/,
          {
            cases: {
              "@keywords": "keyword",
              "@builtinFunctions": "predefined",
              "@default": "identifier",
            },
          },
        ],
        [/[{}()[\]]/, "@brackets"],
        [/[=<>!+\-*/%]+|\?\?/, "operator"],
        [/[;,.]/, "delimiter"],
        [/\s+/, "white"],
      ],
      comment: [
        [/[^/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],
    },
  });

  monaco.editor.defineTheme(THEME_DARK, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6a9955", fontStyle: "italic" },
      { token: "keyword", foreground: "569cd6", fontStyle: "bold" },
      { token: "predefined", foreground: "dcdcaa" },
      { token: "string", foreground: "ce9178" },
      { token: "identifier.quoted", foreground: "ce9178" },
      { token: "number", foreground: "b5cea8" },
      { token: "number.float", foreground: "b5cea8" },
      { token: "operator", foreground: "d4d4d4" },
      { token: "identifier", foreground: "9cdcfe" },
      { token: "delimiter", foreground: "d4d4d4" },
    ],
    colors: {
      "editor.background": "#1e1e24",
      "editor.foreground": "#e6e6e6",
      "editorCursor.foreground": "#aeafad",
      "editor.lineHighlightBackground": "#2d2d30",
    },
  });

  monaco.editor.defineTheme(THEME_LIGHT, {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "008000", fontStyle: "italic" },
      { token: "keyword", foreground: "0000ff", fontStyle: "bold" },
      { token: "predefined", foreground: "795e26" },
      { token: "string", foreground: "a31515" },
      { token: "identifier.quoted", foreground: "a31515" },
      { token: "number", foreground: "098658" },
      { token: "number.float", foreground: "098658" },
      { token: "operator", foreground: "000000" },
      { token: "identifier", foreground: "001080" },
      { token: "delimiter", foreground: "000000" },
    ],
    colors: {},
  });

  monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
    triggerCharacters: [".", " "],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const allPaths = getModelFields(model);

      // Member-access context: text before the cursor ends with an alias/property
      // chain followed by a dot (e.g. `c.`, `c.address.`). Cosmos queries always
      // qualify properties with the FROM alias, so the first chain segment is the
      // alias and the rest maps into the document's property paths.
      const textUntilCursor = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      const memberMatch =
        /([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\.([A-Za-z_]\w*)?$/.exec(
          textUntilCursor,
        );

      if (memberMatch) {
        const segments = memberMatch[1].split(".");
        const rootPrefix = segments.slice(1).join("."); // drop the FROM alias
        const children = childFieldNames(allPaths, rootPrefix);

        const fieldItems: monaco.languages.CompletionItem[] = children.map(
          (name) => ({
            label: name,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: name,
            detail: "Document field",
            range,
          }),
        );

        return { suggestions: fieldItems };
      }

      const keywordItems: monaco.languages.CompletionItem[] = KEYWORDS.map(
        (kw) => ({
          label: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: kw,
          range,
        }),
      );

      const functionItems: monaco.languages.CompletionItem[] =
        BUILTIN_FUNCTIONS.map((fn) => ({
          label: fn,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: `${fn}($0)`,
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: "Cosmos DB function",
          range,
        }));

      // Outside member access, offer top-level fields as hints alongside the
      // language tokens (nested paths only surface after a qualifying dot).
      const fieldItems: monaco.languages.CompletionItem[] = childFieldNames(
        allPaths,
        "",
      ).map((field) => ({
        label: field,
        kind: monaco.languages.CompletionItemKind.Field,
        insertText: field,
        detail: "Document field",
        range,
      }));

      return {
        suggestions: [...fieldItems, ...keywordItems, ...functionItems],
      };
    },
  });
}

// Register at module load so the language + completions exist before any editor
// is created.
registerCosmosSql();
