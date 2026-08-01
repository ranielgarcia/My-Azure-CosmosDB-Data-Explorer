import type { NewSavedQuery, SavedQuery } from "@/types/savedQuery";
import type { QueryError } from "@/types/cosmos";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // response had no JSON body; keep the default message
    }
    const error: QueryError = { message, code: response.status };
    throw error;
  }

  // 204 No Content has no body to parse.
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function fetchSavedQueries(
  databaseId: string,
  containerId: string,
): Promise<SavedQuery[]> {
  const params = new URLSearchParams({ databaseId, containerId });
  const { queries } = await request<{ queries: SavedQuery[] }>(
    `/saved-queries?${params.toString()}`,
  );
  return queries;
}

export async function saveQuery(input: NewSavedQuery): Promise<SavedQuery> {
  return request<SavedQuery>("/saved-queries", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteSavedQuery(id: string): Promise<void> {
  await request<void>(`/saved-queries/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
