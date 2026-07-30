import type {
  ContainerItem,
  DatabaseItem,
  QueryError,
  QueryResult,
} from "@/types/cosmos";

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

  return (await response.json()) as T;
}

export async function fetchDatabases(): Promise<DatabaseItem[]> {
  const { databases } = await request<{ databases: DatabaseItem[] }>(
    "/databases",
  );
  return databases;
}

export async function fetchContainers(dbId: string): Promise<ContainerItem[]> {
  const { containers } = await request<{ containers: ContainerItem[] }>(
    `/databases/${encodeURIComponent(dbId)}/containers`,
  );
  return containers;
}

export async function executeQuery(
  dbId: string,
  containerId: string,
  query: string,
  maxItemCount?: number,
  continuationToken?: string,
): Promise<QueryResult> {
  return request<QueryResult>(
    `/databases/${encodeURIComponent(dbId)}/containers/${encodeURIComponent(containerId)}/query`,
    {
      method: "POST",
      body: JSON.stringify({ query, maxItemCount, continuationToken }),
    },
  );
}
