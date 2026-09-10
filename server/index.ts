import { randomUUID } from "node:crypto";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import { getDb } from "./db/connection.js";
import { databasesRouter } from "./routes/databases.js";
import { containersRouter } from "./routes/containers.js";
import { queryRouter } from "./routes/query.js";
import { tabsRouter } from "./routes/tabs.js";
import { savedQueriesRouter } from "./routes/savedQueries.js";
import { selectedStoreRouter } from "./routes/selectedStore.js";
import { siteLocationRouter } from "./routes/siteLocation.js";
import { stockroomZonesRouter } from "./routes/stockroomZones.js";
import { logEvent } from "./logging.js";

const PORT = Number(process.env.PORT ?? 3001);

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));
app.use((req: Request, res: Response, next: NextFunction) => {
  const suppliedRequestId = req.header("X-Request-Id");
  const requestId =
    suppliedRequestId && /^[A-Za-z0-9_-]{8,128}$/.test(suppliedRequestId)
      ? suppliedRequestId
      : randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
});

// Liveness probe. Registered before the Cosmos routers so it responds the
// moment Express binds the port, letting the client wait for the proxy to be ready.
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/api", databasesRouter);
app.use("/api", containersRouter);
app.use("/api", queryRouter);
app.use("/api", tabsRouter);
app.use("/api", savedQueriesRouter);
app.use("/api", siteLocationRouter);
app.use("/api", selectedStoreRouter);
app.use("/api", stockroomZonesRouter);

// Global error handler. Never leak raw credentials or stack traces to clients.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status =
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "number"
      ? (err as { code: number }).code
      : 500;
  const message =
    err instanceof Error ? err.message : "An unexpected error occurred.";

  logEvent({
    event: "request_failed",
    level: "error",
    requestId: res.locals.requestId as string | undefined,
    details: { status, message },
  });
  res
    .status(status >= 400 && status < 600 ? status : 500)
    .json({ error: message, code: status });
});

// Open the SQLite connection and run migrations before accepting traffic.
const startupStartedAt = performance.now();
try {
  await getDb();
} catch (err) {
  logEvent({
    event: "proxy_startup_failed",
    level: "error",
    details: {
      durationMs: Math.round(performance.now() - startupStartedAt),
      message: err instanceof Error ? err.message : String(err),
    },
  });
  process.exit(1);
}

app.listen(PORT, () => {
  logEvent({
    event: "proxy_listening",
    details: {
      port: PORT,
      durationMs: Math.round(performance.now() - startupStartedAt),
    },
  });
});
