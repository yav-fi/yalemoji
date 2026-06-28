"use client";

import { FormEvent, useMemo, useState } from "react";
import { isYaleEmail, normalizeEmail } from "@/lib/email";
import styles from "./waitlist-form.module.css";

type FormStatus =
  | "idle"
  | "invalid"
  | "submitting"
  | "success"
  | "rate-limited"
  | "error";

type WaitlistResponse =
  | { ok: true }
  | { error: "invalid_email" | "rate_limited" | "server_error"; retryAfterSeconds?: number };

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const canSubmit = status !== "submitting";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRetryAfter(null);

    if (!isYaleEmail(normalizedEmail)) {
      setStatus("invalid");
      return;
    }

    setStatus("submitting");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ email: normalizedEmail, website })
      });
      const payload = (await response.json()) as WaitlistResponse;

      if (response.ok && "ok" in payload) {
        setStatus("success");
        return;
      }

      if ("error" in payload && payload.error === "rate_limited") {
        setRetryAfter(payload.retryAfterSeconds ?? null);
        setStatus("rate-limited");
        return;
      }

      if ("error" in payload && payload.error === "invalid_email") {
        setStatus("invalid");
        return;
      }

      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  const message = getStatusMessage(status, retryAfter);

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <label className={styles.label} htmlFor="email">
        Yale email
      </label>
      <div className={styles.control} data-status={status}>
        <input
          aria-describedby="waitlist-status"
          aria-invalid={status === "invalid"}
          autoComplete="email"
          className={styles.input}
          disabled={status === "submitting"}
          id="email"
          inputMode="email"
          name="email"
          onChange={(event) => {
            setEmail(event.target.value);
            if (status !== "submitting") {
              setStatus("idle");
              setRetryAfter(null);
            }
          }}
          placeholder="Your Yale email"
          type="email"
          value={email}
        />
        <input
          aria-hidden="true"
          autoComplete="off"
          className={styles.honeypot}
          name="website"
          onChange={(event) => setWebsite(event.target.value)}
          tabIndex={-1}
          value={website}
        />
        <button className={styles.button} disabled={!canSubmit} type="submit">
          {status === "submitting" ? "Joining..." : "Join Waitlist"}
        </button>
      </div>
      <p className={styles.status} data-visible={message.length > 0} id="waitlist-status" role="status">
        {message}
      </p>
    </form>
  );
}

function getStatusMessage(status: FormStatus, retryAfter: number | null) {
  switch (status) {
    case "invalid":
      return "Use your @yale.edu email address.";
    case "success":
      return "You're on the waitlist.";
    case "rate-limited":
      return `Too many attempts. Try again${retryAfter ? ` in ${Math.ceil(retryAfter / 60)} min` : " soon"}.`;
    case "error":
      return "Something went wrong. Please try again.";
    default:
      return "";
  }
}
