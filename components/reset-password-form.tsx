"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setHasSession(Boolean(data.session));
        setChecking(false);
      }
    }).catch(() => {
      if (active) {
        setHasSession(false);
        setChecking(false);
      }
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");

    if (password.length < 8) {
      setMessage({ text: "Your new password must contain at least 8 characters.", error: true });
      setBusy(false);
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ text: "The passwords do not match. Please check and try again.", error: true });
      setBusy(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      router.replace("/login?password_updated=1");
      router.refresh();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Your password could not be updated. Request a new reset link and try again.", error: true });
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
        <h1>Create a new password.</h1>
        {checking ? <p>Checking your secure reset session…</p> : !hasSession ? (
          <>
            <div role="alert" className="form-message form-error">This reset link is invalid, expired, or has already been used. Request a new password reset link to continue.</div>
            <div className="form-foot"><Link href="/forgot-password">Request a new reset link</Link></div>
          </>
        ) : (
          <>
            <p>Choose a new password for your NYFB account. Use at least 8 characters.</p>
            <form onSubmit={submit}>
              <div className="field">
                <label htmlFor="password">New password</label>
                <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
              </div>
              <div className="field">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" />
              </div>
              {message && <div role="alert" className={message.error ? "form-message form-error" : "form-message"}>{message.text}</div>}
              <button className="btn form-submit" type="submit" disabled={busy}>{busy ? "Updating password…" : "Update password"} ↗</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
