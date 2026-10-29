export const COUNTRY_CODES = [
  { country: "VN", code: "+84" },
  { country: "US", code: "+1" },
  { country: "GB", code: "+44" },
  { country: "KR", code: "+82" },
  { country: "JP", code: "+81" },
  { country: "CN", code: "+86" },
  { country: "TW", code: "+886" },
  { country: "HK", code: "+852" },
  { country: "SG", code: "+65" },
  { country: "TH", code: "+66" },
  { country: "PH", code: "+63" },
  { country: "ID", code: "+62" },
  { country: "MY", code: "+60" },
  { country: "IN", code: "+91" },
  { country: "AU", code: "+61" },
  { country: "NZ", code: "+64" },
  { country: "FR", code: "+33" },
  { country: "DE", code: "+49" },
  { country: "IT", code: "+39" },
  { country: "ES", code: "+34" },
  { country: "BR", code: "+55" },
  { country: "MX", code: "+52" },
] as const;

export const DEFAULT_COUNTRY_CODE = "+84";

/**
 * Turns a country code plus a locally typed number into one canonical
 * international number, e.g. "+84" + "090 123 4567" -> "+84901234567".
 */
export function normalizePhone(dial: string, input: string): string | null {
  const dialDigits = dial.replace(/\D/g, "");
  let digits = input.replace(/\D/g, "");

  if (!dialDigits || !digits) {
    return null;
  }

  // People often paste the number with the country code already in it.
  if (digits.startsWith(dialDigits) && digits.length > dialDigits.length + 5) {
    digits = digits.slice(dialDigits.length);
  }

  digits = digits.replace(/^0+/, "");

  if (digits.length < 6 || dialDigits.length + digits.length > 15) {
    return null;
  }

  return `+${dialDigits}${digits}`;
}

export function isPhoneNumber(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value);
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/^\+/, "");
  const dial = [...COUNTRY_CODES]
    .map((country) => country.code.replace("+", ""))
    .sort((left, right) => right.length - left.length)
    .find(
      (code) => digits.startsWith(code) && digits.length > code.length + 4,
    );
  const national = dial ? digits.slice(dial.length) : digits;
  const chunks = national.match(/.{1,3}/g) ?? [];

  if (chunks.length > 1 && chunks[chunks.length - 1].length === 1) {
    const tail = chunks.pop();

    if (tail) {
      chunks[chunks.length - 1] += tail;
    }
  }

  return dial ? `+${dial} ${chunks.join(" ")}` : phone;
}
