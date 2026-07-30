import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import "dotenv/config";

const { COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_AUTH_MODE } = process.env;

// Fail fast with a clear message if required env vars are missing.
if (!COSMOS_ENDPOINT) {
  throw new Error("COSMOS_ENDPOINT is required");
}
if (!COSMOS_AUTH_MODE) {
  throw new Error(
    "COSMOS_AUTH_MODE is required (connection-string | azure-cli)",
  );
}

function createClient(): CosmosClient {
  if (COSMOS_AUTH_MODE === "connection-string") {
    if (!COSMOS_KEY) {
      throw new Error(
        "COSMOS_KEY is required when COSMOS_AUTH_MODE=connection-string",
      );
    }
    return new CosmosClient({ endpoint: COSMOS_ENDPOINT!, key: COSMOS_KEY });
  }

  if (COSMOS_AUTH_MODE === "azure-cli") {
    return new CosmosClient({
      endpoint: COSMOS_ENDPOINT!,
      aadCredentials: new DefaultAzureCredential(),
    });
  }

  throw new Error(
    `Unknown COSMOS_AUTH_MODE: ${COSMOS_AUTH_MODE} (expected connection-string | azure-cli)`,
  );
}

export const cosmosClient = createClient();
