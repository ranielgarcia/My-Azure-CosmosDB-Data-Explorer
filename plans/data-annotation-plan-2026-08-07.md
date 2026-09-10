## Plan: Tab-scoped field-enum decorations for JsonViewer

Extend the existing Monaco decoration engine (`generatePatternDecorations`) with a new
`generateEnumFieldDecorations` helper that annotates a specific JSON property (matched by literal
key name, anywhere/any-nesting-depth in the text) with a human label looked up from an enum array.
Introduce a per-tabId registry (`tabAnnotations.ts` + `containers/*.ts`) so future containers/fields
are added by dropping in a new config file, not touching JsonViewer.tsx. Implement only
`documentType` for `stockroom__stockroom` now; `quantityType`/others follow the same pattern later
once their label arrays are supplied. Also remove the leftover debug `console.log` block.

**Steps**

1. **Engine**: Add to [monacoAnnotations.ts](src/features/query-results/data-annotations/monacoAnnotations.ts):
   - `EnumFieldAnnotationOptions { fieldName: string; labels: readonly string[]; inlineClassName?: string }`
   - local `escapeRegExp(value)` helper (none exists in repo yet).
   - `generateEnumFieldDecorations(model, text, options)`: builds regex
     ``new RegExp(`"${escapeRegExp(fieldName)}":\s*(-?\d+)`, "g")``, delegates to
     `generatePatternDecorations` with `buildContent` doing `labels[Number(match[1])]` lookup,
     returning `null` (skip) when the index is out of range/undefined — matches existing null-skip
     convention. Default `inlineClassName` to `"data-annotation"` (reuse existing CSS, per decision).
   - Rationale for literal `"fieldName":` match: JSON keys are exact quoted strings, so no partial-key
     collisions are possible — no word-boundary regex needed. Works across nesting depth for free
     since it's a text scan, not an AST walk (matches current architecture's approach).

2. **Registry** _(depends on 1)_: Create
   [tabAnnotations.ts](src/features/query-results/data-annotations/tabAnnotations.ts):
   - `FieldEnumAnnotationConfig { kind: "enum"; fieldName: string; labels: readonly string[] }`
     and `type FieldAnnotationConfig = FieldEnumAnnotationConfig` (union to grow later, e.g. a
     future `"utcDate"` per-field kind).
   - `TAB_FIELD_ANNOTATIONS: Record<string, FieldAnnotationConfig[]>` keyed by tabId
     (`${databaseId}__${containerId}`, per [tabs.ts](src/types/tabs.ts) convention).
   - `generateTabFieldDecorations(model, text, tabId)`: looks up configs for the tabId (returns `[]`
     if none registered), `flatMap`s over them dispatching on `config.kind` (switch statement;
     `case "enum"` → `generateEnumFieldDecorations`), concatenating all resulting decorations.

3. **Container config** _(depends on 2)_: Create
   `src/features/query-results/data-annotations/containers/stockroom.ts`:
   - `const STOCKROOM_DOCUMENT_TYPES = ["Unknown", "StockroomItem", "StockroomTransaction",
"AdvanceShipmentNotice", "PurchaseOrder", "GITHeader", "GITDetail"] as const;`
   - `export const stockroomFieldAnnotations: FieldAnnotationConfig[] = [{ kind: "enum",
fieldName: "documentType", labels: STOCKROOM_DOCUMENT_TYPES }];`
   - Import `FieldAnnotationConfig` as a **type-only** import from `../tabAnnotations` to avoid a
     runtime circular dependency (tabAnnotations.ts imports `stockroomFieldAnnotations` back).
   - Register `"stockroom__stockroom": stockroomFieldAnnotations` in `TAB_FIELD_ANNOTATIONS`.

4. **Wire into JsonViewer** _(depends on 2, 3)_: Edit
   [JsonViewer.tsx](src/features/query-results/JsonViewer.tsx) lines ~43-66:
   - Import `generateTabFieldDecorations` from `./data-annotations/tabAnnotations`.
   - Remove the `if (tabId === "stockroom__stockroom") console.log(...)` debug block entirely.
   - Build the decorations array as the concatenation of the existing UTC-date decorations (unchanged,
     still gated on `timeZone`) and `generateTabFieldDecorations(model, jsonText, tabId)` (always run,
     no timeZone gating), then pass the merged array to `createDecorationsCollection`.
   - Keep the `useEffect` dependency array as-is (`[jsonText, timeZone, monacoEditor, tabId]`).

5. **Tests** _(depends on 1-3, parallel with 4)_:
   - Add cases to [monacoAnnotations.test.ts](src/features/query-results/data-annotations/monacoAnnotations.test.ts)
     for `generateEnumFieldDecorations`: matches and labels a valid index, skips (returns no
     decoration) for an out-of-range index, ignores unrelated same-prefix keys, reuses the existing
     `createTestModel` helper.
   - Add `tabAnnotations.test.ts` covering `generateTabFieldDecorations`: empty array for an
     unregistered tabId; correct decoration produced for `"stockroom__stockroom"` + sample
     `documentType: 2` text resolving to `"StockroomTransaction"`.

**Relevant files**

- `src/features/query-results/data-annotations/monacoAnnotations.ts` — add `generateEnumFieldDecorations` + `escapeRegExp`, reuse `generatePatternDecorations`.
- `src/features/query-results/data-annotations/monacoAnnotations.test.ts` — new test cases.
- `src/features/query-results/data-annotations/tabAnnotations.ts` — new registry + dispatcher (new file).
- `src/features/query-results/data-annotations/tabAnnotations.test.ts` — new file.
- `src/features/query-results/data-annotations/containers/stockroom.ts` — new file, enum labels.
- `src/features/query-results/JsonViewer.tsx` — wire in `generateTabFieldDecorations`, remove debug block.

**Verification**

1. `npm test` — all existing + new Vitest suites pass (`monacoAnnotations.test.ts`, `tabAnnotations.test.ts`).
2. Manual: open the `stockroom__stockroom` tab in the running app, run a query returning a
   `documentType: 2` document, confirm the JSON viewer shows an inline "→ StockroomTransaction"
   annotation after the `2`, and that an unknown/out-of-range documentType value shows no annotation.
3. Confirm no console errors/warnings and the debug `console.log` is gone.

**Decisions**

- Scope: implement `documentType` only now; `quantityType`/`transactionReason`/etc. deferred until
  their label arrays are supplied — same registry pattern accommodates them with zero changes to
  the engine or JsonViewer.
- Folder structure: `containers/` subfolder per container, central `tabAnnotations.ts` registry.
- Visual style: reuse `.data-annotation` CSS class (no new CSS).
- Unknown/out-of-range enum values: render no annotation (silent skip), consistent with how
  `generateUtcDateDecorations` already skips invalid dates.
- Remove the pre-existing debug `console.log` block in JsonViewer as part of this change.
- No JSON AST/position-tracking library introduced (no `jsonc-parser`/`json-source-map`) — stays
  consistent with the existing text-regex + `model.getPositionAt` approach, and literal
  `"fieldName":` matching is safe since JSON object keys are exact quoted strings (no false positives
  from substrings).

**Further Considerations**

1. Future fields like `quantityType` live inside a nested `transactions` array — no extra work needed
   since matching is a flat text scan, not scoped to object depth; when you're ready to add it, just
   append another `{ kind: "enum", fieldName: "quantityType", labels: [...] }` entry to
   `stockroomFieldAnnotations` (Option: keep as-is / Option: consider scoping decorations to a
   specific JSON path if a field name collision between sibling objects ever needs different labels
   per context — not needed today, only add if it becomes a real requirement).
