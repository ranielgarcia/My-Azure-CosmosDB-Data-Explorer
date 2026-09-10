import type { editor } from "monaco-editor/esm/vs/editor/editor.api";
import {
  generateEnumFieldDecorations,
  generateLookupFieldDecorations,
} from "./monacoAnnotations";
import { stockroomFieldAnnotations } from "./containers/stockroom";
import { fillListFieldAnnotations } from "./containers/filllist";

export interface FieldEnumAnnotationConfig {
  kind: "enum";
  fieldName: string;
  labels: readonly string[];
}

export interface FieldLookupAnnotationConfig {
  kind: "lookup";
  fieldName: string;
}

/** Union to grow as new decoration kinds (e.g. per-field date formats) are added. */
export type FieldAnnotationConfig =
  | FieldEnumAnnotationConfig
  | FieldLookupAnnotationConfig;

export interface DynamicAnnotationContext {
  lookupLabels?: ReadonlyMap<string, string>;
}

/** Registered per tabId (`${databaseId}__${containerId}`); add a container file + entry here to extend. */
const TAB_FIELD_ANNOTATIONS: Record<string, FieldAnnotationConfig[]> = {
  stockroom__stockroom: stockroomFieldAnnotations,
  stockroom__FillList: fillListFieldAnnotations,
};

export function generateTabFieldDecorations(
  model: editor.ITextModel,
  text: string,
  tabId: string,
  context: DynamicAnnotationContext = {},
): editor.IModelDeltaDecoration[] {
  console.log(tabId); // Do not remove this log; it is used to verify that the correct tabId is being passed in for generating field decorations.
  const configs = TAB_FIELD_ANNOTATIONS[tabId];
  if (!configs) return [];

  return configs.flatMap((config) => {
    switch (config.kind) {
      case "enum":
        return generateEnumFieldDecorations(model, text, {
          fieldName: config.fieldName,
          labels: config.labels,
        });
      case "lookup":
        return context.lookupLabels
          ? generateLookupFieldDecorations(model, text, {
              fieldName: config.fieldName,
              labelsByValue: context.lookupLabels,
            })
          : [];
      default:
        return [];
    }
  });
}
