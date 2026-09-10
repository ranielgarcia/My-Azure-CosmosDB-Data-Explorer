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

interface QueryFeedPage {
  resources: unknown[];
  requestCharge: number;
  hasMoreResults: boolean;
  continuationToken?: string | null;
}

interface FilledQueryPage {
  items: unknown[];
  requestCharge: number;
  continuationToken: string | null;
}

type FetchQueryPage = (options: FeedOptions) => Promise<QueryFeedPage>;

function usableContinuationToken(token: string | null | undefined) {
  return typeof token === "string" && token.trim().length > 0 ? token : null;
}

export async function fillQueryPage(
  maxItemCount: number,
  continuationToken: string | undefined,
  fetchPage: FetchQueryPage,
): Promise<FilledQueryPage> {
  const items: unknown[] = [];
  let requestCharge = 0;
  let currentToken = usableContinuationToken(continuationToken);
  let nextToken: string | null = null;
  const seenTokens = new Set<string>();

  if (currentToken) {
    seenTokens.add(currentToken);
  }

  while (items.length < maxItemCount) {
    const remaining = maxItemCount - items.length;
    const options: FeedOptions = { maxItemCount: remaining };
    if (currentToken) {
      options.continuationToken = currentToken;
    }

    const page = await fetchPage(options);
    items.push(...page.resources);
    requestCharge += page.requestCharge;
    nextToken = page.hasMoreResults
      ? usableContinuationToken(page.continuationToken)
      : null;

    if (items.length >= maxItemCount || !nextToken) {
      break;
    }
    if (seenTokens.has(nextToken)) {
      throw new Error("Cosmos DB returned a non-advancing continuation token.");
    }

    seenTokens.add(nextToken);
    currentToken = nextToken;
  }

  return { items, requestCharge, continuationToken: nextToken };
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

      const requestedMaxItemCount = maxItemCount ?? DEFAULT_MAX_ITEM_COUNT;
      if (
        !Number.isInteger(requestedMaxItemCount) ||
        requestedMaxItemCount <= 0
      ) {
        res.status(400).json({
          error: "maxItemCount must be a positive integer.",
        });
        return;
      }

      const container = cosmosClient.database(dbId).container(containerId);
      const page = await fillQueryPage(
        requestedMaxItemCount,
        continuationToken,
        (options) =>
          container.items.query({ query, parameters }, options).fetchNext(),
      );

      res.json({
        items: page.items,
        count: page.items.length,
        requestCharge: page.requestCharge,
        continuationToken: page.continuationToken,
      });
    } catch (err) {
      next(err);
    }
  },
);
