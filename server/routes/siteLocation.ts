import { Router } from "express";
import {
  createSiteLocationService,
  type SiteLocationService,
} from "../services/siteLocationService.js";

export const siteLocationRouter = Router();

// Created lazily on first request so the proxy still boots (for Cosmos routes)
// even when Table Storage env vars aren't configured.
let service: SiteLocationService | null = null;
function getService(): SiteLocationService {
  if (!service) service = createSiteLocationService();
  return service;
}

// POST /api/tables/site-location/refresh -> { count }
// Rebuilds every per-store cache file and all-stores.json from the table.
siteLocationRouter.post(
  "/tables/site-location/refresh",
  async (_req, res, next) => {
    try {
      const result = await getService().refreshCache();
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/tables/site-location/stores -> StoreSummary[]
siteLocationRouter.get(
  "/tables/site-location/stores",
  async (_req, res, next) => {
    try {
      const stores = await getService().getAllStores();
      res.json({ stores });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/tables/site-location/stores/:partitionKey/:rowKey -> StoreDetails
siteLocationRouter.get(
  "/tables/site-location/stores/:partitionKey/:rowKey",
  async (req, res, next) => {
    try {
      const { partitionKey, rowKey } = req.params;
      const details = await getService().getStore(partitionKey, rowKey);
      res.json(details);
    } catch (err) {
      next(err);
    }
  },
);
