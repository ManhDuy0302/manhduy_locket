"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  KeyRound,
  Loader2,
  PlugZap,
  ShieldAlert,
  Unplug,
  UserRound,
} from "lucide-react";

import {
  connectLocketAction,
  connectLocketWithTokenAction,
  disconnectLocketAction,
  saveLocketConfigAction,
  testLocketConnectionAction,
} from "@/app/actions/locket";
import { useToast } from "@/components/Toast";

export type LinkedLocketAccount = {
  uid: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  identifier: string | null;
  linkedAt: string;
};

export type LocketSetupState = {
  apiKeyPreview: string | null;
  appCheckPreview: string | null;
  instanceIdPreview: string | null;
  apiBase: string;
  ready: boolean;
};

type LocketPanelProps = {
  linked: LinkedLocketAccount | null;
  setup: LocketSetupState;
  isAdmin: boolean;
};

function StatusPill({ ready, children }: { ready: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
        ready ? "bg-gold/15 text-gold" : "bg-white/[0.06] text-white/45"
      }`}
    >
      {ready ? <CheckCircle2 size={12} /> : <ShieldAlert size={12} />}
      {children}
    </span>
  );
}

export function LocketPanel({ linked, setup, isAdmin }: LocketPanelProps) {
  const router = useRouter();
  const toast = useToast();

  const [pending, startTransition] = useTransition();
  const [showSetup, setShowSetup] = useState(!setup.ready && isAdmin);
  const [showToken, setShowToken] = useState(false);

  const submitConnect = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pending) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;

    startTransition(async () => {
      const result = await connectLocketAction(formData);

      if (!result.ok) {
        toast(result.error);
        return;
      }

      form.reset();
      toast(result.message ?? "Connected to Locket.");
      router.refresh();
    });
  };

  const submitToken = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pending) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;

    startTransition(async () => {
      const result = await connectLocketWithTokenAction(formData);

      if (!result.ok) {
        toast(result.error);
        return;
      }

      form.reset();
      toast(result.message ?? "Connected to Locket.");
      router.refresh();
    });
  };

  const submitSetup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pending) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await saveLocketConfigAction(formData);

      if (!result.ok) {
        toast(result.error);
        return;
      }

      toast(result.message ?? "Saved.");
      router.refresh();
    });
  };

  const test = () => {
    if (pending) {
      return;
    }

    startTransition(async () => {
      const result = await testLocketConnectionAction();
      toast(result.ok ? (result.message ?? "Locket answered.") : result.error);
    });
  };

  const disconnect = () => {
    if (pending) {
      return;
    }

    startTransition(async () => {
      const result = await disconnectLocketAction();

      if (!result.ok) {
        toast(result.error);
        return;
      }

      toast(result.message ?? "Disconnected.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[26px] border border-white/[0.07] bg-gradient-to-b from-[#19191C] to-[#111113] p-4">
        <div className="flex items-center justify-between px-1 pb-3">
          <span className="flex items-center gap-2 text-[13px] font-medium text-white/45">
            <PlugZap size={14} className="text-gold" />
            Real Locket account
          </span>
          <StatusPill ready={Boolean(linked)}>{linked ? "Linked" : "Not linked"}</StatusPill>
        </div>

        {linked ? (
          <div className="rounded-2xl bg-white/[0.04] p-3.5">
            <div className="flex items-center gap-3">
              {linked.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={linked.avatarUrl}
                  alt={linked.name}
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                  <UserRound size={20} className="text-white/50" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{linked.name}</p>
                <p className="truncate text-[12.5px] text-white/40">
                  {linked.username ? `@${linked.username}` : linked.identifier ?? "Locket account"}
                </p>
              </div>
            </div>

            <dl className="mt-3 space-y-1 border-t border-white/[0.06] pt-3 text-[12px] text-white/35">
              <div className="flex justify-between gap-3">
                <dt>Locket UID</dt>
                <dd className="truncate font-mono text-white/55">{linked.uid}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Linked on</dt>
                <dd className="text-white/55">{linked.linkedAt.slice(0, 10)}</dd>
              </div>
            </dl>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={test}
                disabled={pending}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-gold text-[13.5px] font-semibold text-black disabled:opacity-60"
              >
                {pending ? <Loader2 size={15} className="animate-spin" /> : null}
                Test connection
              </button>
              <button
                type="button"
                onClick={disconnect}
                disabled={pending}
                className="flex h-10 items-center justify-center gap-2 rounded-full bg-white/[0.07] px-4 text-[13.5px] font-medium text-white/65 disabled:opacity-60"
              >
                <Unplug size={15} />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submitConnect} className="space-y-2.5">
            <label className="block">
              <span className="px-1 text-[12px] font-medium text-white/45">
                Locket account email
              </span>
              <input
                name="identifier"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="you@example.com"
                className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-elevated px-3.5 text-[14.5px] outline-none focus:border-gold/60"
              />
            </label>
            <label className="block">
              <span className="px-1 text-[12px] font-medium text-white/45">Password</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Your Locket password"
                className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-elevated px-3.5 text-[14.5px] outline-none focus:border-gold/60"
              />
            </label>
            <button
              type="submit"
              disabled={pending || !setup.ready}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gold text-[14.5px] font-semibold text-black disabled:opacity-60"
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : null}
              Connect Locket
            </button>

            {!setup.ready ? (
              <p className="px-1 text-[12px] leading-relaxed text-amber-200/70">
                This server isn&apos;t connected to Locket yet. Ask the site owner to add the Firebase key.
              </p>
            ) : null}
          </form>
        )}

        {!linked ? (
          <div className="mt-3 border-t border-white/[0.06] pt-3">
            <button
              type="button"
              onClick={() => setShowToken((value) => !value)}
              className="text-[12px] font-medium text-white/40"
            >
              {showToken ? "Hide captured session" : "No password? Use a session captured from the app"}
            </button>

            {showToken ? (
              <form onSubmit={submitToken} className="mt-2 space-y-2">
                <textarea
                  name="refreshToken"
                  rows={3}
                  required
                  spellCheck={false}
                  placeholder="refresh_token (AMf-vB…)"
                  className="w-full resize-y rounded-2xl border border-white/10 bg-elevated px-3.5 py-2.5 font-mono text-[11.5px] outline-none focus:border-gold/60"
                />
                <p className="px-1 text-[11px] leading-relaxed text-white/30">
                  In mitmweb open the securetoken POST → Response tab → copy the refresh_token value.
                </p>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.08] text-[13.5px] font-semibold text-white/85 disabled:opacity-60"
                >
                  {pending ? <Loader2 size={15} className="animate-spin" /> : null}
                  Connect with token
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </section>

      {isAdmin ? (
        <section className="overflow-hidden rounded-[26px] border border-white/[0.07] bg-[#111113]">
        <button
          type="button"
          onClick={() => setShowSetup((value) => !value)}
          className="flex w-full items-center justify-between px-4 py-3.5"
        >
          <span className="flex items-center gap-2 text-[13px] font-medium text-white/45">
            <KeyRound size={14} />
            Server setup
          </span>
          <span className="flex items-center gap-2">
            <StatusPill ready={setup.ready}>{setup.ready ? "Ready" : "Missing key"}</StatusPill>
            <ChevronDown
              size={16}
              className={`text-white/30 transition-transform ${showSetup ? "rotate-180" : ""}`}
            />
          </span>
        </button>

        {showSetup ? (
          <form onSubmit={submitSetup} className="space-y-3 border-t border-white/[0.06] px-4 py-4">
            <p className="text-[12px] leading-relaxed text-white/35">
              Locket&apos;s Firebase project has no public config. These values come from the
              Locket app on a phone you own. They are stored server side and never sent to the
              browser.
            </p>

            <label className="block">
              <span className="px-1 text-[12px] font-medium text-white/45">
                Firebase API key <span className="text-gold">(required)</span>
              </span>
              <input
                name="apiKey"
                placeholder={setup.apiKeyPreview ?? "AIza…"}
                autoCapitalize="none"
                spellCheck={false}
                className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-elevated px-3.5 font-mono text-[13px] outline-none focus:border-gold/60"
              />
              <span className="mt-1 block px-1 text-[11px] text-white/25">
                {setup.apiKeyPreview ? "Saved, leave blank to keep it." : "Required."}
              </span>
            </label>

            <label className="block">
              <span className="px-1 text-[12px] font-medium text-white/45">
                X-Firebase-AppCheck JWT <span className="text-white/25">(optional)</span>
              </span>
              <textarea
                name="appCheckToken"
                rows={3}
                placeholder={setup.appCheckPreview ?? "eyJraWQiOiJNbjVDS1Ei…"}
                spellCheck={false}
                className="mt-1 w-full resize-y rounded-2xl border border-white/10 bg-elevated px-3.5 py-2.5 font-mono text-[12px] outline-none focus:border-gold/60"
              />
              <span className="mt-1 block px-1 text-[11px] leading-relaxed text-white/25">
                Only needed when Locket answers 401/403. Those tokens expire after about an hour.
              </span>
            </label>

            <label className="block">
              <span className="px-1 text-[12px] font-medium text-white/45">
                Firebase Instance ID token <span className="text-white/25">(optional)</span>
              </span>
              <textarea
                name="instanceIdToken"
                rows={2}
                placeholder={setup.instanceIdPreview ?? "d7ChZwJHhEtsluXwXxbjmj:APA91b…"}
                spellCheck={false}
                className="mt-1 w-full resize-y rounded-2xl border border-white/10 bg-elevated px-3.5 py-2.5 font-mono text-[12px] outline-none focus:border-gold/60"
              />
            </label>

            <label className="block">
              <span className="px-1 text-[12px] font-medium text-white/45">API base</span>
              <input
                name="apiBase"
                defaultValue={setup.apiBase}
                autoCapitalize="none"
                spellCheck={false}
                className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-elevated px-3.5 font-mono text-[12.5px] outline-none focus:border-gold/60"
              />
            </label>

            <button
              type="submit"
              disabled={pending}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.08] text-[14px] font-semibold text-white/85 disabled:opacity-60"
            >
              {pending ? <Loader2 size={15} className="animate-spin" /> : null}
              Save settings
            </button>
          </form>
        ) : null}
        </section>
      ) : null}

      <section className="rounded-[22px] border border-amber-400/15 bg-amber-400/[0.05] p-4">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-amber-200/90">
          <ShieldAlert size={15} />
          Before you use this
        </p>
        <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-amber-100/50">
          <li>· It signs in to Locket&apos;s private Firebase project, which breaks Locket&apos;s terms.</li>
          <li>· Accounts that post through unofficial clients can be limited or banned.</li>
          <li>· App Check tokens die after roughly an hour; the feed then stops until you paste a new one.</li>
          <li>· Only connect an account you own.</li>
        </ul>
      </section>
    </div>
  );
}
