import { Router } from "express";
import {
  getSelectedStoreId,
  parseSelectedStoreId,
  saveSelectedStoreId,
} from "../selectedStoreStore.js";

export const selectedStoreRouter = Router();

// GET /api/selected-store -> { storeId: string | null }
selectedStoreRouter.get("/selected-store", async (_req, res, next) => {
  try {
    const storeId = await getSelectedStoreId();
    res.json({ storeId });
  } catch (err) {
    next(err);
  }
});

// PUT /api/selected-store -> persist { storeId: string | null }.
selectedStoreRouter.put("/selected-store", async (req, res, next) => {
  try {
    const storeId = parseSelectedStoreId(req.body);
    if (storeId === undefined) {
      res.status(400).json({
        error: "Invalid selected store payload.",
        code: 400,
      });
      return;
    }
    await saveSelectedStoreId(storeId);
    res.json({ storeId });
  } catch (err) {
    next(err);
  }
});
