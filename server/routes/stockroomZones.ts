import { Router } from "express";
import {
  createStockroomZonesService,
  type StockroomZonesService,
} from "../services/stockroomZonesService.js";

export const stockroomZonesRouter = Router();

let service: StockroomZonesService | null = null;
function getService(): StockroomZonesService {
  if (!service) service = createStockroomZonesService();
  return service;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function invalidLookupPayload(res: import("express").Response): void {
  res.status(400).json({ error: "Expected an array of strings.", code: 400 });
}

stockroomZonesRouter.post(
  "/tables/stockroom-zones/by-partition-keys",
  async (req, res, next) => {
    try {
      const { partitionKeys } = req.body;
      if (!isStringArray(partitionKeys)) {
        invalidLookupPayload(res);
        return;
      }
      const items = await getService().getByPartitionKeys(partitionKeys);
      res.json({ items, count: items.length });
    } catch (err) {
      next(err);
    }
  },
);

stockroomZonesRouter.post(
  "/tables/stockroom-zones/by-ids",
  async (req, res, next) => {
    try {
      const { ids } = req.body;
      if (!isStringArray(ids)) {
        invalidLookupPayload(res);
        return;
      }
      const items = await getService().getByIds(ids);
      res.json({ items, count: items.length });
    } catch (err) {
      next(err);
    }
  },
);
