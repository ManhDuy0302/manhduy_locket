/**
 * Constants that the real Locket iOS client sends. They are not secrets: they
 * are baked into the shipped app binary and are what makes the private API
 * believe the request comes from a phone.
 */
export const LOCKET_DEFAULTS = {
  apiBase: "https://api.locketcamera.com",
  projectId: "locket-4252a",
  storageBucket: "locket-img",
  identityToolkitBase: "https://www.googleapis.com/identitytoolkit/v3/relyingparty",
  secureTokenBase: "https://securetoken.googleapis.com/v1/token",
  firestoreBase: "https://firestore.googleapis.com/v1/projects/locket-4252a/databases",
  bundleId: "com.locket.Locket",
  gmpid: "1:641029076083:ios:cc8eb46290d69b234fa606",
  firebaseClient: "H4sIAAAAAAAAAKtWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA",
  appUserAgent: "com.locket.Locket/1.121.1 iPhone/18.2 hw/iPhone12_1",
  authUserAgent: "FirebaseAuth.iOS/10.23.1 com.locket.Locket/1.82.0 iPhone/18.0 hw/iPhone12_1",
  uploaderUserAgent: "com.locket.Locket/1.43.1 iPhone/17.3 hw/iPhone15_3 (GTMSUF/1)",
  sentryBaggage:
    "sentry-environment=production,sentry-public_key=78fa64317f434fd89d9cc728dd168f50,sentry-release=com.locket.Locket%401.121.1%2B1,sentry-trace_id=2cdda588ea0041ed93d052932b127a3e",
  sentryTrace: "2cdda588ea0041ed93d052932b127a3e-a3e2ba7a095d4f9d-0",
  cdnBase: "https://cdn.locketcamera.com",
} as const;
