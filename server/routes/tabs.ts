import { Router } from "express";
import { getSession, parseSession, saveSession } from "../tabsStore.js";

export const tabsRouter = Router();

// GET /api/tabs -> { tabs: PersistedTab[], activeTabId: string | null }
tabsRouter.get("/tabs", async (_req, res, next) => {
  try {
    const session = await getSession();
    res.json(session);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tabs -> persist the full session snapshot.
tabsRouter.put("/tabs", async (req, res, next) => {
  try {
    const session = parseSession(req.body);
    if (!session) {
      res.status(400).json({
        error: "Invalid tab session payload.",
        code: 400,
      });
      return;
    }
    await saveSession(session);
    res.json(session);
  } catch (err) {
    next(err);
  }
});
