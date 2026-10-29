/**
 * Verification texts go out through Twilio when it is configured. Without
 * credentials the app still works: the code is shown on the verification
 * screen so a self-hosted Locket can be used without an SMS gateway.
 */
export type SmsOutcome = "sent" | "not-configured" | "failed";

function readEnv(key: string): string | null {
  const value = process.env[key]?.trim();
  return value ? value : null;
}

export function isSmsConfigured(): boolean {
  return Boolean(
    readEnv("TWILIO_ACCOUNT_SID") &&
      readEnv("TWILIO_AUTH_TOKEN") &&
      readEnv("TWILIO_FROM_NUMBER"),
  );
}

export async function sendVerificationSms(
  phone: string,
  code: string,
): Promise<SmsOutcome> {
  const sid = readEnv("TWILIO_ACCOUNT_SID");
  const token = readEnv("TWILIO_AUTH_TOKEN");
  const from = readEnv("TWILIO_FROM_NUMBER");

  if (!sid || !token || !from) {
    return "not-configured";
  }

  const body = new URLSearchParams({
    To: phone,
    From: from,
    Body: `Your Locket code is ${code}. It expires in 10 minutes.`,
  });

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) {
      console.error(
        "SMS delivery failed",
        response.status,
        await response.text().catch(() => ""),
      );
      return "failed";
    }

    return "sent";
  } catch (error) {
    console.error("SMS delivery failed", error);
    return "failed";
  }
}
