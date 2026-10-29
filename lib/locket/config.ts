import { LOCKET_DEFAULTS } from "./defaults";
import { readSetting, writeSetting } from "./store";

/**
 * Locket talks to Locket's own Firebase project (locket-4252a). Two things are
 * needed: the Firebase Web API key baked into the shipped iOS app, and
 * optionally an X-Firebase-AppCheck JWT.
 *
 * Values come from .env or from what the operator pasted at /locket. The saved
 * copy lives in Postgres, so it is cached in memory once per server process and
 * refreshed whenever it is written.
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

let savedConfig: SavedConfig | null = null;
let loadPromise: Promise<void> | null = null;

function parse(raw: string | null): SavedConfig {
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

/** Reads the saved settings once per process (called at boot and before writes). */
export async function ensureConfigLoaded(): Promise<void> {
  if (savedConfig) {
    return;
  }

  loadPromise ??= (async () => {
    savedConfig = parse(await readSetting(SETTINGS_KEY));
  })().catch((error) => {
    loadPromise = null;
    throw error;
  });

  await loadPromise;
}

function readSavedConfig(): SavedConfig {
  return savedConfig ?? {};
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
  const saved = readSavedConfig();

  return {
    config,
    apiKeyPreview: preview(config.apiKey),
    appCheckPreview: preview(config.appCheckToken),
    instanceIdPreview: preview(config.instanceIdToken),
    apiKeyFromEnv: !saved.apiKey && Boolean(process.env.LOCKET_FIREBASE_API_KEY),
    appCheckFromEnv: !saved.appCheckToken && Boolean(process.env.LOCKET_APPCHECK_TOKEN),
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

export async function saveLocketConfigInput(input: LocketConfigInput): Promise<void> {
  await ensureConfigLoaded();

  const current = readSavedConfig();

  const next: SavedConfig = {
    ...current,
    apiKey: input.apiKey?.trim() ?? current.apiKey,
    appCheckToken: input.appCheckToken?.trim() ?? current.appCheckToken,
    instanceIdToken: input.instanceIdToken?.trim() ?? current.instanceIdToken,
    apiBase: input.apiBase?.trim() ?? current.apiBase,
  };

  await writeSetting(SETTINGS_KEY, JSON.stringify(next));
  savedConfig = next;
}
