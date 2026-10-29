"use server";

import { redirect } from "next/navigation";

import { destroySession } from "@/lib/auth";

/**
 * Accounts are never created here: every session comes from a real Locket login
 * (see app/actions/locket-login.ts). The only local account action is logging
 * out of the browser session.
 */
export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
