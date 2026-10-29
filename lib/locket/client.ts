import { getLocketConfig, type LocketConfig } from "./config";
import { LOCKET_DEFAULTS } from "./defaults";
import { getLocketAccount, updateLocketTokens } from "./store";

export class LocketError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, options: { status?: number; code?: string | null } = {}) {
    super(message);
    this.name = "LocketError";
    this.status = options.status ?? 0;
    this.code = options.code ?? null;
  }
}

export function locketErrorMessage(error: unknown): string {
  if (error instanceof LocketError) {
    return error.message;
  }

  if (error instanceof Error && error.name === "TimeoutError") {
    return "Locket didn't answer in time. Try again.";
  }

  return "Something went wrong talking to Locket. Try again.";
}

export type LocketTokens = {
  uid: string;
  idToken: string;
  refreshToken: string;
  expiresAt: string;
};

export type LocketSession = {
  userId: string;
  uid: string;
  idToken: string;
  refreshToken: string;
};

const FIREBASE_ERRORS: Record<string, string> = {
  EMAIL_NOT_FOUND: "Locket doesn't recognise that email or phone number.",
  INVALID_PASSWORD: "That password is wrong.",
  INVALID_LOGIN_CREDENTIALS: "Locket doesn't recognise that email / password pair.",
  INVALID_EMAIL: "That email address looks wrong.",
  MISSING_PASSWORD: "Enter your Locket password.",
  USER_DISABLED: "This Locket account has been disabled.",
  TOO_MANY_ATTEMPTS_TRY_LATER: "Too many attempts. Wait a few minutes, then try again.",
  OPERATION_NOT_ALLOWED: "Password sign-in is disabled for Locket's Firebase project.",
  API_KEY_INVALID: "That Firebase API key is not valid.",
  API_KEY_SERVICE_BLOCKED: "Firebase blocks this API key for Identity Toolkit.",
  INVALID_ID_TOKEN: "Locket rejected the session. Reconnect your Locket account.",
  TOKEN_EXPIRED: "Locket session expired. Reconnect your Locket account.",
  INVALID_REFRESH_TOKEN: "Locket session expired. Reconnect your Locket account.",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function firebaseError(status: number, payload: unknown): LocketError {
  const body = asRecord(asRecord(payload)?.error);
  const raw = typeof body?.message === "string" ? body.message : "";
  const code = raw.split(" ")[0] || null;
  let friendly = code ? FIREBASE_ERRORS[code] : null;

  // Secure Token answers with a sentence instead of an error code.
  if (!friendly && /api key not valid|api_key_invalid/i.test(raw)) {
    friendly = "That Firebase API key is not valid.";
  }

  if (!friendly && /token expired|invalid refresh token/i.test(raw)) {
    friendly = "Locket session expired. Reconnect your Locket account.";
  }

  return new LocketError(
    friendly ?? "Firebase rejected the request. Double-check the API key and your credentials.",
    { status, code },
  );
}

function identityHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Language": "en-US",
    "User-Agent": LOCKET_DEFAULTS.authUserAgent,
    "X-Ios-Bundle-Identifier": LOCKET_DEFAULTS.bundleId,
    "X-Client-Version": "iOS/FirebaseSDK/10.23.1/FirebaseCore-iOS",
    "X-Firebase-GMPID": LOCKET_DEFAULTS.gmpid,
    "X-Firebase-Client": LOCKET_DEFAULTS.firebaseClient,
  };
}

/**
 * The exact header set the iOS client sends to api.locketcamera.com. Locket's
 * edge rejects requests that don't look like the app, and App Check is where
 * most of that gatekeeping lives.
 */
export function locketHeaders(config: LocketConfig, idToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Language": "en-US",
    "User-Agent": LOCKET_DEFAULTS.appUserAgent,
    "X-Ios-Bundle-Identifier": LOCKET_DEFAULTS.bundleId,
    "X-Client-Version": "iOS/FirebaseSDK/10.23.1/FirebaseCore-iOS",
    "X-Firebase-GMPID": LOCKET_DEFAULTS.gmpid,
    "X-Firebase-Client": LOCKET_DEFAULTS.firebaseClient,
    baggage: LOCKET_DEFAULTS.sentryBaggage,
    "sentry-trace": LOCKET_DEFAULTS.sentryTrace,
  };

  if (config.appCheckToken) {
    headers["X-Firebase-AppCheck"] = config.appCheckToken;
  }

  if (config.instanceIdToken) {
    headers["Firebase-Instance-ID-Token"] = config.instanceIdToken;
  }

  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }

  return headers;
}

