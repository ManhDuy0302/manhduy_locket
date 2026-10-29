import { LOCKET_DEFAULTS } from "./defaults";
import { readSetting, writeSetting } from "./store";

/**
 * Locket talks to Locket's own Firebase project (locket-4252a). Nothing in this
 * app can work without two things only the operator can provide:
 *
 * - the Firebase Web API key of that project (starts with "AIza" and is baked
 *   into the shipped iOS app),
 * - an X-Firebase-AppCheck JWT, which the real app obtains from DeviceCheck.
 *   Those tokens are short lived, so they must be refreshed from a device.
 *
 * Values can come from .env or be pasted at /locket. Saved values win.
 */
export type LocketConfig = {
  apiBase: string;
  apiKey: string;
  appCheckToken: string;
  instanceIdToken: string;
};

export type LocketConfigSummary = {
  config: LocketConfig;
  apiKeyPreview: string | null;
  appCheckPreview: string | null;
  instanceIdPreview: string | null;
  apiKeyFromEnv: boolean;
  appCheckFromEnv: boolean;
  ready: boolean;
};

const SETTINGS_KEY = "locket.config";

type SavedConfig = Partial<Record<keyof LocketConfig, string>>;

function readSavedConfig(): SavedConfig {
  const raw = readSetting(SETTINGS_KEY);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as SavedConfig;

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function pick(saved: string | undefined, env: string | undefined, fallback = ""): string {
  const fromSaved = saved?.trim();

  if (fromSaved) {
    return fromSaved;
  }

  return env?.trim() || fallback;
}

export function getLocketConfig(): LocketConfig {
  const saved = readSavedConfig();

  return {
    apiBase: pick(saved.apiBase, process.env.LOCKET_API_BASE, LOCKET_DEFAULTS.apiBase),
    apiKey: pick(saved.apiKey, process.env.LOCKET_FIREBASE_API_KEY ?? process.env.FIREBASE_API_KEY),
    appCheckToken: pick(saved.appCheckToken, process.env.LOCKET_APPCHECK_TOKEN),
    instanceIdToken: pick(saved.instanceIdToken, process.env.LOCKET_INSTANCE_ID_TOKEN),
  };
}

function preview(value: string): string | null {
  if (!value) {
    return null;
  }

  if (value.length <= 12) {
    return `${value.slice(0, 3)}…`;
  }

  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function describeLocketConfig(): LocketConfigSummary {
  const config = getLocketConfig();

  return {
    config,
    apiKeyPreview: preview(config.apiKey),
    appCheckPreview: preview(config.appCheckToken),
    instanceIdPreview: preview(config.instanceIdToken),
    apiKeyFromEnv: !readSavedConfig().apiKey && Boolean(process.env.LOCKET_FIREBASE_API_KEY),
    appCheckFromEnv: !readSavedConfig().appCheckToken && Boolean(process.env.LOCKET_APPCHECK_TOKEN),
    // Without an API key there is no way to reach Firebase Auth at all.
    ready: Boolean(config.apiKey),
  };
}

export type LocketConfigInput = {
  apiKey?: string;
  appCheckToken?: string;
  instanceIdToken?: string;
  apiBase?: string;
};

export function saveLocketConfigInput(input: LocketConfigInput): void {
  const current = readSavedConfig();

  const next: SavedConfig = {
    ...current,
    apiKey: input.apiKey?.trim() ?? current.apiKey,
    appCheckToken: input.appCheckToken?.trim() ?? current.appCheckToken,
    instanceIdToken: input.instanceIdToken?.trim() ?? current.instanceIdToken,
    apiBase: input.apiBase?.trim() ?? current.apiBase,
  };

  writeSetting(SETTINGS_KEY, JSON.stringify(next));
}
