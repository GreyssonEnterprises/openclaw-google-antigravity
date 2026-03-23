/**
 * openclaw-google-antigravity
 *
 * OpenClaw provider plugin for Google Antigravity — gives OpenClaw access to
 * Claude 4.6 (Opus, Sonnet) and Gemini 3.1 Pro via Google Cloud Code Assist.
 *
 * Fixes three upstream gaps in OpenClaw's google-antigravity support:
 *   Bug A — formatApiKey: produces correct { token, projectId } JSON payload
 *   Bug B — refreshOAuth: token refresh using Antigravity OAuth client credentials
 *   Bug C — augmentModelCatalog: correct contextWindow for all models
 */

import type {
  OpenClawPluginDefinition,
  ProviderAuthResult,
  ProviderAuthContext,
} from "openclaw/plugin-sdk/plugin-entry";
import type { OAuthCredential } from "openclaw/plugin-sdk/provider-auth";
import type { ProviderPlugin } from "openclaw/plugin-sdk/provider-models";
import type { AuthProfileCredential } from "openclaw/plugin-sdk/agent-runtime";

import { loginAntigravity, refreshAntigravityToken } from "@mariozechner/pi-ai/oauth";
import { withCacheInjection } from "./cache.js";

// ─── Constants ───────────────────────────────────────────────────────────────

const PROVIDER_ID = "google-antigravity";
const DEFAULT_MODEL_ID = "claude-sonnet-4-6";

// ─── Model catalog ───────────────────────────────────────────────────────────
// All confirmed google-antigravity models (from UI screenshot 2026-03-23).
// Appended via augmentModelCatalog — overrides stale contextWindow values from
// pi-ai's built-in catalog. suppressBuiltInModel is intentionally NOT used
// because it removes the model from pi-ai's runtime registry, causing
// "Unknown model" errors on every request.

const ANTIGRAVITY_MODELS = [
  // ── Claude 4.6 ────────────────────────────────────────────────────────────
  // Note: claude-sonnet-4-6 (non-thinking) is NOT available in Antigravity.
  {
    id: "claude-opus-4-6-thinking",
    name: "Claude Opus 4.6 (Thinking)",
    provider: PROVIDER_ID,
    contextWindow: 1_000_000,
    reasoning: true,
  },
  // claude-sonnet-4-6-thinking is NOT in pi-ai catalog — added fresh here.
  // OpenClaw strips the -thinking suffix and routes to claude-sonnet-4-6 base + thinking on.
  {
    id: "claude-sonnet-4-6-thinking",
    name: "Claude Sonnet 4.6 (Thinking)",
    provider: PROVIDER_ID,
    contextWindow: 1_000_000,
    reasoning: true,
  },
  // ── Gemini 3.x ────────────────────────────────────────────────────────────
  // pi-ai has these with correct contextWindow (1048576) — no suppression needed
  {
    id: "gemini-3.1-pro-high",
    name: "Gemini 3.1 Pro (High)",
    provider: PROVIDER_ID,
    contextWindow: 1_048_576,
    reasoning: true,
  },
  {
    id: "gemini-3.1-pro-low",
    name: "Gemini 3.1 Pro (Low)",
    provider: PROVIDER_ID,
    contextWindow: 1_048_576,
    reasoning: true,
  },
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: PROVIDER_ID,
    contextWindow: 1_048_576,
    reasoning: false,
  },
  // ── GPT-OSS ───────────────────────────────────────────────────────────────
  // pi-ai has this with contextWindow: 131072 which is correct
  {
    id: "gpt-oss-120b-medium",
    name: "GPT-OSS 120B (Medium)",
    provider: PROVIDER_ID,
    contextWindow: 131_072,
    reasoning: false,
  },
];


// ─── Auth run ─────────────────────────────────────────────────────────────────

