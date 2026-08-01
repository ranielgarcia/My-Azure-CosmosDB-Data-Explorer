import { Router } from "express";
import {
  addQuery,
  deleteQuery,
  listQueries,
  parseNewQuery,
} from "../savedQueriesStore.js";

export const savedQueriesRouter = Router();

// GET /api/saved-queries?databaseId=&containerId= -> { queries: SavedQuery[] }
savedQueriesRouter.get("/saved-queries", async (req, res, next) => {
  try {
    const { databaseId, containerId } = req.query;
    if (typeof databaseId !== "string" || typeof containerId !== "string") {
      res.status(400).json({
        error: "databaseId and containerId query params are required.",
        code: 400,
      });
      return;
    }
    const queries = await listQueries(databaseId, containerId);
    res.json({ queries });
  } catch (err) {
    next(err);
  }
});

// POST /api/saved-queries -> persist a new saved query.
savedQueriesRouter.post("/saved-queries", async (req, res, next) => {
  try {
    const input = parseNewQuery(req.body);
    if (!input) {
      res.status(400).json({
        error: "Invalid saved query payload.",
        code: 400,
      });
      return;
    }
    const saved = await addQuery(input);
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/saved-queries/:id -> remove a saved query.
savedQueriesRouter.delete("/saved-queries/:id", async (req, res, next) => {
  try {
    const removed = await deleteQuery(req.params.id);
    if (!removed) {
      res.status(404).json({ error: "Saved query not found.", code: 404 });
      return;
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
