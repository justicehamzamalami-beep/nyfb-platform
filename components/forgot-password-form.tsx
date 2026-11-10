"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();

    try {
      const supabase = createClient();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      redirectTo.searchParams.set("next", "/reset-password");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo.toString(),
      });
      if (error) throw error;
      setMessage({
        text: "If an account exists for that email address, a password reset link has been sent. Please check your inbox and spam folder.",
      });
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "We could not process your request. Please try again.",
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="form-shell">
      <section className="form-card">
        <Link className="back-home" href="/login">← Back to sign in</Link>
        <div className="brand" style={{ marginTop: 28 }}>
          <b>NY</b><span>NYFB<small>NIGERIAN YOUTH FOR BAT</small></span>
        </div>
        <h1>Reset your password.</h1>
        <p>Enter the email address linked to your NYFB account. We will send you a secure password reset link if an account is registered with that address.</p>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
          </div>
          {message && <div role="status" className={message.error ? "form-message form-error" : "form-message"}>{message.text}</div>}
          <button className="btn form-submit" type="submit" disabled={busy}>{busy ? "Sending link…" : "Send reset link"} ↗</button>
        </form>
        <div className="form-foot">Remembered your password? <Link href="/login">Sign in</Link></div>
      </section>
    </main>
  );
}
