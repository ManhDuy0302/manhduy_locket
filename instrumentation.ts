/**
 * Runs once when the server boots. Kept tiny on purpose: the deployment
 * bootstrap lives in lib/bootstrap.ts so it can stay out of the request path.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  try {
    const { runBootstrap } = await import("./lib/bootstrap");
    await runBootstrap();
  } catch (error) {
    console.error("[bootstrap] skipped:", error instanceof Error ? error.message : error);
  }
}
