import { TableClient } from "@azure/data-tables";
import { DefaultAzureCredential } from "@azure/identity";
import "dotenv/config";

// A shared AAD credential (azure-cli mode), created once on first use.
let credential: DefaultAzureCredential | null = null;

// Cache one TableClient per table name so repeated calls reuse a connection.
const clients = new Map<string, TableClient>();

function createClient(tableName: string): TableClient {
  const {
    TABLE_AUTH_MODE,
    AZURE_TABLE_CONNECTION_STRING,
    AZURE_TABLE_ENDPOINT,
  } = process.env;

  // Fail fast with a clear message if required env vars are missing. Validated
  // lazily (on first use) so the proxy still boots for the Cosmos routes when
  // Table Storage isn't configured.
  if (!TABLE_AUTH_MODE) {
    throw new Error(
      "TABLE_AUTH_MODE is required (connection-string | azure-cli)",
    );
  }

  if (TABLE_AUTH_MODE === "connection-string") {
    if (!AZURE_TABLE_CONNECTION_STRING) {
      throw new Error(
        "AZURE_TABLE_CONNECTION_STRING is required when TABLE_AUTH_MODE=connection-string",
      );
    }
    return TableClient.fromConnectionString(
      AZURE_TABLE_CONNECTION_STRING,
      tableName,
    );
  }

  if (TABLE_AUTH_MODE === "azure-cli") {
    if (!AZURE_TABLE_ENDPOINT) {
      throw new Error(
        "AZURE_TABLE_ENDPOINT is required when TABLE_AUTH_MODE=azure-cli",
      );
    }
    if (!credential) credential = new DefaultAzureCredential();
    return new TableClient(AZURE_TABLE_ENDPOINT, tableName, credential);
  }

  throw new Error(
    `Unknown TABLE_AUTH_MODE: ${TABLE_AUTH_MODE} (expected connection-string | azure-cli)`,
  );
}

/**
 * Return a `TableClient` bound to `tableName`, creating (and caching) it on
 * first use. Table-name agnostic — call it with any table in the account.
 */
export function getTableClient(tableName: string): TableClient {
  const cached = clients.get(tableName);
  if (cached) return cached;

  const client = createClient(tableName);
  clients.set(tableName, client);
  return client;
}
