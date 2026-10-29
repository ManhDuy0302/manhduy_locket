"use client";

import { useRef } from "react";

const LENGTH = 6;

type CodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function CodeInput({ value, onChange, disabled }: CodeInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const focusAt = (index: number) => {
    const target = inputs.current[Math.max(0, Math.min(index, LENGTH - 1))];
    target?.focus();
    target?.select();
  };

  const handleTyping = (index: number, raw: string) => {
    const typed = raw.replace(/\D/g, "");

    if (!typed) {
      const next = value.slice(0, index) + value.slice(index + 1);
      onChange(next);
      focusAt(index);
      return;
    }

    const digit = typed.slice(-1);
    const next = (value.slice(0, index) + digit + value.slice(index + 1)).slice(
      0,
      LENGTH,
    );

    onChange(next);
    focusAt(index + 1);
  };

  return (
    <div className="grid grid-cols-6 gap-2">
      {Array.from({ length: LENGTH }).map((_, index) => (
        <input
          key={index}
          ref={(node) => {
            inputs.current[index] = node;
          }}
          value={value[index] ?? ""}
          onChange={(event) => handleTyping(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !value[index] && index > 0) {
              event.preventDefault();
              onChange(value.slice(0, index));
              focusAt(index - 1);
            }

            if (event.key === "ArrowLeft") {
              event.preventDefault();
              focusAt(index - 1);
            }

            if (event.key === "ArrowRight") {
              event.preventDefault();
              focusAt(index + 1);
            }
          }}
          onFocus={(event) => event.target.select()}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text").replace(/\D/g, "");

            if (!pasted) {
              return;
            }

            event.preventDefault();
            const next = pasted.slice(0, LENGTH);
            onChange(next);
            focusAt(next.length);
          }}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          autoFocus={index === 0}
          maxLength={1}
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
          className="h-[56px] w-full rounded-2xl border border-white/[0.08] bg-elevated text-center text-[22px] font-semibold text-white outline-none focus:border-gold/60 disabled:opacity-50"
        />
      ))}
    </div>
  );
}
