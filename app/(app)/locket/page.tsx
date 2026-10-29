import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { LocketPanel } from "@/components/locket/LocketPanel";
import { requireUser } from "@/lib/auth";
import { isLocketAdmin } from "@/lib/locket/admin";
import { describeLocketConfig, ensureConfigLoaded } from "@/lib/locket/config";
import { getLocketAccount } from "@/lib/locket/store";

export default async function LocketAccountPage() {
  const user = await requireUser();
  await ensureConfigLoaded();

  const account = await getLocketAccount(user.id);
  const setup = describeLocketConfig();
  const isAdmin = await isLocketAdmin(user);

  return (
    <div>
      <PageHeader title="Locket account" backHref="/profile" />

      <main className="px-4 pb-8 pt-6">
        <LocketPanel
          linked={
            account
              ? {
                  uid: account.uid,
                  name: account.displayName ?? account.username ?? account.uid,
                  username: account.username,
                  avatarUrl: account.avatarUrl,
                  identifier: account.email ?? account.phone,
                  linkedAt: account.linkedAt,
                }
              : null
          }
          setup={{
            apiKeyPreview: setup.apiKeyPreview,
            appCheckPreview: setup.appCheckPreview,
            instanceIdPreview: setup.instanceIdPreview,
            apiBase: setup.config.apiBase,
            ready: setup.ready,
          }}
          isAdmin={isAdmin}
        />

        <p className="mt-6 text-center text-[11.5px] leading-relaxed text-white/20">
          Unofficial Locket client. Photos you send here also stay on this device.
          <br />
          <Link href="/profile" className="text-white/30 underline-offset-2 hover:underline">
            Back to profile
          </Link>
        </p>
      </main>
    </div>
  );
}
