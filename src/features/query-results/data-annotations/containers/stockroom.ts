import type { FieldAnnotationConfig } from "../tabAnnotations";

export const STOCKROOM_TAB_ID = "stockroom__stockroom";

/** Index maps to the numeric `documentType` value stored on stockroom documents. */
const STOCKROOM_DOCUMENT_TYPES = [
  "Unknown",
  "StockroomItem",
  "StockroomTransaction",
  "AdvanceShipmentNotice",
  "PurchaseOrder",
  "GITHeader",
  "GITDetail",
] as const;

/** Index maps to the numeric `source` value stored on stockroom transactions. */
const STOCKROOM_TRANSACTION_SOURCE = [
  "Split",
  "Rework Check Tool",
  "Lookup Count",
  "Fill List",
  "Add Product",
  "Remove Product",
  "Move Product",
  "Move Rework",
  "Reset Stockroom",
  "Emergency Reset",
  "System Generated",
  "Scheduled Count",
  "PickList Count",
  "Online Rover",
  "Move Zone",
  "Remove Zone",
  "PickList Fill",
  "Backstock Pick",
  "Unknown",
  "Guided Count",
];

const STOCKROOM_TRANSACTION_TYPE = ["SetQuantity", "AdjustQuantity"];

const STOCKROOM_QUANTITY_TYPE = [
  "Unknown (X)",
  "Carton (C)",
  "Unit (U)",
  "Pack (P)",
  "Weight (K)",
];

const STOCKROOM_TRANSACTION_REASON = [
  "Unknown",
  "Add",
  "Remove",
  "Reset",
  "BreakCarton",
  "NegativeQuantityReversal",
  "ReturnFromFill",
  "BuildCarton",
  "SetQuantity",
];

export const stockroomFieldAnnotations: FieldAnnotationConfig[] = [
  { kind: "lookup", fieldName: "zoneId" },
  { kind: "enum", fieldName: "documentType", labels: STOCKROOM_DOCUMENT_TYPES },
  { kind: "enum", fieldName: "source", labels: STOCKROOM_TRANSACTION_SOURCE },
  {
    kind: "enum",
    fieldName: "transactionType",
    labels: STOCKROOM_TRANSACTION_TYPE,
  },
  {
    kind: "enum",
    fieldName: "quantityType",
    labels: STOCKROOM_QUANTITY_TYPE,
  },
  {
    kind: "enum",
    fieldName: "transactionReason",
    labels: STOCKROOM_TRANSACTION_REASON,
  },
];