async function runAntigravityOAuth(ctx: ProviderAuthContext): Promise<ProviderAuthResult> {
  const { prompter } = ctx;

  await prompter.intro("Google Antigravity OAuth");

  const progress = prompter.progress("Starting OAuth flow...");

  const credentials = await loginAntigravity(
    // onAuth: URL is ready, open browser
    async (info) => {
      progress.stop();
      await prompter.note(
        `Open this URL to authenticate with Google:\n\n${info.url}`,
        "Browser Login Required",
      );
      // Best-effort browser open — not a failure if this fails
      try {
        const { exec } = await import("node:child_process");
        const cmd =
          process.platform === "darwin"
            ? `open "${info.url}"`
            : process.platform === "win32"
              ? `start "" "${info.url}"`
              : `xdg-open "${info.url}"`;
        exec(cmd);
      } catch {
        // ignore
      }
    },
    // onProgress: status updates
    (_msg) => {
      // progress label — prompter doesn't support live updates, ignore
    },
    // onManualCodeInput: fallback for remote/headless machines
    async () => {
      return prompter.text({
        message:
          "Browser didn't open? Paste the redirect URL from your browser here:",
        placeholder: "http://localhost:51121/oauth-callback?code=...",
      });
    },
  );

  await prompter.outro(
    `Authenticated as ${credentials.email ?? "unknown"} (project: ${(credentials as Record<string, unknown>).projectId ?? "auto"})`,
  );

  const profileId = `${PROVIDER_ID}-oauth`;

  // Construct credential manually — no openclaw runtime import needed.
  // projectId is stored as an extra field (OAuthCredentials allows [key: string]: unknown).
  const credential: OAuthCredential = {
    type: "oauth",
    provider: PROVIDER_ID,
    access: credentials.access,
    refresh: credentials.refresh,
    expires: credentials.expires,
    email: typeof credentials.email === "string" ? credentials.email : undefined,
    ...(typeof (credentials as Record<string, unknown>).projectId === "string"
      ? { projectId: (credentials as Record<string, unknown>).projectId }
      : {}),
  };

  return {
    profiles: [{ profileId, credential }],
    notes: [
      `Logged in as ${credentials.email ?? "unknown"}`,
      `Models available: ${ANTIGRAVITY_MODELS.map((m) => m.id).join(", ")}`,
    ],
  } satisfies ProviderAuthResult;
}

// ─── Provider plugin definition ───────────────────────────────────────────────

const provider: ProviderPlugin = {
  id: PROVIDER_ID,
  label: "Google Antigravity",
  docsPath: "https://github.com/GreyssonEnterprises/openclaw-google-antigravity",

  auth: [
    {
      id: `${PROVIDER_ID}-oauth`,
      label: "Google Antigravity OAuth",
      hint: "Claude 4.6 (Opus, Sonnet) and Gemini 3.1 Pro via Google Cloud Code Assist",
      kind: "oauth",
      run: runAntigravityOAuth,
    },
  ],

  // Bug A fix: produce the { token, projectId } JSON that the Antigravity API expects.
  // Without this, OpenClaw sends the raw access token string and gets "Invalid credentials."
  formatApiKey(cred: AuthProfileCredential): string {
    if (cred.type !== "oauth") {
      return "";
    }
    const extra = cred as Record<string, unknown>;
    const projectId = typeof extra.projectId === "string" ? extra.projectId : "";
    return JSON.stringify({ token: cred.access, projectId });
  },

  // Bug B fix: use the Antigravity-specific OAuth client credentials for refresh.
  // Without this, token refresh fails after ~60 minutes when the access token expires.
  async refreshOAuth(cred: OAuthCredential): Promise<OAuthCredential> {
    const extra = cred as Record<string, unknown>;
    const projectId = typeof extra.projectId === "string" ? extra.projectId : "";
    if (!projectId) {
      throw new Error(
        "google-antigravity: credential is missing projectId — re-authenticate with /login",
      );
    }
    const refreshed = await refreshAntigravityToken(cred.refresh, projectId);
    return {
      ...cred,
      access: refreshed.access,
      refresh: typeof refreshed.refresh === "string" ? refreshed.refresh : cred.refresh,
      expires: refreshed.expires,
    };
  },

  // Bug C fix: provide correct contextWindow values.
  // pi-ai 0.61.1 ships stale values (200K for Claude, off-by-one for Gemini).
  // This plugin's entries are appended after discovery and win on deduplication.
  augmentModelCatalog() {
    return ANTIGRAVITY_MODELS;
  },

  // Explicit context caching via Google's cachedContents API.
  //
  // Intercepts the request payload before it's sent, checks for a valid
  // server-side cache of the system instruction, and injects the cachedContent
  // reference when available. The first request per unique system prompt is
  // always uncached (no latency impact); the cache is created asynchronously
  // and all subsequent requests benefit from it.
  //
  // Falls back to uncached operation silently on any API error (404, 400
  // min-token threshold, endpoint not supported, network failure).
  wrapStreamFn(ctx) {
    if (ctx.provider !== PROVIDER_ID) return null;
    const underlying = ctx.streamFn;
    if (!underlying) return null;

    return (model, context, options) => {
      return underlying(model, context, withCacheInjection(options, model.id));
    };
  },

  // Antigravity models use adaptive thinking by default (same as native Anthropic).
  resolveDefaultThinkingLevel(ctx) {
    if (ctx.provider !== PROVIDER_ID) return null;
    if (ctx.modelId.includes("thinking") || ctx.modelId.includes("opus")) {
      return "adaptive";
    }
    return null;
  },
};

// ─── Plugin entry point ───────────────────────────────────────────────────────

const plugin: OpenClawPluginDefinition = {
  register(api) {
    api.registerProvider(provider);
  },
};

export default plugin;
