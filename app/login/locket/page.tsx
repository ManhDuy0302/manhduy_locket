import { redirect } from "next/navigation";

/** Kept so older links (and the docs) keep working. */
export default function LegacyLocketLoginPage() {
  redirect("/login");
}
