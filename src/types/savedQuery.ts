/** A saved SQL query scoped to a single database/container. Mirrors the server. */
export interface SavedQuery {
  id: string;
  databaseId: string;
  containerId: string;
  name: string;
  query: string;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
}

/** Payload sent to the server when saving a new query. */
export interface NewSavedQuery {
  databaseId: string;
  containerId: string;
  name: string;
  query: string;
}
