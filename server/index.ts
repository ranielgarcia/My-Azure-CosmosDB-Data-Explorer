import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import { databasesRouter } from "./routes/databases.js";
import { containersRouter } from "./routes/containers.js";
import { queryRouter } from "./routes/query.js";
import { tabsRouter } from "./routes/tabs.js";

const PORT = Number(process.env.PORT ?? 3001);

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

// Liveness probe. Registered before the Cosmos routers so it responds the
// moment Express binds the port, letting the client wait for the proxy to be ready.
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/api", databasesRouter);
app.use("/api", containersRouter);
app.use("/api", queryRouter);
app.use("/api", tabsRouter);

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

  // eslint-disable-next-line no-console
  console.error(`[proxy error] ${status}: ${message}`);
  res
    .status(status >= 400 && status < 600 ? status : 500)
    .json({ error: message, code: status });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Cosmos proxy listening on http://localhost:${PORT}`);
});
