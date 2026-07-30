import { Router } from "express";
import { cosmosClient } from "../cosmosClient.js";

export const containersRouter = Router();

// GET /api/databases/:dbId/containers -> { containers: ContainerItem[] }
containersRouter.get("/databases/:dbId/containers", async (req, res, next) => {
  try {
    const { dbId } = req.params;
    const { resources } = await cosmosClient
      .database(dbId)
      .containers.readAll()
      .fetchAll();
    const containers = resources.map((container) => ({
      id: container.id,
      partitionKeyPath: container.partitionKey?.paths?.[0] ?? "",
    }));
    res.json({ containers });
  } catch (err) {
    next(err);
  }
});
