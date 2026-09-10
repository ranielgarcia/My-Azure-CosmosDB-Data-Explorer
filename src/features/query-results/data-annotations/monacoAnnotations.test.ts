import type { editor } from "monaco-editor/esm/vs/editor/editor.api";
import { describe, expect, it } from "vitest";
import {
  generateEnumFieldDecorations,
  generateLookupFieldDecorations,
  generatePatternDecorations,
  generateUtcDateDecorations,
} from "./monacoAnnotations";
import { formatUtcInTimeZone } from "../../../lib/dateFormat";

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

describe("generatePatternDecorations", () => {
  it("maps multiple matches to Monaco ranges", () => {
    const text = '{\n  "a": "date:1",\n  "b": "date:2"\n}';
    const model = createTestModel(text);

    const decorations = generatePatternDecorations(model, text, {
      regex: /"date:(\d+)"/g,
      inlineClassName: "data-annotation",
      buildContent: (match) => ` #${match[1]}`,
    });

    expect(decorations).toHaveLength(2);

    const firstIndex = text.indexOf('"date:1"');
    const secondIndex = text.indexOf('"date:2"');

    const firstStart = model.getPositionAt(firstIndex);
    const firstEnd = model.getPositionAt(firstIndex + '"date:1"'.length);
    const secondStart = model.getPositionAt(secondIndex);
    const secondEnd = model.getPositionAt(secondIndex + '"date:2"'.length);

    expect(decorations[0].range).toEqual({
      startLineNumber: firstStart.lineNumber,
      startColumn: firstStart.column,
      endLineNumber: firstEnd.lineNumber,
      endColumn: firstEnd.column,
    });
    expect(decorations[1].range).toEqual({
      startLineNumber: secondStart.lineNumber,
      startColumn: secondStart.column,
      endLineNumber: secondEnd.lineNumber,
      endColumn: secondEnd.column,
    });
  });

  it("filters out matches when content builder returns null", () => {
    const text = '{"a":"date:1","b":"date:2"}';
    const model = createTestModel(text);

    const decorations = generatePatternDecorations(model, text, {
      regex: /"date:(\d+)"/g,
      inlineClassName: "data-annotation",
      buildContent: (match) => (match[1] === "1" ? " keep" : null),
    });

    expect(decorations).toHaveLength(1);
    expect(decorations[0].options.after?.content).toBe(" keep");
  });

  it("handles zero-length matches safely", () => {
    const text = '{"a":"date:1"}';
    const model = createTestModel(text);

    const decorations = generatePatternDecorations(model, text, {
      regex: /(?="date:)/g,
      inlineClassName: "data-annotation",
      buildContent: () => null,
    });

    expect(decorations).toEqual([]);
  });
});

describe("generateUtcDateDecorations", () => {
  it("builds UTC date annotations with selected and local timezone labels", () => {
    const date = "2025-04-30T17:00:00Z";
    const text = `{"createdAt":"${date}"}`;
    const model = createTestModel(text);

    const selectedLabel = formatUtcInTimeZone(date, "Australia/Perth");
    const localLabel = formatUtcInTimeZone(date, "UTC");

    const decorations = generateUtcDateDecorations(model, text, {
      displayTimeZone: "Australia/Perth",
      localTimeZone: "UTC",
    });

    expect(decorations).toHaveLength(1);
    expect(selectedLabel).toBeTruthy();
    expect(localLabel).toBeTruthy();
    expect(decorations[0].options.after?.content).toBe(
      `  ${selectedLabel} (Local: ${localLabel})`,
    );
  });

  it("builds UTC date annotations for offset timestamps (+HH:MM)", () => {
    const date = "2026-08-05T11:03:11.0953424+00:00";
    const text = `{"createdAt":"${date}"}`;
    const model = createTestModel(text);

    const selectedLabel = formatUtcInTimeZone(date, "Australia/Perth");
    const localLabel = formatUtcInTimeZone(date, "UTC");

    const decorations = generateUtcDateDecorations(model, text, {
      displayTimeZone: "Australia/Perth",
      localTimeZone: "UTC",
    });

    expect(decorations).toHaveLength(1);
    expect(selectedLabel).toBeTruthy();
    expect(localLabel).toBeTruthy();
    expect(decorations[0].options.after?.content).toBe(
      `  ${selectedLabel} (Local: ${localLabel})`,
    );
  });

  it("returns no decorations when timezone formatting fails", () => {
    const text = '{"createdAt":"2025-04-30T17:00:00Z"}';
    const model = createTestModel(text);

    const decorations = generateUtcDateDecorations(model, text, {
      displayTimeZone: "Not/AZone",
      localTimeZone: "UTC",
    });

    expect(decorations).toEqual([]);
  });
});

describe("generateEnumFieldDecorations", () => {
  const labels = ["Unknown", "StockroomItem", "StockroomTransaction"] as const;

  it("labels a valid enum index", () => {
    const text = '{"documentType":2,"partitionKey1":"0720"}';
    const model = createTestModel(text);

    const decorations = generateEnumFieldDecorations(model, text, {
      fieldName: "documentType",
      labels,
    });

    expect(decorations).toHaveLength(1);
    expect(decorations[0].options.after?.content).toBe(
      "  \u2192 StockroomTransaction",
    );
  });

  it("skips out-of-range indices", () => {
    const text = '{"documentType":99}';
    const model = createTestModel(text);

    const decorations = generateEnumFieldDecorations(model, text, {
      fieldName: "documentType",
      labels,
    });

    expect(decorations).toEqual([]);
  });

  it("ignores unrelated keys with a similar suffix", () => {
    const text = '{"innerDocumentType":2,"documentType":1}';
    const model = createTestModel(text);

    const decorations = generateEnumFieldDecorations(model, text, {
      fieldName: "documentType",
      labels,
    });

    expect(decorations).toHaveLength(1);
    expect(decorations[0].options.after?.content).toBe(
      "  \u2192 StockroomItem",
    );
  });

  it("annotates every occurrence, regardless of nesting depth", () => {
    const text = '{"transactions":[{"quantityType":2},{"quantityType":1}]}';
    const model = createTestModel(text);

    const decorations = generateEnumFieldDecorations(model, text, {
      fieldName: "quantityType",
      labels,
    });

    expect(decorations).toHaveLength(2);
  });

  it("attaches a hoverMessage listing every label with the matched value bolded", () => {
    const text = '{"documentType":2}';
    const model = createTestModel(text);

    const decorations = generateEnumFieldDecorations(model, text, {
      fieldName: "documentType",
      labels,
    });

    expect(decorations[0].options.hoverMessage).toEqual({
      value:
        "**documentType**\n\n- 0 - Unknown\n- 1 - StockroomItem\n- **2 - StockroomTransaction**",
    });
  });

  it("omits hoverMessage (and the decoration) for out-of-range indices", () => {
    const text = '{"documentType":99}';
    const model = createTestModel(text);

    const decorations = generateEnumFieldDecorations(model, text, {
      fieldName: "documentType",
      labels,
    });

    expect(decorations).toEqual([]);
  });
});

describe("generateLookupFieldDecorations", () => {
  it("labels every matching string field using case-insensitive keys", () => {
    const zoneId = "0415EEAD-AA2A-443D-96D2-25471C04B892";
    const text = `{"zones":[{"zoneId":"${zoneId}"},{"zoneId":"missing"}]}`;
    const model = createTestModel(text);

    const decorations = generateLookupFieldDecorations(model, text, {
      fieldName: "zoneId",
      labelsByValue: new Map([
        [zoneId.toLowerCase(), "Future Promo (Ambient)"],
      ]),
    });

    expect(decorations).toHaveLength(1);
    expect(decorations[0].options.after?.content).toBe(
      "  \u2192 Future Promo (Ambient)",
    );
  });

  it("ignores similarly named fields", () => {
    const text = '{"previousZoneId":"abc","zoneId":"abc"}';
    const model = createTestModel(text);

    const decorations = generateLookupFieldDecorations(model, text, {
      fieldName: "zoneId",
      labelsByValue: new Map([["abc", "Zone A (Group A)"]]),
    });

    expect(decorations).toHaveLength(1);
  });
});
