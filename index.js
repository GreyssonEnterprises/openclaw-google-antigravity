// node_modules/@mariozechner/pi-ai/dist/utils/oauth/oauth-page.js
var LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" aria-hidden="true"><path fill="#fff" fill-rule="evenodd" d="M165.29 165.29 H517.36 V400 H400 V517.36 H282.65 V634.72 H165.29 Z M282.65 282.65 V400 H400 V282.65 Z"/><path fill="#fff" d="M517.36 400 H634.72 V634.72 H517.36 Z"/></svg>`;
function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function renderPage(options) {
  const title = escapeHtml(options.title);
  const heading = escapeHtml(options.heading);
  const message = escapeHtml(options.message);
  const details = options.details ? escapeHtml(options.details) : void 0;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root {
      --text: #fafafa;
      --text-dim: #a1a1aa;
      --page-bg: #09090b;
      --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }
    * { box-sizing: border-box; }
    html { color-scheme: dark; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: var(--page-bg);
      color: var(--text);
      font-family: var(--font-sans);
      text-align: center;
    }
    main {
      width: 100%;
      max-width: 560px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .logo {
      width: 72px;
      height: 72px;
      display: block;
      margin-bottom: 24px;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 28px;
      line-height: 1.15;
      font-weight: 650;
      color: var(--text);
    }
    p {
      margin: 0;
      line-height: 1.7;
      color: var(--text-dim);
      font-size: 15px;
    }
    .details {
      margin-top: 16px;
      font-family: var(--font-mono);
      font-size: 13px;
      color: var(--text-dim);
      white-space: pre-wrap;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <main>
    <div class="logo">${LOGO_SVG}</div>
    <h1>${heading}</h1>
    <p>${message}</p>
    ${details ? `<div class="details">${details}</div>` : ""}
  </main>
</body>
</html>`;
}
function oauthSuccessHtml(message) {
  return renderPage({
    title: "Authentication successful",
    heading: "Authentication successful",
    message
  });
}
function oauthErrorHtml(message, details) {
  return renderPage({
    title: "Authentication failed",
    heading: "Authentication failed",
    message,
    details
  });
}

// node_modules/@mariozechner/pi-ai/dist/utils/oauth/pkce.js
function base64urlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
async function generatePKCE() {
  const verifierBytes = new Uint8Array(32);
  crypto.getRandomValues(verifierBytes);
  const verifier = base64urlEncode(verifierBytes);
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const challenge = base64urlEncode(new Uint8Array(hashBuffer));
  return { verifier, challenge };
}

// node_modules/@mariozechner/pi-ai/dist/utils/oauth/anthropic.js
var nodeApis = null;
var nodeApisPromise = null;
var decode = (s) => atob(s);
var CLIENT_ID = decode("OWQxYzI1MGEtZTYxYi00NGQ5LTg4ZWQtNTk0NGQxOTYyZjVl");
var AUTHORIZE_URL = "https://claude.ai/oauth/authorize";
var TOKEN_URL = "https://platform.claude.com/v1/oauth/token";
var CALLBACK_HOST = "127.0.0.1";
var CALLBACK_PORT = 53692;
var CALLBACK_PATH = "/callback";
var REDIRECT_URI = `http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`;
var SCOPES = "org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload";
async function getNodeApis() {
  if (nodeApis)
    return nodeApis;
  if (!nodeApisPromise) {
    if (typeof process === "undefined" || !process.versions?.node && !process.versions?.bun) {
      throw new Error("Anthropic OAuth is only available in Node.js environments");
    }
    nodeApisPromise = import("http").then((httpModule) => ({
      createServer: httpModule.createServer
    }));
  }
  nodeApis = await nodeApisPromise;
  return nodeApis;
}
function parseAuthorizationInput(input) {
  const value = input.trim();
  if (!value)
    return {};
  try {
    const url = new URL(value);
    return {
      code: url.searchParams.get("code") ?? void 0,
      state: url.searchParams.get("state") ?? void 0
    };
  } catch {
  }
  if (value.includes("#")) {
    const [code, state] = value.split("#", 2);
    return { code, state };
  }
  if (value.includes("code=")) {
    const params = new URLSearchParams(value);
    return {
      code: params.get("code") ?? void 0,
      state: params.get("state") ?? void 0
    };
  }
  return { code: value };
}
function formatErrorDetails(error) {
  if (error instanceof Error) {
    const details = [`${error.name}: ${error.message}`];
    const errorWithCode = error;
    if (errorWithCode.code)
      details.push(`code=${errorWithCode.code}`);
    if (typeof errorWithCode.errno !== "undefined")
      details.push(`errno=${String(errorWithCode.errno)}`);
    if (typeof error.cause !== "undefined") {
      details.push(`cause=${formatErrorDetails(error.cause)}`);
    }
    if (error.stack) {
      details.push(`stack=${error.stack}`);
    }
    return details.join("; ");
  }
  return String(error);
}
async function startCallbackServer(expectedState) {
  const { createServer } = await getNodeApis();
  return new Promise((resolve, reject) => {
    let settleWait;
    const waitForCodePromise = new Promise((resolveWait) => {
      let settled = false;
      settleWait = (value) => {
        if (settled)
          return;
        settled = true;
        resolveWait(value);
      };
    });
    const server = createServer((req, res) => {
      try {
        const url = new URL(req.url || "", "http://localhost");
        if (url.pathname !== CALLBACK_PATH) {
          res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
          res.end(oauthErrorHtml("Callback route not found."));
          return;
        }
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        if (error) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(oauthErrorHtml("Anthropic authentication did not complete.", `Error: ${error}`));
          return;
        }
        if (!code || !state) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(oauthErrorHtml("Missing code or state parameter."));
          return;
        }
        if (state !== expectedState) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(oauthErrorHtml("State mismatch."));
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(oauthSuccessHtml("Anthropic authentication completed. You can close this window."));
        settleWait?.({ code, state });
      } catch {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Internal error");
      }
    });
    server.on("error", (err) => {
      reject(err);
    });
    server.listen(CALLBACK_PORT, CALLBACK_HOST, () => {
      resolve({
        server,
        redirectUri: REDIRECT_URI,
        cancelWait: () => {
          settleWait?.(null);
        },
        waitForCode: () => waitForCodePromise
      });
    });
  });
}
async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(3e4)
  });
  const responseBody = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP request failed. status=${response.status}; url=${url}; body=${responseBody}`);
  }
  return responseBody;
}
async function exchangeAuthorizationCode(code, state, verifier, redirectUri) {
  let responseBody;
  try {
    responseBody = await postJson(TOKEN_URL, {
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code,
      state,
      redirect_uri: redirectUri,
      code_verifier: verifier
    });
  } catch (error) {
    throw new Error(`Token exchange request failed. url=${TOKEN_URL}; redirect_uri=${redirectUri}; response_type=authorization_code; details=${formatErrorDetails(error)}`);
  }
  let tokenData;
  try {
    tokenData = JSON.parse(responseBody);
  } catch (error) {
    throw new Error(`Token exchange returned invalid JSON. url=${TOKEN_URL}; body=${responseBody}; details=${formatErrorDetails(error)}`);
  }
  return {
    refresh: tokenData.refresh_token,
    access: tokenData.access_token,
    expires: Date.now() + tokenData.expires_in * 1e3 - 5 * 60 * 1e3
  };
}
async function loginAnthropic(options) {
  const { verifier, challenge } = await generatePKCE();
  const server = await startCallbackServer(verifier);
  let code;
  let state;
  let redirectUriForExchange = REDIRECT_URI;
  try {
    const authParams = new URLSearchParams({
      code: "true",
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge: challenge,
      code_challenge_method: "S256",
      state: verifier
    });
    options.onAuth({
      url: `${AUTHORIZE_URL}?${authParams.toString()}`,
      instructions: "Complete login in your browser. If the browser is on another machine, paste the final redirect URL here."
    });
    if (options.onManualCodeInput) {
      let manualInput;
      let manualError;
      const manualPromise = options.onManualCodeInput().then((input) => {
        manualInput = input;
        server.cancelWait();
      }).catch((err) => {
        manualError = err instanceof Error ? err : new Error(String(err));
        server.cancelWait();
      });
      const result = await server.waitForCode();
      if (manualError) {
        throw manualError;
      }
      if (result?.code) {
        code = result.code;
        state = result.state;
        redirectUriForExchange = REDIRECT_URI;
      } else if (manualInput) {
        const parsed = parseAuthorizationInput(manualInput);
        if (parsed.state && parsed.state !== verifier) {
          throw new Error("OAuth state mismatch");
        }
        code = parsed.code;
        state = parsed.state ?? verifier;
      }
      if (!code) {
        await manualPromise;
        if (manualError) {
          throw manualError;
        }
        if (manualInput) {
          const parsed = parseAuthorizationInput(manualInput);
          if (parsed.state && parsed.state !== verifier) {
            throw new Error("OAuth state mismatch");
          }
          code = parsed.code;
          state = parsed.state ?? verifier;
        }
      }
    } else {
      const result = await server.waitForCode();
      if (result?.code) {
        code = result.code;
        state = result.state;
        redirectUriForExchange = REDIRECT_URI;
      }
    }
    if (!code) {
      const input = await options.onPrompt({
        message: "Paste the authorization code or full redirect URL:",
        placeholder: REDIRECT_URI
      });
      const parsed = parseAuthorizationInput(input);
      if (parsed.state && parsed.state !== verifier) {
        throw new Error("OAuth state mismatch");
      }
      code = parsed.code;
      state = parsed.state ?? verifier;
    }
    if (!code) {
      throw new Error("Missing authorization code");
    }
    if (!state) {
      throw new Error("Missing OAuth state");
    }
    options.onProgress?.("Exchanging authorization code for tokens...");
    return exchangeAuthorizationCode(code, state, verifier, redirectUriForExchange);
  } finally {
    server.server.close();
  }
}
async function refreshAnthropicToken(refreshToken) {
  let responseBody;
  try {
    responseBody = await postJson(TOKEN_URL, {
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      refresh_token: refreshToken
    });
  } catch (error) {
    throw new Error(`Anthropic token refresh request failed. url=${TOKEN_URL}; details=${formatErrorDetails(error)}`);
  }
  let data;
  try {
    data = JSON.parse(responseBody);
  } catch (error) {
    throw new Error(`Anthropic token refresh returned invalid JSON. url=${TOKEN_URL}; body=${responseBody}; details=${formatErrorDetails(error)}`);
  }
  return {
    refresh: data.refresh_token,
    access: data.access_token,
    expires: Date.now() + data.expires_in * 1e3 - 5 * 60 * 1e3
  };
}
var anthropicOAuthProvider = {
  id: "anthropic",
  name: "Anthropic (Claude Pro/Max)",
  usesCallbackServer: true,
  async login(callbacks) {
    return loginAnthropic({
      onAuth: callbacks.onAuth,
      onPrompt: callbacks.onPrompt,
      onProgress: callbacks.onProgress,
      onManualCodeInput: callbacks.onManualCodeInput
    });
  },
  async refreshToken(credentials) {
    return refreshAnthropicToken(credentials.refresh);
  },
  getApiKey(credentials) {
    return credentials.access;
  }
};

