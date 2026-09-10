import { appendFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

export type LogLevel = "debug" | "info" | "warn" | "error";
type LogValue = boolean | number | string | null;

export interface LogEvent {
  event: string;
  level?: LogLevel;
  requestId?: string;
  details?: Record<string, LogValue>;
}

interface LogConfig {
  directory: string;
  retentionDays: number;
  maxFileBytes: number;
}

const DEFAULT_RETENTION_DAYS = 30;
const DEFAULT_MAX_FILE_BYTES = 5 * 1024 * 1024;
const LOG_FILE_PREFIX = "backend-";
const LOG_FILE_SUFFIX = ".ndjson";

let writeChain: Promise<void> = Promise.resolve();
let cleanedDirectory: string | null = null;

function positiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getConfig(): LogConfig {
  return {
    directory: resolve(
      process.env.LOG_DIR ?? join(process.cwd(), "server", "data", "logs"),
    ),
    retentionDays: positiveInteger(
      process.env.LOG_RETENTION_DAYS,
      DEFAULT_RETENTION_DAYS,
    ),
    maxFileBytes: positiveInteger(
      process.env.LOG_MAX_FILE_BYTES,
      DEFAULT_MAX_FILE_BYTES,
    ),
  };
}

function currentFilePrefix(): string {
  return `${LOG_FILE_PREFIX}${new Date().toISOString().slice(0, 10)}`;
}

async function cleanupExpiredFiles(config: LogConfig): Promise<void> {
  if (cleanedDirectory === config.directory) return;
  await mkdir(config.directory, { recursive: true });
  const expiredBefore = Date.now() - config.retentionDays * 24 * 60 * 60 * 1000;
  const files = await readdir(config.directory, { withFileTypes: true });
  await Promise.all(
    files
      .filter(
        (file) =>
          file.isFile() &&
          file.name.startsWith(LOG_FILE_PREFIX) &&
          file.name.endsWith(LOG_FILE_SUFFIX),
      )
      .map(async (file) => {
        const path = join(config.directory, file.name);
        if ((await stat(path)).mtimeMs < expiredBefore) {
          await rm(path, { force: true });
        }
      }),
  );
  cleanedDirectory = config.directory;
}

async function currentLogFile(config: LogConfig): Promise<string> {
  const prefix = currentFilePrefix();
  for (let sequence = 0; ; sequence += 1) {
    const filename = `${prefix}${sequence === 0 ? "" : `-${sequence}`}${LOG_FILE_SUFFIX}`;
    const path = join(config.directory, filename);
    try {
      if ((await stat(path)).size < config.maxFileBytes) return path;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return path;
      throw error;
    }
  }
}

async function writeToFile(line: string): Promise<void> {
  const config = getConfig();
  await cleanupExpiredFiles(config);
  await appendFile(await currentLogFile(config), line, "utf8");
}

/** Emit safe, structured backend diagnostics to stdout and rolling local NDJSON files. */
export function logEvent({ level = "info", ...event }: LogEvent): void {
  const line = `${JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    ...event,
  })}\n`;
  const output = level === "error" ? console.error : console.log;
  output(line.trimEnd());

  writeChain = writeChain
    .then(() => writeToFile(line))
    .catch((error: unknown) => {
      console.error(
        `[logging] Failed to append diagnostic event: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
}

/** Wait for queued file writes. Intended for graceful shutdown and tests. */
export function flushLogs(): Promise<void> {
  return writeChain;
}

/** Reset module state between isolated tests. */
export async function resetLogsForTests(): Promise<void> {
  await flushLogs();
  writeChain = Promise.resolve();
  cleanedDirectory = null;
}
