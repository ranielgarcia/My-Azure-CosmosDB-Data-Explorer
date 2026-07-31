import type { StoreDetails, StoreSummary } from "@/types/siteLocation";
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

  return (await response.json()) as T;
}

export async function fetchStores(): Promise<StoreSummary[]> {
  const { stores } = await request<{ stores: StoreSummary[] }>(
    "/tables/site-location/stores",
  );
  return stores;
}

export async function fetchStore(
  partitionKey: string,
  rowKey: string,
): Promise<StoreDetails> {
  return request<StoreDetails>(
    `/tables/site-location/stores/${encodeURIComponent(partitionKey)}/${encodeURIComponent(rowKey)}`,
  );
}

export async function refreshStores(): Promise<{ count: number }> {
  return request<{ count: number }>("/tables/site-location/refresh", {
    method: "POST",
  });
}
