# openclaw-google-antigravity

OpenClaw provider plugin for **Google Antigravity** — gives OpenClaw access to:

- **Claude Opus 4.6 (Thinking)**
- **Claude Sonnet 4.6**
- **Claude Sonnet 4.6 (Thinking)**
- **Gemini 3.1 Pro High**
- **Gemini 3.1 Pro Low**

...all via Google Cloud Code Assist (free tier).

## Why this exists

OpenClaw v2026.3.22 knows `google-antigravity` is a provider but has three gaps that prevent it from working:

| Bug | Symptom | What this plugin does |
|-----|---------|----------------------|
| **A** | "Invalid Google Cloud Code Assist credentials" on every request | `formatApiKey` — wraps the OAuth token in the `{ token, projectId }` JSON payload the API requires |
| **B** | Models stop working after ~60 minutes | `refreshOAuth` — uses the correct Antigravity OAuth client credentials to refresh the token |
| **C** | Context window shows as 195K instead of 977K/1M | `augmentModelCatalog` + `suppressBuiltInModel` — replaces the stale pi-ai catalog entries with correct 1M values |

The plugin bundles the pi-ai OAuth implementation so it is **fully self-contained** — no external dependencies at runtime.

## Installation

```bash
# Install via npm (recommended — openclaw handles placement)
openclaw plugins install npm:openclaw-google-antigravity

# Or manually copy to extensions directory
cp -r path/to/dist ~/.openclaw/extensions/openclaw-google-antigravity
cp openclaw.plugin.json ~/.openclaw/extensions/openclaw-google-antigravity/
```

## First-time auth

```
/login google-antigravity
```

This opens a browser OAuth flow. On headless machines, paste the redirect URL when prompted.

## openclaw.json model config

Add to your `~/.openclaw/openclaw.json` to set correct maxTokens (the plugin fixes contextWindow display, but pi-ai's maxTokens is separate):

```json
{
  "models": {
    "providers": {
      "google-antigravity": {
        "baseUrl": "https://daily-cloudcode-pa.sandbox.googleapis.com",
        "models": [
          { "id": "claude-opus-4-6-thinking",  "contextWindow": 1000000, "maxTokens": 128000, "reasoning": true },
          { "id": "claude-sonnet-4-6",          "contextWindow": 1000000, "maxTokens": 128000, "reasoning": true },
          { "id": "claude-sonnet-4-6-thinking", "contextWindow": 1000000, "maxTokens": 128000, "reasoning": true },
          { "id": "gemini-3.1-pro-high",        "contextWindow": 1048576, "maxTokens": 65536,  "reasoning": true },
          { "id": "gemini-3.1-pro-low",         "contextWindow": 1048576, "maxTokens": 65536,  "reasoning": true }
        ]
      }
    }
  }
}
```

## Upgrade-safe

This plugin lives in `~/.openclaw/extensions/` — a directory openclaw never touches during upgrades. No fork of openclaw, no Ansible dist-patching, no post-upgrade manual fixes.

## Ansible deployment

For multi-machine fleet deployment:

```yaml
- name: Install google-antigravity plugin
  community.general.npm:
    name: openclaw-google-antigravity
    global: false
    path: "{{ openclaw_extensions_dir }}/openclaw-google-antigravity"
  # or use git clone + npm install + npm run build
```

## Building from source

```bash
git clone https://github.com/GreyssonEnterprises/openclaw-google-antigravity
cd openclaw-google-antigravity
npm install
npm run build
```

## Compatibility

| Plugin version | OpenClaw version | Notes |
|---------------|-----------------|-------|
| 2026.3.22+    | 2026.3.22+      | New plugin-sdk architecture |

## Account ban risk

Per [openclaw issue #14203](https://github.com/openclaw/openclaw/issues/14203), Google has started disabling Google accounts used with third-party Antigravity OAuth. Use a dedicated Google account.
