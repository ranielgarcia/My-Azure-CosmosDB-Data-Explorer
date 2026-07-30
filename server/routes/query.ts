import { Router } from "express";
import type { FeedOptions, SqlParameter } from "@azure/cosmos";
import { cosmosClient } from "../cosmosClient.js";
import { isMutatingQuery } from "../readOnlyGuard.js";

export const queryRouter = Router();

const DEFAULT_MAX_ITEM_COUNT = 100;

interface QueryRequestBody {
  query?: string;
  parameters?: SqlParameter[];
  maxItemCount?: number;
  continuationToken?: string;
}

// POST /api/databases/:dbId/containers/:containerId/query
// Body: { query, parameters?, maxItemCount?, continuationToken? }
// -> 200: { items, count, requestCharge, continuationToken | null }
// -> 400: { error } when a mutating statement is detected
queryRouter.post(
  "/databases/:dbId/containers/:containerId/query",
  async (req, res, next) => {
    try {
      const { dbId, containerId } = req.params;
      const { query, parameters, maxItemCount, continuationToken } =
        req.body as QueryRequestBody;

      if (typeof query !== "string" || query.trim().length === 0) {
        res
          .status(400)
          .json({ error: "A non-empty query string is required." });
        return;
      }

      if (isMutatingQuery(query)) {
        res.status(400).json({
          error: "Only read-only (SELECT) queries are allowed.",
        });
        return;
      }

      const container = cosmosClient.database(dbId).container(containerId);
      const options: FeedOptions = {
        maxItemCount: maxItemCount ?? DEFAULT_MAX_ITEM_COUNT,
      };
      if (continuationToken) {
        options.continuationToken = continuationToken;
      }

      const iterator = container.items.query({ query, parameters }, options);
      const page = await iterator.fetchNext();

      res.json({
        items: page.resources,
        count: page.resources.length,
        requestCharge: page.requestCharge,
        continuationToken: page.hasMoreResults ? page.continuationToken : null,
      });
    } catch (err) {
      next(err);
    }
  },
);
