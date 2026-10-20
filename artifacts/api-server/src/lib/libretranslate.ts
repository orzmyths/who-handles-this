import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { logger } from "./logger";

const LIBRETRANSLATE_PORT = 5001;
const WORKSPACE_ROOT = path.resolve(import.meta.dirname, "../../..");
const RESTART_DELAY_MS = 3_000;

export const LIBRETRANSLATE_BASE_URL = `http://127.0.0.1:${LIBRETRANSLATE_PORT}`;

let processHandle: ChildProcess | null = null;
let shuttingDown = false;
let readyUntil = 0;
let readinessProbe: Promise<boolean> | null = null;

function logImportantOutput(chunk: Buffer): void {
  const message = chunk.toString().trim();

  if (
    message.includes("Running on") ||
    message.includes("Loaded support") ||
    message.includes("Downloading") ||
    message.includes("Traceback") ||
    message.includes("ERROR")
  ) {
    logger.info({ service: "libretranslate", message }, "LibreTranslate");
  }
}

function launchLibreTranslate(): void {
  if (processHandle || shuttingDown) return;

  processHandle = spawn(
    "uv",
    [
      "run",
      "libretranslate",
      "--host",
      "127.0.0.1",
      "--port",
      String(LIBRETRANSLATE_PORT),
      "--load-only",
      "en,de,es,vi,zh,tl",
      "--update-models",
      "--disable-web-ui",
      "--disable-files-translation",
      "--threads",
      "2",
      "--batch-limit",
      "20",
      "--char-limit",
      "5000",
    ],
    {
      cwd: WORKSPACE_ROOT,
      env: {
        ...process.env,
        HOME: WORKSPACE_ROOT,
        PYTHONWARNINGS: "ignore",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  processHandle.stdout?.on("data", logImportantOutput);
  processHandle.stderr?.on("data", logImportantOutput);

  processHandle.on("error", (error) => {
    logger.error({ err: error }, "Unable to start LibreTranslate");
  });

  processHandle.on("exit", (code, signal) => {
    processHandle = null;

    if (shuttingDown) return;

    logger.warn(
      { code, signal, restartDelayMs: RESTART_DELAY_MS },
      "LibreTranslate stopped; scheduling restart",
    );
    setTimeout(launchLibreTranslate, RESTART_DELAY_MS).unref();
  });
}

export function startLibreTranslate(): void {
  launchLibreTranslate();
}

export function waitForLibreTranslate(
  timeoutMs = 90_000,
): Promise<boolean> {
  // A busy translator can occupy both workers. Do not enqueue a fresh health
  // probe for every paragraph and incorrectly declare that busy service down.
  if (Date.now() < readyUntil) return Promise.resolve(true);
  if (readinessProbe) return readinessProbe;
  readinessProbe = probeLibreTranslate(timeoutMs).finally(() => {
    readinessProbe = null;
  });
  return readinessProbe;
}

async function probeLibreTranslate(timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${LIBRETRANSLATE_BASE_URL}/languages`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) {
        readyUntil = Date.now() + 60_000;
        return true;
      }
    } catch {
      // The model service is still downloading or loading its language packs.
    }

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  return false;
}

function stopLibreTranslate(): void {
  shuttingDown = true;
  processHandle?.kill("SIGTERM");
}

process.once("SIGTERM", stopLibreTranslate);
process.once("SIGINT", stopLibreTranslate);