/** Firebase Identity Toolkit `verifyPassword` — the same call the iOS app makes. */
export async function signInToLocket(
  identifier: string,
  password: string,
): Promise<LocketTokens> {
  const config = getLocketConfig();

  if (!config.apiKey) {
    throw new LocketError(
      "Add Locket's Firebase API key under Server setup first.",
      { code: "NO_API_KEY" },
    );
  }

  const response = await fetch(
    `${LOCKET_DEFAULTS.identityToolkitBase}/verifyPassword?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: "POST",
      headers: identityHeaders(),
      body: JSON.stringify({
        email: identifier,
        password,
        returnSecureToken: true,
        clientType: "CLIENT_TYPE_IOS",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    },
  );

  const payload = await readJson(response);

  if (!response.ok) {
    throw firebaseError(response.status, payload);
  }

  const body = asRecord(payload);
  const idToken = typeof body?.idToken === "string" ? body.idToken : "";
  const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : "";
  const uid = typeof body?.localId === "string" ? body.localId : "";
  const expiresIn = Number(body?.expiresIn ?? 3600);

  if (!idToken || !refreshToken || !uid) {
    throw new LocketError("Firebase answered without a token. Check the API key.", {
      status: response.status,
    });
  }

  return {
    uid,
    idToken,
    refreshToken,
    expiresAt: new Date(Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000).toISOString(),
  };
}

/** Firebase Secure Token endpoint, used to mint a new ID token silently. */
export async function refreshLocketIdToken(refreshToken: string): Promise<LocketTokens> {
  const config = getLocketConfig();

  if (!config.apiKey) {
    throw new LocketError("Add Locket's Firebase API key under Server setup first.", {
      code: "NO_API_KEY",
    });
  }

  const response = await fetch(
    `${LOCKET_DEFAULTS.secureTokenBase}?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": LOCKET_DEFAULTS.authUserAgent,
        "X-Ios-Bundle-Identifier": LOCKET_DEFAULTS.bundleId,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    },
  );

  const payload = await readJson(response);

  if (!response.ok) {
    throw firebaseError(response.status, payload);
  }

  const body = asRecord(payload);
  const idToken = typeof body?.id_token === "string" ? body.id_token : "";
  const nextRefresh = typeof body?.refresh_token === "string" ? body.refresh_token : refreshToken;
  const uid = typeof body?.user_id === "string" ? body.user_id : "";
  const expiresIn = Number(body?.expires_in ?? 3600);

  if (!idToken) {
    throw new LocketError("Firebase didn't return a new session. Reconnect your Locket account.", {
      status: response.status,
    });
  }

  return {
    uid,
    idToken,
    refreshToken: nextRefresh,
    expiresAt: new Date(Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000).toISOString(),
  };
}

/** Loads the stored session, refreshing the ID token when it is about to expire. */
export async function getLocketSession(userId: string): Promise<LocketSession> {
  const account = await getLocketAccount(userId);

  if (!account) {
    throw new LocketError("This account isn't linked to Locket yet.", { code: "NOT_LINKED" });
  }

  const expiresAt = account.idTokenExpiresAt ? Date.parse(account.idTokenExpiresAt) : 0;

  if (account.idToken && Number.isFinite(expiresAt) && expiresAt - Date.now() > 60_000) {
    return {
      userId,
      uid: account.uid,
      idToken: account.idToken,
      refreshToken: account.refreshToken,
    };
  }

  const tokens = await refreshLocketIdToken(account.refreshToken);
  await updateLocketTokens(userId, {
    idToken: tokens.idToken,
    idTokenExpiresAt: tokens.expiresAt,
    refreshToken: tokens.refreshToken,
  });

  return {
    userId,
    uid: account.uid,
    idToken: tokens.idToken,
    refreshToken: tokens.refreshToken,
  };
}

async function authorizedFetch(
  session: LocketSession,
  url: string,
  init: RequestInit,
  config: LocketConfig,
): Promise<Response> {
  const send = (idToken: string) =>
    fetch(url, {
      ...init,
      headers: {
        ...locketHeaders(config, idToken),
        ...(init.headers as Record<string, string> | undefined),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(35_000),
    });

  let response = await send(session.idToken);

  if (response.status === 401) {
    const tokens = await refreshLocketIdToken(session.refreshToken);
    updateLocketTokens(session.userId, {
      idToken: tokens.idToken,
      idTokenExpiresAt: tokens.expiresAt,
      refreshToken: tokens.refreshToken,
    });
    session.idToken = tokens.idToken;
    session.refreshToken = tokens.refreshToken;
    response = await send(tokens.idToken);
  }

  return response;
}

function payloadMessage(payload: unknown): string | null {
  const body = asRecord(payload);
  const result = asRecord(body?.result);
  const resultError = result?.error;

  if (typeof resultError === "string" && resultError) {
    return resultError;
  }

  const nested = asRecord(resultError)?.message;

  if (typeof nested === "string" && nested) {
    return nested;
  }

  if (typeof result?.message === "string" && result.message) {
    return result.message;
  }

  const error = body?.error;
  const errorMessage = asRecord(error)?.message ?? error;

  if (typeof errorMessage === "string" && errorMessage) {
    return errorMessage;
  }

  if (typeof body?.message === "string" && body.message) {
    return body.message;
  }

  return null;
}

async function unwrap(
  response: Response,
  config: LocketConfig,
  label: string,
): Promise<unknown> {
  const payload = await readJson(response);
  const result = asRecord(asRecord(payload)?.result);
  const resultStatus = typeof result?.status === "number" ? result.status : response.status;
  const rejected = !response.ok || resultStatus >= 400;

  if (!rejected) {
    return payload;
  }

  const status = response.status || resultStatus;
  let hint = "";

  if (status === 401 || status === 403) {
    hint = config.appCheckToken
      ? " Locket rejected App Check — that JWT lives about an hour, paste a fresh one."
      : " No App Check token is saved, so Locket will refuse most calls.";
  }

  throw new LocketError(
    `${payloadMessage(payload) ?? `Locket answered ${status} for ${label}.`}${hint}`,
    { status },
  );
}

/** POSTs to the private Locket API with the iOS header set. */
export async function locketPost(
  session: LocketSession,
  path: string,
  body: unknown,
): Promise<unknown> {
  const config = getLocketConfig();
  const url = `${config.apiBase.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  const response = await authorizedFetch(
    session,
    url,
    { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } },
    config,
  );

  return unwrap(response, config, path);
}

/** Reads a Firestore document collection in Locket's own project. */
export async function firestoreGet(session: LocketSession, path: string): Promise<unknown> {
  const config = getLocketConfig();
  const url = `${LOCKET_DEFAULTS.firestoreBase}/${path.replace(/^\/+/, "")}`;
  const response = await authorizedFetch(session, url, { method: "GET" }, config);

  return unwrap(response, config, "firestore");
}
