import type { editor } from "monaco-editor/esm/vs/editor/editor.api";
import { describe, expect, it } from "vitest";
import { generateTabFieldDecorations } from "./tabAnnotations";

function createTestModel(text: string): editor.ITextModel {
  const lineStarts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\n") {
      lineStarts.push(i + 1);
    }
  }

  return {
    getPositionAt(offset: number) {
      const safeOffset = Math.max(0, Math.min(offset, text.length));
      let lineIndex = 0;
      for (let i = 0; i < lineStarts.length; i += 1) {
        if (lineStarts[i] > safeOffset) break;
        lineIndex = i;
      }
      return {
        lineNumber: lineIndex + 1,
        column: safeOffset - lineStarts[lineIndex] + 1,
      };
    },
  } as editor.ITextModel;
}

describe("generateTabFieldDecorations", () => {
  it("returns no decorations for an unregistered tabId", () => {
    const text = '{"documentType":2}';
    const model = createTestModel(text);

    expect(
      generateTabFieldDecorations(model, text, "unknown__unknown"),
    ).toEqual([]);
  });

  it("labels documentType for the stockroom tab", () => {
    const text = '{"documentType":2,"storeId":"0720"}';
    const model = createTestModel(text);

    const decorations = generateTabFieldDecorations(
      model,
      text,
      "stockroom__stockroom",
    );

    expect(decorations).toHaveLength(1);
    expect(decorations[0].options.after?.content).toBe(
      "  \u2192 StockroomTransaction",
    );
  });

  it("adds zone labels without disrupting enum annotations", () => {
    const zoneId = "0415eead-aa2a-443d-96d2-25471c04b892";
    const text = `{"documentType":2,"zoneId":"${zoneId}"}`;
    const model = createTestModel(text);

    const decorations = generateTabFieldDecorations(
      model,
      text,
      "stockroom__stockroom",
      { lookupLabels: new Map([[zoneId, "Future Promo (Ambient)"]]) },
    );

    expect(decorations.map((item) => item.options.after?.content)).toEqual([
      "  \u2192 Future Promo (Ambient)",
      "  \u2192 StockroomTransaction",
    ]);
  });
});
