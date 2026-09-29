/**
 * FitPulse sync API — Node entry point.
 *
 * Runs the Hono app on a plain node:http server (zero extra deps).
 * Env is read from the process AND from apps/api/.env when present:
 *   DATABASE_URL    postgres connection; omit → in-memory stores
 *   SYNC_API_TOKEN  enable Bearer auth on /api/v1/sync/*
 *   PORT            default 8787
 */
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { createAppFromEnv } from './index.ts';

try {
  // Node >= 20.12: load apps/api/.env when present (missing file is fine).
  process.loadEnvFile(new URL('../.env', import.meta.url));
} catch {
  /* no .env — env vars may come from the shell / hosting platform */
}

const PORT = Number(process.env.PORT || 8787);

async function requestFromNode(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? `localhost:${PORT}`;
  const url = `http://${host}${req.url ?? '/'}`;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }
  return new Request(url, { method: req.method, headers, body });
}

async function main(): Promise<void> {
  const app = await createAppFromEnv();

  const server = createServer((req, res: ServerResponse) => {
    void (async () => {
      try {
        const request = await requestFromNode(req);
        const response = await app.fetch(request);
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch (err) {
        console.error('[fitpulse-api] unhandled request error', err);
        if (!res.headersSent) res.statusCode = 500;
        res.end();
      }
    })();
  });

  server.listen(PORT, () => {
    console.log(`[fitpulse-api] listening on http://localhost:${PORT}`);
    console.log(
      process.env.SYNC_API_TOKEN
        ? '[fitpulse-api] auth: bearer (SYNC_API_TOKEN is set)'
        : '[fitpulse-api] auth: OPEN — set SYNC_API_TOKEN to protect sync endpoints',
    );
  });
}

void main();
