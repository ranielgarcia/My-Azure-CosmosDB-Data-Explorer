import { FieldAnnotationConfig } from "../tabAnnotations";

const FILLLIST_PICK_STATUSES = [
  "Not Picked",
  "Partially Picked",
  "Zero Picked",
  "Fully Picked",
] as const;

const FILLLIST_QTY_TYPES = ["X", "C", "U", "P", "K"] as const;
const FILLLIST_SCAN_TYPES = ["X", "C", "P", "I"] as const;

export const fillListFieldAnnotations: FieldAnnotationConfig[] = [
  {
    kind: "enum",
    fieldName: "status",
    labels: FILLLIST_PICK_STATUSES,
  },
  {
    kind: "enum",
    fieldName: "quantityType",
    labels: FILLLIST_QTY_TYPES,
  },
  {
    kind: "enum",
    fieldName: "scanType",
    labels: FILLLIST_SCAN_TYPES,
  },
];
