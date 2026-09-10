import { Router } from "express";
import { logEvent } from "../logging.js";
import {
  clearSession,
  getSession,
  parseSession,
  saveSession,
} from "../tabsStore.js";

export const tabsRouter = Router();

// GET /api/tabs -> the complete persisted tab, subtab, and pane session.
tabsRouter.get("/tabs", async (_req, res, next) => {
  const startedAt = performance.now();
  try {
    const session = await getSession({ requestId: res.locals.requestId });
    res.json(session);
    logEvent({
      event: "tab_session_get_responded",
      requestId: res.locals.requestId as string | undefined,
      details: {
        status: 200,
        durationMs: Math.round(performance.now() - startedAt),
      },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tabs -> explicitly clear the complete persisted tab session.
tabsRouter.delete("/tabs", async (_req, res, next) => {
  const startedAt = performance.now();
  try {
    await clearSession({ requestId: res.locals.requestId });
    res.status(204).end();
    logEvent({
      event: "tab_session_delete_responded",
      requestId: res.locals.requestId as string | undefined,
      details: {
        status: 204,
        durationMs: Math.round(performance.now() - startedAt),
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tabs -> persist the full session snapshot.
tabsRouter.put("/tabs", async (req, res, next) => {
  const startedAt = performance.now();
  try {
    const session = parseSession(req.body);
    if (!session) {
      logEvent({
        event: "tab_session_payload_rejected",
        level: "warn",
        requestId: res.locals.requestId as string | undefined,
        details: {
          status: 400,
          durationMs: Math.round(performance.now() - startedAt),
        },
      });
      res.status(400).json({
        error: "Invalid tab session payload.",
        code: 400,
      });
      return;
    }
    await saveSession(session, { requestId: res.locals.requestId });
    res.json(session);
    logEvent({
      event: "tab_session_put_responded",
      requestId: res.locals.requestId as string | undefined,
      details: {
        status: 200,
        durationMs: Math.round(performance.now() - startedAt),
      },
    });
  } catch (err) {
    next(err);
  }
});