// node_modules/@mariozechner/pi-ai/dist/models.generated.js
var MODELS = {
  "amazon-bedrock": {
    "amazon.nova-2-lite-v1:0": {
      id: "amazon.nova-2-lite-v1:0",
      name: "Nova 2 Lite",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.33,
        output: 2.75,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "amazon.nova-lite-v1:0": {
      id: "amazon.nova-lite-v1:0",
      name: "Nova Lite",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.06,
        output: 0.24,
        cacheRead: 0.015,
        cacheWrite: 0
      },
      contextWindow: 3e5,
      maxTokens: 8192
    },
    "amazon.nova-micro-v1:0": {
      id: "amazon.nova-micro-v1:0",
      name: "Nova Micro",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.035,
        output: 0.14,
        cacheRead: 875e-5,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 8192
    },
    "amazon.nova-premier-v1:0": {
      id: "amazon.nova-premier-v1:0",
      name: "Nova Premier",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2.5,
        output: 12.5,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 16384
    },
    "amazon.nova-pro-v1:0": {
      id: "amazon.nova-pro-v1:0",
      name: "Nova Pro",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.8,
        output: 3.2,
        cacheRead: 0.2,
        cacheWrite: 0
      },
      contextWindow: 3e5,
      maxTokens: 8192
    },
    "anthropic.claude-3-5-haiku-20241022-v1:0": {
      id: "anthropic.claude-3-5-haiku-20241022-v1:0",
      name: "Claude Haiku 3.5",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.8,
        output: 4,
        cacheRead: 0.08,
        cacheWrite: 1
      },
      contextWindow: 2e5,
      maxTokens: 8192
    },
    "anthropic.claude-3-5-sonnet-20240620-v1:0": {
      id: "anthropic.claude-3-5-sonnet-20240620-v1:0",
      name: "Claude Sonnet 3.5",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 8192
    },
    "anthropic.claude-3-5-sonnet-20241022-v2:0": {
      id: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      name: "Claude Sonnet 3.5 v2",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 8192
    },
    "anthropic.claude-3-7-sonnet-20250219-v1:0": {
      id: "anthropic.claude-3-7-sonnet-20250219-v1:0",
      name: "Claude Sonnet 3.7",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 8192
    },
    "anthropic.claude-3-haiku-20240307-v1:0": {
      id: "anthropic.claude-3-haiku-20240307-v1:0",
      name: "Claude Haiku 3",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.25,
        output: 1.25,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 4096
    },
    "anthropic.claude-haiku-4-5-20251001-v1:0": {
      id: "anthropic.claude-haiku-4-5-20251001-v1:0",
      name: "Claude Haiku 4.5",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1,
        output: 5,
        cacheRead: 0.1,
        cacheWrite: 1.25
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "anthropic.claude-opus-4-1-20250805-v1:0": {
      id: "anthropic.claude-opus-4-1-20250805-v1:0",
      name: "Claude Opus 4.1",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 75,
        cacheRead: 1.5,
        cacheWrite: 18.75
      },
      contextWindow: 2e5,
      maxTokens: 32e3
    },
    "anthropic.claude-opus-4-20250514-v1:0": {
      id: "anthropic.claude-opus-4-20250514-v1:0",
      name: "Claude Opus 4",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 75,
        cacheRead: 1.5,
        cacheWrite: 18.75
      },
      contextWindow: 2e5,
      maxTokens: 32e3
    },
    "anthropic.claude-opus-4-5-20251101-v1:0": {
      id: "anthropic.claude-opus-4-5-20251101-v1:0",
      name: "Claude Opus 4.5",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 0.5,
        cacheWrite: 6.25
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "anthropic.claude-opus-4-6-v1": {
      id: "anthropic.claude-opus-4-6-v1",
      name: "Claude Opus 4.6",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 0.5,
        cacheWrite: 6.25
      },
      contextWindow: 1e6,
      maxTokens: 128e3
    },
    "anthropic.claude-sonnet-4-20250514-v1:0": {
      id: "anthropic.claude-sonnet-4-20250514-v1:0",
      name: "Claude Sonnet 4",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "anthropic.claude-sonnet-4-5-20250929-v1:0": {
      id: "anthropic.claude-sonnet-4-5-20250929-v1:0",
      name: "Claude Sonnet 4.5",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "anthropic.claude-sonnet-4-6": {
      id: "anthropic.claude-sonnet-4-6",
      name: "Claude Sonnet 4.6",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 1e6,
      maxTokens: 64e3
    },
    "deepseek.r1-v1:0": {
      id: "deepseek.r1-v1:0",
      name: "DeepSeek-R1",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1.35,
        output: 5.4,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 32768
    },
    "deepseek.v3-v1:0": {
      id: "deepseek.v3-v1:0",
      name: "DeepSeek-V3.1",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.58,
        output: 1.68,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 163840,
      maxTokens: 81920
    },
    "deepseek.v3.2": {
      id: "deepseek.v3.2",
      name: "DeepSeek-V3.2",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.62,
        output: 1.85,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 163840,
      maxTokens: 81920
    },
    "eu.anthropic.claude-haiku-4-5-20251001-v1:0": {
      id: "eu.anthropic.claude-haiku-4-5-20251001-v1:0",
      name: "Claude Haiku 4.5 (EU)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1,
        output: 5,
        cacheRead: 0.1,
        cacheWrite: 1.25
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "eu.anthropic.claude-opus-4-5-20251101-v1:0": {
      id: "eu.anthropic.claude-opus-4-5-20251101-v1:0",
      name: "Claude Opus 4.5 (EU)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 0.5,
        cacheWrite: 6.25
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "eu.anthropic.claude-opus-4-6-v1": {
      id: "eu.anthropic.claude-opus-4-6-v1",
      name: "Claude Opus 4.6 (EU)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 0.5,
        cacheWrite: 6.25
      },
      contextWindow: 1e6,
      maxTokens: 128e3
    },
    "eu.anthropic.claude-sonnet-4-20250514-v1:0": {
      id: "eu.anthropic.claude-sonnet-4-20250514-v1:0",
      name: "Claude Sonnet 4 (EU)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "eu.anthropic.claude-sonnet-4-5-20250929-v1:0": {
      id: "eu.anthropic.claude-sonnet-4-5-20250929-v1:0",
      name: "Claude Sonnet 4.5 (EU)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "eu.anthropic.claude-sonnet-4-6": {
      id: "eu.anthropic.claude-sonnet-4-6",
      name: "Claude Sonnet 4.6 (EU)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 1e6,
      maxTokens: 64e3
    },
    "global.anthropic.claude-haiku-4-5-20251001-v1:0": {
      id: "global.anthropic.claude-haiku-4-5-20251001-v1:0",
      name: "Claude Haiku 4.5 (Global)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1,
        output: 5,
        cacheRead: 0.1,
        cacheWrite: 1.25
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "global.anthropic.claude-opus-4-5-20251101-v1:0": {
      id: "global.anthropic.claude-opus-4-5-20251101-v1:0",
      name: "Claude Opus 4.5 (Global)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 0.5,
        cacheWrite: 6.25
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "global.anthropic.claude-opus-4-6-v1": {
      id: "global.anthropic.claude-opus-4-6-v1",
      name: "Claude Opus 4.6 (Global)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 0.5,
        cacheWrite: 6.25
      },
      contextWindow: 1e6,
      maxTokens: 128e3
    },
    "global.anthropic.claude-sonnet-4-20250514-v1:0": {
      id: "global.anthropic.claude-sonnet-4-20250514-v1:0",
      name: "Claude Sonnet 4 (Global)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "global.anthropic.claude-sonnet-4-5-20250929-v1:0": {
      id: "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
      name: "Claude Sonnet 4.5 (Global)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "global.anthropic.claude-sonnet-4-6": {
      id: "global.anthropic.claude-sonnet-4-6",
      name: "Claude Sonnet 4.6 (Global)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 1e6,
      maxTokens: 64e3
    },
    "google.gemma-3-27b-it": {
      id: "google.gemma-3-27b-it",
      name: "Google Gemma 3 27B Instruct",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.12,
        output: 0.2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 202752,
      maxTokens: 8192
    },
    "google.gemma-3-4b-it": {
      id: "google.gemma-3-4b-it",
      name: "Gemma 3 4B IT",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.04,
        output: 0.08,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "meta.llama3-1-405b-instruct-v1:0": {
      id: "meta.llama3-1-405b-instruct-v1:0",
      name: "Llama 3.1 405B Instruct",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 2.4,
        output: 2.4,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "meta.llama3-1-70b-instruct-v1:0": {
      id: "meta.llama3-1-70b-instruct-v1:0",
      name: "Llama 3.1 70B Instruct",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.72,
        output: 0.72,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "meta.llama3-1-8b-instruct-v1:0": {
      id: "meta.llama3-1-8b-instruct-v1:0",
      name: "Llama 3.1 8B Instruct",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.22,
        output: 0.22,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "meta.llama3-2-11b-instruct-v1:0": {
      id: "meta.llama3-2-11b-instruct-v1:0",
      name: "Llama 3.2 11B Instruct",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.16,
        output: 0.16,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "meta.llama3-2-1b-instruct-v1:0": {
      id: "meta.llama3-2-1b-instruct-v1:0",
      name: "Llama 3.2 1B Instruct",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.1,
        output: 0.1,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131e3,
      maxTokens: 4096
    },
    "meta.llama3-2-3b-instruct-v1:0": {
      id: "meta.llama3-2-3b-instruct-v1:0",
      name: "Llama 3.2 3B Instruct",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.15,
        output: 0.15,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131e3,
      maxTokens: 4096
    },
    "meta.llama3-2-90b-instruct-v1:0": {
      id: "meta.llama3-2-90b-instruct-v1:0",
      name: "Llama 3.2 90B Instruct",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.72,
        output: 0.72,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "meta.llama3-3-70b-instruct-v1:0": {
      id: "meta.llama3-3-70b-instruct-v1:0",
      name: "Llama 3.3 70B Instruct",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.72,
        output: 0.72,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "meta.llama4-maverick-17b-instruct-v1:0": {
      id: "meta.llama4-maverick-17b-instruct-v1:0",
      name: "Llama 4 Maverick 17B Instruct",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.24,
        output: 0.97,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 16384
    },
    "meta.llama4-scout-17b-instruct-v1:0": {
      id: "meta.llama4-scout-17b-instruct-v1:0",
      name: "Llama 4 Scout 17B Instruct",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.17,
        output: 0.66,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 35e5,
      maxTokens: 16384
    },
    "minimax.minimax-m2": {
      id: "minimax.minimax-m2",
      name: "MiniMax M2",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 204608,
      maxTokens: 128e3
    },
    "minimax.minimax-m2.1": {
      id: "minimax.minimax-m2.1",
      name: "MiniMax M2.1",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "mistral.devstral-2-123b": {
      id: "mistral.devstral-2-123b",
      name: "Devstral 2 123B",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.4,
        output: 2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 8192
    },
    "mistral.magistral-small-2509": {
      id: "mistral.magistral-small-2509",
      name: "Magistral Small 1.2",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.5,
        output: 1.5,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4e4
    },
    "mistral.ministral-3-14b-instruct": {
      id: "mistral.ministral-3-14b-instruct",
      name: "Ministral 14B 3.0",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.2,
        output: 0.2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "mistral.ministral-3-3b-instruct": {
      id: "mistral.ministral-3-3b-instruct",
      name: "Ministral 3 3B",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.1,
        output: 0.1,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 8192
    },
    "mistral.ministral-3-8b-instruct": {
      id: "mistral.ministral-3-8b-instruct",
      name: "Ministral 3 8B",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.15,
        output: 0.15,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "mistral.mistral-large-3-675b-instruct": {
      id: "mistral.mistral-large-3-675b-instruct",
      name: "Mistral Large 3",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.5,
        output: 1.5,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 8192
    },
    "mistral.pixtral-large-2502-v1:0": {
      id: "mistral.pixtral-large-2502-v1:0",
      name: "Pixtral Large (25.02)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 8192
    },
    "mistral.voxtral-mini-3b-2507": {
      id: "mistral.voxtral-mini-3b-2507",
      name: "Voxtral Mini 3B 2507",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.04,
        output: 0.04,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "mistral.voxtral-small-24b-2507": {
      id: "mistral.voxtral-small-24b-2507",
      name: "Voxtral Small 24B 2507",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.15,
        output: 0.35,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 32e3,
      maxTokens: 8192
    },
    "moonshot.kimi-k2-thinking": {
      id: "moonshot.kimi-k2-thinking",
      name: "Kimi K2 Thinking",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.5,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 256e3
    },
    "moonshotai.kimi-k2.5": {
      id: "moonshotai.kimi-k2.5",
      name: "Kimi K2.5",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.6,
        output: 3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 256e3
    },
    "nvidia.nemotron-nano-12b-v2": {
      id: "nvidia.nemotron-nano-12b-v2",
      name: "NVIDIA Nemotron Nano 12B v2 VL BF16",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.2,
        output: 0.6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "nvidia.nemotron-nano-3-30b": {
      id: "nvidia.nemotron-nano-3-30b",
      name: "NVIDIA Nemotron Nano 3 30B",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.06,
        output: 0.24,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "nvidia.nemotron-nano-9b-v2": {
      id: "nvidia.nemotron-nano-9b-v2",
      name: "NVIDIA Nemotron Nano 9B v2",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.06,
        output: 0.23,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "openai.gpt-oss-120b-1:0": {
      id: "openai.gpt-oss-120b-1:0",
      name: "gpt-oss-120b",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "openai.gpt-oss-20b-1:0": {
      id: "openai.gpt-oss-20b-1:0",
      name: "gpt-oss-20b",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.07,
        output: 0.3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "openai.gpt-oss-safeguard-120b": {
      id: "openai.gpt-oss-safeguard-120b",
      name: "GPT OSS Safeguard 120B",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "openai.gpt-oss-safeguard-20b": {
      id: "openai.gpt-oss-safeguard-20b",
      name: "GPT OSS Safeguard 20B",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.07,
        output: 0.2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "qwen.qwen3-235b-a22b-2507-v1:0": {
      id: "qwen.qwen3-235b-a22b-2507-v1:0",
      name: "Qwen3 235B A22B 2507",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.22,
        output: 0.88,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 131072
    },
    "qwen.qwen3-32b-v1:0": {
      id: "qwen.qwen3-32b-v1:0",
      name: "Qwen3 32B (dense)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 16384,
      maxTokens: 16384
    },
    "qwen.qwen3-coder-30b-a3b-v1:0": {
      id: "qwen.qwen3-coder-30b-a3b-v1:0",
      name: "Qwen3 Coder 30B A3B Instruct",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 131072
    },
    "qwen.qwen3-coder-480b-a35b-v1:0": {
      id: "qwen.qwen3-coder-480b-a35b-v1:0",
      name: "Qwen3 Coder 480B A35B Instruct",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.22,
        output: 1.8,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 65536
    },
    "qwen.qwen3-next-80b-a3b": {
      id: "qwen.qwen3-next-80b-a3b",
      name: "Qwen/Qwen3-Next-80B-A3B-Instruct",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.14,
        output: 1.4,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262e3,
      maxTokens: 262e3
    },
    "qwen.qwen3-vl-235b-a22b": {
      id: "qwen.qwen3-vl-235b-a22b",
      name: "Qwen/Qwen3-VL-235B-A22B-Instruct",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.3,
        output: 1.5,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262e3,
      maxTokens: 262e3
    },
    "us.anthropic.claude-haiku-4-5-20251001-v1:0": {
      id: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
      name: "Claude Haiku 4.5 (US)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1,
        output: 5,
        cacheRead: 0.1,
        cacheWrite: 1.25
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "us.anthropic.claude-opus-4-1-20250805-v1:0": {
      id: "us.anthropic.claude-opus-4-1-20250805-v1:0",
      name: "Claude Opus 4.1 (US)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 75,
        cacheRead: 1.5,
        cacheWrite: 18.75
      },
      contextWindow: 2e5,
      maxTokens: 32e3
    },
    "us.anthropic.claude-opus-4-20250514-v1:0": {
      id: "us.anthropic.claude-opus-4-20250514-v1:0",
      name: "Claude Opus 4 (US)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 75,
        cacheRead: 1.5,
        cacheWrite: 18.75
      },
      contextWindow: 2e5,
      maxTokens: 32e3
    },
    "us.anthropic.claude-opus-4-5-20251101-v1:0": {
      id: "us.anthropic.claude-opus-4-5-20251101-v1:0",
      name: "Claude Opus 4.5 (US)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 0.5,
        cacheWrite: 6.25
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "us.anthropic.claude-opus-4-6-v1": {
      id: "us.anthropic.claude-opus-4-6-v1",
      name: "Claude Opus 4.6 (US)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 0.5,
        cacheWrite: 6.25
      },
      contextWindow: 1e6,
      maxTokens: 128e3
    },
    "us.anthropic.claude-sonnet-4-20250514-v1:0": {
      id: "us.anthropic.claude-sonnet-4-20250514-v1:0",
      name: "Claude Sonnet 4 (US)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "us.anthropic.claude-sonnet-4-5-20250929-v1:0": {
      id: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
      name: "Claude Sonnet 4.5 (US)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "us.anthropic.claude-sonnet-4-6": {
      id: "us.anthropic.claude-sonnet-4-6",
      name: "Claude Sonnet 4.6 (US)",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 1e6,
      maxTokens: 64e3
    },
    "writer.palmyra-x4-v1:0": {
      id: "writer.palmyra-x4-v1:0",
      name: "Palmyra X4",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 2.5,
        output: 10,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 122880,
      maxTokens: 8192
    },
    "writer.palmyra-x5-v1:0": {
      id: "writer.palmyra-x5-v1:0",
      name: "Palmyra X5",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 104e4,
      maxTokens: 8192
    },
    "zai.glm-4.7": {
      id: "zai.glm-4.7",
      name: "GLM-4.7",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "zai.glm-4.7-flash": {
      id: "zai.glm-4.7-flash",
      name: "GLM-4.7-Flash",
      api: "bedrock-converse-stream",
      provider: "amazon-bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.07,
        output: 0.4,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 131072
    }
  },
  "anthropic": {
    "claude-3-5-haiku-20241022": {
      id: "claude-3-5-haiku-20241022",
      name: "Claude Haiku 3.5",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.8,
        output: 4,
        cacheRead: 0.08,
        cacheWrite: 1
      },
      contextWindow: 2e5,
      maxTokens: 8192
    },
    "claude-3-5-haiku-latest": {
      id: "claude-3-5-haiku-latest",
      name: "Claude Haiku 3.5 (latest)",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.8,
        output: 4,
        cacheRead: 0.08,
        cacheWrite: 1
      },
      contextWindow: 2e5,
      maxTokens: 8192
    },
    "claude-3-5-sonnet-20240620": {
      id: "claude-3-5-sonnet-20240620",
      name: "Claude Sonnet 3.5",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 8192
    },
    "claude-3-5-sonnet-20241022": {
      id: "claude-3-5-sonnet-20241022",
      name: "Claude Sonnet 3.5 v2",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 8192
    },
    "claude-3-7-sonnet-20250219": {
      id: "claude-3-7-sonnet-20250219",
      name: "Claude Sonnet 3.7",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "claude-3-7-sonnet-latest": {
      id: "claude-3-7-sonnet-latest",
      name: "Claude Sonnet 3.7 (latest)",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "claude-3-haiku-20240307": {
      id: "claude-3-haiku-20240307",
      name: "Claude Haiku 3",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.25,
        output: 1.25,
        cacheRead: 0.03,
        cacheWrite: 0.3
      },
      contextWindow: 2e5,
      maxTokens: 4096
    },
    "claude-3-opus-20240229": {
      id: "claude-3-opus-20240229",
      name: "Claude Opus 3",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 75,
        cacheRead: 1.5,
        cacheWrite: 18.75
      },
      contextWindow: 2e5,
      maxTokens: 4096
    },
    "claude-3-sonnet-20240229": {
      id: "claude-3-sonnet-20240229",
      name: "Claude Sonnet 3",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 0.3
      },
      contextWindow: 2e5,
      maxTokens: 4096
    },
    "claude-haiku-4-5": {
      id: "claude-haiku-4-5",
      name: "Claude Haiku 4.5 (latest)",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1,
        output: 5,
        cacheRead: 0.1,
        cacheWrite: 1.25
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "claude-haiku-4-5-20251001": {
      id: "claude-haiku-4-5-20251001",
      name: "Claude Haiku 4.5",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1,
        output: 5,
        cacheRead: 0.1,
        cacheWrite: 1.25
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "claude-opus-4-0": {
      id: "claude-opus-4-0",
      name: "Claude Opus 4 (latest)",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 75,
        cacheRead: 1.5,
        cacheWrite: 18.75
      },
      contextWindow: 2e5,
      maxTokens: 32e3
    },
    "claude-opus-4-1": {
      id: "claude-opus-4-1",
      name: "Claude Opus 4.1 (latest)",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 75,
        cacheRead: 1.5,
        cacheWrite: 18.75
      },
      contextWindow: 2e5,
      maxTokens: 32e3
    },
    "claude-opus-4-1-20250805": {
      id: "claude-opus-4-1-20250805",
      name: "Claude Opus 4.1",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 75,
        cacheRead: 1.5,
        cacheWrite: 18.75
      },
      contextWindow: 2e5,
      maxTokens: 32e3
    },
    "claude-opus-4-20250514": {
      id: "claude-opus-4-20250514",
      name: "Claude Opus 4",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 75,
        cacheRead: 1.5,
        cacheWrite: 18.75
      },
      contextWindow: 2e5,
      maxTokens: 32e3
    },
    "claude-opus-4-5": {
      id: "claude-opus-4-5",
      name: "Claude Opus 4.5 (latest)",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 0.5,
        cacheWrite: 6.25
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "claude-opus-4-5-20251101": {
      id: "claude-opus-4-5-20251101",
      name: "Claude Opus 4.5",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 0.5,
        cacheWrite: 6.25
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "claude-opus-4-6": {
      id: "claude-opus-4-6",
      name: "Claude Opus 4.6",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 0.5,
        cacheWrite: 6.25
      },
      contextWindow: 1e6,
      maxTokens: 128e3
    },
    "claude-sonnet-4-0": {
      id: "claude-sonnet-4-0",
      name: "Claude Sonnet 4 (latest)",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "claude-sonnet-4-20250514": {
      id: "claude-sonnet-4-20250514",
      name: "Claude Sonnet 4",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "claude-sonnet-4-5": {
      id: "claude-sonnet-4-5",
      name: "Claude Sonnet 4.5 (latest)",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "claude-sonnet-4-5-20250929": {
      id: "claude-sonnet-4-5-20250929",
      name: "Claude Sonnet 4.5",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "claude-sonnet-4-6": {
      id: "claude-sonnet-4-6",
      name: "Claude Sonnet 4.6",
      api: "anthropic-messages",
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 1e6,
      maxTokens: 64e3
    }
  },
  "azure-openai-responses": {
    "codex-mini-latest": {
      id: "codex-mini-latest",
      name: "Codex Mini",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1.5,
        output: 6,
        cacheRead: 0.375,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "gpt-4": {
      id: "gpt-4",
      name: "GPT-4",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 30,
        output: 60,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 8192,
      maxTokens: 8192
    },
    "gpt-4-turbo": {
      id: "gpt-4-turbo",
      name: "GPT-4 Turbo",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 10,
        output: 30,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "gpt-4.1": {
      id: "gpt-4.1",
      name: "GPT-4.1",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 8,
        cacheRead: 0.5,
        cacheWrite: 0
      },
      contextWindow: 1047576,
      maxTokens: 32768
    },
    "gpt-4.1-mini": {
      id: "gpt-4.1-mini",
      name: "GPT-4.1 mini",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.4,
        output: 1.6,
        cacheRead: 0.1,
        cacheWrite: 0
      },
      contextWindow: 1047576,
      maxTokens: 32768
    },
    "gpt-4.1-nano": {
      id: "gpt-4.1-nano",
      name: "GPT-4.1 nano",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.1,
        output: 0.4,
        cacheRead: 0.03,
        cacheWrite: 0
      },
      contextWindow: 1047576,
      maxTokens: 32768
    },
    "gpt-4o": {
      id: "gpt-4o",
      name: "GPT-4o",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2.5,
        output: 10,
        cacheRead: 1.25,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "gpt-4o-2024-05-13": {
      id: "gpt-4o-2024-05-13",
      name: "GPT-4o (2024-05-13)",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 15,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "gpt-4o-2024-08-06": {
      id: "gpt-4o-2024-08-06",
      name: "GPT-4o (2024-08-06)",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2.5,
        output: 10,
        cacheRead: 1.25,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "gpt-4o-2024-11-20": {
      id: "gpt-4o-2024-11-20",
      name: "GPT-4o (2024-11-20)",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2.5,
        output: 10,
        cacheRead: 1.25,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "gpt-4o-mini": {
      id: "gpt-4o-mini",
      name: "GPT-4o mini",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0.08,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "gpt-5": {
      id: "gpt-5",
      name: "GPT-5",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5-chat-latest": {
      id: "gpt-5-chat-latest",
      name: "GPT-5 Chat Latest",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "gpt-5-codex": {
      id: "gpt-5-codex",
      name: "GPT-5-Codex",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5-mini": {
      id: "gpt-5-mini",
      name: "GPT-5 Mini",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.25,
        output: 2,
        cacheRead: 0.025,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5-nano": {
      id: "gpt-5-nano",
      name: "GPT-5 Nano",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.05,
        output: 0.4,
        cacheRead: 5e-3,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5-pro": {
      id: "gpt-5-pro",
      name: "GPT-5 Pro",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 120,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 272e3
    },
    "gpt-5.1": {
      id: "gpt-5.1",
      name: "GPT-5.1",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.13,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.1-chat-latest": {
      id: "gpt-5.1-chat-latest",
      name: "GPT-5.1 Chat",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "gpt-5.1-codex": {
      id: "gpt-5.1-codex",
      name: "GPT-5.1 Codex",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.1-codex-max": {
      id: "gpt-5.1-codex-max",
      name: "GPT-5.1 Codex Max",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.1-codex-mini": {
      id: "gpt-5.1-codex-mini",
      name: "GPT-5.1 Codex mini",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.25,
        output: 2,
        cacheRead: 0.025,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.2": {
      id: "gpt-5.2",
      name: "GPT-5.2",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.2-chat-latest": {
      id: "gpt-5.2-chat-latest",
      name: "GPT-5.2 Chat",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "gpt-5.2-codex": {
      id: "gpt-5.2-codex",
      name: "GPT-5.2 Codex",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.2-pro": {
      id: "gpt-5.2-pro",
      name: "GPT-5.2 Pro",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 21,
        output: 168,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.3-codex": {
      id: "gpt-5.3-codex",
      name: "GPT-5.3 Codex",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.3-codex-spark": {
      id: "gpt-5.3-codex-spark",
      name: "GPT-5.3 Codex Spark",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 32e3
    },
    "gpt-5.4": {
      id: "gpt-5.4",
      name: "GPT-5.4",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2.5,
        output: 15,
        cacheRead: 0.25,
        cacheWrite: 0
      },
      contextWindow: 272e3,
      maxTokens: 128e3
    },
    "gpt-5.4-mini": {
      id: "gpt-5.4-mini",
      name: "GPT-5.4 mini",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.75,
        output: 4.5,
        cacheRead: 0.075,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.4-nano": {
      id: "gpt-5.4-nano",
      name: "GPT-5.4 nano",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.2,
        output: 1.25,
        cacheRead: 0.02,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.4-pro": {
      id: "gpt-5.4-pro",
      name: "GPT-5.4 Pro",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 30,
        output: 180,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 105e4,
      maxTokens: 128e3
    },
    "o1": {
      id: "o1",
      name: "o1",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 60,
        cacheRead: 7.5,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "o1-pro": {
      id: "o1-pro",
      name: "o1-pro",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 150,
        output: 600,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "o3": {
      id: "o3",
      name: "o3",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 8,
        cacheRead: 0.5,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "o3-deep-research": {
      id: "o3-deep-research",
      name: "o3-deep-research",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 10,
        output: 40,
        cacheRead: 2.5,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "o3-mini": {
      id: "o3-mini",
      name: "o3-mini",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1.1,
        output: 4.4,
        cacheRead: 0.55,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "o3-pro": {
      id: "o3-pro",
      name: "o3-pro",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 20,
        output: 80,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "o4-mini": {
      id: "o4-mini",
      name: "o4-mini",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.1,
        output: 4.4,
        cacheRead: 0.28,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "o4-mini-deep-research": {
      id: "o4-mini-deep-research",
      name: "o4-mini-deep-research",
      api: "azure-openai-responses",
      provider: "azure-openai-responses",
      baseUrl: "",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 8,
        cacheRead: 0.5,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    }
  },
  "cerebras": {
    "gpt-oss-120b": {
      id: "gpt-oss-120b",
      name: "GPT OSS 120B",
      api: "openai-completions",
      provider: "cerebras",
      baseUrl: "https://api.cerebras.ai/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.25,
        output: 0.69,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 32768
    },
    "llama3.1-8b": {
      id: "llama3.1-8b",
      name: "Llama 3.1 8B",
      api: "openai-completions",
      provider: "cerebras",
      baseUrl: "https://api.cerebras.ai/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.1,
        output: 0.1,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 32e3,
      maxTokens: 8e3
    },
    "qwen-3-235b-a22b-instruct-2507": {
      id: "qwen-3-235b-a22b-instruct-2507",
      name: "Qwen 3 235B Instruct",
      api: "openai-completions",
      provider: "cerebras",
      baseUrl: "https://api.cerebras.ai/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 1.2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131e3,
      maxTokens: 32e3
    },
    "zai-glm-4.7": {
      id: "zai-glm-4.7",
      name: "Z.AI GLM-4.7",
      api: "openai-completions",
      provider: "cerebras",
      baseUrl: "https://api.cerebras.ai/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 2.25,
        output: 2.75,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4e4
    }
  },
  "github-copilot": {
    "claude-haiku-4.5": {
      id: "claude-haiku-4.5",
      name: "Claude Haiku 4.5",
      api: "anthropic-messages",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 32e3
    },
    "claude-opus-4.5": {
      id: "claude-opus-4.5",
      name: "Claude Opus 4.5",
      api: "anthropic-messages",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 32e3
    },
    "claude-opus-4.6": {
      id: "claude-opus-4.6",
      name: "Claude Opus 4.6",
      api: "anthropic-messages",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 64e3
    },
    "claude-sonnet-4": {
      id: "claude-sonnet-4",
      name: "Claude Sonnet 4",
      api: "anthropic-messages",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16e3
    },
    "claude-sonnet-4.5": {
      id: "claude-sonnet-4.5",
      name: "Claude Sonnet 4.5",
      api: "anthropic-messages",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 32e3
    },
    "claude-sonnet-4.6": {
      id: "claude-sonnet-4.6",
      name: "Claude Sonnet 4.6",
      api: "anthropic-messages",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 32e3
    },
    "gemini-2.5-pro": {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      api: "openai-completions",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      compat: { "supportsStore": false, "supportsDeveloperRole": false, "supportsReasoningEffort": false },
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 64e3
    },
    "gemini-3-flash-preview": {
      id: "gemini-3-flash-preview",
      name: "Gemini 3 Flash",
      api: "openai-completions",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      compat: { "supportsStore": false, "supportsDeveloperRole": false, "supportsReasoningEffort": false },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 64e3
    },
    "gemini-3-pro-preview": {
      id: "gemini-3-pro-preview",
      name: "Gemini 3 Pro Preview",
      api: "openai-completions",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      compat: { "supportsStore": false, "supportsDeveloperRole": false, "supportsReasoningEffort": false },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 64e3
    },
    "gemini-3.1-pro-preview": {
      id: "gemini-3.1-pro-preview",
      name: "Gemini 3.1 Pro Preview",
      api: "openai-completions",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      compat: { "supportsStore": false, "supportsDeveloperRole": false, "supportsReasoningEffort": false },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 64e3
    },
    "gpt-4.1": {
      id: "gpt-4.1",
      name: "GPT-4.1",
      api: "openai-completions",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      compat: { "supportsStore": false, "supportsDeveloperRole": false, "supportsReasoningEffort": false },
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 64e3,
      maxTokens: 16384
    },
    "gpt-4o": {
      id: "gpt-4o",
      name: "GPT-4o",
      api: "openai-completions",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      compat: { "supportsStore": false, "supportsDeveloperRole": false, "supportsReasoningEffort": false },
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 64e3,
      maxTokens: 16384
    },
    "gpt-5": {
      id: "gpt-5",
      name: "GPT-5",
      api: "openai-responses",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 128e3
    },
    "gpt-5-mini": {
      id: "gpt-5-mini",
      name: "GPT-5-mini",
      api: "openai-responses",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 64e3
    },
    "gpt-5.1": {
      id: "gpt-5.1",
      name: "GPT-5.1",
      api: "openai-responses",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 64e3
    },
    "gpt-5.1-codex": {
      id: "gpt-5.1-codex",
      name: "GPT-5.1-Codex",
      api: "openai-responses",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 128e3
    },
    "gpt-5.1-codex-max": {
      id: "gpt-5.1-codex-max",
      name: "GPT-5.1-Codex-max",
      api: "openai-responses",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 128e3
    },
    "gpt-5.1-codex-mini": {
      id: "gpt-5.1-codex-mini",
      name: "GPT-5.1-Codex-mini",
      api: "openai-responses",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 128e3
    },
    "gpt-5.2": {
      id: "gpt-5.2",
      name: "GPT-5.2",
      api: "openai-responses",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 264e3,
      maxTokens: 64e3
    },
    "gpt-5.2-codex": {
      id: "gpt-5.2-codex",
      name: "GPT-5.2-Codex",
      api: "openai-responses",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.3-codex": {
      id: "gpt-5.3-codex",
      name: "GPT-5.3-Codex",
      api: "openai-responses",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.4": {
      id: "gpt-5.4",
      name: "GPT-5.4",
      api: "openai-responses",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.4-mini": {
      id: "gpt-5.4-mini",
      name: "GPT-5.4 mini",
      api: "openai-responses",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "grok-code-fast-1": {
      id: "grok-code-fast-1",
      name: "Grok Code Fast 1",
      api: "openai-completions",
      provider: "github-copilot",
      baseUrl: "https://api.individual.githubcopilot.com",
      headers: { "User-Agent": "GitHubCopilotChat/0.35.0", "Editor-Version": "vscode/1.107.0", "Editor-Plugin-Version": "copilot-chat/0.35.0", "Copilot-Integration-Id": "vscode-chat" },
      compat: { "supportsStore": false, "supportsDeveloperRole": false, "supportsReasoningEffort": false },
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 64e3
    }
  },
  "google": {
    "gemini-1.5-flash": {
      id: "gemini-1.5-flash",
      name: "Gemini 1.5 Flash",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.075,
        output: 0.3,
        cacheRead: 0.01875,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 8192
    },
    "gemini-1.5-flash-8b": {
      id: "gemini-1.5-flash-8b",
      name: "Gemini 1.5 Flash-8B",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.0375,
        output: 0.15,
        cacheRead: 0.01,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 8192
    },
    "gemini-1.5-pro": {
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 5,
        cacheRead: 0.3125,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 8192
    },
    "gemini-2.0-flash": {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.1,
        output: 0.4,
        cacheRead: 0.025,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 8192
    },
    "gemini-2.0-flash-lite": {
      id: "gemini-2.0-flash-lite",
      name: "Gemini 2.0 Flash Lite",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.075,
        output: 0.3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 8192
    },
    "gemini-2.5-flash": {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.3,
        output: 2.5,
        cacheRead: 0.075,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-2.5-flash-lite": {
      id: "gemini-2.5-flash-lite",
      name: "Gemini 2.5 Flash Lite",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.1,
        output: 0.4,
        cacheRead: 0.025,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-2.5-flash-lite-preview-06-17": {
      id: "gemini-2.5-flash-lite-preview-06-17",
      name: "Gemini 2.5 Flash Lite Preview 06-17",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.1,
        output: 0.4,
        cacheRead: 0.025,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-2.5-flash-lite-preview-09-2025": {
      id: "gemini-2.5-flash-lite-preview-09-2025",
      name: "Gemini 2.5 Flash Lite Preview 09-25",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.1,
        output: 0.4,
        cacheRead: 0.025,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-2.5-flash-preview-04-17": {
      id: "gemini-2.5-flash-preview-04-17",
      name: "Gemini 2.5 Flash Preview 04-17",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0.0375,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-2.5-flash-preview-05-20": {
      id: "gemini-2.5-flash-preview-05-20",
      name: "Gemini 2.5 Flash Preview 05-20",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0.0375,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-2.5-flash-preview-09-2025": {
      id: "gemini-2.5-flash-preview-09-2025",
      name: "Gemini 2.5 Flash Preview 09-25",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.3,
        output: 2.5,
        cacheRead: 0.075,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-2.5-pro": {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.31,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-2.5-pro-preview-05-06": {
      id: "gemini-2.5-pro-preview-05-06",
      name: "Gemini 2.5 Pro Preview 05-06",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.31,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-2.5-pro-preview-06-05": {
      id: "gemini-2.5-pro-preview-06-05",
      name: "Gemini 2.5 Pro Preview 06-05",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.31,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-3-flash-preview": {
      id: "gemini-3-flash-preview",
      name: "Gemini 3 Flash Preview",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.5,
        output: 3,
        cacheRead: 0.05,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-3-pro-preview": {
      id: "gemini-3-pro-preview",
      name: "Gemini 3 Pro Preview",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 12,
        cacheRead: 0.2,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 64e3
    },
    "gemini-3.1-flash-lite-preview": {
      id: "gemini-3.1-flash-lite-preview",
      name: "Gemini 3.1 Flash Lite Preview",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.25,
        output: 1.5,
        cacheRead: 0.025,
        cacheWrite: 1
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-3.1-pro-preview": {
      id: "gemini-3.1-pro-preview",
      name: "Gemini 3.1 Pro Preview",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 12,
        cacheRead: 0.2,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-3.1-pro-preview-customtools": {
      id: "gemini-3.1-pro-preview-customtools",
      name: "Gemini 3.1 Pro Preview Custom Tools",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 12,
        cacheRead: 0.2,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-flash-latest": {
      id: "gemini-flash-latest",
      name: "Gemini Flash Latest",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.3,
        output: 2.5,
        cacheRead: 0.075,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-flash-lite-latest": {
      id: "gemini-flash-lite-latest",
      name: "Gemini Flash-Lite Latest",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.1,
        output: 0.4,
        cacheRead: 0.025,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-live-2.5-flash": {
      id: "gemini-live-2.5-flash",
      name: "Gemini Live 2.5 Flash",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.5,
        output: 2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 8e3
    },
    "gemini-live-2.5-flash-preview-native-audio": {
      id: "gemini-live-2.5-flash-preview-native-audio",
      name: "Gemini Live 2.5 Flash Preview Native Audio",
      api: "google-generative-ai",
      provider: "google",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.5,
        output: 2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 65536
    }
  },
  "google-antigravity": {
    "claude-opus-4-5-thinking": {
      id: "claude-opus-4-5-thinking",
      name: "Claude Opus 4.5 Thinking (Antigravity)",
      api: "google-gemini-cli",
      provider: "google-antigravity",
      baseUrl: "https://daily-cloudcode-pa.sandbox.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 0.5,
        cacheWrite: 6.25
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "claude-opus-4-6-thinking": {
      id: "claude-opus-4-6-thinking",
      name: "Claude Opus 4.6 Thinking (Antigravity)",
      api: "google-gemini-cli",
      provider: "google-antigravity",
      baseUrl: "https://daily-cloudcode-pa.sandbox.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 0.5,
        cacheWrite: 6.25
      },
      contextWindow: 2e5,
      maxTokens: 128e3
    },
    "claude-sonnet-4-5": {
      id: "claude-sonnet-4-5",
      name: "Claude Sonnet 4.5 (Antigravity)",
      api: "google-gemini-cli",
      provider: "google-antigravity",
      baseUrl: "https://daily-cloudcode-pa.sandbox.googleapis.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "claude-sonnet-4-5-thinking": {
      id: "claude-sonnet-4-5-thinking",
      name: "Claude Sonnet 4.5 Thinking (Antigravity)",
      api: "google-gemini-cli",
      provider: "google-antigravity",
      baseUrl: "https://daily-cloudcode-pa.sandbox.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "claude-sonnet-4-6": {
      id: "claude-sonnet-4-6",
      name: "Claude Sonnet 4.6 (Antigravity)",
      api: "google-gemini-cli",
      provider: "google-antigravity",
      baseUrl: "https://daily-cloudcode-pa.sandbox.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "gemini-3-flash": {
      id: "gemini-3-flash",
      name: "Gemini 3 Flash (Antigravity)",
      api: "google-gemini-cli",
      provider: "google-antigravity",
      baseUrl: "https://daily-cloudcode-pa.sandbox.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.5,
        output: 3,
        cacheRead: 0.5,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65535
    },
    "gemini-3.1-pro-high": {
      id: "gemini-3.1-pro-high",
      name: "Gemini 3.1 Pro High (Antigravity)",
      api: "google-gemini-cli",
      provider: "google-antigravity",
      baseUrl: "https://daily-cloudcode-pa.sandbox.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 12,
        cacheRead: 0.2,
        cacheWrite: 2.375
      },
      contextWindow: 1048576,
      maxTokens: 65535
    },
    "gemini-3.1-pro-low": {
      id: "gemini-3.1-pro-low",
      name: "Gemini 3.1 Pro Low (Antigravity)",
      api: "google-gemini-cli",
      provider: "google-antigravity",
      baseUrl: "https://daily-cloudcode-pa.sandbox.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 12,
        cacheRead: 0.2,
        cacheWrite: 2.375
      },
      contextWindow: 1048576,
      maxTokens: 65535
    },
    "gpt-oss-120b-medium": {
      id: "gpt-oss-120b-medium",
      name: "GPT-OSS 120B Medium (Antigravity)",
      api: "google-gemini-cli",
      provider: "google-antigravity",
      baseUrl: "https://daily-cloudcode-pa.sandbox.googleapis.com",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.09,
        output: 0.36,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 32768
    }
  },
  "google-gemini-cli": {
    "gemini-2.0-flash": {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash (Cloud Code Assist)",
      api: "google-gemini-cli",
      provider: "google-gemini-cli",
      baseUrl: "https://cloudcode-pa.googleapis.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 8192
    },
    "gemini-2.5-flash": {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash (Cloud Code Assist)",
      api: "google-gemini-cli",
      provider: "google-gemini-cli",
      baseUrl: "https://cloudcode-pa.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65535
    },
    "gemini-2.5-pro": {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro (Cloud Code Assist)",
      api: "google-gemini-cli",
      provider: "google-gemini-cli",
      baseUrl: "https://cloudcode-pa.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65535
    },
    "gemini-3-flash-preview": {
      id: "gemini-3-flash-preview",
      name: "Gemini 3 Flash Preview (Cloud Code Assist)",
      api: "google-gemini-cli",
      provider: "google-gemini-cli",
      baseUrl: "https://cloudcode-pa.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65535
    },
    "gemini-3-pro-preview": {
      id: "gemini-3-pro-preview",
      name: "Gemini 3 Pro Preview (Cloud Code Assist)",
      api: "google-gemini-cli",
      provider: "google-gemini-cli",
      baseUrl: "https://cloudcode-pa.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65535
    },
    "gemini-3.1-pro-preview": {
      id: "gemini-3.1-pro-preview",
      name: "Gemini 3.1 Pro Preview (Cloud Code Assist)",
      api: "google-gemini-cli",
      provider: "google-gemini-cli",
      baseUrl: "https://cloudcode-pa.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65535
    }
  },
  "google-vertex": {
    "gemini-1.5-flash": {
      id: "gemini-1.5-flash",
      name: "Gemini 1.5 Flash (Vertex)",
      api: "google-vertex",
      provider: "google-vertex",
      baseUrl: "https://{location}-aiplatform.googleapis.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.075,
        output: 0.3,
        cacheRead: 0.01875,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 8192
    },
    "gemini-1.5-flash-8b": {
      id: "gemini-1.5-flash-8b",
      name: "Gemini 1.5 Flash-8B (Vertex)",
      api: "google-vertex",
      provider: "google-vertex",
      baseUrl: "https://{location}-aiplatform.googleapis.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.0375,
        output: 0.15,
        cacheRead: 0.01,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 8192
    },
    "gemini-1.5-pro": {
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro (Vertex)",
      api: "google-vertex",
      provider: "google-vertex",
      baseUrl: "https://{location}-aiplatform.googleapis.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 5,
        cacheRead: 0.3125,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 8192
    },
    "gemini-2.0-flash": {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash (Vertex)",
      api: "google-vertex",
      provider: "google-vertex",
      baseUrl: "https://{location}-aiplatform.googleapis.com",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0.0375,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 8192
    },
    "gemini-2.0-flash-lite": {
      id: "gemini-2.0-flash-lite",
      name: "Gemini 2.0 Flash Lite (Vertex)",
      api: "google-vertex",
      provider: "google-vertex",
      baseUrl: "https://{location}-aiplatform.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.075,
        output: 0.3,
        cacheRead: 0.01875,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-2.5-flash": {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash (Vertex)",
      api: "google-vertex",
      provider: "google-vertex",
      baseUrl: "https://{location}-aiplatform.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.3,
        output: 2.5,
        cacheRead: 0.03,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-2.5-flash-lite": {
      id: "gemini-2.5-flash-lite",
      name: "Gemini 2.5 Flash Lite (Vertex)",
      api: "google-vertex",
      provider: "google-vertex",
      baseUrl: "https://{location}-aiplatform.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.1,
        output: 0.4,
        cacheRead: 0.01,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-2.5-flash-lite-preview-09-2025": {
      id: "gemini-2.5-flash-lite-preview-09-2025",
      name: "Gemini 2.5 Flash Lite Preview 09-25 (Vertex)",
      api: "google-vertex",
      provider: "google-vertex",
      baseUrl: "https://{location}-aiplatform.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.1,
        output: 0.4,
        cacheRead: 0.01,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-2.5-pro": {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro (Vertex)",
      api: "google-vertex",
      provider: "google-vertex",
      baseUrl: "https://{location}-aiplatform.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-3-flash-preview": {
      id: "gemini-3-flash-preview",
      name: "Gemini 3 Flash Preview (Vertex)",
      api: "google-vertex",
      provider: "google-vertex",
      baseUrl: "https://{location}-aiplatform.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.5,
        output: 3,
        cacheRead: 0.05,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-3-pro-preview": {
      id: "gemini-3-pro-preview",
      name: "Gemini 3 Pro Preview (Vertex)",
      api: "google-vertex",
      provider: "google-vertex",
      baseUrl: "https://{location}-aiplatform.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 12,
        cacheRead: 0.2,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 64e3
    },
    "gemini-3.1-pro-preview": {
      id: "gemini-3.1-pro-preview",
      name: "Gemini 3.1 Pro Preview (Vertex)",
      api: "google-vertex",
      provider: "google-vertex",
      baseUrl: "https://{location}-aiplatform.googleapis.com",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 12,
        cacheRead: 0.2,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    }
  },
  "groq": {
    "deepseek-r1-distill-llama-70b": {
      id: "deepseek-r1-distill-llama-70b",
      name: "DeepSeek R1 Distill Llama 70B",
      api: "openai-completions",
      provider: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.75,
        output: 0.99,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 8192
    },
    "gemma2-9b-it": {
      id: "gemma2-9b-it",
      name: "Gemma 2 9B",
      api: "openai-completions",
      provider: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.2,
        output: 0.2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 8192,
      maxTokens: 8192
    },
    "llama-3.1-8b-instant": {
      id: "llama-3.1-8b-instant",
      name: "Llama 3.1 8B Instant",
      api: "openai-completions",
      provider: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.05,
        output: 0.08,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 131072
    },
    "llama-3.3-70b-versatile": {
      id: "llama-3.3-70b-versatile",
      name: "Llama 3.3 70B Versatile",
      api: "openai-completions",
      provider: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.59,
        output: 0.79,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 32768
    },
    "llama3-70b-8192": {
      id: "llama3-70b-8192",
      name: "Llama 3 70B",
      api: "openai-completions",
      provider: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.59,
        output: 0.79,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 8192,
      maxTokens: 8192
    },
    "llama3-8b-8192": {
      id: "llama3-8b-8192",
      name: "Llama 3 8B",
      api: "openai-completions",
      provider: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.05,
        output: 0.08,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 8192,
      maxTokens: 8192
    },
    "meta-llama/llama-4-maverick-17b-128e-instruct": {
      id: "meta-llama/llama-4-maverick-17b-128e-instruct",
      name: "Llama 4 Maverick 17B",
      api: "openai-completions",
      provider: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.2,
        output: 0.6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 8192
    },
    "meta-llama/llama-4-scout-17b-16e-instruct": {
      id: "meta-llama/llama-4-scout-17b-16e-instruct",
      name: "Llama 4 Scout 17B",
      api: "openai-completions",
      provider: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.11,
        output: 0.34,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 8192
    },
    "mistral-saba-24b": {
      id: "mistral-saba-24b",
      name: "Mistral Saba 24B",
      api: "openai-completions",
      provider: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.79,
        output: 0.79,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 32768,
      maxTokens: 32768
    },
    "moonshotai/kimi-k2-instruct": {
      id: "moonshotai/kimi-k2-instruct",
      name: "Kimi K2 Instruct",
      api: "openai-completions",
      provider: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 1,
        output: 3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 16384
    },
    "moonshotai/kimi-k2-instruct-0905": {
      id: "moonshotai/kimi-k2-instruct-0905",
      name: "Kimi K2 Instruct 0905",
      api: "openai-completions",
      provider: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 1,
        output: 3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 16384
    },
    "openai/gpt-oss-120b": {
      id: "openai/gpt-oss-120b",
      name: "GPT OSS 120B",
      api: "openai-completions",
      provider: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 65536
    },
    "openai/gpt-oss-20b": {
      id: "openai/gpt-oss-20b",
      name: "GPT OSS 20B",
      api: "openai-completions",
      provider: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.075,
        output: 0.3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 65536
    },
    "qwen-qwq-32b": {
      id: "qwen-qwq-32b",
      name: "Qwen QwQ 32B",
      api: "openai-completions",
      provider: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.29,
        output: 0.39,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 16384
    },
    "qwen/qwen3-32b": {
      id: "qwen/qwen3-32b",
      name: "Qwen3 32B",
      api: "openai-completions",
      provider: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.29,
        output: 0.59,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 16384
    }
  },
  "huggingface": {
    "MiniMaxAI/MiniMax-M2.1": {
      id: "MiniMaxAI/MiniMax-M2.1",
      name: "MiniMax-M2.1",
      api: "openai-completions",
      provider: "huggingface",
      baseUrl: "https://router.huggingface.co/v1",
      compat: { "supportsDeveloperRole": false },
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "MiniMaxAI/MiniMax-M2.5": {
      id: "MiniMaxAI/MiniMax-M2.5",
      name: "MiniMax-M2.5",
      api: "openai-completions",
      provider: "huggingface",
      baseUrl: "https://router.huggingface.co/v1",
      compat: { "supportsDeveloperRole": false },
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0.03,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "Qwen/Qwen3-235B-A22B-Thinking-2507": {
      id: "Qwen/Qwen3-235B-A22B-Thinking-2507",
      name: "Qwen3-235B-A22B-Thinking-2507",
      api: "openai-completions",
      provider: "huggingface",
      baseUrl: "https://router.huggingface.co/v1",
      compat: { "supportsDeveloperRole": false },
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 131072
    },
    "Qwen/Qwen3-Coder-480B-A35B-Instruct": {
      id: "Qwen/Qwen3-Coder-480B-A35B-Instruct",
      name: "Qwen3-Coder-480B-A35B-Instruct",
      api: "openai-completions",
      provider: "huggingface",
      baseUrl: "https://router.huggingface.co/v1",
      compat: { "supportsDeveloperRole": false },
      reasoning: false,
      input: ["text"],
      cost: {
        input: 2,
        output: 2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 66536
    },
    "Qwen/Qwen3-Coder-Next": {
      id: "Qwen/Qwen3-Coder-Next",
      name: "Qwen3-Coder-Next",
      api: "openai-completions",
      provider: "huggingface",
      baseUrl: "https://router.huggingface.co/v1",
      compat: { "supportsDeveloperRole": false },
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.2,
        output: 1.5,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 65536
    },
    "Qwen/Qwen3-Next-80B-A3B-Instruct": {
      id: "Qwen/Qwen3-Next-80B-A3B-Instruct",
      name: "Qwen3-Next-80B-A3B-Instruct",
      api: "openai-completions",
      provider: "huggingface",
      baseUrl: "https://router.huggingface.co/v1",
      compat: { "supportsDeveloperRole": false },
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.25,
        output: 1,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 66536
    },
    "Qwen/Qwen3-Next-80B-A3B-Thinking": {
      id: "Qwen/Qwen3-Next-80B-A3B-Thinking",
      name: "Qwen3-Next-80B-A3B-Thinking",
      api: "openai-completions",
      provider: "huggingface",
      baseUrl: "https://router.huggingface.co/v1",
      compat: { "supportsDeveloperRole": false },
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 131072
    },
    "Qwen/Qwen3.5-397B-A17B": {
      id: "Qwen/Qwen3.5-397B-A17B",
      name: "Qwen3.5-397B-A17B",
      api: "openai-completions",
      provider: "huggingface",
      baseUrl: "https://router.huggingface.co/v1",
      compat: { "supportsDeveloperRole": false },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.6,
        output: 3.6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 32768
    },
    "XiaomiMiMo/MiMo-V2-Flash": {
      id: "XiaomiMiMo/MiMo-V2-Flash",
      name: "MiMo-V2-Flash",
      api: "openai-completions",
      provider: "huggingface",
      baseUrl: "https://router.huggingface.co/v1",
      compat: { "supportsDeveloperRole": false },
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.1,
        output: 0.3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 4096
    },
    "deepseek-ai/DeepSeek-R1-0528": {
      id: "deepseek-ai/DeepSeek-R1-0528",
      name: "DeepSeek-R1-0528",
      api: "openai-completions",
      provider: "huggingface",
      baseUrl: "https://router.huggingface.co/v1",
      compat: { "supportsDeveloperRole": false },
      reasoning: true,
      input: ["text"],
      cost: {
        input: 3,
        output: 5,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 163840,
      maxTokens: 163840
    },
    "deepseek-ai/DeepSeek-V3.2": {
      id: "deepseek-ai/DeepSeek-V3.2",
      name: "DeepSeek-V3.2",
      api: "openai-completions",
      provider: "huggingface",
      baseUrl: "https://router.huggingface.co/v1",
      compat: { "supportsDeveloperRole": false },
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.28,
        output: 0.4,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 163840,
      maxTokens: 65536
    },
    "moonshotai/Kimi-K2-Instruct": {
      id: "moonshotai/Kimi-K2-Instruct",
      name: "Kimi-K2-Instruct",
      api: "openai-completions",
      provider: "huggingface",
      baseUrl: "https://router.huggingface.co/v1",
      compat: { "supportsDeveloperRole": false },
      reasoning: false,
      input: ["text"],
      cost: {
        input: 1,
        output: 3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 16384
    },
    "moonshotai/Kimi-K2-Instruct-0905": {
      id: "moonshotai/Kimi-K2-Instruct-0905",
      name: "Kimi-K2-Instruct-0905",
      api: "openai-completions",
      provider: "huggingface",
      baseUrl: "https://router.huggingface.co/v1",
      compat: { "supportsDeveloperRole": false },
      reasoning: false,
      input: ["text"],
      cost: {
        input: 1,
        output: 3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 16384
    },
    "moonshotai/Kimi-K2-Thinking": {
      id: "moonshotai/Kimi-K2-Thinking",
      name: "Kimi-K2-Thinking",
      api: "openai-completions",
      provider: "huggingface",
      baseUrl: "https://router.huggingface.co/v1",
      compat: { "supportsDeveloperRole": false },
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.5,
        cacheRead: 0.15,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 262144
    },
    "moonshotai/Kimi-K2.5": {
      id: "moonshotai/Kimi-K2.5",
      name: "Kimi-K2.5",
      api: "openai-completions",
      provider: "huggingface",
      baseUrl: "https://router.huggingface.co/v1",
      compat: { "supportsDeveloperRole": false },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.6,
        output: 3,
        cacheRead: 0.1,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 262144
    },
    "zai-org/GLM-4.7": {
      id: "zai-org/GLM-4.7",
      name: "GLM-4.7",
      api: "openai-completions",
      provider: "huggingface",
      baseUrl: "https://router.huggingface.co/v1",
      compat: { "supportsDeveloperRole": false },
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.2,
        cacheRead: 0.11,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "zai-org/GLM-4.7-Flash": {
      id: "zai-org/GLM-4.7-Flash",
      name: "GLM-4.7-Flash",
      api: "openai-completions",
      provider: "huggingface",
      baseUrl: "https://router.huggingface.co/v1",
      compat: { "supportsDeveloperRole": false },
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 128e3
    },
    "zai-org/GLM-5": {
      id: "zai-org/GLM-5",
      name: "GLM-5",
      api: "openai-completions",
      provider: "huggingface",
      baseUrl: "https://router.huggingface.co/v1",
      compat: { "supportsDeveloperRole": false },
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1,
        output: 3.2,
        cacheRead: 0.2,
        cacheWrite: 0
      },
      contextWindow: 202752,
      maxTokens: 131072
    }
  },
  "kimi-coding": {
    "k2p5": {
      id: "k2p5",
      name: "Kimi K2.5",
      api: "anthropic-messages",
      provider: "kimi-coding",
      baseUrl: "https://api.kimi.com/coding",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 32768
    },
    "kimi-k2-thinking": {
      id: "kimi-k2-thinking",
      name: "Kimi K2 Thinking",
      api: "anthropic-messages",
      provider: "kimi-coding",
      baseUrl: "https://api.kimi.com/coding",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 32768
    }
  },
  "minimax": {
    "MiniMax-M2": {
      id: "MiniMax-M2",
      name: "MiniMax-M2",
      api: "anthropic-messages",
      provider: "minimax",
      baseUrl: "https://api.minimax.io/anthropic",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "MiniMax-M2.1": {
      id: "MiniMax-M2.1",
      name: "MiniMax-M2.1",
      api: "anthropic-messages",
      provider: "minimax",
      baseUrl: "https://api.minimax.io/anthropic",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "MiniMax-M2.1-highspeed": {
      id: "MiniMax-M2.1-highspeed",
      name: "MiniMax-M2.1-highspeed",
      api: "anthropic-messages",
      provider: "minimax",
      baseUrl: "https://api.minimax.io/anthropic",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.4,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "MiniMax-M2.5": {
      id: "MiniMax-M2.5",
      name: "MiniMax-M2.5",
      api: "anthropic-messages",
      provider: "minimax",
      baseUrl: "https://api.minimax.io/anthropic",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0.03,
        cacheWrite: 0.375
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "MiniMax-M2.5-highspeed": {
      id: "MiniMax-M2.5-highspeed",
      name: "MiniMax-M2.5-highspeed",
      api: "anthropic-messages",
      provider: "minimax",
      baseUrl: "https://api.minimax.io/anthropic",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.4,
        cacheRead: 0.06,
        cacheWrite: 0.375
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "MiniMax-M2.7": {
      id: "MiniMax-M2.7",
      name: "MiniMax-M2.7",
      api: "anthropic-messages",
      provider: "minimax",
      baseUrl: "https://api.minimax.io/anthropic",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0.06,
        cacheWrite: 0.375
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "MiniMax-M2.7-highspeed": {
      id: "MiniMax-M2.7-highspeed",
      name: "MiniMax-M2.7-highspeed",
      api: "anthropic-messages",
      provider: "minimax",
      baseUrl: "https://api.minimax.io/anthropic",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.4,
        cacheRead: 0.06,
        cacheWrite: 0.375
      },
      contextWindow: 204800,
      maxTokens: 131072
    }
  },
  "minimax-cn": {
    "MiniMax-M2": {
      id: "MiniMax-M2",
      name: "MiniMax-M2",
      api: "anthropic-messages",
      provider: "minimax-cn",
      baseUrl: "https://api.minimaxi.com/anthropic",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "MiniMax-M2.1": {
      id: "MiniMax-M2.1",
      name: "MiniMax-M2.1",
      api: "anthropic-messages",
      provider: "minimax-cn",
      baseUrl: "https://api.minimaxi.com/anthropic",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "MiniMax-M2.1-highspeed": {
      id: "MiniMax-M2.1-highspeed",
      name: "MiniMax-M2.1-highspeed",
      api: "anthropic-messages",
      provider: "minimax-cn",
      baseUrl: "https://api.minimaxi.com/anthropic",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.4,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "MiniMax-M2.5": {
      id: "MiniMax-M2.5",
      name: "MiniMax-M2.5",
      api: "anthropic-messages",
      provider: "minimax-cn",
      baseUrl: "https://api.minimaxi.com/anthropic",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0.03,
        cacheWrite: 0.375
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "MiniMax-M2.5-highspeed": {
      id: "MiniMax-M2.5-highspeed",
      name: "MiniMax-M2.5-highspeed",
      api: "anthropic-messages",
      provider: "minimax-cn",
      baseUrl: "https://api.minimaxi.com/anthropic",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.4,
        cacheRead: 0.06,
        cacheWrite: 0.375
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "MiniMax-M2.7": {
      id: "MiniMax-M2.7",
      name: "MiniMax-M2.7",
      api: "anthropic-messages",
      provider: "minimax-cn",
      baseUrl: "https://api.minimaxi.com/anthropic",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0.06,
        cacheWrite: 0.375
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "MiniMax-M2.7-highspeed": {
      id: "MiniMax-M2.7-highspeed",
      name: "MiniMax-M2.7-highspeed",
      api: "anthropic-messages",
      provider: "minimax-cn",
      baseUrl: "https://api.minimaxi.com/anthropic",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.4,
        cacheRead: 0.06,
        cacheWrite: 0.375
      },
      contextWindow: 204800,
      maxTokens: 131072
    }
  },
  "mistral": {
    "codestral-latest": {
      id: "codestral-latest",
      name: "Codestral (latest)",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 0.9,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 4096
    },
    "devstral-2512": {
      id: "devstral-2512",
      name: "Devstral 2",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.4,
        output: 2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 262144
    },
    "devstral-medium-2507": {
      id: "devstral-medium-2507",
      name: "Devstral Medium",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.4,
        output: 2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 128e3
    },
    "devstral-medium-latest": {
      id: "devstral-medium-latest",
      name: "Devstral 2 (latest)",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.4,
        output: 2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 262144
    },
    "devstral-small-2505": {
      id: "devstral-small-2505",
      name: "Devstral Small 2505",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.1,
        output: 0.3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 128e3
    },
    "devstral-small-2507": {
      id: "devstral-small-2507",
      name: "Devstral Small",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.1,
        output: 0.3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 128e3
    },
    "labs-devstral-small-2512": {
      id: "labs-devstral-small-2512",
      name: "Devstral Small 2",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 256e3
    },
    "magistral-medium-latest": {
      id: "magistral-medium-latest",
      name: "Magistral Medium (latest)",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 2,
        output: 5,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "magistral-small": {
      id: "magistral-small",
      name: "Magistral Small",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.5,
        output: 1.5,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 128e3
    },
    "ministral-3b-latest": {
      id: "ministral-3b-latest",
      name: "Ministral 3B (latest)",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.04,
        output: 0.04,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 128e3
    },
    "ministral-8b-latest": {
      id: "ministral-8b-latest",
      name: "Ministral 8B (latest)",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.1,
        output: 0.1,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 128e3
    },
    "mistral-large-2411": {
      id: "mistral-large-2411",
      name: "Mistral Large 2.1",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 2,
        output: 6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 16384
    },
    "mistral-large-2512": {
      id: "mistral-large-2512",
      name: "Mistral Large 3",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.5,
        output: 1.5,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 262144
    },
    "mistral-large-latest": {
      id: "mistral-large-latest",
      name: "Mistral Large (latest)",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.5,
        output: 1.5,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 262144
    },
    "mistral-medium-2505": {
      id: "mistral-medium-2505",
      name: "Mistral Medium 3",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.4,
        output: 2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 131072
    },
    "mistral-medium-2508": {
      id: "mistral-medium-2508",
      name: "Mistral Medium 3.1",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.4,
        output: 2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 262144
    },
    "mistral-medium-latest": {
      id: "mistral-medium-latest",
      name: "Mistral Medium (latest)",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.4,
        output: 2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "mistral-nemo": {
      id: "mistral-nemo",
      name: "Mistral Nemo",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.15,
        output: 0.15,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 128e3
    },
    "mistral-small-2506": {
      id: "mistral-small-2506",
      name: "Mistral Small 3.2",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.1,
        output: 0.3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "mistral-small-latest": {
      id: "mistral-small-latest",
      name: "Mistral Small (latest)",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.1,
        output: 0.3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "open-mistral-7b": {
      id: "open-mistral-7b",
      name: "Mistral 7B",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.25,
        output: 0.25,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 8e3,
      maxTokens: 8e3
    },
    "open-mixtral-8x22b": {
      id: "open-mixtral-8x22b",
      name: "Mixtral 8x22B",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 2,
        output: 6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 64e3,
      maxTokens: 64e3
    },
    "open-mixtral-8x7b": {
      id: "open-mixtral-8x7b",
      name: "Mixtral 8x7B",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.7,
        output: 0.7,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 32e3,
      maxTokens: 32e3
    },
    "pixtral-12b": {
      id: "pixtral-12b",
      name: "Pixtral 12B",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.15,
        output: 0.15,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 128e3
    },
    "pixtral-large-latest": {
      id: "pixtral-large-latest",
      name: "Pixtral Large (latest)",
      api: "mistral-conversations",
      provider: "mistral",
      baseUrl: "https://api.mistral.ai",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 128e3
    }
  },
  "openai": {
    "codex-mini-latest": {
      id: "codex-mini-latest",
      name: "Codex Mini",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1.5,
        output: 6,
        cacheRead: 0.375,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "gpt-4": {
      id: "gpt-4",
      name: "GPT-4",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 30,
        output: 60,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 8192,
      maxTokens: 8192
    },
    "gpt-4-turbo": {
      id: "gpt-4-turbo",
      name: "GPT-4 Turbo",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 10,
        output: 30,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "gpt-4.1": {
      id: "gpt-4.1",
      name: "GPT-4.1",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 8,
        cacheRead: 0.5,
        cacheWrite: 0
      },
      contextWindow: 1047576,
      maxTokens: 32768
    },
    "gpt-4.1-mini": {
      id: "gpt-4.1-mini",
      name: "GPT-4.1 mini",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.4,
        output: 1.6,
        cacheRead: 0.1,
        cacheWrite: 0
      },
      contextWindow: 1047576,
      maxTokens: 32768
    },
    "gpt-4.1-nano": {
      id: "gpt-4.1-nano",
      name: "GPT-4.1 nano",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.1,
        output: 0.4,
        cacheRead: 0.03,
        cacheWrite: 0
      },
      contextWindow: 1047576,
      maxTokens: 32768
    },
    "gpt-4o": {
      id: "gpt-4o",
      name: "GPT-4o",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2.5,
        output: 10,
        cacheRead: 1.25,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "gpt-4o-2024-05-13": {
      id: "gpt-4o-2024-05-13",
      name: "GPT-4o (2024-05-13)",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 15,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "gpt-4o-2024-08-06": {
      id: "gpt-4o-2024-08-06",
      name: "GPT-4o (2024-08-06)",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2.5,
        output: 10,
        cacheRead: 1.25,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "gpt-4o-2024-11-20": {
      id: "gpt-4o-2024-11-20",
      name: "GPT-4o (2024-11-20)",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2.5,
        output: 10,
        cacheRead: 1.25,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "gpt-4o-mini": {
      id: "gpt-4o-mini",
      name: "GPT-4o mini",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0.08,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "gpt-5": {
      id: "gpt-5",
      name: "GPT-5",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5-chat-latest": {
      id: "gpt-5-chat-latest",
      name: "GPT-5 Chat Latest",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "gpt-5-codex": {
      id: "gpt-5-codex",
      name: "GPT-5-Codex",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5-mini": {
      id: "gpt-5-mini",
      name: "GPT-5 Mini",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.25,
        output: 2,
        cacheRead: 0.025,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5-nano": {
      id: "gpt-5-nano",
      name: "GPT-5 Nano",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.05,
        output: 0.4,
        cacheRead: 5e-3,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5-pro": {
      id: "gpt-5-pro",
      name: "GPT-5 Pro",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 120,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 272e3
    },
    "gpt-5.1": {
      id: "gpt-5.1",
      name: "GPT-5.1",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.13,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.1-chat-latest": {
      id: "gpt-5.1-chat-latest",
      name: "GPT-5.1 Chat",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "gpt-5.1-codex": {
      id: "gpt-5.1-codex",
      name: "GPT-5.1 Codex",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.1-codex-max": {
      id: "gpt-5.1-codex-max",
      name: "GPT-5.1 Codex Max",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.1-codex-mini": {
      id: "gpt-5.1-codex-mini",
      name: "GPT-5.1 Codex mini",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.25,
        output: 2,
        cacheRead: 0.025,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.2": {
      id: "gpt-5.2",
      name: "GPT-5.2",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.2-chat-latest": {
      id: "gpt-5.2-chat-latest",
      name: "GPT-5.2 Chat",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "gpt-5.2-codex": {
      id: "gpt-5.2-codex",
      name: "GPT-5.2 Codex",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.2-pro": {
      id: "gpt-5.2-pro",
      name: "GPT-5.2 Pro",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 21,
        output: 168,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.3-codex": {
      id: "gpt-5.3-codex",
      name: "GPT-5.3 Codex",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.3-codex-spark": {
      id: "gpt-5.3-codex-spark",
      name: "GPT-5.3 Codex Spark",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 32e3
    },
    "gpt-5.4": {
      id: "gpt-5.4",
      name: "GPT-5.4",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2.5,
        output: 15,
        cacheRead: 0.25,
        cacheWrite: 0
      },
      contextWindow: 272e3,
      maxTokens: 128e3
    },
    "gpt-5.4-mini": {
      id: "gpt-5.4-mini",
      name: "GPT-5.4 mini",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.75,
        output: 4.5,
        cacheRead: 0.075,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.4-nano": {
      id: "gpt-5.4-nano",
      name: "GPT-5.4 nano",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.2,
        output: 1.25,
        cacheRead: 0.02,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.4-pro": {
      id: "gpt-5.4-pro",
      name: "GPT-5.4 Pro",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 30,
        output: 180,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 105e4,
      maxTokens: 128e3
    },
    "o1": {
      id: "o1",
      name: "o1",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 60,
        cacheRead: 7.5,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "o1-pro": {
      id: "o1-pro",
      name: "o1-pro",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 150,
        output: 600,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "o3": {
      id: "o3",
      name: "o3",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 8,
        cacheRead: 0.5,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "o3-deep-research": {
      id: "o3-deep-research",
      name: "o3-deep-research",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 10,
        output: 40,
        cacheRead: 2.5,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "o3-mini": {
      id: "o3-mini",
      name: "o3-mini",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1.1,
        output: 4.4,
        cacheRead: 0.55,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "o3-pro": {
      id: "o3-pro",
      name: "o3-pro",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 20,
        output: 80,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "o4-mini": {
      id: "o4-mini",
      name: "o4-mini",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.1,
        output: 4.4,
        cacheRead: 0.28,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "o4-mini-deep-research": {
      id: "o4-mini-deep-research",
      name: "o4-mini-deep-research",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 8,
        cacheRead: 0.5,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    }
  },
  "openai-codex": {
    "gpt-5.1": {
      id: "gpt-5.1",
      name: "GPT-5.1",
      api: "openai-codex-responses",
      provider: "openai-codex",
      baseUrl: "https://chatgpt.com/backend-api",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 272e3,
      maxTokens: 128e3
    },
    "gpt-5.1-codex-max": {
      id: "gpt-5.1-codex-max",
      name: "GPT-5.1 Codex Max",
      api: "openai-codex-responses",
      provider: "openai-codex",
      baseUrl: "https://chatgpt.com/backend-api",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 272e3,
      maxTokens: 128e3
    },
    "gpt-5.1-codex-mini": {
      id: "gpt-5.1-codex-mini",
      name: "GPT-5.1 Codex Mini",
      api: "openai-codex-responses",
      provider: "openai-codex",
      baseUrl: "https://chatgpt.com/backend-api",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.25,
        output: 2,
        cacheRead: 0.025,
        cacheWrite: 0
      },
      contextWindow: 272e3,
      maxTokens: 128e3
    },
    "gpt-5.2": {
      id: "gpt-5.2",
      name: "GPT-5.2",
      api: "openai-codex-responses",
      provider: "openai-codex",
      baseUrl: "https://chatgpt.com/backend-api",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 272e3,
      maxTokens: 128e3
    },
    "gpt-5.2-codex": {
      id: "gpt-5.2-codex",
      name: "GPT-5.2 Codex",
      api: "openai-codex-responses",
      provider: "openai-codex",
      baseUrl: "https://chatgpt.com/backend-api",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 272e3,
      maxTokens: 128e3
    },
    "gpt-5.3-codex": {
      id: "gpt-5.3-codex",
      name: "GPT-5.3 Codex",
      api: "openai-codex-responses",
      provider: "openai-codex",
      baseUrl: "https://chatgpt.com/backend-api",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 272e3,
      maxTokens: 128e3
    },
    "gpt-5.3-codex-spark": {
      id: "gpt-5.3-codex-spark",
      name: "GPT-5.3 Codex Spark",
      api: "openai-codex-responses",
      provider: "openai-codex",
      baseUrl: "https://chatgpt.com/backend-api",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 128e3
    },
    "gpt-5.4": {
      id: "gpt-5.4",
      name: "GPT-5.4",
      api: "openai-codex-responses",
      provider: "openai-codex",
      baseUrl: "https://chatgpt.com/backend-api",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2.5,
        output: 15,
        cacheRead: 0.25,
        cacheWrite: 0
      },
      contextWindow: 272e3,
      maxTokens: 128e3
    },
    "gpt-5.4-mini": {
      id: "gpt-5.4-mini",
      name: "GPT-5.4 Mini",
      api: "openai-codex-responses",
      provider: "openai-codex",
      baseUrl: "https://chatgpt.com/backend-api",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.75,
        output: 4.5,
        cacheRead: 0.075,
        cacheWrite: 0
      },
      contextWindow: 272e3,
      maxTokens: 128e3
    }
  },
  "opencode": {
    "big-pickle": {
      id: "big-pickle",
      name: "Big Pickle",
      api: "anthropic-messages",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 128e3
    },
    "claude-3-5-haiku": {
      id: "claude-3-5-haiku",
      name: "Claude Haiku 3.5",
      api: "anthropic-messages",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.8,
        output: 4,
        cacheRead: 0.08,
        cacheWrite: 1
      },
      contextWindow: 2e5,
      maxTokens: 8192
    },
    "claude-haiku-4-5": {
      id: "claude-haiku-4-5",
      name: "Claude Haiku 4.5",
      api: "anthropic-messages",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1,
        output: 5,
        cacheRead: 0.1,
        cacheWrite: 1.25
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "claude-opus-4-1": {
      id: "claude-opus-4-1",
      name: "Claude Opus 4.1",
      api: "anthropic-messages",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 75,
        cacheRead: 1.5,
        cacheWrite: 18.75
      },
      contextWindow: 2e5,
      maxTokens: 32e3
    },
    "claude-opus-4-5": {
      id: "claude-opus-4-5",
      name: "Claude Opus 4.5",
      api: "anthropic-messages",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 0.5,
        cacheWrite: 6.25
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "claude-opus-4-6": {
      id: "claude-opus-4-6",
      name: "Claude Opus 4.6",
      api: "anthropic-messages",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 0.5,
        cacheWrite: 6.25
      },
      contextWindow: 1e6,
      maxTokens: 128e3
    },
    "claude-sonnet-4": {
      id: "claude-sonnet-4",
      name: "Claude Sonnet 4",
      api: "anthropic-messages",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "claude-sonnet-4-5": {
      id: "claude-sonnet-4-5",
      name: "Claude Sonnet 4.5",
      api: "anthropic-messages",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "claude-sonnet-4-6": {
      id: "claude-sonnet-4-6",
      name: "Claude Sonnet 4.6",
      api: "anthropic-messages",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 1e6,
      maxTokens: 64e3
    },
    "gemini-3-flash": {
      id: "gemini-3-flash",
      name: "Gemini 3 Flash",
      api: "google-generative-ai",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.5,
        output: 3,
        cacheRead: 0.05,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "gemini-3.1-pro": {
      id: "gemini-3.1-pro",
      name: "Gemini 3.1 Pro Preview",
      api: "google-generative-ai",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 12,
        cacheRead: 0.2,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "glm-5": {
      id: "glm-5",
      name: "GLM-5",
      api: "openai-completions",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1,
        output: 3.2,
        cacheRead: 0.2,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "gpt-5": {
      id: "gpt-5",
      name: "GPT-5",
      api: "openai-responses",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.07,
        output: 8.5,
        cacheRead: 0.107,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5-codex": {
      id: "gpt-5-codex",
      name: "GPT-5 Codex",
      api: "openai-responses",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.07,
        output: 8.5,
        cacheRead: 0.107,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5-nano": {
      id: "gpt-5-nano",
      name: "GPT-5 Nano",
      api: "openai-responses",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.1": {
      id: "gpt-5.1",
      name: "GPT-5.1",
      api: "openai-responses",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.07,
        output: 8.5,
        cacheRead: 0.107,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.1-codex": {
      id: "gpt-5.1-codex",
      name: "GPT-5.1 Codex",
      api: "openai-responses",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.07,
        output: 8.5,
        cacheRead: 0.107,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.1-codex-max": {
      id: "gpt-5.1-codex-max",
      name: "GPT-5.1 Codex Max",
      api: "openai-responses",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.1-codex-mini": {
      id: "gpt-5.1-codex-mini",
      name: "GPT-5.1 Codex Mini",
      api: "openai-responses",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.25,
        output: 2,
        cacheRead: 0.025,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.2": {
      id: "gpt-5.2",
      name: "GPT-5.2",
      api: "openai-responses",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.2-codex": {
      id: "gpt-5.2-codex",
      name: "GPT-5.2 Codex",
      api: "openai-responses",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.3-codex": {
      id: "gpt-5.3-codex",
      name: "GPT-5.3 Codex",
      api: "openai-responses",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.4": {
      id: "gpt-5.4",
      name: "GPT-5.4",
      api: "openai-responses",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2.5,
        output: 15,
        cacheRead: 0.25,
        cacheWrite: 0
      },
      contextWindow: 272e3,
      maxTokens: 128e3
    },
    "gpt-5.4-mini": {
      id: "gpt-5.4-mini",
      name: "GPT-5.4 Mini",
      api: "openai-responses",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.75,
        output: 4.5,
        cacheRead: 0.075,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.4-nano": {
      id: "gpt-5.4-nano",
      name: "GPT-5.4 Nano",
      api: "openai-responses",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.2,
        output: 1.25,
        cacheRead: 0.02,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "gpt-5.4-pro": {
      id: "gpt-5.4-pro",
      name: "GPT-5.4 Pro",
      api: "openai-responses",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 30,
        output: 180,
        cacheRead: 30,
        cacheWrite: 0
      },
      contextWindow: 105e4,
      maxTokens: 128e3
    },
    "kimi-k2.5": {
      id: "kimi-k2.5",
      name: "Kimi K2.5",
      api: "openai-completions",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.6,
        output: 3,
        cacheRead: 0.08,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 65536
    },
    "mimo-v2-omni-free": {
      id: "mimo-v2-omni-free",
      name: "MiMo V2 Omni Free",
      api: "openai-completions",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 64e3
    },
    "mimo-v2-pro-free": {
      id: "mimo-v2-pro-free",
      name: "MiMo V2 Pro Free",
      api: "openai-completions",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 64e3
    },
    "minimax-m2.5": {
      id: "minimax-m2.5",
      name: "MiniMax M2.5",
      api: "openai-completions",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0.06,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "minimax-m2.5-free": {
      id: "minimax-m2.5-free",
      name: "MiniMax M2.5 Free",
      api: "anthropic-messages",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "nemotron-3-super-free": {
      id: "nemotron-3-super-free",
      name: "Nemotron 3 Super Free",
      api: "openai-completions",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 128e3
    }
  },
  "opencode-go": {
    "glm-5": {
      id: "glm-5",
      name: "GLM-5",
      api: "openai-completions",
      provider: "opencode-go",
      baseUrl: "https://opencode.ai/zen/go/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1,
        output: 3.2,
        cacheRead: 0.2,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "kimi-k2.5": {
      id: "kimi-k2.5",
      name: "Kimi K2.5",
      api: "openai-completions",
      provider: "opencode-go",
      baseUrl: "https://opencode.ai/zen/go/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.6,
        output: 3,
        cacheRead: 0.1,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 65536
    },
    "minimax-m2.5": {
      id: "minimax-m2.5",
      name: "MiniMax M2.5",
      api: "anthropic-messages",
      provider: "opencode-go",
      baseUrl: "https://opencode.ai/zen/go",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0.03,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "minimax-m2.7": {
      id: "minimax-m2.7",
      name: "MiniMax M2.7",
      api: "anthropic-messages",
      provider: "opencode-go",
      baseUrl: "https://opencode.ai/zen/go",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0.06,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    }
  },
  "openrouter": {
    "ai21/jamba-large-1.7": {
      id: "ai21/jamba-large-1.7",
      name: "AI21: Jamba Large 1.7",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 2,
        output: 8,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 4096
    },
    "alibaba/tongyi-deepresearch-30b-a3b": {
      id: "alibaba/tongyi-deepresearch-30b-a3b",
      name: "Tongyi DeepResearch 30B A3B",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.09,
        output: 0.44999999999999996,
        cacheRead: 0.09,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 131072
    },
    "allenai/olmo-3.1-32b-instruct": {
      id: "allenai/olmo-3.1-32b-instruct",
      name: "AllenAI: Olmo 3.1 32B Instruct",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.19999999999999998,
        output: 0.6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 65536,
      maxTokens: 4096
    },
    "amazon/nova-2-lite-v1": {
      id: "amazon/nova-2-lite-v1",
      name: "Amazon: Nova 2 Lite",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.3,
        output: 2.5,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 65535
    },
    "amazon/nova-lite-v1": {
      id: "amazon/nova-lite-v1",
      name: "Amazon: Nova Lite 1.0",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.06,
        output: 0.24,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 3e5,
      maxTokens: 5120
    },
    "amazon/nova-micro-v1": {
      id: "amazon/nova-micro-v1",
      name: "Amazon: Nova Micro 1.0",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.035,
        output: 0.14,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 5120
    },
    "amazon/nova-premier-v1": {
      id: "amazon/nova-premier-v1",
      name: "Amazon: Nova Premier 1.0",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2.5,
        output: 12.5,
        cacheRead: 0.625,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 32e3
    },
    "amazon/nova-pro-v1": {
      id: "amazon/nova-pro-v1",
      name: "Amazon: Nova Pro 1.0",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.7999999999999999,
        output: 3.1999999999999997,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 3e5,
      maxTokens: 5120
    },
    "anthropic/claude-3-haiku": {
      id: "anthropic/claude-3-haiku",
      name: "Anthropic: Claude 3 Haiku",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.25,
        output: 1.25,
        cacheRead: 0.03,
        cacheWrite: 0.3
      },
      contextWindow: 2e5,
      maxTokens: 4096
    },
    "anthropic/claude-3.5-haiku": {
      id: "anthropic/claude-3.5-haiku",
      name: "Anthropic: Claude 3.5 Haiku",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.7999999999999999,
        output: 4,
        cacheRead: 0.08,
        cacheWrite: 1
      },
      contextWindow: 2e5,
      maxTokens: 8192
    },
    "anthropic/claude-3.5-sonnet": {
      id: "anthropic/claude-3.5-sonnet",
      name: "Anthropic: Claude 3.5 Sonnet",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 6,
        output: 30,
        cacheRead: 0.6,
        cacheWrite: 7.5
      },
      contextWindow: 2e5,
      maxTokens: 8192
    },
    "anthropic/claude-3.7-sonnet": {
      id: "anthropic/claude-3.7-sonnet",
      name: "Anthropic: Claude 3.7 Sonnet",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "anthropic/claude-3.7-sonnet:thinking": {
      id: "anthropic/claude-3.7-sonnet:thinking",
      name: "Anthropic: Claude 3.7 Sonnet (thinking)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "anthropic/claude-haiku-4.5": {
      id: "anthropic/claude-haiku-4.5",
      name: "Anthropic: Claude Haiku 4.5",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1,
        output: 5,
        cacheRead: 0.09999999999999999,
        cacheWrite: 1.25
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "anthropic/claude-opus-4": {
      id: "anthropic/claude-opus-4",
      name: "Anthropic: Claude Opus 4",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 75,
        cacheRead: 1.5,
        cacheWrite: 18.75
      },
      contextWindow: 2e5,
      maxTokens: 32e3
    },
    "anthropic/claude-opus-4.1": {
      id: "anthropic/claude-opus-4.1",
      name: "Anthropic: Claude Opus 4.1",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 75,
        cacheRead: 1.5,
        cacheWrite: 18.75
      },
      contextWindow: 2e5,
      maxTokens: 32e3
    },
    "anthropic/claude-opus-4.5": {
      id: "anthropic/claude-opus-4.5",
      name: "Anthropic: Claude Opus 4.5",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 0.5,
        cacheWrite: 6.25
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "anthropic/claude-opus-4.6": {
      id: "anthropic/claude-opus-4.6",
      name: "Anthropic: Claude Opus 4.6",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 0.5,
        cacheWrite: 6.25
      },
      contextWindow: 1e6,
      maxTokens: 128e3
    },
    "anthropic/claude-sonnet-4": {
      id: "anthropic/claude-sonnet-4",
      name: "Anthropic: Claude Sonnet 4",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "anthropic/claude-sonnet-4.5": {
      id: "anthropic/claude-sonnet-4.5",
      name: "Anthropic: Claude Sonnet 4.5",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 1e6,
      maxTokens: 64e3
    },
    "anthropic/claude-sonnet-4.6": {
      id: "anthropic/claude-sonnet-4.6",
      name: "Anthropic: Claude Sonnet 4.6",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 1e6,
      maxTokens: 128e3
    },
    "arcee-ai/trinity-large-preview:free": {
      id: "arcee-ai/trinity-large-preview:free",
      name: "Arcee AI: Trinity Large Preview (free)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131e3,
      maxTokens: 4096
    },
    "arcee-ai/trinity-mini": {
      id: "arcee-ai/trinity-mini",
      name: "Arcee AI: Trinity Mini",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.045,
        output: 0.15,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 131072
    },
    "arcee-ai/trinity-mini:free": {
      id: "arcee-ai/trinity-mini:free",
      name: "Arcee AI: Trinity Mini (free)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "arcee-ai/virtuoso-large": {
      id: "arcee-ai/virtuoso-large",
      name: "Arcee AI: Virtuoso Large",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.75,
        output: 1.2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 64e3
    },
    "auto": {
      id: "auto",
      name: "Auto",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 2e6,
      maxTokens: 3e4
    },
    "baidu/ernie-4.5-21b-a3b": {
      id: "baidu/ernie-4.5-21b-a3b",
      name: "Baidu: ERNIE 4.5 21B A3B",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.07,
        output: 0.28,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 12e4,
      maxTokens: 8e3
    },
    "baidu/ernie-4.5-vl-28b-a3b": {
      id: "baidu/ernie-4.5-vl-28b-a3b",
      name: "Baidu: ERNIE 4.5 VL 28B A3B",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.14,
        output: 0.56,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 3e4,
      maxTokens: 8e3
    },
    "bytedance-seed/seed-1.6": {
      id: "bytedance-seed/seed-1.6",
      name: "ByteDance Seed: Seed 1.6",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.25,
        output: 2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 32768
    },
    "bytedance-seed/seed-1.6-flash": {
      id: "bytedance-seed/seed-1.6-flash",
      name: "ByteDance Seed: Seed 1.6 Flash",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.075,
        output: 0.3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 32768
    },
    "bytedance-seed/seed-2.0-lite": {
      id: "bytedance-seed/seed-2.0-lite",
      name: "ByteDance Seed: Seed-2.0-Lite",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.25,
        output: 2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 131072
    },
    "bytedance-seed/seed-2.0-mini": {
      id: "bytedance-seed/seed-2.0-mini",
      name: "ByteDance Seed: Seed-2.0-Mini",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.09999999999999999,
        output: 0.39999999999999997,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 131072
    },
    "cohere/command-r-08-2024": {
      id: "cohere/command-r-08-2024",
      name: "Cohere: Command R (08-2024)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4e3
    },
    "cohere/command-r-plus-08-2024": {
      id: "cohere/command-r-plus-08-2024",
      name: "Cohere: Command R+ (08-2024)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 2.5,
        output: 10,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4e3
    },
    "deepseek/deepseek-chat": {
      id: "deepseek/deepseek-chat",
      name: "DeepSeek: DeepSeek V3",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.32,
        output: 0.8899999999999999,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 163840,
      maxTokens: 163840
    },
    "deepseek/deepseek-chat-v3-0324": {
      id: "deepseek/deepseek-chat-v3-0324",
      name: "DeepSeek: DeepSeek V3 0324",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.19999999999999998,
        output: 0.77,
        cacheRead: 0.135,
        cacheWrite: 0
      },
      contextWindow: 163840,
      maxTokens: 4096
    },
    "deepseek/deepseek-chat-v3.1": {
      id: "deepseek/deepseek-chat-v3.1",
      name: "DeepSeek: DeepSeek V3.1",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.15,
        output: 0.75,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 32768,
      maxTokens: 7168
    },
    "deepseek/deepseek-r1": {
      id: "deepseek/deepseek-r1",
      name: "DeepSeek: R1",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.7,
        output: 2.5,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 64e3,
      maxTokens: 16e3
    },
    "deepseek/deepseek-r1-0528": {
      id: "deepseek/deepseek-r1-0528",
      name: "DeepSeek: R1 0528",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.44999999999999996,
        output: 2.1500000000000004,
        cacheRead: 0.22499999999999998,
        cacheWrite: 0
      },
      contextWindow: 163840,
      maxTokens: 65536
    },
    "deepseek/deepseek-v3.1-terminus": {
      id: "deepseek/deepseek-v3.1-terminus",
      name: "DeepSeek: DeepSeek V3.1 Terminus",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.21,
        output: 0.78,
        cacheRead: 0.105,
        cacheWrite: 0
      },
      contextWindow: 163840,
      maxTokens: 65536
    },
    "deepseek/deepseek-v3.2": {
      id: "deepseek/deepseek-v3.2",
      name: "DeepSeek: DeepSeek V3.2",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.26,
        output: 0.38,
        cacheRead: 0.13,
        cacheWrite: 0
      },
      contextWindow: 163840,
      maxTokens: 4096
    },
    "deepseek/deepseek-v3.2-exp": {
      id: "deepseek/deepseek-v3.2-exp",
      name: "DeepSeek: DeepSeek V3.2 Exp",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.27,
        output: 0.41,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 163840,
      maxTokens: 65536
    },
    "essentialai/rnj-1-instruct": {
      id: "essentialai/rnj-1-instruct",
      name: "EssentialAI: Rnj 1 Instruct",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.15,
        output: 0.15,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 32768,
      maxTokens: 4096
    },
    "google/gemini-2.0-flash-001": {
      id: "google/gemini-2.0-flash-001",
      name: "Google: Gemini 2.0 Flash",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.09999999999999999,
        output: 0.39999999999999997,
        cacheRead: 0.024999999999999998,
        cacheWrite: 0.08333333333333334
      },
      contextWindow: 1048576,
      maxTokens: 8192
    },
    "google/gemini-2.0-flash-lite-001": {
      id: "google/gemini-2.0-flash-lite-001",
      name: "Google: Gemini 2.0 Flash Lite",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.075,
        output: 0.3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 8192
    },
    "google/gemini-2.5-flash": {
      id: "google/gemini-2.5-flash",
      name: "Google: Gemini 2.5 Flash",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.3,
        output: 2.5,
        cacheRead: 0.03,
        cacheWrite: 0.08333333333333334
      },
      contextWindow: 1048576,
      maxTokens: 65535
    },
    "google/gemini-2.5-flash-lite": {
      id: "google/gemini-2.5-flash-lite",
      name: "Google: Gemini 2.5 Flash Lite",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.09999999999999999,
        output: 0.39999999999999997,
        cacheRead: 0.01,
        cacheWrite: 0.08333333333333334
      },
      contextWindow: 1048576,
      maxTokens: 65535
    },
    "google/gemini-2.5-flash-lite-preview-09-2025": {
      id: "google/gemini-2.5-flash-lite-preview-09-2025",
      name: "Google: Gemini 2.5 Flash Lite Preview 09-2025",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.09999999999999999,
        output: 0.39999999999999997,
        cacheRead: 0.01,
        cacheWrite: 0.08333333333333334
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "google/gemini-2.5-pro": {
      id: "google/gemini-2.5-pro",
      name: "Google: Gemini 2.5 Pro",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0.375
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "google/gemini-2.5-pro-preview": {
      id: "google/gemini-2.5-pro-preview",
      name: "Google: Gemini 2.5 Pro Preview 06-05",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0.375
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "google/gemini-2.5-pro-preview-05-06": {
      id: "google/gemini-2.5-pro-preview-05-06",
      name: "Google: Gemini 2.5 Pro Preview 05-06",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0.375
      },
      contextWindow: 1048576,
      maxTokens: 65535
    },
    "google/gemini-3-flash-preview": {
      id: "google/gemini-3-flash-preview",
      name: "Google: Gemini 3 Flash Preview",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.5,
        output: 3,
        cacheRead: 0.049999999999999996,
        cacheWrite: 0.08333333333333334
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "google/gemini-3-pro-preview": {
      id: "google/gemini-3-pro-preview",
      name: "Google: Gemini 3 Pro Preview",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 12,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0.375
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "google/gemini-3.1-flash-lite-preview": {
      id: "google/gemini-3.1-flash-lite-preview",
      name: "Google: Gemini 3.1 Flash Lite Preview",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.25,
        output: 1.5,
        cacheRead: 0.024999999999999998,
        cacheWrite: 0.08333333333333334
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "google/gemini-3.1-pro-preview": {
      id: "google/gemini-3.1-pro-preview",
      name: "Google: Gemini 3.1 Pro Preview",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 12,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0.375
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "google/gemini-3.1-pro-preview-customtools": {
      id: "google/gemini-3.1-pro-preview-customtools",
      name: "Google: Gemini 3.1 Pro Preview Custom Tools",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 12,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0.375
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "inception/mercury": {
      id: "inception/mercury",
      name: "Inception: Mercury",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.25,
        output: 0.75,
        cacheRead: 0.024999999999999998,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 32e3
    },
    "inception/mercury-2": {
      id: "inception/mercury-2",
      name: "Inception: Mercury 2",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.25,
        output: 0.75,
        cacheRead: 0.024999999999999998,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 5e4
    },
    "inception/mercury-coder": {
      id: "inception/mercury-coder",
      name: "Inception: Mercury Coder",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.25,
        output: 0.75,
        cacheRead: 0.024999999999999998,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 32e3
    },
    "kwaipilot/kat-coder-pro": {
      id: "kwaipilot/kat-coder-pro",
      name: "Kwaipilot: KAT-Coder-Pro V1",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.207,
        output: 0.828,
        cacheRead: 0.0414,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 128e3
    },
    "meituan/longcat-flash-chat": {
      id: "meituan/longcat-flash-chat",
      name: "Meituan: LongCat Flash Chat",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.19999999999999998,
        output: 0.7999999999999999,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 131072
    },
    "meta-llama/llama-3-8b-instruct": {
      id: "meta-llama/llama-3-8b-instruct",
      name: "Meta: Llama 3 8B Instruct",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.03,
        output: 0.04,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 8192,
      maxTokens: 16384
    },
    "meta-llama/llama-3.1-70b-instruct": {
      id: "meta-llama/llama-3.1-70b-instruct",
      name: "Meta: Llama 3.1 70B Instruct",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.39999999999999997,
        output: 0.39999999999999997,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "meta-llama/llama-3.1-8b-instruct": {
      id: "meta-llama/llama-3.1-8b-instruct",
      name: "Meta: Llama 3.1 8B Instruct",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.02,
        output: 0.049999999999999996,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 16384,
      maxTokens: 16384
    },
    "meta-llama/llama-3.3-70b-instruct": {
      id: "meta-llama/llama-3.3-70b-instruct",
      name: "Meta: Llama 3.3 70B Instruct",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.09999999999999999,
        output: 0.32,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 16384
    },
    "meta-llama/llama-3.3-70b-instruct:free": {
      id: "meta-llama/llama-3.3-70b-instruct:free",
      name: "Meta: Llama 3.3 70B Instruct (free)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 65536,
      maxTokens: 4096
    },
    "meta-llama/llama-4-maverick": {
      id: "meta-llama/llama-4-maverick",
      name: "Meta: Llama 4 Maverick",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 16384
    },
    "meta-llama/llama-4-scout": {
      id: "meta-llama/llama-4-scout",
      name: "Meta: Llama 4 Scout",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.08,
        output: 0.3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 327680,
      maxTokens: 16384
    },
    "minimax/minimax-m1": {
      id: "minimax/minimax-m1",
      name: "MiniMax: MiniMax M1",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.39999999999999997,
        output: 2.2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 4e4
    },
    "minimax/minimax-m2": {
      id: "minimax/minimax-m2",
      name: "MiniMax: MiniMax M2",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.255,
        output: 1,
        cacheRead: 0.03,
        cacheWrite: 0
      },
      contextWindow: 196608,
      maxTokens: 196608
    },
    "minimax/minimax-m2.1": {
      id: "minimax/minimax-m2.1",
      name: "MiniMax: MiniMax M2.1",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.27,
        output: 0.95,
        cacheRead: 0.0290000007,
        cacheWrite: 0
      },
      contextWindow: 196608,
      maxTokens: 4096
    },
    "minimax/minimax-m2.5": {
      id: "minimax/minimax-m2.5",
      name: "MiniMax: MiniMax M2.5",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.19999999999999998,
        output: 1.17,
        cacheRead: 0.09999999999999999,
        cacheWrite: 0
      },
      contextWindow: 196608,
      maxTokens: 65536
    },
    "minimax/minimax-m2.5:free": {
      id: "minimax/minimax-m2.5:free",
      name: "MiniMax: MiniMax M2.5 (free)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 196608,
      maxTokens: 196608
    },
    "minimax/minimax-m2.7": {
      id: "minimax/minimax-m2.7",
      name: "MiniMax: MiniMax M2.7",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0.06,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "mistralai/codestral-2508": {
      id: "mistralai/codestral-2508",
      name: "Mistral: Codestral 2508",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 0.8999999999999999,
        cacheRead: 0.03,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 4096
    },
    "mistralai/devstral-2512": {
      id: "mistralai/devstral-2512",
      name: "Mistral: Devstral 2 2512",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.39999999999999997,
        output: 2,
        cacheRead: 0.04,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 4096
    },
    "mistralai/devstral-medium": {
      id: "mistralai/devstral-medium",
      name: "Mistral: Devstral Medium",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.39999999999999997,
        output: 2,
        cacheRead: 0.04,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "mistralai/devstral-small": {
      id: "mistralai/devstral-small",
      name: "Mistral: Devstral Small 1.1",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.09999999999999999,
        output: 0.3,
        cacheRead: 0.01,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "mistralai/ministral-14b-2512": {
      id: "mistralai/ministral-14b-2512",
      name: "Mistral: Ministral 3 14B 2512",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.19999999999999998,
        output: 0.19999999999999998,
        cacheRead: 0.02,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 4096
    },
    "mistralai/ministral-3b-2512": {
      id: "mistralai/ministral-3b-2512",
      name: "Mistral: Ministral 3 3B 2512",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.09999999999999999,
        output: 0.09999999999999999,
        cacheRead: 0.01,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "mistralai/ministral-8b-2512": {
      id: "mistralai/ministral-8b-2512",
      name: "Mistral: Ministral 3 8B 2512",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.15,
        output: 0.15,
        cacheRead: 0.015,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 4096
    },
    "mistralai/mistral-large": {
      id: "mistralai/mistral-large",
      name: "Mistral Large",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 2,
        output: 6,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "mistralai/mistral-large-2407": {
      id: "mistralai/mistral-large-2407",
      name: "Mistral Large 2407",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 2,
        output: 6,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "mistralai/mistral-large-2411": {
      id: "mistralai/mistral-large-2411",
      name: "Mistral Large 2411",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 2,
        output: 6,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "mistralai/mistral-large-2512": {
      id: "mistralai/mistral-large-2512",
      name: "Mistral: Mistral Large 3 2512",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.5,
        output: 1.5,
        cacheRead: 0.049999999999999996,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 4096
    },
    "mistralai/mistral-medium-3": {
      id: "mistralai/mistral-medium-3",
      name: "Mistral: Mistral Medium 3",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.39999999999999997,
        output: 2,
        cacheRead: 0.04,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "mistralai/mistral-medium-3.1": {
      id: "mistralai/mistral-medium-3.1",
      name: "Mistral: Mistral Medium 3.1",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.39999999999999997,
        output: 2,
        cacheRead: 0.04,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "mistralai/mistral-nemo": {
      id: "mistralai/mistral-nemo",
      name: "Mistral: Mistral Nemo",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.02,
        output: 0.04,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 16384
    },
    "mistralai/mistral-saba": {
      id: "mistralai/mistral-saba",
      name: "Mistral: Saba",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.19999999999999998,
        output: 0.6,
        cacheRead: 0.02,
        cacheWrite: 0
      },
      contextWindow: 32768,
      maxTokens: 4096
    },
    "mistralai/mistral-small-24b-instruct-2501": {
      id: "mistralai/mistral-small-24b-instruct-2501",
      name: "Mistral: Mistral Small 3",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.049999999999999996,
        output: 0.08,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 32768,
      maxTokens: 16384
    },
    "mistralai/mistral-small-2603": {
      id: "mistralai/mistral-small-2603",
      name: "Mistral: Mistral Small 4",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0.015,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 4096
    },
    "mistralai/mistral-small-3.1-24b-instruct:free": {
      id: "mistralai/mistral-small-3.1-24b-instruct:free",
      name: "Mistral: Mistral Small 3.1 24B (free)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "mistralai/mistral-small-3.2-24b-instruct": {
      id: "mistralai/mistral-small-3.2-24b-instruct",
      name: "Mistral: Mistral Small 3.2 24B",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.075,
        output: 0.19999999999999998,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "mistralai/mistral-small-creative": {
      id: "mistralai/mistral-small-creative",
      name: "Mistral: Mistral Small Creative",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.09999999999999999,
        output: 0.3,
        cacheRead: 0.01,
        cacheWrite: 0
      },
      contextWindow: 32768,
      maxTokens: 4096
    },
    "mistralai/mixtral-8x22b-instruct": {
      id: "mistralai/mixtral-8x22b-instruct",
      name: "Mistral: Mixtral 8x22B Instruct",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 2,
        output: 6,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0
      },
      contextWindow: 65536,
      maxTokens: 4096
    },
    "mistralai/mixtral-8x7b-instruct": {
      id: "mistralai/mixtral-8x7b-instruct",
      name: "Mistral: Mixtral 8x7B Instruct",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.54,
        output: 0.54,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 32768,
      maxTokens: 16384
    },
    "mistralai/pixtral-large-2411": {
      id: "mistralai/pixtral-large-2411",
      name: "Mistral: Pixtral Large 2411",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 6,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "mistralai/voxtral-small-24b-2507": {
      id: "mistralai/voxtral-small-24b-2507",
      name: "Mistral: Voxtral Small 24B 2507",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.09999999999999999,
        output: 0.3,
        cacheRead: 0.01,
        cacheWrite: 0
      },
      contextWindow: 32e3,
      maxTokens: 4096
    },
    "moonshotai/kimi-k2": {
      id: "moonshotai/kimi-k2",
      name: "MoonshotAI: Kimi K2 0711",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.55,
        output: 2.2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131e3,
      maxTokens: 4096
    },
    "moonshotai/kimi-k2-0905": {
      id: "moonshotai/kimi-k2-0905",
      name: "MoonshotAI: Kimi K2 0905",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.39999999999999997,
        output: 2,
        cacheRead: 0.15,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "moonshotai/kimi-k2-thinking": {
      id: "moonshotai/kimi-k2-thinking",
      name: "MoonshotAI: Kimi K2 Thinking",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.47,
        output: 2,
        cacheRead: 0.14100000000000001,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "moonshotai/kimi-k2.5": {
      id: "moonshotai/kimi-k2.5",
      name: "MoonshotAI: Kimi K2.5",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.41,
        output: 2.06,
        cacheRead: 0.07,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 4096
    },
    "nex-agi/deepseek-v3.1-nex-n1": {
      id: "nex-agi/deepseek-v3.1-nex-n1",
      name: "Nex AGI: DeepSeek V3.1 Nex N1",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.27,
        output: 1,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 163840
    },
    "nvidia/llama-3.1-nemotron-70b-instruct": {
      id: "nvidia/llama-3.1-nemotron-70b-instruct",
      name: "NVIDIA: Llama 3.1 Nemotron 70B Instruct",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 1.2,
        output: 1.2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 16384
    },
    "nvidia/llama-3.3-nemotron-super-49b-v1.5": {
      id: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
      name: "NVIDIA: Llama 3.3 Nemotron Super 49B V1.5",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.09999999999999999,
        output: 0.39999999999999997,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "nvidia/nemotron-3-nano-30b-a3b": {
      id: "nvidia/nemotron-3-nano-30b-a3b",
      name: "NVIDIA: Nemotron 3 Nano 30B A3B",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.049999999999999996,
        output: 0.19999999999999998,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 4096
    },
    "nvidia/nemotron-3-nano-30b-a3b:free": {
      id: "nvidia/nemotron-3-nano-30b-a3b:free",
      name: "NVIDIA: Nemotron 3 Nano 30B A3B (free)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 4096
    },
    "nvidia/nemotron-3-super-120b-a12b": {
      id: "nvidia/nemotron-3-super-120b-a12b",
      name: "NVIDIA: Nemotron 3 Super",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.09999999999999999,
        output: 0.5,
        cacheRead: 0.04,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 4096
    },
    "nvidia/nemotron-3-super-120b-a12b:free": {
      id: "nvidia/nemotron-3-super-120b-a12b:free",
      name: "NVIDIA: Nemotron 3 Super (free)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 262144
    },
    "nvidia/nemotron-nano-12b-v2-vl:free": {
      id: "nvidia/nemotron-nano-12b-v2-vl:free",
      name: "NVIDIA: Nemotron Nano 12B 2 VL (free)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 128e3
    },
    "nvidia/nemotron-nano-9b-v2": {
      id: "nvidia/nemotron-nano-9b-v2",
      name: "NVIDIA: Nemotron Nano 9B V2",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.04,
        output: 0.16,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "nvidia/nemotron-nano-9b-v2:free": {
      id: "nvidia/nemotron-nano-9b-v2:free",
      name: "NVIDIA: Nemotron Nano 9B V2 (free)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "openai/gpt-3.5-turbo": {
      id: "openai/gpt-3.5-turbo",
      name: "OpenAI: GPT-3.5 Turbo",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.5,
        output: 1.5,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 16385,
      maxTokens: 4096
    },
    "openai/gpt-3.5-turbo-0613": {
      id: "openai/gpt-3.5-turbo-0613",
      name: "OpenAI: GPT-3.5 Turbo (older v0613)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 1,
        output: 2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 4095,
      maxTokens: 4096
    },
    "openai/gpt-3.5-turbo-16k": {
      id: "openai/gpt-3.5-turbo-16k",
      name: "OpenAI: GPT-3.5 Turbo 16k",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 3,
        output: 4,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 16385,
      maxTokens: 4096
    },
    "openai/gpt-4": {
      id: "openai/gpt-4",
      name: "OpenAI: GPT-4",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 30,
        output: 60,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 8191,
      maxTokens: 4096
    },
    "openai/gpt-4-0314": {
      id: "openai/gpt-4-0314",
      name: "OpenAI: GPT-4 (older v0314)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 30,
        output: 60,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 8191,
      maxTokens: 4096
    },
    "openai/gpt-4-1106-preview": {
      id: "openai/gpt-4-1106-preview",
      name: "OpenAI: GPT-4 Turbo (older v1106)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 10,
        output: 30,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "openai/gpt-4-turbo": {
      id: "openai/gpt-4-turbo",
      name: "OpenAI: GPT-4 Turbo",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 10,
        output: 30,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "openai/gpt-4-turbo-preview": {
      id: "openai/gpt-4-turbo-preview",
      name: "OpenAI: GPT-4 Turbo Preview",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 10,
        output: 30,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "openai/gpt-4.1": {
      id: "openai/gpt-4.1",
      name: "OpenAI: GPT-4.1",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 8,
        cacheRead: 0.5,
        cacheWrite: 0
      },
      contextWindow: 1047576,
      maxTokens: 32768
    },
    "openai/gpt-4.1-mini": {
      id: "openai/gpt-4.1-mini",
      name: "OpenAI: GPT-4.1 Mini",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.39999999999999997,
        output: 1.5999999999999999,
        cacheRead: 0.09999999999999999,
        cacheWrite: 0
      },
      contextWindow: 1047576,
      maxTokens: 32768
    },
    "openai/gpt-4.1-nano": {
      id: "openai/gpt-4.1-nano",
      name: "OpenAI: GPT-4.1 Nano",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.09999999999999999,
        output: 0.39999999999999997,
        cacheRead: 0.024999999999999998,
        cacheWrite: 0
      },
      contextWindow: 1047576,
      maxTokens: 32768
    },
    "openai/gpt-4o": {
      id: "openai/gpt-4o",
      name: "OpenAI: GPT-4o",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2.5,
        output: 10,
        cacheRead: 1.25,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "openai/gpt-4o-2024-05-13": {
      id: "openai/gpt-4o-2024-05-13",
      name: "OpenAI: GPT-4o (2024-05-13)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 15,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "openai/gpt-4o-2024-08-06": {
      id: "openai/gpt-4o-2024-08-06",
      name: "OpenAI: GPT-4o (2024-08-06)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2.5,
        output: 10,
        cacheRead: 1.25,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "openai/gpt-4o-2024-11-20": {
      id: "openai/gpt-4o-2024-11-20",
      name: "OpenAI: GPT-4o (2024-11-20)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2.5,
        output: 10,
        cacheRead: 1.25,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "openai/gpt-4o-audio-preview": {
      id: "openai/gpt-4o-audio-preview",
      name: "OpenAI: GPT-4o Audio",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 2.5,
        output: 10,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "openai/gpt-4o-mini": {
      id: "openai/gpt-4o-mini",
      name: "OpenAI: GPT-4o-mini",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0.075,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "openai/gpt-4o-mini-2024-07-18": {
      id: "openai/gpt-4o-mini-2024-07-18",
      name: "OpenAI: GPT-4o-mini (2024-07-18)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0.075,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "openai/gpt-4o:extended": {
      id: "openai/gpt-4o:extended",
      name: "OpenAI: GPT-4o (extended)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 6,
        output: 18,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 64e3
    },
    "openai/gpt-5": {
      id: "openai/gpt-5",
      name: "OpenAI: GPT-5",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5-codex": {
      id: "openai/gpt-5-codex",
      name: "OpenAI: GPT-5 Codex",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5-image": {
      id: "openai/gpt-5-image",
      name: "OpenAI: GPT-5 Image",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 10,
        output: 10,
        cacheRead: 1.25,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5-image-mini": {
      id: "openai/gpt-5-image-mini",
      name: "OpenAI: GPT-5 Image Mini",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2.5,
        output: 2,
        cacheRead: 0.25,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5-mini": {
      id: "openai/gpt-5-mini",
      name: "OpenAI: GPT-5 Mini",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.25,
        output: 2,
        cacheRead: 0.024999999999999998,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5-nano": {
      id: "openai/gpt-5-nano",
      name: "OpenAI: GPT-5 Nano",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.049999999999999996,
        output: 0.39999999999999997,
        cacheRead: 5e-3,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5-pro": {
      id: "openai/gpt-5-pro",
      name: "OpenAI: GPT-5 Pro",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 120,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.1": {
      id: "openai/gpt-5.1",
      name: "OpenAI: GPT-5.1",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.1-chat": {
      id: "openai/gpt-5.1-chat",
      name: "OpenAI: GPT-5.1 Chat",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "openai/gpt-5.1-codex": {
      id: "openai/gpt-5.1-codex",
      name: "OpenAI: GPT-5.1-Codex",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.1-codex-max": {
      id: "openai/gpt-5.1-codex-max",
      name: "OpenAI: GPT-5.1-Codex-Max",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.1-codex-mini": {
      id: "openai/gpt-5.1-codex-mini",
      name: "OpenAI: GPT-5.1-Codex-Mini",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.25,
        output: 2,
        cacheRead: 0.024999999999999998,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 1e5
    },
    "openai/gpt-5.2": {
      id: "openai/gpt-5.2",
      name: "OpenAI: GPT-5.2",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.2-chat": {
      id: "openai/gpt-5.2-chat",
      name: "OpenAI: GPT-5.2 Chat",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "openai/gpt-5.2-codex": {
      id: "openai/gpt-5.2-codex",
      name: "OpenAI: GPT-5.2-Codex",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.2-pro": {
      id: "openai/gpt-5.2-pro",
      name: "OpenAI: GPT-5.2 Pro",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 21,
        output: 168,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.3-chat": {
      id: "openai/gpt-5.3-chat",
      name: "OpenAI: GPT-5.3 Chat",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "openai/gpt-5.3-codex": {
      id: "openai/gpt-5.3-codex",
      name: "OpenAI: GPT-5.3-Codex",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.4": {
      id: "openai/gpt-5.4",
      name: "OpenAI: GPT-5.4",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2.5,
        output: 15,
        cacheRead: 0.25,
        cacheWrite: 0
      },
      contextWindow: 105e4,
      maxTokens: 128e3
    },
    "openai/gpt-5.4-mini": {
      id: "openai/gpt-5.4-mini",
      name: "OpenAI: GPT-5.4 Mini",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.75,
        output: 4.5,
        cacheRead: 0.075,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.4-nano": {
      id: "openai/gpt-5.4-nano",
      name: "OpenAI: GPT-5.4 Nano",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.19999999999999998,
        output: 1.25,
        cacheRead: 0.02,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.4-pro": {
      id: "openai/gpt-5.4-pro",
      name: "OpenAI: GPT-5.4 Pro",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 30,
        output: 180,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 105e4,
      maxTokens: 128e3
    },
    "openai/gpt-oss-120b": {
      id: "openai/gpt-oss-120b",
      name: "OpenAI: gpt-oss-120b",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.039,
        output: 0.19,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "openai/gpt-oss-120b:free": {
      id: "openai/gpt-oss-120b:free",
      name: "OpenAI: gpt-oss-120b (free)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 131072
    },
    "openai/gpt-oss-20b": {
      id: "openai/gpt-oss-20b",
      name: "OpenAI: gpt-oss-20b",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.03,
        output: 0.14,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "openai/gpt-oss-20b:free": {
      id: "openai/gpt-oss-20b:free",
      name: "OpenAI: gpt-oss-20b (free)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 131072
    },
    "openai/gpt-oss-safeguard-20b": {
      id: "openai/gpt-oss-safeguard-20b",
      name: "OpenAI: gpt-oss-safeguard-20b",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.075,
        output: 0.3,
        cacheRead: 0.037,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 65536
    },
    "openai/o1": {
      id: "openai/o1",
      name: "OpenAI: o1",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 60,
        cacheRead: 7.5,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "openai/o3": {
      id: "openai/o3",
      name: "OpenAI: o3",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 8,
        cacheRead: 0.5,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "openai/o3-deep-research": {
      id: "openai/o3-deep-research",
      name: "OpenAI: o3 Deep Research",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 10,
        output: 40,
        cacheRead: 2.5,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "openai/o3-mini": {
      id: "openai/o3-mini",
      name: "OpenAI: o3 Mini",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1.1,
        output: 4.4,
        cacheRead: 0.55,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "openai/o3-mini-high": {
      id: "openai/o3-mini-high",
      name: "OpenAI: o3 Mini High",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1.1,
        output: 4.4,
        cacheRead: 0.55,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "openai/o3-pro": {
      id: "openai/o3-pro",
      name: "OpenAI: o3 Pro",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 20,
        output: 80,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "openai/o4-mini": {
      id: "openai/o4-mini",
      name: "OpenAI: o4 Mini",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.1,
        output: 4.4,
        cacheRead: 0.275,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "openai/o4-mini-deep-research": {
      id: "openai/o4-mini-deep-research",
      name: "OpenAI: o4 Mini Deep Research",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 8,
        cacheRead: 0.5,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "openai/o4-mini-high": {
      id: "openai/o4-mini-high",
      name: "OpenAI: o4 Mini High",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.1,
        output: 4.4,
        cacheRead: 0.275,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "openrouter/auto": {
      id: "openrouter/auto",
      name: "Auto Router",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: -1e6,
        output: -1e6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 2e6,
      maxTokens: 4096
    },
    "openrouter/free": {
      id: "openrouter/free",
      name: "Free Models Router",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 4096
    },
    "prime-intellect/intellect-3": {
      id: "prime-intellect/intellect-3",
      name: "Prime Intellect: INTELLECT-3",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.19999999999999998,
        output: 1.1,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 131072
    },
    "qwen/qwen-2.5-72b-instruct": {
      id: "qwen/qwen-2.5-72b-instruct",
      name: "Qwen2.5 72B Instruct",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.12,
        output: 0.39,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 32768,
      maxTokens: 16384
    },
    "qwen/qwen-2.5-7b-instruct": {
      id: "qwen/qwen-2.5-7b-instruct",
      name: "Qwen: Qwen2.5 7B Instruct",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.04,
        output: 0.09999999999999999,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 32768,
      maxTokens: 4096
    },
    "qwen/qwen-max": {
      id: "qwen/qwen-max",
      name: "Qwen: Qwen-Max ",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 1.04,
        output: 4.16,
        cacheRead: 0.20800000000000002,
        cacheWrite: 0
      },
      contextWindow: 32768,
      maxTokens: 8192
    },
    "qwen/qwen-plus": {
      id: "qwen/qwen-plus",
      name: "Qwen: Qwen-Plus",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.26,
        output: 0.78,
        cacheRead: 0.052000000000000005,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 32768
    },
    "qwen/qwen-plus-2025-07-28": {
      id: "qwen/qwen-plus-2025-07-28",
      name: "Qwen: Qwen Plus 0728",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.26,
        output: 0.78,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 32768
    },
    "qwen/qwen-plus-2025-07-28:thinking": {
      id: "qwen/qwen-plus-2025-07-28:thinking",
      name: "Qwen: Qwen Plus 0728 (thinking)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.26,
        output: 0.78,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 32768
    },
    "qwen/qwen-turbo": {
      id: "qwen/qwen-turbo",
      name: "Qwen: Qwen-Turbo",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.0325,
        output: 0.13,
        cacheRead: 0.006500000000000001,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 8192
    },
    "qwen/qwen-vl-max": {
      id: "qwen/qwen-vl-max",
      name: "Qwen: Qwen VL Max",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.52,
        output: 2.08,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 32768
    },
    "qwen/qwen3-14b": {
      id: "qwen/qwen3-14b",
      name: "Qwen: Qwen3 14B",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.06,
        output: 0.24,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 40960,
      maxTokens: 40960
    },
    "qwen/qwen3-235b-a22b": {
      id: "qwen/qwen3-235b-a22b",
      name: "Qwen: Qwen3 235B A22B",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.45499999999999996,
        output: 1.8199999999999998,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 8192
    },
    "qwen/qwen3-235b-a22b-2507": {
      id: "qwen/qwen3-235b-a22b-2507",
      name: "Qwen: Qwen3 235B A22B Instruct 2507",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.071,
        output: 0.09999999999999999,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 4096
    },
    "qwen/qwen3-235b-a22b-thinking-2507": {
      id: "qwen/qwen3-235b-a22b-thinking-2507",
      name: "Qwen: Qwen3 235B A22B Thinking 2507",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.14950000000000002,
        output: 1.495,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "qwen/qwen3-30b-a3b": {
      id: "qwen/qwen3-30b-a3b",
      name: "Qwen: Qwen3 30B A3B",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.08,
        output: 0.28,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 40960,
      maxTokens: 40960
    },
    "qwen/qwen3-30b-a3b-instruct-2507": {
      id: "qwen/qwen3-30b-a3b-instruct-2507",
      name: "Qwen: Qwen3 30B A3B Instruct 2507",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.09,
        output: 0.3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 262144
    },
    "qwen/qwen3-30b-a3b-thinking-2507": {
      id: "qwen/qwen3-30b-a3b-thinking-2507",
      name: "Qwen: Qwen3 30B A3B Thinking 2507",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.08,
        output: 0.39999999999999997,
        cacheRead: 0.08,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 131072
    },
    "qwen/qwen3-32b": {
      id: "qwen/qwen3-32b",
      name: "Qwen: Qwen3 32B",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.08,
        output: 0.24,
        cacheRead: 0.04,
        cacheWrite: 0
      },
      contextWindow: 40960,
      maxTokens: 40960
    },
    "qwen/qwen3-4b:free": {
      id: "qwen/qwen3-4b:free",
      name: "Qwen: Qwen3 4B (free)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 40960,
      maxTokens: 4096
    },
    "qwen/qwen3-8b": {
      id: "qwen/qwen3-8b",
      name: "Qwen: Qwen3 8B",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.049999999999999996,
        output: 0.39999999999999997,
        cacheRead: 0.049999999999999996,
        cacheWrite: 0
      },
      contextWindow: 40960,
      maxTokens: 8192
    },
    "qwen/qwen3-coder": {
      id: "qwen/qwen3-coder",
      name: "Qwen: Qwen3 Coder 480B A35B",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.22,
        output: 1,
        cacheRead: 0.022,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 4096
    },
    "qwen/qwen3-coder-30b-a3b-instruct": {
      id: "qwen/qwen3-coder-30b-a3b-instruct",
      name: "Qwen: Qwen3 Coder 30B A3B Instruct",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.07,
        output: 0.27,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 16e4,
      maxTokens: 32768
    },
    "qwen/qwen3-coder-flash": {
      id: "qwen/qwen3-coder-flash",
      name: "Qwen: Qwen3 Coder Flash",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.195,
        output: 0.975,
        cacheRead: 0.039,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 65536
    },
    "qwen/qwen3-coder-next": {
      id: "qwen/qwen3-coder-next",
      name: "Qwen: Qwen3 Coder Next",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.12,
        output: 0.75,
        cacheRead: 0.06,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 65536
    },
    "qwen/qwen3-coder-plus": {
      id: "qwen/qwen3-coder-plus",
      name: "Qwen: Qwen3 Coder Plus",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.65,
        output: 3.25,
        cacheRead: 0.13,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 65536
    },
    "qwen/qwen3-coder:free": {
      id: "qwen/qwen3-coder:free",
      name: "Qwen: Qwen3 Coder 480B A35B (free)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262e3,
      maxTokens: 262e3
    },
    "qwen/qwen3-max": {
      id: "qwen/qwen3-max",
      name: "Qwen: Qwen3 Max",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.78,
        output: 3.9,
        cacheRead: 0.156,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 32768
    },
    "qwen/qwen3-max-thinking": {
      id: "qwen/qwen3-max-thinking",
      name: "Qwen: Qwen3 Max Thinking",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.78,
        output: 3.9,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 32768
    },
    "qwen/qwen3-next-80b-a3b-instruct": {
      id: "qwen/qwen3-next-80b-a3b-instruct",
      name: "Qwen: Qwen3 Next 80B A3B Instruct",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.09,
        output: 1.1,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 4096
    },
    "qwen/qwen3-next-80b-a3b-instruct:free": {
      id: "qwen/qwen3-next-80b-a3b-instruct:free",
      name: "Qwen: Qwen3 Next 80B A3B Instruct (free)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 4096
    },
    "qwen/qwen3-next-80b-a3b-thinking": {
      id: "qwen/qwen3-next-80b-a3b-thinking",
      name: "Qwen: Qwen3 Next 80B A3B Thinking",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.0975,
        output: 0.78,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 32768
    },
    "qwen/qwen3-vl-235b-a22b-instruct": {
      id: "qwen/qwen3-vl-235b-a22b-instruct",
      name: "Qwen: Qwen3 VL 235B A22B Instruct",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.19999999999999998,
        output: 0.88,
        cacheRead: 0.11,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 4096
    },
    "qwen/qwen3-vl-235b-a22b-thinking": {
      id: "qwen/qwen3-vl-235b-a22b-thinking",
      name: "Qwen: Qwen3 VL 235B A22B Thinking",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.26,
        output: 2.6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 32768
    },
    "qwen/qwen3-vl-30b-a3b-instruct": {
      id: "qwen/qwen3-vl-30b-a3b-instruct",
      name: "Qwen: Qwen3 VL 30B A3B Instruct",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.13,
        output: 0.52,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 32768
    },
    "qwen/qwen3-vl-30b-a3b-thinking": {
      id: "qwen/qwen3-vl-30b-a3b-thinking",
      name: "Qwen: Qwen3 VL 30B A3B Thinking",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.13,
        output: 1.56,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 32768
    },
    "qwen/qwen3-vl-32b-instruct": {
      id: "qwen/qwen3-vl-32b-instruct",
      name: "Qwen: Qwen3 VL 32B Instruct",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.10400000000000001,
        output: 0.41600000000000004,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 32768
    },
    "qwen/qwen3-vl-8b-instruct": {
      id: "qwen/qwen3-vl-8b-instruct",
      name: "Qwen: Qwen3 VL 8B Instruct",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.08,
        output: 0.5,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 32768
    },
    "qwen/qwen3-vl-8b-thinking": {
      id: "qwen/qwen3-vl-8b-thinking",
      name: "Qwen: Qwen3 VL 8B Thinking",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.117,
        output: 1.365,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 32768
    },
    "qwen/qwen3.5-122b-a10b": {
      id: "qwen/qwen3.5-122b-a10b",
      name: "Qwen: Qwen3.5-122B-A10B",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.26,
        output: 2.08,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 65536
    },
    "qwen/qwen3.5-27b": {
      id: "qwen/qwen3.5-27b",
      name: "Qwen: Qwen3.5-27B",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.195,
        output: 1.56,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 65536
    },
    "qwen/qwen3.5-35b-a3b": {
      id: "qwen/qwen3.5-35b-a3b",
      name: "Qwen: Qwen3.5-35B-A3B",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.1625,
        output: 1.3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 65536
    },
    "qwen/qwen3.5-397b-a17b": {
      id: "qwen/qwen3.5-397b-a17b",
      name: "Qwen: Qwen3.5 397B A17B",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.39,
        output: 2.34,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 65536
    },
    "qwen/qwen3.5-9b": {
      id: "qwen/qwen3.5-9b",
      name: "Qwen: Qwen3.5-9B",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.049999999999999996,
        output: 0.15,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 4096
    },
    "qwen/qwen3.5-flash-02-23": {
      id: "qwen/qwen3.5-flash-02-23",
      name: "Qwen: Qwen3.5-Flash",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.065,
        output: 0.26,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 65536
    },
    "qwen/qwen3.5-plus-02-15": {
      id: "qwen/qwen3.5-plus-02-15",
      name: "Qwen: Qwen3.5 Plus 2026-02-15",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.26,
        output: 1.56,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 65536
    },
    "qwen/qwq-32b": {
      id: "qwen/qwq-32b",
      name: "Qwen: QwQ 32B",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.15,
        output: 0.58,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 131072
    },
    "relace/relace-search": {
      id: "relace/relace-search",
      name: "Relace: Relace Search",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 1,
        output: 3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 128e3
    },
    "sao10k/l3-euryale-70b": {
      id: "sao10k/l3-euryale-70b",
      name: "Sao10k: Llama 3 Euryale 70B v2.1",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 1.48,
        output: 1.48,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 8192,
      maxTokens: 8192
    },
    "sao10k/l3.1-euryale-70b": {
      id: "sao10k/l3.1-euryale-70b",
      name: "Sao10K: Llama 3.1 Euryale 70B v2.2",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.85,
        output: 0.85,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 16384
    },
    "stepfun/step-3.5-flash": {
      id: "stepfun/step-3.5-flash",
      name: "StepFun: Step 3.5 Flash",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.09999999999999999,
        output: 0.3,
        cacheRead: 0.02,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 256e3
    },
    "stepfun/step-3.5-flash:free": {
      id: "stepfun/step-3.5-flash:free",
      name: "StepFun: Step 3.5 Flash (free)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 256e3
    },
    "thedrummer/rocinante-12b": {
      id: "thedrummer/rocinante-12b",
      name: "TheDrummer: Rocinante 12B",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.16999999999999998,
        output: 0.43,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 32768,
      maxTokens: 32768
    },
    "thedrummer/unslopnemo-12b": {
      id: "thedrummer/unslopnemo-12b",
      name: "TheDrummer: UnslopNemo 12B",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.39999999999999997,
        output: 0.39999999999999997,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 32768,
      maxTokens: 32768
    },
    "tngtech/deepseek-r1t2-chimera": {
      id: "tngtech/deepseek-r1t2-chimera",
      name: "TNG: DeepSeek R1T2 Chimera",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.25,
        output: 0.85,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 163840,
      maxTokens: 163840
    },
    "upstage/solar-pro-3": {
      id: "upstage/solar-pro-3",
      name: "Upstage: Solar Pro 3",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0.015,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "x-ai/grok-3": {
      id: "x-ai/grok-3",
      name: "xAI: Grok 3",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.75,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "x-ai/grok-3-beta": {
      id: "x-ai/grok-3-beta",
      name: "xAI: Grok 3 Beta",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.75,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "x-ai/grok-3-mini": {
      id: "x-ai/grok-3-mini",
      name: "xAI: Grok 3 Mini",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 0.5,
        cacheRead: 0.075,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "x-ai/grok-3-mini-beta": {
      id: "x-ai/grok-3-mini-beta",
      name: "xAI: Grok 3 Mini Beta",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 0.5,
        cacheRead: 0.075,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "x-ai/grok-4": {
      id: "x-ai/grok-4",
      name: "xAI: Grok 4",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.75,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 4096
    },
    "x-ai/grok-4-fast": {
      id: "x-ai/grok-4-fast",
      name: "xAI: Grok 4 Fast",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.19999999999999998,
        output: 0.5,
        cacheRead: 0.049999999999999996,
        cacheWrite: 0
      },
      contextWindow: 2e6,
      maxTokens: 3e4
    },
    "x-ai/grok-4.1-fast": {
      id: "x-ai/grok-4.1-fast",
      name: "xAI: Grok 4.1 Fast",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.19999999999999998,
        output: 0.5,
        cacheRead: 0.049999999999999996,
        cacheWrite: 0
      },
      contextWindow: 2e6,
      maxTokens: 3e4
    },
    "x-ai/grok-4.20-beta": {
      id: "x-ai/grok-4.20-beta",
      name: "xAI: Grok 4.20 Beta",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 6,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0
      },
      contextWindow: 2e6,
      maxTokens: 4096
    },
    "x-ai/grok-code-fast-1": {
      id: "x-ai/grok-code-fast-1",
      name: "xAI: Grok Code Fast 1",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.19999999999999998,
        output: 1.5,
        cacheRead: 0.02,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 1e4
    },
    "xiaomi/mimo-v2-flash": {
      id: "xiaomi/mimo-v2-flash",
      name: "Xiaomi: MiMo-V2-Flash",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.09,
        output: 0.29,
        cacheRead: 0.045,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 65536
    },
    "xiaomi/mimo-v2-omni": {
      id: "xiaomi/mimo-v2-omni",
      name: "Xiaomi: MiMo-V2-Omni",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.39999999999999997,
        output: 2,
        cacheRead: 0.08,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 65536
    },
    "xiaomi/mimo-v2-pro": {
      id: "xiaomi/mimo-v2-pro",
      name: "Xiaomi: MiMo-V2-Pro",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1,
        output: 3,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 131072
    },
    "z-ai/glm-4-32b": {
      id: "z-ai/glm-4-32b",
      name: "Z.ai: GLM 4 32B ",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.09999999999999999,
        output: 0.09999999999999999,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "z-ai/glm-4.5": {
      id: "z-ai/glm-4.5",
      name: "Z.ai: GLM 4.5",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.2,
        cacheRead: 0.11,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 98304
    },
    "z-ai/glm-4.5-air": {
      id: "z-ai/glm-4.5-air",
      name: "Z.ai: GLM 4.5 Air",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.13,
        output: 0.85,
        cacheRead: 0.024999999999999998,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 98304
    },
    "z-ai/glm-4.5-air:free": {
      id: "z-ai/glm-4.5-air:free",
      name: "Z.ai: GLM 4.5 Air (free)",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 96e3
    },
    "z-ai/glm-4.5v": {
      id: "z-ai/glm-4.5v",
      name: "Z.ai: GLM 4.5V",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.6,
        output: 1.7999999999999998,
        cacheRead: 0.11,
        cacheWrite: 0
      },
      contextWindow: 65536,
      maxTokens: 16384
    },
    "z-ai/glm-4.6": {
      id: "z-ai/glm-4.6",
      name: "Z.ai: GLM 4.6",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.39,
        output: 1.9,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 204800
    },
    "z-ai/glm-4.6v": {
      id: "z-ai/glm-4.6v",
      name: "Z.ai: GLM 4.6V",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.3,
        output: 0.8999999999999999,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 131072
    },
    "z-ai/glm-4.7": {
      id: "z-ai/glm-4.7",
      name: "Z.ai: GLM 4.7",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.39,
        output: 1.75,
        cacheRead: 0.195,
        cacheWrite: 0
      },
      contextWindow: 202752,
      maxTokens: 65535
    },
    "z-ai/glm-4.7-flash": {
      id: "z-ai/glm-4.7-flash",
      name: "Z.ai: GLM 4.7 Flash",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.06,
        output: 0.39999999999999997,
        cacheRead: 0.0100000002,
        cacheWrite: 0
      },
      contextWindow: 202752,
      maxTokens: 4096
    },
    "z-ai/glm-5": {
      id: "z-ai/glm-5",
      name: "Z.ai: GLM 5",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 1.9,
        cacheRead: 0.119,
        cacheWrite: 0
      },
      contextWindow: 8e4,
      maxTokens: 131072
    },
    "z-ai/glm-5-turbo": {
      id: "z-ai/glm-5-turbo",
      name: "Z.ai: GLM 5 Turbo",
      api: "openai-completions",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.96,
        output: 3.1999999999999997,
        cacheRead: 0.192,
        cacheWrite: 0
      },
      contextWindow: 202752,
      maxTokens: 131072
    }
  },
  "vercel-ai-gateway": {
    "alibaba/qwen-3-14b": {
      id: "alibaba/qwen-3-14b",
      name: "Qwen3-14B",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.12,
        output: 0.24,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 40960,
      maxTokens: 16384
    },
    "alibaba/qwen-3-235b": {
      id: "alibaba/qwen-3-235b",
      name: "Qwen3-235B-A22B",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.071,
        output: 0.463,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 40960,
      maxTokens: 16384
    },
    "alibaba/qwen-3-30b": {
      id: "alibaba/qwen-3-30b",
      name: "Qwen3-30B-A3B",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.08,
        output: 0.29,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 40960,
      maxTokens: 16384
    },
    "alibaba/qwen-3-32b": {
      id: "alibaba/qwen-3-32b",
      name: "Qwen 3 32B",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.29,
        output: 0.59,
        cacheRead: 0.145,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 40960
    },
    "alibaba/qwen3-235b-a22b-thinking": {
      id: "alibaba/qwen3-235b-a22b-thinking",
      name: "Qwen3 235B A22B Thinking 2507",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.22999999999999998,
        output: 2.3,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0
      },
      contextWindow: 262114,
      maxTokens: 262114
    },
    "alibaba/qwen3-coder": {
      id: "alibaba/qwen3-coder",
      name: "Qwen3 Coder 480B A35B Instruct",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.39999999999999997,
        output: 1.5999999999999999,
        cacheRead: 0.022,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 66536
    },
    "alibaba/qwen3-coder-30b-a3b": {
      id: "alibaba/qwen3-coder-30b-a3b",
      name: "Qwen 3 Coder 30B A3B Instruct",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 8192
    },
    "alibaba/qwen3-coder-next": {
      id: "alibaba/qwen3-coder-next",
      name: "Qwen3 Coder Next",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.5,
        output: 1.2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 256e3
    },
    "alibaba/qwen3-coder-plus": {
      id: "alibaba/qwen3-coder-plus",
      name: "Qwen3 Coder Plus",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 1,
        output: 5,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 65536
    },
    "alibaba/qwen3-max": {
      id: "alibaba/qwen3-max",
      name: "Qwen3 Max",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 1.2,
        output: 6,
        cacheRead: 0.24,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 32768
    },
    "alibaba/qwen3-max-preview": {
      id: "alibaba/qwen3-max-preview",
      name: "Qwen3 Max Preview",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 1.2,
        output: 6,
        cacheRead: 0.24,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 32768
    },
    "alibaba/qwen3-max-thinking": {
      id: "alibaba/qwen3-max-thinking",
      name: "Qwen 3 Max Thinking",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1.2,
        output: 6,
        cacheRead: 0.24,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 65536
    },
    "alibaba/qwen3-vl-thinking": {
      id: "alibaba/qwen3-vl-thinking",
      name: "Qwen3 VL 235B A22B Thinking",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.22,
        output: 0.88,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 256e3
    },
    "alibaba/qwen3.5-flash": {
      id: "alibaba/qwen3.5-flash",
      name: "Qwen 3.5 Flash",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.09999999999999999,
        output: 0.39999999999999997,
        cacheRead: 1e-3,
        cacheWrite: 0.125
      },
      contextWindow: 1e6,
      maxTokens: 64e3
    },
    "alibaba/qwen3.5-plus": {
      id: "alibaba/qwen3.5-plus",
      name: "Qwen 3.5 Plus",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.39999999999999997,
        output: 2.4,
        cacheRead: 0.04,
        cacheWrite: 0.5
      },
      contextWindow: 1e6,
      maxTokens: 64e3
    },
    "anthropic/claude-3-haiku": {
      id: "anthropic/claude-3-haiku",
      name: "Claude 3 Haiku",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.25,
        output: 1.25,
        cacheRead: 0.03,
        cacheWrite: 0.3
      },
      contextWindow: 2e5,
      maxTokens: 4096
    },
    "anthropic/claude-3.5-haiku": {
      id: "anthropic/claude-3.5-haiku",
      name: "Claude 3.5 Haiku",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.7999999999999999,
        output: 4,
        cacheRead: 0.08,
        cacheWrite: 1
      },
      contextWindow: 2e5,
      maxTokens: 8192
    },
    "anthropic/claude-3.5-sonnet": {
      id: "anthropic/claude-3.5-sonnet",
      name: "Claude 3.5 Sonnet",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 8192
    },
    "anthropic/claude-3.5-sonnet-20240620": {
      id: "anthropic/claude-3.5-sonnet-20240620",
      name: "Claude 3.5 Sonnet (2024-06-20)",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 8192
    },
    "anthropic/claude-3.7-sonnet": {
      id: "anthropic/claude-3.7-sonnet",
      name: "Claude 3.7 Sonnet",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 2e5,
      maxTokens: 8192
    },
    "anthropic/claude-haiku-4.5": {
      id: "anthropic/claude-haiku-4.5",
      name: "Claude Haiku 4.5",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1,
        output: 5,
        cacheRead: 0.09999999999999999,
        cacheWrite: 1.25
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "anthropic/claude-opus-4": {
      id: "anthropic/claude-opus-4",
      name: "Claude Opus 4",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 75,
        cacheRead: 1.5,
        cacheWrite: 18.75
      },
      contextWindow: 2e5,
      maxTokens: 32e3
    },
    "anthropic/claude-opus-4.1": {
      id: "anthropic/claude-opus-4.1",
      name: "Claude Opus 4.1",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 75,
        cacheRead: 1.5,
        cacheWrite: 18.75
      },
      contextWindow: 2e5,
      maxTokens: 32e3
    },
    "anthropic/claude-opus-4.5": {
      id: "anthropic/claude-opus-4.5",
      name: "Claude Opus 4.5",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 0.5,
        cacheWrite: 6.25
      },
      contextWindow: 2e5,
      maxTokens: 64e3
    },
    "anthropic/claude-opus-4.6": {
      id: "anthropic/claude-opus-4.6",
      name: "Claude Opus 4.6",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 0.5,
        cacheWrite: 6.25
      },
      contextWindow: 1e6,
      maxTokens: 128e3
    },
    "anthropic/claude-sonnet-4": {
      id: "anthropic/claude-sonnet-4",
      name: "Claude Sonnet 4",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 1e6,
      maxTokens: 64e3
    },
    "anthropic/claude-sonnet-4.5": {
      id: "anthropic/claude-sonnet-4.5",
      name: "Claude Sonnet 4.5",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 1e6,
      maxTokens: 64e3
    },
    "anthropic/claude-sonnet-4.6": {
      id: "anthropic/claude-sonnet-4.6",
      name: "Claude Sonnet 4.6",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.3,
        cacheWrite: 3.75
      },
      contextWindow: 1e6,
      maxTokens: 128e3
    },
    "arcee-ai/trinity-large-preview": {
      id: "arcee-ai/trinity-large-preview",
      name: "Trinity Large Preview",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.25,
        output: 1,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131e3,
      maxTokens: 131e3
    },
    "bytedance/seed-1.6": {
      id: "bytedance/seed-1.6",
      name: "Seed 1.6",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.25,
        output: 2,
        cacheRead: 0.049999999999999996,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 32e3
    },
    "cohere/command-a": {
      id: "cohere/command-a",
      name: "Command A",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 2.5,
        output: 10,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 8e3
    },
    "deepseek/deepseek-r1": {
      id: "deepseek/deepseek-r1",
      name: "DeepSeek-R1",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1.35,
        output: 5.4,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 8192
    },
    "deepseek/deepseek-v3": {
      id: "deepseek/deepseek-v3",
      name: "DeepSeek V3 0324",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.77,
        output: 0.77,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 163840,
      maxTokens: 16384
    },
    "deepseek/deepseek-v3.1": {
      id: "deepseek/deepseek-v3.1",
      name: "DeepSeek-V3.1",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.5,
        output: 1.5,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 163840,
      maxTokens: 16384
    },
    "deepseek/deepseek-v3.1-terminus": {
      id: "deepseek/deepseek-v3.1-terminus",
      name: "DeepSeek V3.1 Terminus",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.27,
        output: 1,
        cacheRead: 0.135,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 65536
    },
    "deepseek/deepseek-v3.2": {
      id: "deepseek/deepseek-v3.2",
      name: "DeepSeek V3.2",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.28,
        output: 0.42,
        cacheRead: 0.028,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 8e3
    },
    "deepseek/deepseek-v3.2-thinking": {
      id: "deepseek/deepseek-v3.2-thinking",
      name: "DeepSeek V3.2 Thinking",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.28,
        output: 0.42,
        cacheRead: 0.028,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 64e3
    },
    "google/gemini-2.0-flash": {
      id: "google/gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0.024999999999999998,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 8192
    },
    "google/gemini-2.0-flash-lite": {
      id: "google/gemini-2.0-flash-lite",
      name: "Gemini 2.0 Flash Lite",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.075,
        output: 0.3,
        cacheRead: 0.02,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 8192
    },
    "google/gemini-2.5-flash": {
      id: "google/gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.3,
        output: 2.5,
        cacheRead: 0.03,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 65536
    },
    "google/gemini-2.5-flash-lite": {
      id: "google/gemini-2.5-flash-lite",
      name: "Gemini 2.5 Flash Lite",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.09999999999999999,
        output: 0.39999999999999997,
        cacheRead: 0.01,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "google/gemini-2.5-pro": {
      id: "google/gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 1048576,
      maxTokens: 65536
    },
    "google/gemini-3-flash": {
      id: "google/gemini-3-flash",
      name: "Gemini 3 Flash",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.5,
        output: 3,
        cacheRead: 0.049999999999999996,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 65e3
    },
    "google/gemini-3-pro-preview": {
      id: "google/gemini-3-pro-preview",
      name: "Gemini 3 Pro Preview",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 12,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 64e3
    },
    "google/gemini-3.1-flash-lite-preview": {
      id: "google/gemini-3.1-flash-lite-preview",
      name: "Gemini 3.1 Flash Lite Preview",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.25,
        output: 1.5,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 65e3
    },
    "google/gemini-3.1-pro-preview": {
      id: "google/gemini-3.1-pro-preview",
      name: "Gemini 3.1 Pro Preview",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 12,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 64e3
    },
    "inception/mercury-2": {
      id: "inception/mercury-2",
      name: "Mercury 2",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.25,
        output: 0.75,
        cacheRead: 0.024999999999999998,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 128e3
    },
    "inception/mercury-coder-small": {
      id: "inception/mercury-coder-small",
      name: "Mercury Coder Small Beta",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.25,
        output: 1,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 32e3,
      maxTokens: 16384
    },
    "meituan/longcat-flash-chat": {
      id: "meituan/longcat-flash-chat",
      name: "LongCat Flash Chat",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 1e5
    },
    "meituan/longcat-flash-thinking": {
      id: "meituan/longcat-flash-thinking",
      name: "LongCat Flash Thinking",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.15,
        output: 1.5,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 8192
    },
    "meta/llama-3.1-70b": {
      id: "meta/llama-3.1-70b",
      name: "Llama 3.1 70B Instruct",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.72,
        output: 0.72,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 8192
    },
    "meta/llama-3.1-8b": {
      id: "meta/llama-3.1-8b",
      name: "Llama 3.1 8B Instruct",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.09999999999999999,
        output: 0.09999999999999999,
        cacheRead: 0.09999999999999999,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "meta/llama-3.2-11b": {
      id: "meta/llama-3.2-11b",
      name: "Llama 3.2 11B Vision Instruct",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.16,
        output: 0.16,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 8192
    },
    "meta/llama-3.2-90b": {
      id: "meta/llama-3.2-90b",
      name: "Llama 3.2 90B Vision Instruct",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.72,
        output: 0.72,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 8192
    },
    "meta/llama-3.3-70b": {
      id: "meta/llama-3.3-70b",
      name: "Llama 3.3 70B Instruct",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.72,
        output: 0.72,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 8192
    },
    "meta/llama-4-maverick": {
      id: "meta/llama-4-maverick",
      name: "Llama 4 Maverick 17B Instruct",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.24,
        output: 0.9700000000000001,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 8192
    },
    "meta/llama-4-scout": {
      id: "meta/llama-4-scout",
      name: "Llama 4 Scout 17B Instruct",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.16999999999999998,
        output: 0.66,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 8192
    },
    "minimax/minimax-m2": {
      id: "minimax/minimax-m2",
      name: "MiniMax M2",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0.03,
        cacheWrite: 0.375
      },
      contextWindow: 205e3,
      maxTokens: 205e3
    },
    "minimax/minimax-m2.1": {
      id: "minimax/minimax-m2.1",
      name: "MiniMax M2.1",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0.03,
        cacheWrite: 0.375
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "minimax/minimax-m2.1-lightning": {
      id: "minimax/minimax-m2.1-lightning",
      name: "MiniMax M2.1 Lightning",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 2.4,
        cacheRead: 0.03,
        cacheWrite: 0.375
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "minimax/minimax-m2.5": {
      id: "minimax/minimax-m2.5",
      name: "MiniMax M2.5",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0.03,
        cacheWrite: 0.375
      },
      contextWindow: 204800,
      maxTokens: 131e3
    },
    "minimax/minimax-m2.5-highspeed": {
      id: "minimax/minimax-m2.5-highspeed",
      name: "MiniMax M2.5 High Speed",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.4,
        cacheRead: 0.03,
        cacheWrite: 0.375
      },
      contextWindow: 204800,
      maxTokens: 131e3
    },
    "minimax/minimax-m2.7": {
      id: "minimax/minimax-m2.7",
      name: "Minimax M2.7",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.3,
        output: 1.2,
        cacheRead: 0.06,
        cacheWrite: 0.375
      },
      contextWindow: 204800,
      maxTokens: 131e3
    },
    "minimax/minimax-m2.7-highspeed": {
      id: "minimax/minimax-m2.7-highspeed",
      name: "MiniMax M2.7 High Speed",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.6,
        output: 2.4,
        cacheRead: 0.06,
        cacheWrite: 0.375
      },
      contextWindow: 204800,
      maxTokens: 131100
    },
    "mistral/codestral": {
      id: "mistral/codestral",
      name: "Mistral Codestral",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 0.8999999999999999,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4e3
    },
    "mistral/devstral-2": {
      id: "mistral/devstral-2",
      name: "Devstral 2",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.39999999999999997,
        output: 2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 256e3
    },
    "mistral/devstral-small": {
      id: "mistral/devstral-small",
      name: "Devstral Small 1.1",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.09999999999999999,
        output: 0.3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 64e3
    },
    "mistral/devstral-small-2": {
      id: "mistral/devstral-small-2",
      name: "Devstral Small 2",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.09999999999999999,
        output: 0.3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 256e3
    },
    "mistral/ministral-3b": {
      id: "mistral/ministral-3b",
      name: "Ministral 3B",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.09999999999999999,
        output: 0.09999999999999999,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4e3
    },
    "mistral/ministral-8b": {
      id: "mistral/ministral-8b",
      name: "Ministral 8B",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.15,
        output: 0.15,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4e3
    },
    "mistral/mistral-medium": {
      id: "mistral/mistral-medium",
      name: "Mistral Medium 3.1",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.39999999999999997,
        output: 2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 64e3
    },
    "mistral/mistral-small": {
      id: "mistral/mistral-small",
      name: "Mistral Small",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.09999999999999999,
        output: 0.3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 32e3,
      maxTokens: 4e3
    },
    "mistral/pixtral-12b": {
      id: "mistral/pixtral-12b",
      name: "Pixtral 12B 2409",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.15,
        output: 0.15,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4e3
    },
    "mistral/pixtral-large": {
      id: "mistral/pixtral-large",
      name: "Pixtral Large",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4e3
    },
    "moonshotai/kimi-k2": {
      id: "moonshotai/kimi-k2",
      name: "Kimi K2",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.5,
        cacheRead: 0.15,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 16384
    },
    "moonshotai/kimi-k2-0905": {
      id: "moonshotai/kimi-k2-0905",
      name: "Kimi K2 0905",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.5,
        cacheRead: 0.15,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 16384
    },
    "moonshotai/kimi-k2-thinking": {
      id: "moonshotai/kimi-k2-thinking",
      name: "Kimi K2 Thinking",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.5,
        cacheRead: 0.15,
        cacheWrite: 0
      },
      contextWindow: 262114,
      maxTokens: 262114
    },
    "moonshotai/kimi-k2-thinking-turbo": {
      id: "moonshotai/kimi-k2-thinking-turbo",
      name: "Kimi K2 Thinking Turbo",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1.15,
        output: 8,
        cacheRead: 0.15,
        cacheWrite: 0
      },
      contextWindow: 262114,
      maxTokens: 262114
    },
    "moonshotai/kimi-k2-turbo": {
      id: "moonshotai/kimi-k2-turbo",
      name: "Kimi K2 Turbo",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 1.15,
        output: 8,
        cacheRead: 0.15,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 16384
    },
    "moonshotai/kimi-k2.5": {
      id: "moonshotai/kimi-k2.5",
      name: "Kimi K2.5",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.6,
        output: 3,
        cacheRead: 0.09999999999999999,
        cacheWrite: 0
      },
      contextWindow: 262114,
      maxTokens: 262114
    },
    "nvidia/nemotron-nano-12b-v2-vl": {
      id: "nvidia/nemotron-nano-12b-v2-vl",
      name: "Nvidia Nemotron Nano 12B V2 VL",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.19999999999999998,
        output: 0.6,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 131072
    },
    "nvidia/nemotron-nano-9b-v2": {
      id: "nvidia/nemotron-nano-9b-v2",
      name: "Nvidia Nemotron Nano 9B V2",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.06,
        output: 0.22999999999999998,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 131072
    },
    "openai/gpt-4-turbo": {
      id: "openai/gpt-4-turbo",
      name: "GPT-4 Turbo",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 10,
        output: 30,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 4096
    },
    "openai/gpt-4.1": {
      id: "openai/gpt-4.1",
      name: "GPT-4.1",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 8,
        cacheRead: 0.5,
        cacheWrite: 0
      },
      contextWindow: 1047576,
      maxTokens: 32768
    },
    "openai/gpt-4.1-mini": {
      id: "openai/gpt-4.1-mini",
      name: "GPT-4.1 mini",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.39999999999999997,
        output: 1.5999999999999999,
        cacheRead: 0.09999999999999999,
        cacheWrite: 0
      },
      contextWindow: 1047576,
      maxTokens: 32768
    },
    "openai/gpt-4.1-nano": {
      id: "openai/gpt-4.1-nano",
      name: "GPT-4.1 nano",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.09999999999999999,
        output: 0.39999999999999997,
        cacheRead: 0.024999999999999998,
        cacheWrite: 0
      },
      contextWindow: 1047576,
      maxTokens: 32768
    },
    "openai/gpt-4o": {
      id: "openai/gpt-4o",
      name: "GPT-4o",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2.5,
        output: 10,
        cacheRead: 1.25,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "openai/gpt-4o-mini": {
      id: "openai/gpt-4o-mini",
      name: "GPT-4o mini",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0.075,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "openai/gpt-5": {
      id: "openai/gpt-5",
      name: "GPT-5",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5-chat": {
      id: "openai/gpt-5-chat",
      name: "GPT 5 Chat",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "openai/gpt-5-codex": {
      id: "openai/gpt-5-codex",
      name: "GPT-5-Codex",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5-mini": {
      id: "openai/gpt-5-mini",
      name: "GPT-5 mini",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.25,
        output: 2,
        cacheRead: 0.024999999999999998,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5-nano": {
      id: "openai/gpt-5-nano",
      name: "GPT-5 nano",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.049999999999999996,
        output: 0.39999999999999997,
        cacheRead: 5e-3,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5-pro": {
      id: "openai/gpt-5-pro",
      name: "GPT-5 pro",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 120,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 272e3
    },
    "openai/gpt-5.1-codex": {
      id: "openai/gpt-5.1-codex",
      name: "GPT-5.1-Codex",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.1-codex-max": {
      id: "openai/gpt-5.1-codex-max",
      name: "GPT 5.1 Codex Max",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.1-codex-mini": {
      id: "openai/gpt-5.1-codex-mini",
      name: "GPT 5.1 Codex Mini",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.25,
        output: 2,
        cacheRead: 0.024999999999999998,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.1-instant": {
      id: "openai/gpt-5.1-instant",
      name: "GPT-5.1 Instant",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "openai/gpt-5.1-thinking": {
      id: "openai/gpt-5.1-thinking",
      name: "GPT 5.1 Thinking",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.25,
        output: 10,
        cacheRead: 0.125,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.2": {
      id: "openai/gpt-5.2",
      name: "GPT 5.2",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.2-chat": {
      id: "openai/gpt-5.2-chat",
      name: "GPT 5.2 Chat",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "openai/gpt-5.2-codex": {
      id: "openai/gpt-5.2-codex",
      name: "GPT 5.2 Codex",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.2-pro": {
      id: "openai/gpt-5.2-pro",
      name: "GPT 5.2 ",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 21,
        output: 168,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.3-chat": {
      id: "openai/gpt-5.3-chat",
      name: "GPT-5.3 Chat",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 16384
    },
    "openai/gpt-5.3-codex": {
      id: "openai/gpt-5.3-codex",
      name: "GPT 5.3 Codex",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.75,
        output: 14,
        cacheRead: 0.175,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.4": {
      id: "openai/gpt-5.4",
      name: "GPT 5.4",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2.5,
        output: 15,
        cacheRead: 0.25,
        cacheWrite: 0
      },
      contextWindow: 105e4,
      maxTokens: 128e3
    },
    "openai/gpt-5.4-mini": {
      id: "openai/gpt-5.4-mini",
      name: "GPT 5.4 Mini",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.75,
        output: 4.5,
        cacheRead: 0.075,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.4-nano": {
      id: "openai/gpt-5.4-nano",
      name: "GPT 5.4 Nano",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.19999999999999998,
        output: 1.25,
        cacheRead: 0.02,
        cacheWrite: 0
      },
      contextWindow: 4e5,
      maxTokens: 128e3
    },
    "openai/gpt-5.4-pro": {
      id: "openai/gpt-5.4-pro",
      name: "GPT 5.4 Pro",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 30,
        output: 180,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 105e4,
      maxTokens: 128e3
    },
    "openai/gpt-oss-20b": {
      id: "openai/gpt-oss-20b",
      name: "gpt-oss-20b",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.07,
        output: 0.3,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 8192
    },
    "openai/gpt-oss-safeguard-20b": {
      id: "openai/gpt-oss-safeguard-20b",
      name: "gpt-oss-safeguard-20b",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.075,
        output: 0.3,
        cacheRead: 0.037,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 65536
    },
    "openai/o1": {
      id: "openai/o1",
      name: "o1",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 15,
        output: 60,
        cacheRead: 7.5,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "openai/o3": {
      id: "openai/o3",
      name: "o3",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 8,
        cacheRead: 0.5,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "openai/o3-deep-research": {
      id: "openai/o3-deep-research",
      name: "o3-deep-research",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 10,
        output: 40,
        cacheRead: 2.5,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "openai/o3-mini": {
      id: "openai/o3-mini",
      name: "o3-mini",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1.1,
        output: 4.4,
        cacheRead: 0.55,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "openai/o3-pro": {
      id: "openai/o3-pro",
      name: "o3 Pro",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 20,
        output: 80,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "openai/o4-mini": {
      id: "openai/o4-mini",
      name: "o4-mini",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 1.1,
        output: 4.4,
        cacheRead: 0.275,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 1e5
    },
    "perplexity/sonar": {
      id: "perplexity/sonar",
      name: "Sonar",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 1,
        output: 1,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 127e3,
      maxTokens: 8e3
    },
    "perplexity/sonar-pro": {
      id: "perplexity/sonar-pro",
      name: "Sonar Pro",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 8e3
    },
    "prime-intellect/intellect-3": {
      id: "prime-intellect/intellect-3",
      name: "INTELLECT 3",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.19999999999999998,
        output: 1.1,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 131072
    },
    "xai/grok-2-vision": {
      id: "xai/grok-2-vision",
      name: "Grok 2 Vision",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 10,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 32768,
      maxTokens: 32768
    },
    "xai/grok-3": {
      id: "xai/grok-3",
      name: "Grok 3 Beta",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.75,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 131072
    },
    "xai/grok-3-fast": {
      id: "xai/grok-3-fast",
      name: "Grok 3 Fast Beta",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 1.25,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 131072
    },
    "xai/grok-3-mini": {
      id: "xai/grok-3-mini",
      name: "Grok 3 Mini Beta",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 0.5,
        cacheRead: 0.075,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 131072
    },
    "xai/grok-3-mini-fast": {
      id: "xai/grok-3-mini-fast",
      name: "Grok 3 Mini Fast Beta",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 4,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 131072
    },
    "xai/grok-4": {
      id: "xai/grok-4",
      name: "Grok 4",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.75,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 256e3
    },
    "xai/grok-4-fast-non-reasoning": {
      id: "xai/grok-4-fast-non-reasoning",
      name: "Grok 4 Fast Non-Reasoning",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.19999999999999998,
        output: 0.5,
        cacheRead: 0.049999999999999996,
        cacheWrite: 0
      },
      contextWindow: 2e6,
      maxTokens: 256e3
    },
    "xai/grok-4-fast-reasoning": {
      id: "xai/grok-4-fast-reasoning",
      name: "Grok 4 Fast Reasoning",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.19999999999999998,
        output: 0.5,
        cacheRead: 0.049999999999999996,
        cacheWrite: 0
      },
      contextWindow: 2e6,
      maxTokens: 256e3
    },
    "xai/grok-4.1-fast-non-reasoning": {
      id: "xai/grok-4.1-fast-non-reasoning",
      name: "Grok 4.1 Fast Non-Reasoning",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.19999999999999998,
        output: 0.5,
        cacheRead: 0.049999999999999996,
        cacheWrite: 0
      },
      contextWindow: 2e6,
      maxTokens: 3e4
    },
    "xai/grok-4.1-fast-reasoning": {
      id: "xai/grok-4.1-fast-reasoning",
      name: "Grok 4.1 Fast Reasoning",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.19999999999999998,
        output: 0.5,
        cacheRead: 0.049999999999999996,
        cacheWrite: 0
      },
      contextWindow: 2e6,
      maxTokens: 3e4
    },
    "xai/grok-4.20-multi-agent-beta": {
      id: "xai/grok-4.20-multi-agent-beta",
      name: "Grok 4.20 Multi Agent Beta",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 2,
        output: 6,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0
      },
      contextWindow: 2e6,
      maxTokens: 2e6
    },
    "xai/grok-4.20-non-reasoning-beta": {
      id: "xai/grok-4.20-non-reasoning-beta",
      name: "Grok 4.20 Beta Non-Reasoning",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 6,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0
      },
      contextWindow: 2e6,
      maxTokens: 2e6
    },
    "xai/grok-4.20-reasoning-beta": {
      id: "xai/grok-4.20-reasoning-beta",
      name: "Grok 4.20 Beta Reasoning",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 6,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0
      },
      contextWindow: 2e6,
      maxTokens: 2e6
    },
    "xai/grok-code-fast-1": {
      id: "xai/grok-code-fast-1",
      name: "Grok Code Fast 1",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.19999999999999998,
        output: 1.5,
        cacheRead: 0.02,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 256e3
    },
    "xiaomi/mimo-v2-flash": {
      id: "xiaomi/mimo-v2-flash",
      name: "MiMo V2 Flash",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.09999999999999999,
        output: 0.3,
        cacheRead: 0.02,
        cacheWrite: 0
      },
      contextWindow: 262144,
      maxTokens: 32e3
    },
    "xiaomi/mimo-v2-pro": {
      id: "xiaomi/mimo-v2-pro",
      name: "MiMo V2 Pro",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1,
        output: 3,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0
      },
      contextWindow: 1e6,
      maxTokens: 128e3
    },
    "zai/glm-4.5": {
      id: "zai/glm-4.5",
      name: "GLM-4.5",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.2,
        cacheRead: 0.11,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 96e3
    },
    "zai/glm-4.5-air": {
      id: "zai/glm-4.5-air",
      name: "GLM 4.5 Air",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.19999999999999998,
        output: 1.1,
        cacheRead: 0.03,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 96e3
    },
    "zai/glm-4.5v": {
      id: "zai/glm-4.5v",
      name: "GLM 4.5V",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.6,
        output: 1.7999999999999998,
        cacheRead: 0.11,
        cacheWrite: 0
      },
      contextWindow: 66e3,
      maxTokens: 16e3
    },
    "zai/glm-4.6": {
      id: "zai/glm-4.6",
      name: "GLM 4.6",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.2,
        cacheRead: 0.11,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 96e3
    },
    "zai/glm-4.6v": {
      id: "zai/glm-4.6v",
      name: "GLM-4.6V",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.3,
        output: 0.8999999999999999,
        cacheRead: 0.049999999999999996,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 24e3
    },
    "zai/glm-4.6v-flash": {
      id: "zai/glm-4.6v-flash",
      name: "GLM-4.6V-Flash",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 24e3
    },
    "zai/glm-4.7": {
      id: "zai/glm-4.7",
      name: "GLM 4.7",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.2,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 12e4
    },
    "zai/glm-4.7-flash": {
      id: "zai/glm-4.7-flash",
      name: "GLM 4.7 Flash",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.07,
        output: 0.39999999999999997,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 131e3
    },
    "zai/glm-4.7-flashx": {
      id: "zai/glm-4.7-flashx",
      name: "GLM 4.7 FlashX",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.06,
        output: 0.39999999999999997,
        cacheRead: 0.01,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 128e3
    },
    "zai/glm-5": {
      id: "zai/glm-5",
      name: "GLM 5",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1,
        output: 3.1999999999999997,
        cacheRead: 0.19999999999999998,
        cacheWrite: 0
      },
      contextWindow: 202800,
      maxTokens: 131100
    },
    "zai/glm-5-turbo": {
      id: "zai/glm-5-turbo",
      name: "GLM 5 Turbo",
      api: "anthropic-messages",
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1.2,
        output: 4,
        cacheRead: 0.24,
        cacheWrite: 0
      },
      contextWindow: 202800,
      maxTokens: 131100
    }
  },
  "xai": {
    "grok-2": {
      id: "grok-2",
      name: "Grok 2",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 2,
        output: 10,
        cacheRead: 2,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 8192
    },
    "grok-2-1212": {
      id: "grok-2-1212",
      name: "Grok 2 (1212)",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 2,
        output: 10,
        cacheRead: 2,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 8192
    },
    "grok-2-latest": {
      id: "grok-2-latest",
      name: "Grok 2 Latest",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 2,
        output: 10,
        cacheRead: 2,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 8192
    },
    "grok-2-vision": {
      id: "grok-2-vision",
      name: "Grok 2 Vision",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 10,
        cacheRead: 2,
        cacheWrite: 0
      },
      contextWindow: 8192,
      maxTokens: 4096
    },
    "grok-2-vision-1212": {
      id: "grok-2-vision-1212",
      name: "Grok 2 Vision (1212)",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 10,
        cacheRead: 2,
        cacheWrite: 0
      },
      contextWindow: 8192,
      maxTokens: 4096
    },
    "grok-2-vision-latest": {
      id: "grok-2-vision-latest",
      name: "Grok 2 Vision Latest",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 10,
        cacheRead: 2,
        cacheWrite: 0
      },
      contextWindow: 8192,
      maxTokens: 4096
    },
    "grok-3": {
      id: "grok-3",
      name: "Grok 3",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.75,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 8192
    },
    "grok-3-fast": {
      id: "grok-3-fast",
      name: "Grok 3 Fast",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 1.25,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 8192
    },
    "grok-3-fast-latest": {
      id: "grok-3-fast-latest",
      name: "Grok 3 Fast Latest",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 5,
        output: 25,
        cacheRead: 1.25,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 8192
    },
    "grok-3-latest": {
      id: "grok-3-latest",
      name: "Grok 3 Latest",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.75,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 8192
    },
    "grok-3-mini": {
      id: "grok-3-mini",
      name: "Grok 3 Mini",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 0.5,
        cacheRead: 0.075,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 8192
    },
    "grok-3-mini-fast": {
      id: "grok-3-mini-fast",
      name: "Grok 3 Mini Fast",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 4,
        cacheRead: 0.15,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 8192
    },
    "grok-3-mini-fast-latest": {
      id: "grok-3-mini-fast-latest",
      name: "Grok 3 Mini Fast Latest",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 4,
        cacheRead: 0.15,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 8192
    },
    "grok-3-mini-latest": {
      id: "grok-3-mini-latest",
      name: "Grok 3 Mini Latest",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.3,
        output: 0.5,
        cacheRead: 0.075,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 8192
    },
    "grok-4": {
      id: "grok-4",
      name: "Grok 4",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 3,
        output: 15,
        cacheRead: 0.75,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 64e3
    },
    "grok-4-1-fast": {
      id: "grok-4-1-fast",
      name: "Grok 4.1 Fast",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.2,
        output: 0.5,
        cacheRead: 0.05,
        cacheWrite: 0
      },
      contextWindow: 2e6,
      maxTokens: 3e4
    },
    "grok-4-1-fast-non-reasoning": {
      id: "grok-4-1-fast-non-reasoning",
      name: "Grok 4.1 Fast (Non-Reasoning)",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.2,
        output: 0.5,
        cacheRead: 0.05,
        cacheWrite: 0
      },
      contextWindow: 2e6,
      maxTokens: 3e4
    },
    "grok-4-fast": {
      id: "grok-4-fast",
      name: "Grok 4 Fast",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.2,
        output: 0.5,
        cacheRead: 0.05,
        cacheWrite: 0
      },
      contextWindow: 2e6,
      maxTokens: 3e4
    },
    "grok-4-fast-non-reasoning": {
      id: "grok-4-fast-non-reasoning",
      name: "Grok 4 Fast (Non-Reasoning)",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 0.2,
        output: 0.5,
        cacheRead: 0.05,
        cacheWrite: 0
      },
      contextWindow: 2e6,
      maxTokens: 3e4
    },
    "grok-4.20-beta-latest-non-reasoning": {
      id: "grok-4.20-beta-latest-non-reasoning",
      name: "Grok 4.20 Beta (Non-Reasoning)",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 6,
        cacheRead: 0.2,
        cacheWrite: 0
      },
      contextWindow: 2e6,
      maxTokens: 3e4
    },
    "grok-4.20-beta-latest-reasoning": {
      id: "grok-4.20-beta-latest-reasoning",
      name: "Grok 4.20 Beta (Reasoning)",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 2,
        output: 6,
        cacheRead: 0.2,
        cacheWrite: 0
      },
      contextWindow: 2e6,
      maxTokens: 3e4
    },
    "grok-beta": {
      id: "grok-beta",
      name: "Grok Beta",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 5,
        output: 15,
        cacheRead: 5,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 4096
    },
    "grok-code-fast-1": {
      id: "grok-code-fast-1",
      name: "Grok Code Fast 1",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.2,
        output: 1.5,
        cacheRead: 0.02,
        cacheWrite: 0
      },
      contextWindow: 256e3,
      maxTokens: 1e4
    },
    "grok-vision-beta": {
      id: "grok-vision-beta",
      name: "Grok Vision Beta",
      api: "openai-completions",
      provider: "xai",
      baseUrl: "https://api.x.ai/v1",
      reasoning: false,
      input: ["text", "image"],
      cost: {
        input: 5,
        output: 15,
        cacheRead: 5,
        cacheWrite: 0
      },
      contextWindow: 8192,
      maxTokens: 4096
    }
  },
  "zai": {
    "glm-4.5": {
      id: "glm-4.5",
      name: "GLM-4.5",
      api: "openai-completions",
      provider: "zai",
      baseUrl: "https://api.z.ai/api/coding/paas/v4",
      compat: { "supportsDeveloperRole": false, "thinkingFormat": "zai" },
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.2,
        cacheRead: 0.11,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 98304
    },
    "glm-4.5-air": {
      id: "glm-4.5-air",
      name: "GLM-4.5-Air",
      api: "openai-completions",
      provider: "zai",
      baseUrl: "https://api.z.ai/api/coding/paas/v4",
      compat: { "supportsDeveloperRole": false, "thinkingFormat": "zai" },
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.2,
        output: 1.1,
        cacheRead: 0.03,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 98304
    },
    "glm-4.5-flash": {
      id: "glm-4.5-flash",
      name: "GLM-4.5-Flash",
      api: "openai-completions",
      provider: "zai",
      baseUrl: "https://api.z.ai/api/coding/paas/v4",
      compat: { "supportsDeveloperRole": false, "thinkingFormat": "zai" },
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 131072,
      maxTokens: 98304
    },
    "glm-4.5v": {
      id: "glm-4.5v",
      name: "GLM-4.5V",
      api: "openai-completions",
      provider: "zai",
      baseUrl: "https://api.z.ai/api/coding/paas/v4",
      compat: { "supportsDeveloperRole": false, "thinkingFormat": "zai" },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.6,
        output: 1.8,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 64e3,
      maxTokens: 16384
    },
    "glm-4.6": {
      id: "glm-4.6",
      name: "GLM-4.6",
      api: "openai-completions",
      provider: "zai",
      baseUrl: "https://api.z.ai/api/coding/paas/v4",
      compat: { "supportsDeveloperRole": false, "thinkingFormat": "zai" },
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.2,
        cacheRead: 0.11,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "glm-4.6v": {
      id: "glm-4.6v",
      name: "GLM-4.6V",
      api: "openai-completions",
      provider: "zai",
      baseUrl: "https://api.z.ai/api/coding/paas/v4",
      compat: { "supportsDeveloperRole": false, "thinkingFormat": "zai" },
      reasoning: true,
      input: ["text", "image"],
      cost: {
        input: 0.3,
        output: 0.9,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 128e3,
      maxTokens: 32768
    },
    "glm-4.7": {
      id: "glm-4.7",
      name: "GLM-4.7",
      api: "openai-completions",
      provider: "zai",
      baseUrl: "https://api.z.ai/api/coding/paas/v4",
      compat: { "supportsDeveloperRole": false, "thinkingFormat": "zai" },
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.6,
        output: 2.2,
        cacheRead: 0.11,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "glm-4.7-flash": {
      id: "glm-4.7-flash",
      name: "GLM-4.7-Flash",
      api: "openai-completions",
      provider: "zai",
      baseUrl: "https://api.z.ai/api/coding/paas/v4",
      compat: { "supportsDeveloperRole": false, "thinkingFormat": "zai" },
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 131072
    },
    "glm-5": {
      id: "glm-5",
      name: "GLM-5",
      api: "openai-completions",
      provider: "zai",
      baseUrl: "https://api.z.ai/api/coding/paas/v4",
      compat: { "supportsDeveloperRole": false, "thinkingFormat": "zai" },
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1,
        output: 3.2,
        cacheRead: 0.2,
        cacheWrite: 0
      },
      contextWindow: 204800,
      maxTokens: 131072
    },
    "glm-5-turbo": {
      id: "glm-5-turbo",
      name: "GLM-5-Turbo",
      api: "openai-completions",
      provider: "zai",
      baseUrl: "https://api.z.ai/api/coding/paas/v4",
      compat: { "supportsDeveloperRole": false, "thinkingFormat": "zai" },
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1.2,
        output: 4,
        cacheRead: 0.24,
        cacheWrite: 0
      },
      contextWindow: 2e5,
      maxTokens: 131072
    }
  }
};

// node_modules/@mariozechner/pi-ai/dist/models.js
var modelRegistry = /* @__PURE__ */ new Map();
for (const [provider2, models] of Object.entries(MODELS)) {
  const providerModels = /* @__PURE__ */ new Map();
  for (const [id, model] of Object.entries(models)) {
    providerModels.set(id, model);
  }
  modelRegistry.set(provider2, providerModels);
}
function getModels(provider2) {
  const models = modelRegistry.get(provider2);
  return models ? Array.from(models.values()) : [];
}

// node_modules/@mariozechner/pi-ai/dist/utils/oauth/github-copilot.js
var decode2 = (s) => atob(s);
var CLIENT_ID2 = decode2("SXYxLmI1MDdhMDhjODdlY2ZlOTg=");
var COPILOT_HEADERS = {
  "User-Agent": "GitHubCopilotChat/0.35.0",
  "Editor-Version": "vscode/1.107.0",
  "Editor-Plugin-Version": "copilot-chat/0.35.0",
  "Copilot-Integration-Id": "vscode-chat"
};
var INITIAL_POLL_INTERVAL_MULTIPLIER = 1.2;
var SLOW_DOWN_POLL_INTERVAL_MULTIPLIER = 1.4;
function normalizeDomain(input) {
  const trimmed = input.trim();
  if (!trimmed)
    return null;
  try {
    const url = trimmed.includes("://") ? new URL(trimmed) : new URL(`https://${trimmed}`);
    return url.hostname;
  } catch {
    return null;
  }
}
function getUrls(domain) {
  return {
    deviceCodeUrl: `https://${domain}/login/device/code`,
    accessTokenUrl: `https://${domain}/login/oauth/access_token`,
    copilotTokenUrl: `https://api.${domain}/copilot_internal/v2/token`
  };
}
function getBaseUrlFromToken(token) {
  const match = token.match(/proxy-ep=([^;]+)/);
  if (!match)
    return null;
  const proxyHost = match[1];
  const apiHost = proxyHost.replace(/^proxy\./, "api.");
  return `https://${apiHost}`;
}
function getGitHubCopilotBaseUrl(token, enterpriseDomain) {
  if (token) {
    const urlFromToken = getBaseUrlFromToken(token);
    if (urlFromToken)
      return urlFromToken;
  }
  if (enterpriseDomain)
    return `https://copilot-api.${enterpriseDomain}`;
  return "https://api.individual.githubcopilot.com";
}
async function fetchJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  return response.json();
}
async function startDeviceFlow(domain) {
  const urls = getUrls(domain);
  const data = await fetchJson(urls.deviceCodeUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "GitHubCopilotChat/0.35.0"
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID2,
      scope: "read:user"
    })
  });
  if (!data || typeof data !== "object") {
    throw new Error("Invalid device code response");
  }
  const deviceCode = data.device_code;
  const userCode = data.user_code;
  const verificationUri = data.verification_uri;
  const interval = data.interval;
  const expiresIn = data.expires_in;
  if (typeof deviceCode !== "string" || typeof userCode !== "string" || typeof verificationUri !== "string" || typeof interval !== "number" || typeof expiresIn !== "number") {
    throw new Error("Invalid device code response fields");
  }
  return {
    device_code: deviceCode,
    user_code: userCode,
    verification_uri: verificationUri,
    interval,
    expires_in: expiresIn
  };
}
function abortableSleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Login cancelled"));
      return;
    }
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(new Error("Login cancelled"));
    }, { once: true });
  });
}
async function pollForGitHubAccessToken(domain, deviceCode, intervalSeconds, expiresIn, signal) {
  const urls = getUrls(domain);
  const deadline = Date.now() + expiresIn * 1e3;
  let intervalMs = Math.max(1e3, Math.floor(intervalSeconds * 1e3));
  let intervalMultiplier = INITIAL_POLL_INTERVAL_MULTIPLIER;
  let slowDownResponses = 0;
  while (Date.now() < deadline) {
    if (signal?.aborted) {
      throw new Error("Login cancelled");
    }
    const remainingMs = deadline - Date.now();
    const waitMs = Math.min(Math.ceil(intervalMs * intervalMultiplier), remainingMs);
    await abortableSleep(waitMs, signal);
    const raw = await fetchJson(urls.accessTokenUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "GitHubCopilotChat/0.35.0"
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID2,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code"
      })
    });
    if (raw && typeof raw === "object" && typeof raw.access_token === "string") {
      return raw.access_token;
    }
    if (raw && typeof raw === "object" && typeof raw.error === "string") {
      const { error, error_description: description, interval } = raw;
      if (error === "authorization_pending") {
        continue;
      }
      if (error === "slow_down") {
        slowDownResponses += 1;
        intervalMs = typeof interval === "number" && interval > 0 ? interval * 1e3 : Math.max(1e3, intervalMs + 5e3);
        intervalMultiplier = SLOW_DOWN_POLL_INTERVAL_MULTIPLIER;
        continue;
      }
      const descriptionSuffix = description ? `: ${description}` : "";
      throw new Error(`Device flow failed: ${error}${descriptionSuffix}`);
    }
  }
  if (slowDownResponses > 0) {
    throw new Error("Device flow timed out after one or more slow_down responses. This is often caused by clock drift in WSL or VM environments. Please sync or restart the VM clock and try again.");
  }
  throw new Error("Device flow timed out");
}
async function refreshGitHubCopilotToken(refreshToken, enterpriseDomain) {
  const domain = enterpriseDomain || "github.com";
  const urls = getUrls(domain);
  const raw = await fetchJson(urls.copilotTokenUrl, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${refreshToken}`,
      ...COPILOT_HEADERS
    }
  });
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid Copilot token response");
  }
  const token = raw.token;
  const expiresAt = raw.expires_at;
  if (typeof token !== "string" || typeof expiresAt !== "number") {
    throw new Error("Invalid Copilot token response fields");
  }
  return {
    refresh: refreshToken,
    access: token,
    expires: expiresAt * 1e3 - 5 * 60 * 1e3,
    enterpriseUrl: enterpriseDomain
  };
}
async function enableGitHubCopilotModel(token, modelId, enterpriseDomain) {
  const baseUrl = getGitHubCopilotBaseUrl(token, enterpriseDomain);
  const url = `${baseUrl}/models/${modelId}/policy`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...COPILOT_HEADERS,
        "openai-intent": "chat-policy",
        "x-interaction-type": "chat-policy"
      },
      body: JSON.stringify({ state: "enabled" })
    });
    return response.ok;
  } catch {
    return false;
  }
}
async function enableAllGitHubCopilotModels(token, enterpriseDomain, onProgress) {
  const models = getModels("github-copilot");
  await Promise.all(models.map(async (model) => {
    const success = await enableGitHubCopilotModel(token, model.id, enterpriseDomain);
    onProgress?.(model.id, success);
  }));
}
async function loginGitHubCopilot(options) {
  const input = await options.onPrompt({
    message: "GitHub Enterprise URL/domain (blank for github.com)",
    placeholder: "company.ghe.com",
    allowEmpty: true
  });
  if (options.signal?.aborted) {
    throw new Error("Login cancelled");
  }
  const trimmed = input.trim();
  const enterpriseDomain = normalizeDomain(input);
  if (trimmed && !enterpriseDomain) {
    throw new Error("Invalid GitHub Enterprise URL/domain");
  }
  const domain = enterpriseDomain || "github.com";
  const device = await startDeviceFlow(domain);
  options.onAuth(device.verification_uri, `Enter code: ${device.user_code}`);
  const githubAccessToken = await pollForGitHubAccessToken(domain, device.device_code, device.interval, device.expires_in, options.signal);
  const credentials = await refreshGitHubCopilotToken(githubAccessToken, enterpriseDomain ?? void 0);
  options.onProgress?.("Enabling models...");
  await enableAllGitHubCopilotModels(credentials.access, enterpriseDomain ?? void 0);
  return credentials;
}
var githubCopilotOAuthProvider = {
  id: "github-copilot",
  name: "GitHub Copilot",
  async login(callbacks) {
    return loginGitHubCopilot({
      onAuth: (url, instructions) => callbacks.onAuth({ url, instructions }),
      onPrompt: callbacks.onPrompt,
      onProgress: callbacks.onProgress,
      signal: callbacks.signal
    });
  },
  async refreshToken(credentials) {
    const creds = credentials;
    return refreshGitHubCopilotToken(creds.refresh, creds.enterpriseUrl);
  },
  getApiKey(credentials) {
    return credentials.access;
  },
  modifyModels(models, credentials) {
    const creds = credentials;
    const domain = creds.enterpriseUrl ? normalizeDomain(creds.enterpriseUrl) ?? void 0 : void 0;
    const baseUrl = getGitHubCopilotBaseUrl(creds.access, domain);
    return models.map((m) => m.provider === "github-copilot" ? { ...m, baseUrl } : m);
  }
};

// node_modules/@mariozechner/pi-ai/dist/utils/oauth/google-antigravity.js
var _createServer = null;
var _httpImportPromise = null;
if (typeof process !== "undefined" && (process.versions?.node || process.versions?.bun)) {
  _httpImportPromise = import("http").then((m) => {
    _createServer = m.createServer;
  });
}
var decode3 = (s) => atob(s);
var CLIENT_ID3 = decode3("MTA3MTAwNjA2MDU5MS10bWhzc2luMmgyMWxjcmUyMzV2dG9sb2poNGc0MDNlcC5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbQ==");
var CLIENT_SECRET = decode3("R09DU1BYLUs1OEZXUjQ4NkxkTEoxbUxCOHNYQzR6NnFEQWY=");
var REDIRECT_URI2 = "http://localhost:51121/oauth-callback";
var SCOPES2 = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs"
];
var AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
var TOKEN_URL2 = "https://oauth2.googleapis.com/token";
var DEFAULT_PROJECT_ID = "rising-fact-p41fc";
async function getNodeCreateServer() {
  if (_createServer)
    return _createServer;
  if (_httpImportPromise) {
    await _httpImportPromise;
  }
  if (_createServer)
    return _createServer;
  throw new Error("Antigravity OAuth is only available in Node.js environments");
}
async function startCallbackServer2() {
  const createServer = await getNodeCreateServer();
  return new Promise((resolve, reject) => {
    let settleWait;
    const waitForCodePromise = new Promise((resolveWait) => {
      let settled = false;
      settleWait = (value) => {
        if (settled)
          return;
        settled = true;
        resolveWait(value);
      };
    });
    const server = createServer((req, res) => {
      const url = new URL(req.url || "", `http://localhost:51121`);
      if (url.pathname === "/oauth-callback") {
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        if (error) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(oauthErrorHtml("Google authentication did not complete.", `Error: ${error}`));
          return;
        }
        if (code && state) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(oauthSuccessHtml("Google authentication completed. You can close this window."));
          settleWait?.({ code, state });
        } else {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(oauthErrorHtml("Missing code or state parameter."));
        }
      } else {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end(oauthErrorHtml("Callback route not found."));
      }
    });
    server.on("error", (err) => {
      reject(err);
    });
    server.listen(51121, "127.0.0.1", () => {
      resolve({
        server,
        cancelWait: () => {
          settleWait?.(null);
        },
        waitForCode: () => waitForCodePromise
      });
    });
  });
}
function parseRedirectUrl(input) {
  const value = input.trim();
  if (!value)
    return {};
  try {
    const url = new URL(value);
    return {
      code: url.searchParams.get("code") ?? void 0,
      state: url.searchParams.get("state") ?? void 0
    };
  } catch {
    return {};
  }
}
async function discoverProject(accessToken, onProgress) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "User-Agent": "google-api-nodejs-client/9.15.1",
    "X-Goog-Api-Client": "google-cloud-sdk vscode_cloudshelleditor/0.1",
    "Client-Metadata": JSON.stringify({
      ideType: "IDE_UNSPECIFIED",
      platform: "PLATFORM_UNSPECIFIED",
      pluginType: "GEMINI"
    })
  };
  const endpoints = ["https://cloudcode-pa.googleapis.com", "https://daily-cloudcode-pa.sandbox.googleapis.com"];
  onProgress?.("Checking for existing project...");
  for (const endpoint of endpoints) {
    try {
      const loadResponse = await fetch(`${endpoint}/v1internal:loadCodeAssist`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          metadata: {
            ideType: "IDE_UNSPECIFIED",
            platform: "PLATFORM_UNSPECIFIED",
            pluginType: "GEMINI"
          }
        })
      });
      if (loadResponse.ok) {
        const data = await loadResponse.json();
        if (typeof data.cloudaicompanionProject === "string" && data.cloudaicompanionProject) {
          return data.cloudaicompanionProject;
        }
        if (data.cloudaicompanionProject && typeof data.cloudaicompanionProject === "object" && data.cloudaicompanionProject.id) {
          return data.cloudaicompanionProject.id;
        }
      }
    } catch {
    }
  }
  onProgress?.("Using default project...");
  return DEFAULT_PROJECT_ID;
}
async function getUserEmail(accessToken) {
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      return data.email;
    }
  } catch {
  }
  return void 0;
}
async function refreshAntigravityToken(refreshToken, projectId) {
  const response = await fetch(TOKEN_URL2, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID3,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Antigravity token refresh failed: ${error}`);
  }
  const data = await response.json();
  return {
    refresh: data.refresh_token || refreshToken,
    access: data.access_token,
    expires: Date.now() + data.expires_in * 1e3 - 5 * 60 * 1e3,
    projectId
  };
}
async function loginAntigravity(onAuth, onProgress, onManualCodeInput) {
  const { verifier, challenge } = await generatePKCE();
  onProgress?.("Starting local server for OAuth callback...");
  const server = await startCallbackServer2();
  let code;
  try {
    const authParams = new URLSearchParams({
      client_id: CLIENT_ID3,
      response_type: "code",
      redirect_uri: REDIRECT_URI2,
      scope: SCOPES2.join(" "),
      code_challenge: challenge,
      code_challenge_method: "S256",
      state: verifier,
      access_type: "offline",
      prompt: "consent"
    });
    const authUrl = `${AUTH_URL}?${authParams.toString()}`;
    onAuth({
      url: authUrl,
      instructions: "Complete the sign-in in your browser."
    });
    onProgress?.("Waiting for OAuth callback...");
    if (onManualCodeInput) {
      let manualInput;
      let manualError;
      const manualPromise = onManualCodeInput().then((input) => {
        manualInput = input;
        server.cancelWait();
      }).catch((err) => {
        manualError = err instanceof Error ? err : new Error(String(err));
        server.cancelWait();
      });
      const result = await server.waitForCode();
      if (manualError) {
        throw manualError;
      }
      if (result?.code) {
        if (result.state !== verifier) {
          throw new Error("OAuth state mismatch - possible CSRF attack");
        }
        code = result.code;
      } else if (manualInput) {
        const parsed = parseRedirectUrl(manualInput);
        if (parsed.state && parsed.state !== verifier) {
          throw new Error("OAuth state mismatch - possible CSRF attack");
        }
        code = parsed.code;
      }
      if (!code) {
        await manualPromise;
        if (manualError) {
          throw manualError;
        }
        if (manualInput) {
          const parsed = parseRedirectUrl(manualInput);
          if (parsed.state && parsed.state !== verifier) {
            throw new Error("OAuth state mismatch - possible CSRF attack");
          }
          code = parsed.code;
        }
      }
    } else {
      const result = await server.waitForCode();
      if (result?.code) {
        if (result.state !== verifier) {
          throw new Error("OAuth state mismatch - possible CSRF attack");
        }
        code = result.code;
      }
    }
    if (!code) {
      throw new Error("No authorization code received");
    }
    onProgress?.("Exchanging authorization code for tokens...");
    const tokenResponse = await fetch(TOKEN_URL2, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID3,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI2,
        code_verifier: verifier
      })
    });
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${error}`);
    }
    const tokenData = await tokenResponse.json();
    if (!tokenData.refresh_token) {
      throw new Error("No refresh token received. Please try again.");
    }
    onProgress?.("Getting user info...");
    const email = await getUserEmail(tokenData.access_token);
    const projectId = await discoverProject(tokenData.access_token, onProgress);
    const expiresAt = Date.now() + tokenData.expires_in * 1e3 - 5 * 60 * 1e3;
    const credentials = {
      refresh: tokenData.refresh_token,
      access: tokenData.access_token,
      expires: expiresAt,
      projectId,
      email
    };
    return credentials;
  } finally {
    server.server.close();
  }
}
var antigravityOAuthProvider = {
  id: "google-antigravity",
  name: "Antigravity (Gemini 3, Claude, GPT-OSS)",
  usesCallbackServer: true,
  async login(callbacks) {
    return loginAntigravity(callbacks.onAuth, callbacks.onProgress, callbacks.onManualCodeInput);
  },
  async refreshToken(credentials) {
    const creds = credentials;
    if (!creds.projectId) {
      throw new Error("Antigravity credentials missing projectId");
    }
    return refreshAntigravityToken(creds.refresh, creds.projectId);
  },
  getApiKey(credentials) {
    const creds = credentials;
    return JSON.stringify({ token: creds.access, projectId: creds.projectId });
  }
};

// node_modules/@mariozechner/pi-ai/dist/utils/oauth/google-gemini-cli.js
var _createServer2 = null;
var _httpImportPromise2 = null;
if (typeof process !== "undefined" && (process.versions?.node || process.versions?.bun)) {
  _httpImportPromise2 = import("http").then((m) => {
    _createServer2 = m.createServer;
  });
}
var decode4 = (s) => atob(s);
var CLIENT_ID4 = decode4("NjgxMjU1ODA5Mzk1LW9vOGZ0Mm9wcmRybnA5ZTNhcWY2YXYzaG1kaWIxMzVqLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29t");
var CLIENT_SECRET2 = decode4("R09DU1BYLTR1SGdNUG0tMW83U2stZ2VWNkN1NWNsWEZzeGw=");
var REDIRECT_URI3 = "http://localhost:8085/oauth2callback";
var SCOPES3 = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile"
];
var AUTH_URL2 = "https://accounts.google.com/o/oauth2/v2/auth";
var TOKEN_URL3 = "https://oauth2.googleapis.com/token";
var CODE_ASSIST_ENDPOINT = "https://cloudcode-pa.googleapis.com";
async function getNodeCreateServer2() {
  if (_createServer2)
    return _createServer2;
  if (_httpImportPromise2) {
    await _httpImportPromise2;
  }
  if (_createServer2)
    return _createServer2;
  throw new Error("Gemini CLI OAuth is only available in Node.js environments");
}
async function startCallbackServer3() {
  const createServer = await getNodeCreateServer2();
  return new Promise((resolve, reject) => {
    let settleWait;
    const waitForCodePromise = new Promise((resolveWait) => {
      let settled = false;
      settleWait = (value) => {
        if (settled)
          return;
        settled = true;
        resolveWait(value);
      };
    });
    const server = createServer((req, res) => {
      const url = new URL(req.url || "", `http://localhost:8085`);
      if (url.pathname === "/oauth2callback") {
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        if (error) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(oauthErrorHtml("Google authentication did not complete.", `Error: ${error}`));
          return;
        }
        if (code && state) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(oauthSuccessHtml("Google authentication completed. You can close this window."));
          settleWait?.({ code, state });
        } else {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(oauthErrorHtml("Missing code or state parameter."));
        }
      } else {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end(oauthErrorHtml("Callback route not found."));
      }
    });
    server.on("error", (err) => {
      reject(err);
    });
    server.listen(8085, "127.0.0.1", () => {
      resolve({
        server,
        cancelWait: () => {
          settleWait?.(null);
        },
        waitForCode: () => waitForCodePromise
      });
    });
  });
}
function parseRedirectUrl2(input) {
  const value = input.trim();
  if (!value)
    return {};
  try {
    const url = new URL(value);
    return {
      code: url.searchParams.get("code") ?? void 0,
      state: url.searchParams.get("state") ?? void 0
    };
  } catch {
    return {};
  }
}
var TIER_FREE = "free-tier";
var TIER_LEGACY = "legacy-tier";
var TIER_STANDARD = "standard-tier";
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function getDefaultTier(allowedTiers) {
  if (!allowedTiers || allowedTiers.length === 0)
    return { id: TIER_LEGACY };
  const defaultTier = allowedTiers.find((t) => t.isDefault);
  return defaultTier ?? { id: TIER_LEGACY };
}
function isVpcScAffectedUser(payload) {
  if (!payload || typeof payload !== "object")
    return false;
  if (!("error" in payload))
    return false;
  const error = payload.error;
  if (!error?.details || !Array.isArray(error.details))
    return false;
  return error.details.some((detail) => detail.reason === "SECURITY_POLICY_VIOLATED");
}
async function pollOperation(operationName, headers, onProgress) {
  let attempt = 0;
  while (true) {
    if (attempt > 0) {
      onProgress?.(`Waiting for project provisioning (attempt ${attempt + 1})...`);
      await wait(5e3);
    }
    const response = await fetch(`${CODE_ASSIST_ENDPOINT}/v1internal/${operationName}`, {
      method: "GET",
      headers
    });
    if (!response.ok) {
      throw new Error(`Failed to poll operation: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (data.done) {
      return data;
    }
    attempt += 1;
  }
}
async function discoverProject2(accessToken, onProgress) {
  const envProjectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT_ID;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "User-Agent": "google-api-nodejs-client/9.15.1",
    "X-Goog-Api-Client": "gl-node/22.17.0"
  };
  onProgress?.("Checking for existing Cloud Code Assist project...");
  const loadResponse = await fetch(`${CODE_ASSIST_ENDPOINT}/v1internal:loadCodeAssist`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      cloudaicompanionProject: envProjectId,
      metadata: {
        ideType: "IDE_UNSPECIFIED",
        platform: "PLATFORM_UNSPECIFIED",
        pluginType: "GEMINI",
        duetProject: envProjectId
      }
    })
  });
  let data;
  if (!loadResponse.ok) {
    let errorPayload;
    try {
      errorPayload = await loadResponse.clone().json();
    } catch {
      errorPayload = void 0;
    }
    if (isVpcScAffectedUser(errorPayload)) {
      data = { currentTier: { id: TIER_STANDARD } };
    } else {
      const errorText = await loadResponse.text();
      throw new Error(`loadCodeAssist failed: ${loadResponse.status} ${loadResponse.statusText}: ${errorText}`);
    }
  } else {
    data = await loadResponse.json();
  }
  if (data.currentTier) {
    if (data.cloudaicompanionProject) {
      return data.cloudaicompanionProject;
    }
    if (envProjectId) {
      return envProjectId;
    }
    throw new Error("This account requires setting the GOOGLE_CLOUD_PROJECT or GOOGLE_CLOUD_PROJECT_ID environment variable. See https://goo.gle/gemini-cli-auth-docs#workspace-gca");
  }
  const tier = getDefaultTier(data.allowedTiers);
  const tierId = tier?.id ?? TIER_FREE;
  if (tierId !== TIER_FREE && !envProjectId) {
    throw new Error("This account requires setting the GOOGLE_CLOUD_PROJECT or GOOGLE_CLOUD_PROJECT_ID environment variable. See https://goo.gle/gemini-cli-auth-docs#workspace-gca");
  }
  onProgress?.("Provisioning Cloud Code Assist project (this may take a moment)...");
  const onboardBody = {
    tierId,
    metadata: {
      ideType: "IDE_UNSPECIFIED",
      platform: "PLATFORM_UNSPECIFIED",
      pluginType: "GEMINI"
    }
  };
  if (tierId !== TIER_FREE && envProjectId) {
    onboardBody.cloudaicompanionProject = envProjectId;
    onboardBody.metadata.duetProject = envProjectId;
  }
  const onboardResponse = await fetch(`${CODE_ASSIST_ENDPOINT}/v1internal:onboardUser`, {
    method: "POST",
    headers,
    body: JSON.stringify(onboardBody)
  });
  if (!onboardResponse.ok) {
    const errorText = await onboardResponse.text();
    throw new Error(`onboardUser failed: ${onboardResponse.status} ${onboardResponse.statusText}: ${errorText}`);
  }
  let lroData = await onboardResponse.json();
  if (!lroData.done && lroData.name) {
    lroData = await pollOperation(lroData.name, headers, onProgress);
  }
  const projectId = lroData.response?.cloudaicompanionProject?.id;
  if (projectId) {
    return projectId;
  }
  if (envProjectId) {
    return envProjectId;
  }
  throw new Error("Could not discover or provision a Google Cloud project. Try setting the GOOGLE_CLOUD_PROJECT or GOOGLE_CLOUD_PROJECT_ID environment variable. See https://goo.gle/gemini-cli-auth-docs#workspace-gca");
}
async function getUserEmail2(accessToken) {
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      return data.email;
    }
  } catch {
  }
  return void 0;
}
async function refreshGoogleCloudToken(refreshToken, projectId) {
  const response = await fetch(TOKEN_URL3, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID4,
      client_secret: CLIENT_SECRET2,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Cloud token refresh failed: ${error}`);
  }
  const data = await response.json();
  return {
    refresh: data.refresh_token || refreshToken,
    access: data.access_token,
    expires: Date.now() + data.expires_in * 1e3 - 5 * 60 * 1e3,
    projectId
  };
}
async function loginGeminiCli(onAuth, onProgress, onManualCodeInput) {
  const { verifier, challenge } = await generatePKCE();
  onProgress?.("Starting local server for OAuth callback...");
  const server = await startCallbackServer3();
  let code;
  try {
    const authParams = new URLSearchParams({
      client_id: CLIENT_ID4,
      response_type: "code",
      redirect_uri: REDIRECT_URI3,
      scope: SCOPES3.join(" "),
      code_challenge: challenge,
      code_challenge_method: "S256",
      state: verifier,
      access_type: "offline",
      prompt: "consent"
    });
    const authUrl = `${AUTH_URL2}?${authParams.toString()}`;
    onAuth({
      url: authUrl,
      instructions: "Complete the sign-in in your browser."
    });
    onProgress?.("Waiting for OAuth callback...");
    if (onManualCodeInput) {
      let manualInput;
      let manualError;
      const manualPromise = onManualCodeInput().then((input) => {
        manualInput = input;
        server.cancelWait();
      }).catch((err) => {
        manualError = err instanceof Error ? err : new Error(String(err));
        server.cancelWait();
      });
      const result = await server.waitForCode();
      if (manualError) {
        throw manualError;
      }
      if (result?.code) {
        if (result.state !== verifier) {
          throw new Error("OAuth state mismatch - possible CSRF attack");
        }
        code = result.code;
      } else if (manualInput) {
        const parsed = parseRedirectUrl2(manualInput);
        if (parsed.state && parsed.state !== verifier) {
          throw new Error("OAuth state mismatch - possible CSRF attack");
        }
        code = parsed.code;
      }
      if (!code) {
        await manualPromise;
        if (manualError) {
          throw manualError;
        }
        if (manualInput) {
          const parsed = parseRedirectUrl2(manualInput);
          if (parsed.state && parsed.state !== verifier) {
            throw new Error("OAuth state mismatch - possible CSRF attack");
          }
          code = parsed.code;
        }
      }
    } else {
      const result = await server.waitForCode();
      if (result?.code) {
        if (result.state !== verifier) {
          throw new Error("OAuth state mismatch - possible CSRF attack");
        }
        code = result.code;
      }
    }
    if (!code) {
      throw new Error("No authorization code received");
    }
    onProgress?.("Exchanging authorization code for tokens...");
    const tokenResponse = await fetch(TOKEN_URL3, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID4,
        client_secret: CLIENT_SECRET2,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI3,
        code_verifier: verifier
      })
    });
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${error}`);
    }
    const tokenData = await tokenResponse.json();
    if (!tokenData.refresh_token) {
      throw new Error("No refresh token received. Please try again.");
    }
    onProgress?.("Getting user info...");
    const email = await getUserEmail2(tokenData.access_token);
    const projectId = await discoverProject2(tokenData.access_token, onProgress);
    const expiresAt = Date.now() + tokenData.expires_in * 1e3 - 5 * 60 * 1e3;
    const credentials = {
      refresh: tokenData.refresh_token,
      access: tokenData.access_token,
      expires: expiresAt,
      projectId,
      email
    };
    return credentials;
  } finally {
    server.server.close();
  }
}
var geminiCliOAuthProvider = {
  id: "google-gemini-cli",
  name: "Google Cloud Code Assist (Gemini CLI)",
  usesCallbackServer: true,
  async login(callbacks) {
    return loginGeminiCli(callbacks.onAuth, callbacks.onProgress, callbacks.onManualCodeInput);
  },
  async refreshToken(credentials) {
    const creds = credentials;
    if (!creds.projectId) {
      throw new Error("Google Cloud credentials missing projectId");
    }
    return refreshGoogleCloudToken(creds.refresh, creds.projectId);
  },
  getApiKey(credentials) {
    const creds = credentials;
    return JSON.stringify({ token: creds.access, projectId: creds.projectId });
  }
};

// node_modules/@mariozechner/pi-ai/dist/utils/oauth/openai-codex.js
var _randomBytes = null;
var _http = null;
if (typeof process !== "undefined" && (process.versions?.node || process.versions?.bun)) {
  import("crypto").then((m) => {
    _randomBytes = m.randomBytes;
  });
  import("http").then((m) => {
    _http = m;
  });
}
var CLIENT_ID5 = "app_EMoamEEZ73f0CkXaXp7hrann";
var AUTHORIZE_URL2 = "https://auth.openai.com/oauth/authorize";
var TOKEN_URL4 = "https://auth.openai.com/oauth/token";
var REDIRECT_URI4 = "http://localhost:1455/auth/callback";
var SCOPE = "openid profile email offline_access";
var JWT_CLAIM_PATH = "https://api.openai.com/auth";
function createState() {
  if (!_randomBytes) {
    throw new Error("OpenAI Codex OAuth is only available in Node.js environments");
  }
  return _randomBytes(16).toString("hex");
}
function parseAuthorizationInput2(input) {
  const value = input.trim();
  if (!value)
    return {};
  try {
    const url = new URL(value);
    return {
      code: url.searchParams.get("code") ?? void 0,
      state: url.searchParams.get("state") ?? void 0
    };
  } catch {
  }
  if (value.includes("#")) {
    const [code, state] = value.split("#", 2);
    return { code, state };
  }
  if (value.includes("code=")) {
    const params = new URLSearchParams(value);
    return {
      code: params.get("code") ?? void 0,
      state: params.get("state") ?? void 0
    };
  }
  return { code: value };
}
function decodeJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3)
      return null;
    const payload = parts[1] ?? "";
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}
async function exchangeAuthorizationCode2(code, verifier, redirectUri = REDIRECT_URI4) {
  const response = await fetch(TOKEN_URL4, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID5,
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri
    })
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("[openai-codex] code->token failed:", response.status, text);
    return { type: "failed" };
  }
  const json = await response.json();
  if (!json.access_token || !json.refresh_token || typeof json.expires_in !== "number") {
    console.error("[openai-codex] token response missing fields:", json);
    return { type: "failed" };
  }
  return {
    type: "success",
    access: json.access_token,
    refresh: json.refresh_token,
    expires: Date.now() + json.expires_in * 1e3
  };
}
async function refreshAccessToken(refreshToken) {
  try {
    const response = await fetch(TOKEN_URL4, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: CLIENT_ID5
      })
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("[openai-codex] Token refresh failed:", response.status, text);
      return { type: "failed" };
    }
    const json = await response.json();
    if (!json.access_token || !json.refresh_token || typeof json.expires_in !== "number") {
      console.error("[openai-codex] Token refresh response missing fields:", json);
      return { type: "failed" };
    }
    return {
      type: "success",
      access: json.access_token,
      refresh: json.refresh_token,
      expires: Date.now() + json.expires_in * 1e3
    };
  } catch (error) {
    console.error("[openai-codex] Token refresh error:", error);
    return { type: "failed" };
  }
}
async function createAuthorizationFlow(originator = "pi") {
  const { verifier, challenge } = await generatePKCE();
  const state = createState();
  const url = new URL(AUTHORIZE_URL2);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", CLIENT_ID5);
  url.searchParams.set("redirect_uri", REDIRECT_URI4);
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  url.searchParams.set("id_token_add_organizations", "true");
  url.searchParams.set("codex_cli_simplified_flow", "true");
  url.searchParams.set("originator", originator);
  return { verifier, state, url: url.toString() };
}
function startLocalOAuthServer(state) {
  if (!_http) {
    throw new Error("OpenAI Codex OAuth is only available in Node.js environments");
  }
  let settleWait;
  const waitForCodePromise = new Promise((resolve) => {
    let settled = false;
    settleWait = (value) => {
      if (settled)
        return;
      settled = true;
      resolve(value);
    };
  });
  const server = _http.createServer((req, res) => {
    try {
      const url = new URL(req.url || "", "http://localhost");
      if (url.pathname !== "/auth/callback") {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(oauthErrorHtml("Callback route not found."));
        return;
      }
      if (url.searchParams.get("state") !== state) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(oauthErrorHtml("State mismatch."));
        return;
      }
      const code = url.searchParams.get("code");
      if (!code) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(oauthErrorHtml("Missing authorization code."));
        return;
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(oauthSuccessHtml("OpenAI authentication completed. You can close this window."));
      settleWait?.({ code });
    } catch {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(oauthErrorHtml("Internal error while processing OAuth callback."));
    }
  });
  return new Promise((resolve) => {
    server.listen(1455, "127.0.0.1", () => {
      resolve({
        close: () => server.close(),
        cancelWait: () => {
          settleWait?.(null);
        },
        waitForCode: () => waitForCodePromise
      });
    }).on("error", (err) => {
      console.error("[openai-codex] Failed to bind http://127.0.0.1:1455 (", err.code, ") Falling back to manual paste.");
      settleWait?.(null);
      resolve({
        close: () => {
          try {
            server.close();
          } catch {
          }
        },
        cancelWait: () => {
        },
        waitForCode: async () => null
      });
    });
  });
}
function getAccountId(accessToken) {
  const payload = decodeJwt(accessToken);
  const auth = payload?.[JWT_CLAIM_PATH];
  const accountId = auth?.chatgpt_account_id;
  return typeof accountId === "string" && accountId.length > 0 ? accountId : null;
}
async function loginOpenAICodex(options) {
  const { verifier, state, url } = await createAuthorizationFlow(options.originator);
  const server = await startLocalOAuthServer(state);
  options.onAuth({ url, instructions: "A browser window should open. Complete login to finish." });
  let code;
  try {
    if (options.onManualCodeInput) {
      let manualCode;
      let manualError;
      const manualPromise = options.onManualCodeInput().then((input) => {
        manualCode = input;
        server.cancelWait();
      }).catch((err) => {
        manualError = err instanceof Error ? err : new Error(String(err));
        server.cancelWait();
      });
      const result = await server.waitForCode();
      if (manualError) {
        throw manualError;
      }
      if (result?.code) {
        code = result.code;
      } else if (manualCode) {
        const parsed = parseAuthorizationInput2(manualCode);
        if (parsed.state && parsed.state !== state) {
          throw new Error("State mismatch");
        }
        code = parsed.code;
      }
      if (!code) {
        await manualPromise;
        if (manualError) {
          throw manualError;
        }
        if (manualCode) {
          const parsed = parseAuthorizationInput2(manualCode);
          if (parsed.state && parsed.state !== state) {
            throw new Error("State mismatch");
          }
          code = parsed.code;
        }
      }
    } else {
      const result = await server.waitForCode();
      if (result?.code) {
        code = result.code;
      }
    }
    if (!code) {
      const input = await options.onPrompt({
        message: "Paste the authorization code (or full redirect URL):"
      });
      const parsed = parseAuthorizationInput2(input);
      if (parsed.state && parsed.state !== state) {
        throw new Error("State mismatch");
      }
      code = parsed.code;
    }
    if (!code) {
      throw new Error("Missing authorization code");
    }
    const tokenResult = await exchangeAuthorizationCode2(code, verifier);
    if (tokenResult.type !== "success") {
      throw new Error("Token exchange failed");
    }
    const accountId = getAccountId(tokenResult.access);
    if (!accountId) {
      throw new Error("Failed to extract accountId from token");
    }
    return {
      access: tokenResult.access,
      refresh: tokenResult.refresh,
      expires: tokenResult.expires,
      accountId
    };
  } finally {
    server.close();
  }
}
async function refreshOpenAICodexToken(refreshToken) {
  const result = await refreshAccessToken(refreshToken);
  if (result.type !== "success") {
    throw new Error("Failed to refresh OpenAI Codex token");
  }
  const accountId = getAccountId(result.access);
  if (!accountId) {
    throw new Error("Failed to extract accountId from token");
  }
  return {
    access: result.access,
    refresh: result.refresh,
    expires: result.expires,
    accountId
  };
}
var openaiCodexOAuthProvider = {
  id: "openai-codex",
  name: "ChatGPT Plus/Pro (Codex Subscription)",
  usesCallbackServer: true,
  async login(callbacks) {
    return loginOpenAICodex({
      onAuth: callbacks.onAuth,
      onPrompt: callbacks.onPrompt,
      onProgress: callbacks.onProgress,
      onManualCodeInput: callbacks.onManualCodeInput
    });
  },
  async refreshToken(credentials) {
    return refreshOpenAICodexToken(credentials.refresh);
  },
  getApiKey(credentials) {
    return credentials.access;
  }
};

// node_modules/@mariozechner/pi-ai/dist/utils/oauth/index.js
var BUILT_IN_OAUTH_PROVIDERS = [
  anthropicOAuthProvider,
  githubCopilotOAuthProvider,
  geminiCliOAuthProvider,
  antigravityOAuthProvider,
  openaiCodexOAuthProvider
];
var oauthProviderRegistry = new Map(BUILT_IN_OAUTH_PROVIDERS.map((provider2) => [provider2.id, provider2]));

// src/cache.ts
import { createHash } from "crypto";
var CACHE_ENDPOINT = "https://daily-cloudcode-pa.sandbox.googleapis.com";
var CACHE_API_PATH = "/v1beta/cachedContents";
var CACHE_TTL_SECONDS = 3600;
var EXPIRY_BUFFER_MS = 5 * 60 * 1e3;
var cacheStore = /* @__PURE__ */ new Map();
var uncacheable = /* @__PURE__ */ new Set();
var inFlight = /* @__PURE__ */ new Set();
function contentKey(systemInstruction, modelId) {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(systemInstruction));
  hash.update("\0");
  hash.update(modelId);
  return hash.digest("hex");
}
function isValid(entry) {
  return entry.expiresAt - EXPIRY_BUFFER_MS > Date.now();
}
function parseApiKey(apiKey) {
  if (typeof apiKey !== "string" || !apiKey) return null;
  try {
    const parsed = JSON.parse(apiKey);
    const token = typeof parsed.token === "string" ? parsed.token : null;
    const projectId = typeof parsed.projectId === "string" ? parsed.projectId : null;
    if (!token || !projectId) return null;
    return { token, projectId };
  } catch {
    return null;
  }
}
async function createAntigravityCache(token, projectId, modelId, systemInstruction) {
  try {
    const body = JSON.stringify({
      model: `models/${modelId}`,
      systemInstruction,
      contents: [],
      // No conversation turns — system prompt only
      ttl: `${CACHE_TTL_SECONDS}s`
      // projectId is passed as a query param per Cloud Code Assist conventions
    });
    const url = `${CACHE_ENDPOINT}${CACHE_API_PATH}?project=${encodeURIComponent(projectId)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": `google-cloud-sdk vscode_cloudshelleditor/0.1`
      },
      body
    });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const name = typeof data.name === "string" ? data.name : null;
    return name;
  } catch {
    return null;
  }
}
function scheduleCache(key, token, projectId, modelId, systemInstruction) {
  if (inFlight.has(key) || uncacheable.has(key)) return;
  inFlight.add(key);
  createAntigravityCache(token, projectId, modelId, systemInstruction).then((name) => {
    inFlight.delete(key);
    if (!name) {
      uncacheable.add(key);
      return;
    }
    cacheStore.set(key, {
      name,
      expiresAt: Date.now() + CACHE_TTL_SECONDS * 1e3
    });
  }).catch(() => {
    inFlight.delete(key);
  });
}
function withCacheInjection(baseOptions, modelId) {
  const originalOnPayload = baseOptions?.onPayload;
  return {
    ...baseOptions,
    onPayload: (payload, model) => {
      const body = payload;
      const systemInstruction = body?.request?.systemInstruction;
      if (!systemInstruction || !body?.request) {
        return originalOnPayload?.(payload, model);
      }
      const key = contentKey(systemInstruction, modelId);
      const existing = cacheStore.get(key);
      if (existing && isValid(existing)) {
        const modifiedBody = {
          ...body,
          request: {
            ...body.request,
            cachedContent: existing.name,
            systemInstruction: void 0
          }
        };
        return originalOnPayload?.(modifiedBody, model) ?? modifiedBody;
      }
      const creds = parseApiKey(baseOptions?.apiKey);
      if (creds) {
        scheduleCache(key, creds.token, creds.projectId, modelId, systemInstruction);
      }
      return originalOnPayload?.(payload, model);
    }
  };
}

// src/index.ts
var PROVIDER_ID = "google-antigravity";
var ANTIGRAVITY_MODELS = [
  // ── Claude 4.6 ────────────────────────────────────────────────────────────
  // Note: claude-sonnet-4-6 (non-thinking) is NOT available in Antigravity.
  {
    id: "claude-opus-4-6-thinking",
    name: "Claude Opus 4.6 (Thinking)",
    provider: PROVIDER_ID,
    contextWindow: 1e6,
    reasoning: true
  },
  // claude-sonnet-4-6-thinking is NOT in pi-ai catalog — added fresh here.
  // OpenClaw strips the -thinking suffix and routes to claude-sonnet-4-6 base + thinking on.
  {
    id: "claude-sonnet-4-6-thinking",
    name: "Claude Sonnet 4.6 (Thinking)",
    provider: PROVIDER_ID,
    contextWindow: 1e6,
    reasoning: true
  },
  // ── Gemini 3.x ────────────────────────────────────────────────────────────
  // pi-ai has these with correct contextWindow (1048576) — no suppression needed
  {
    id: "gemini-3.1-pro-high",
    name: "Gemini 3.1 Pro (High)",
    provider: PROVIDER_ID,
    contextWindow: 1048576,
    reasoning: true
  },
  {
    id: "gemini-3.1-pro-low",
    name: "Gemini 3.1 Pro (Low)",
    provider: PROVIDER_ID,
    contextWindow: 1048576,
    reasoning: true
  },
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: PROVIDER_ID,
    contextWindow: 1048576,
    reasoning: false
  },
  // ── GPT-OSS ───────────────────────────────────────────────────────────────
  // pi-ai has this with contextWindow: 131072 which is correct
  {
    id: "gpt-oss-120b-medium",
    name: "GPT-OSS 120B (Medium)",
    provider: PROVIDER_ID,
    contextWindow: 131072,
    reasoning: false
  }
];
async function runAntigravityOAuth(ctx) {
  const { prompter } = ctx;
  await prompter.intro("Google Antigravity OAuth");
  const progress = prompter.progress("Starting OAuth flow...");
  const credentials = await loginAntigravity(
    // onAuth: URL is ready, open browser
    async (info) => {
      progress.stop();
      await prompter.note(
        `Open this URL to authenticate with Google:

${info.url}`,
        "Browser Login Required"
      );
      try {
        const { exec } = await import("child_process");
        const cmd = process.platform === "darwin" ? `open "${info.url}"` : process.platform === "win32" ? `start "" "${info.url}"` : `xdg-open "${info.url}"`;
        exec(cmd);
      } catch {
      }
    },
    // onProgress: status updates
    (_msg) => {
    },
    // onManualCodeInput: fallback for remote/headless machines
    async () => {
      return prompter.text({
        message: "Browser didn't open? Paste the redirect URL from your browser here:",
        placeholder: "http://localhost:51121/oauth-callback?code=..."
      });
    }
  );
  await prompter.outro(
    `Authenticated as ${credentials.email ?? "unknown"} (project: ${credentials.projectId ?? "auto"})`
  );
  const profileId = `${PROVIDER_ID}-oauth`;
  const credential = {
    type: "oauth",
    provider: PROVIDER_ID,
    access: credentials.access,
    refresh: credentials.refresh,
    expires: credentials.expires,
    email: typeof credentials.email === "string" ? credentials.email : void 0,
    ...typeof credentials.projectId === "string" ? { projectId: credentials.projectId } : {}
  };
  return {
    profiles: [{ profileId, credential }],
    notes: [
      `Logged in as ${credentials.email ?? "unknown"}`,
      `Models available: ${ANTIGRAVITY_MODELS.map((m) => m.id).join(", ")}`
    ]
  };
}
var provider = {
  id: PROVIDER_ID,
  label: "Google Antigravity",
  docsPath: "https://github.com/GreyssonEnterprises/openclaw-google-antigravity",
  auth: [
    {
      id: `${PROVIDER_ID}-oauth`,
      label: "Google Antigravity OAuth",
      hint: "Claude 4.6 (Opus, Sonnet) and Gemini 3.1 Pro via Google Cloud Code Assist",
      kind: "oauth",
      run: runAntigravityOAuth
    }
  ],
  // Bug A fix: produce the { token, projectId } JSON that the Antigravity API expects.
  // Without this, OpenClaw sends the raw access token string and gets "Invalid credentials."
  formatApiKey(cred) {
    if (cred.type !== "oauth") {
      return "";
    }
    const extra = cred;
    const projectId = typeof extra.projectId === "string" ? extra.projectId : "";
    return JSON.stringify({ token: cred.access, projectId });
  },
  // Bug B fix: use the Antigravity-specific OAuth client credentials for refresh.
  // Without this, token refresh fails after ~60 minutes when the access token expires.
  async refreshOAuth(cred) {
    const extra = cred;
    const projectId = typeof extra.projectId === "string" ? extra.projectId : "";
    if (!projectId) {
      throw new Error(
        "google-antigravity: credential is missing projectId \u2014 re-authenticate with /login"
      );
    }
    const refreshed = await refreshAntigravityToken(cred.refresh, projectId);
    return {
      ...cred,
      access: refreshed.access,
      refresh: typeof refreshed.refresh === "string" ? refreshed.refresh : cred.refresh,
      expires: refreshed.expires
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
  }
};
var plugin = {
  register(api) {
    api.registerProvider(provider);
  }
};
var index_default = plugin;
export {
  index_default as default
};
