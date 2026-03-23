/**
 * Antigravity explicit context caching
 *
 * Google's Antigravity endpoint supports a cachedContents API that lets us
 * pre-cache the system prompt (soul.md, agents.md, OpenClaw prompt) so it
 * is not re-billed on every turn. This module manages that lifecycle:
 *
 *   1. First request: proceeds uncached (no latency impact), cache created async
 *   2. Subsequent requests: cachedContent reference injected, systemInstruction removed
 *   3. Cache expiry: transparent background recreation
 *   4. Any API failure: falls back to uncached operation silently
 *
 * The cachedContents endpoint is not officially documented for Antigravity —
 * all failure paths are handled gracefully so the plugin degrades safely.
 */

import { createHash } from "node:crypto";
import type { SimpleStreamOptions } from "@mariozechner/pi-ai";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CacheEntry = {
  name: string;        // e.g. "cachedContents/abc123xyz"
  expiresAt: number;   // ms since epoch
};

type AntigravityRequestBody = {
  project?: string;
  model?: string;
  request?: {
    systemInstruction?: unknown;
    cachedContent?: string;
    contents?: unknown;
    generationConfig?: unknown;
    tools?: unknown;
    toolConfig?: unknown;
    sessionId?: unknown;
  };
  requestType?: string;
  userAgent?: string;
  requestId?: string;
};

// ─── Cache endpoint ───────────────────────────────────────────────────────────

// Primary Antigravity endpoint — same host as inference requests
const CACHE_ENDPOINT = "https://daily-cloudcode-pa.sandbox.googleapis.com";
const CACHE_API_PATH = "/v1beta/cachedContents";

// TTL for cached content — 1 hour. Google minimum is unspecified for this
// endpoint; the standard Gemini API minimum is 32,768 tokens.
const CACHE_TTL_SECONDS = 3600;

// How long before expiry to proactively recreate the cache (5-min buffer)
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

// ─── In-memory store ──────────────────────────────────────────────────────────
// Key: SHA-256(systemInstructionJSON + "\0" + modelId)
// Recreated on OpenClaw restart — first post-restart request is uncached.

const cacheStore = new Map<string, CacheEntry>();

// Track content that permanently failed caching (e.g. below min-token threshold)
// so we don't retry on every request.
const uncacheable = new Set<string>();

// Guard against concurrent cache creation for the same key
const inFlight = new Set<string>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function contentKey(systemInstruction: unknown, modelId: string): string {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(systemInstruction));
  hash.update("\0");
  hash.update(modelId);
  return hash.digest("hex");
}

function isValid(entry: CacheEntry): boolean {
  return entry.expiresAt - EXPIRY_BUFFER_MS > Date.now();
}

function parseApiKey(apiKey: unknown): { token: string; projectId: string } | null {
  if (typeof apiKey !== "string" || !apiKey) return null;
  try {
    const parsed = JSON.parse(apiKey) as Record<string, unknown>;
    const token = typeof parsed.token === "string" ? parsed.token : null;
    const projectId = typeof parsed.projectId === "string" ? parsed.projectId : null;
    if (!token || !projectId) return null;
    return { token, projectId };
  } catch {
    return null;
  }
}

// ─── Cache creation ───────────────────────────────────────────────────────────

/**
 * POST to the Antigravity cachedContents endpoint.
 * Returns the cache resource name on success, null on any failure.
 *
 * Failure cases handled silently:
 *   - 404/405: endpoint not supported on this Antigravity host
 *   - 400: system prompt below minimum token threshold
 *   - Network errors
 *   - Any unexpected error
 */
async function createAntigravityCache(
  token: string,
  projectId: string,
  modelId: string,
  systemInstruction: unknown,
): Promise<string | null> {
  try {
    const body = JSON.stringify({
      model: `models/${modelId}`,
      systemInstruction,
      contents: [],           // No conversation turns — system prompt only
      ttl: `${CACHE_TTL_SECONDS}s`,
      // projectId is passed as a query param per Cloud Code Assist conventions
    });

    const url = `${CACHE_ENDPOINT}${CACHE_API_PATH}?project=${encodeURIComponent(projectId)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": `google-cloud-sdk vscode_cloudshelleditor/0.1`,
      },
      body,
    });

    if (!response.ok) {
      // Non-retriable failures are expected for unsupported endpoints/content
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const name = typeof data.name === "string" ? data.name : null;
    return name;
  } catch {
    return null;
  }
}

// ─── Background cache creation ────────────────────────────────────────────────

function scheduleCache(
  key: string,
  token: string,
  projectId: string,
  modelId: string,
  systemInstruction: unknown,
): void {
  if (inFlight.has(key) || uncacheable.has(key)) return;

  inFlight.add(key);

  createAntigravityCache(token, projectId, modelId, systemInstruction)
    .then((name) => {
      inFlight.delete(key);
      if (!name) {
        // Mark as permanently uncacheable so we stop retrying.
        // If the endpoint starts working later, a restart clears this.
        uncacheable.add(key);
        return;
      }
      cacheStore.set(key, {
        name,
        expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
      });
    })
    .catch(() => {
      inFlight.delete(key);
    });
}

// ─── Request injection ────────────────────────────────────────────────────────

/**
 * Wraps a SimpleStreamOptions.onPayload to inject cachedContent when available.
 *
 * Called once per inference request. The payload is the full Antigravity
 * request body produced by pi-ai's buildRequest() — we can see and modify
 * the systemInstruction before it's serialized.
 */
export function withCacheInjection(
  baseOptions: SimpleStreamOptions | undefined,
  modelId: string,
): SimpleStreamOptions {
  const originalOnPayload = baseOptions?.onPayload;

  return {
    ...baseOptions,
    onPayload: (payload: unknown, model: unknown) => {
      const body = payload as AntigravityRequestBody;
      const systemInstruction = body?.request?.systemInstruction;

      if (!systemInstruction || !body?.request) {
        // No system instruction to cache — pass through unchanged
        return originalOnPayload?.(payload, model as never);
      }

      const key = contentKey(systemInstruction, modelId);
      const existing = cacheStore.get(key);

      if (existing && isValid(existing)) {
        // Cache hit — inject reference and remove the systemInstruction
        // (it's already encoded in the cached content on the server side)
        const modifiedBody: AntigravityRequestBody = {
          ...body,
          request: {
            ...body.request,
            cachedContent: existing.name,
            systemInstruction: undefined,
          },
        };
        return originalOnPayload?.(modifiedBody, model as never) ?? modifiedBody;
      }

      // Cache miss — proceed uncached, schedule background creation
      // The token is in base64-encoded options.apiKey as { token, projectId }
      const creds = parseApiKey((baseOptions as Record<string, unknown>)?.apiKey);
      if (creds) {
        scheduleCache(key, creds.token, creds.projectId, modelId, systemInstruction);
      }

      return originalOnPayload?.(payload, model as never);
    },
  };
}
