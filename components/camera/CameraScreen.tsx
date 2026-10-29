"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CameraOff,
  Check,
  ChevronLeft,
  ChevronRight,
  Images,
  Loader2,
  RefreshCcw,
  RotateCcw,
  UsersRound,
} from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { useToast } from "@/components/Toast";
import { mediaUrl } from "@/lib/format";
import { preparePhoto } from "@/lib/image-client";

type CameraUser = {
  displayName: string;
  username: string;
  avatarFile: string | null;
};

type CameraScreenProps = {
  user: CameraUser;
  friendCount: number;
  latestFile: string | null;
  locketLinked: boolean;
};

type EngineState = "starting" | "ready" | "unavailable";

type Shot = {
  blob: Blob;
  url: string;
};

function cameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
      case "SecurityError":
        return "Camera access is blocked. Allow it in your browser settings, or choose a photo instead.";
      case "NotFoundError":
      case "OverconstrainedError":
        return "No camera found on this device. Pick a photo from your library instead.";
      case "NotReadableError":
        return "Your camera is busy in another app. Close it and try again.";
      case "NotSupportedError":
        return "This browser can't open a camera. Pick a photo from your library instead.";
      default:
        break;
    }
  }

  return "We couldn't open the camera. You can pick a photo instead.";
}

export function CameraScreen({ user, friendCount, latestFile, locketLinked }: CameraScreenProps) {
  const router = useRouter();
  const toast = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);
  const shotRef = useRef<Shot | null>(null);

  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [engine, setEngine] = useState<EngineState>("starting");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [shot, setShot] = useState<Shot | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [sendToLocket, setSendToLocket] = useState(locketLinked);
  const [flashKey, setFlashKey] = useState(0);

  const hasStream = shot === null;
  const historyThumb = mediaUrl(latestFile);

  const replaceShot = useCallback((next: Shot | null) => {
    if (shotRef.current) {
      URL.revokeObjectURL(shotRef.current.url);
    }

    shotRef.current = next;
    setShot(next);
  }, []);

  useEffect(() => {
    return () => {
      if (shotRef.current) {
        URL.revokeObjectURL(shotRef.current.url);
      }
    };
  }, []);

  const resetEngine = useCallback(() => {
    setEngine("starting");
    setCameraError(null);
  }, []);

  useEffect(() => {
    if (!hasStream) {
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    const videoElement = videoRef.current;

    const openStream = async (): Promise<MediaStream> => {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException("This browser can't open a camera.", "NotSupportedError");
      }

      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: facing,
            width: { ideal: 1440 },
            height: { ideal: 1920 },
          },
        });
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";

        // Devices with a single camera may reject "environment" outright.
        if (name === "OverconstrainedError" || name === "NotFoundError") {
          return navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        }

        throw error;
      }
    };

    openStream()
      .then((nextStream) => {
        if (cancelled) {
          nextStream.getTracks().forEach((track) => track.stop());
          return;
        }

        stream = nextStream;

        if (videoElement) {
          videoElement.srcObject = nextStream;
          void videoElement.play().catch(() => undefined);
        }

        setEngine("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setEngine("unavailable");
        setCameraError(cameraErrorMessage(error));
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());

      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [facing, hasStream]);

  const capture = async () => {
    const video = videoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      toast("The camera is still warming up. Try again in a second.");
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    const targetRatio = 3 / 4;

    let sourceWidth = width;
    let sourceHeight = height;

    if (width / height > targetRatio) {
      sourceWidth = height * targetRatio;
    } else {
      sourceHeight = width / targetRatio;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1440;

    const context = canvas.getContext("2d");

    if (!context) {
      toast("Your browser can't take photos.");
      return;
    }

    if (facing === "user") {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    context.drawImage(
      video,
      (width - sourceWidth) / 2,
      (height - sourceHeight) / 2,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    setFlashKey((key) => key + 1);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.9);
    });

    if (!blob) {
      toast("We couldn't capture that photo. Try again.");
      return;
    }

    replaceShot({ blob, url: URL.createObjectURL(blob) });
  };

  const takeFromLibrary = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast("Pick a photo from your library.");
      return;
    }

    try {
      const blob = await preparePhoto(file);
      replaceShot({ blob, url: URL.createObjectURL(blob) });
    } catch {
      toast("We couldn't read that photo. Try another one.");
    }
  };

  const send = async () => {
    if (!shot || sending) {
      return;
    }

    setSending(true);

    try {
      const formData = new FormData();
      formData.append("photo", shot.blob, "locket.jpg");

      if (locketLinked && sendToLocket) {
        formData.append("toLocket", "1");
      }

      const response = await fetch("/api/moments", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; locket?: { ok: boolean; error?: string } | null }
        | null;

      if (!response.ok) {
        toast(payload?.error ?? "Couldn't send your Locket. Try again.");
        return;
      }

      const locketFailed = payload?.locket && !payload.locket.ok;

      if (locketFailed) {
        toast(payload?.locket?.error ?? "Locket didn't accept that photo. It is saved here.");
      }

      setSent(
        locketFailed
          ? "Saved here · Locket failed"
          : locketLinked && sendToLocket
            ? "Posted to Locket"
            : friendCount === 0
              ? "Saved to your Lockets"
              : `Sent to ${friendCount} ${friendCount === 1 ? "friend" : "friends"}`,
      );
      router.refresh();

      window.setTimeout(() => {
        setFlashKey(0);
        resetEngine();
        replaceShot(null);
      }, 1500);
      window.setTimeout(() => setSent(null), 2400);
    } catch {
      toast("Couldn't send your Locket. Check your connection.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[100dvh] select-none flex-col overflow-hidden bg-black">
      <header className="safe-top shrink-0">
        <div className="grid h-[54px] grid-cols-[44px_1fr_44px] items-center px-4">
          <Link
            href="/"
            aria-label="Back to home"
            className="glass flex h-10 w-10 items-center justify-center justify-self-start rounded-full border border-white/[0.06] text-white/80"
          >
            <ChevronLeft size={22} strokeWidth={2.2} />
          </Link>

          <Link
            href="/friends"
            className="glass mx-auto flex h-10 items-center gap-2 rounded-full border border-white/[0.06] px-4 text-[14px] font-medium"
          >
            <UsersRound size={16} strokeWidth={2.1} className="text-white/70" />
            {friendCount} {friendCount === 1 ? "Friend" : "Friends"}
          </Link>

          <Link href="/profile" aria-label="Your profile" className="justify-self-end">
            <Avatar person={user} size={40} priority />
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center px-3 pb-1">
        <div
          className="relative aspect-[3/4] max-w-full overflow-hidden rounded-[30px] bg-[#111113]"
          style={{
            height: "min(calc(100dvh - 250px), 581px, calc((100vw - 24px) * 1.3333))",
          }}
        >
          {shot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shot.url}
              alt="Your new Locket"
              className="h-full w-full object-cover"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="h-full w-full object-cover"
                style={{
                  transform: facing === "user" ? "scaleX(-1)" : undefined,
                  opacity: engine === "ready" ? 1 : 0,
                }}
              />

              {engine !== "ready" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
                  {engine === "starting" ? (
                    <>
                      <Loader2 size={26} className="animate-spin text-white/60" />
                      <p className="text-[14px] text-white/50">Opening camera…</p>
                    </>
                  ) : (
                    <>
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06]">
                        <CameraOff size={22} className="text-white/45" />
                      </div>
                      <p className="max-w-[280px] text-[14px] leading-relaxed text-white/55">
                        {cameraError}
                      </p>
                      <div className="mt-1 flex flex-col items-center gap-2">
                        <button
                          type="button"
                          onClick={() => captureInputRef.current?.click()}
                          className="h-10 rounded-full bg-white px-5 text-[14px] font-semibold text-black"
                        >
                          Take a photo
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-10 rounded-full bg-white/10 px-5 text-[14px] font-semibold text-white"
                        >
                          Choose from library
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {flashKey > 0 ? (
                <div
                  key={flashKey}
                  className="pointer-events-none absolute inset-0 animate-flash bg-white"
                />
              ) : null}
            </>
          )}

          {sent ? (
            <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4">
              <span className="animate-pop flex max-w-full items-center gap-2 whitespace-nowrap rounded-full border border-gold/30 bg-black/70 px-4 py-2 text-[13px] font-semibold text-gold backdrop-blur">
                <Check size={15} strokeWidth={3} />
                {sent}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void takeFromLibrary(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <input
          ref={captureInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(event) => {
            void takeFromLibrary(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        {shot ? (
          <div className="mb-2.5 flex items-center justify-between rounded-2xl bg-white/[0.05] px-4 py-2.5">
            <span className="flex items-center gap-2 text-[12.5px] font-medium text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              Post to real Locket
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={sendToLocket}
              onClick={() => setSendToLocket((value) => !value)}
              disabled={sending}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                sendToLocket ? "bg-gold" : "bg-white/15"
              } disabled:opacity-50`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                  sendToLocket ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        ) : null}

        {shot ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                resetEngine();
                replaceShot(null);
              }}
              disabled={sending}
              aria-label="Retake photo"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/80 disabled:opacity-40"
            >
              <RotateCcw size={20} strokeWidth={2.1} />
            </button>
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending || sent !== null}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-gold text-[15px] font-semibold text-black transition-transform active:scale-[0.99] disabled:opacity-70"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : null}
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-8">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Choose from library"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black transition-transform active:scale-95"
            >
              <Images size={22} strokeWidth={2.2} />
            </button>

            <button
              type="button"
              onClick={() => void capture()}
              disabled={engine !== "ready"}
              aria-label="Take photo"
              className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-[4px] border-gold transition-transform active:scale-95 disabled:opacity-40"
            >
              <span className="h-[54px] w-[54px] rounded-full bg-white" />
            </button>

            <button
              type="button"
              onClick={() => {
                resetEngine();
                setFacing((current) => (current === "user" ? "environment" : "user"));
              }}
              aria-label="Flip camera"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.08] text-white/85 transition-transform active:scale-95"
            >
              <RefreshCcw size={21} strokeWidth={2.1} />
            </button>
          </div>
        )}

        <Link
          href="/history"
          className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[14px] font-medium text-white/65"
        >
          {historyThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={historyThumb}
              alt=""
              className="h-6 w-6 rounded-md object-cover"
            />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-white/45">
              <Images size={13} />
            </span>
          )}
          History
          <ChevronRight size={15} className="text-white/35" />
        </Link>
      </div>
    </div>
  );
}
