import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushLogs, logEvent, resetLogsForTests } from "./logging.js";

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "backend-logs-"));
  process.env.LOG_DIR = directory;
  await resetLogsForTests();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(async () => {
  await resetLogsForTests();
  vi.restoreAllMocks();
  delete process.env.LOG_DIR;
  delete process.env.LOG_RETENTION_DAYS;
  delete process.env.LOG_MAX_FILE_BYTES;
  await rm(directory, { recursive: true, force: true });
});

describe("local backend logging", () => {
  it("writes structured NDJSON", async () => {
    logEvent({
      event: "tab_session_loaded",
      requestId: "request-123",
      details: { tabs: 2 },
    });
    await flushLogs();

    const files = await readLogFiles();
    expect(files).toHaveLength(1);
    expect(
      JSON.parse(await readFile(join(directory, files[0]), "utf8")),
    ).toMatchObject({
      level: "info",
      event: "tab_session_loaded",
      requestId: "request-123",
      details: { tabs: 2 },
    });
  });

  it("rotates full files and removes expired files", async () => {
    process.env.LOG_MAX_FILE_BYTES = "1";
    process.env.LOG_RETENTION_DAYS = "1";
    const expired = join(directory, "backend-2020-01-01.ndjson");
    await writeFile(expired, "old\n");
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await utimes(expired, twoDaysAgo, twoDaysAgo);

    logEvent({ event: "first" });
    await flushLogs();
    await resetLogsForTests();
    logEvent({ event: "second" });
    await flushLogs();

    const files = await readLogFiles();
    expect(files).toHaveLength(2);
    expect(files.some((file) => file.includes("2020-01-01"))).toBe(false);
  });
});

async function readLogFiles(): Promise<string[]> {
  return (await readdir(directory)).filter((file) => file.endsWith(".ndjson"));
}
