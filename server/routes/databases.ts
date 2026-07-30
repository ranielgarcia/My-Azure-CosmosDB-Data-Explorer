import { Router } from "express";
import { cosmosClient } from "../cosmosClient.js";

export const databasesRouter = Router();

// GET /api/databases -> { databases: DatabaseItem[] }
databasesRouter.get("/databases", async (_req, res, next) => {
  try {
    const { resources } = await cosmosClient.databases.readAll().fetchAll();
    const databases = resources.map((db) => ({ id: db.id }));
    res.json({ databases });
  } catch (err) {
    next(err);
  }
});
