import type { QueryError, QueryResult } from "./cosmos";

export interface TabState {
  /** `${databaseId}__${containerId}` */
  id: string;
  databaseId: string;
  containerId: string;
  /** Displayed as `databaseId / containerId`. */
  label: string;
  /** Current text in the query editor. */
  query: string;
  /**
   * Cumulative results across all loaded pages. `results.requestCharge` is the
   * running total RU and `results.continuationToken` is the token for the next
   * page (null when exhausted).
   */
  results: QueryResult | null;
  error: QueryError | null;
  isLoading: boolean;
}
