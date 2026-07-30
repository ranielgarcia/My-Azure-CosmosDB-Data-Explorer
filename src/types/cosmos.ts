export interface DatabaseItem {
  id: string;
}

export interface ContainerItem {
  id: string;
  partitionKeyPath: string;
}

export interface QueryResult {
  items: unknown[];
  count: number;
  requestCharge: number;
  continuationToken: string | null;
}

export interface QueryError {
  message: string;
  code?: number;
}
