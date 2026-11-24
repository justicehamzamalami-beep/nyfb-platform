"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

export default function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    const data = new FormData(e.currentTarget);
    try {
      const { error } = await withTimeout(
        authClient.signIn.email({
          email: String(data.get("email")).trim().toLowerCase(),
          password: String(data.get("password"))
        }),
        20000,
        "NYFB sign-in is taking longer than expected. Please wait a moment and try again."
      );
      if (error) throw new Error(error.message || "Unable to sign in. Please check your details.");

      const response = await withTimeout(
        fetch("/api/member/session-context", { method: "GET", cache: "no-store", credentials: "same-origin" }),
        10000,
        "Your account is signed in, but loading your NYFB access profile timed out. Please try again."
      );
      const context = await response.json();
      if (!response.ok) {
        throw new Error(context.error || "Your account is signed in, but your NYFB access profile could not be loaded.");
      }

      router.replace(context.destination || "/member");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="form-shell">
      <section className="form-card">
        <Link className="back-home" href="/">← Back to NYFB home</Link>
        <div className="brand" style={{ marginTop: 28 }}><b>NY</b><span>NYFB<small>NIGERIAN YOUTH FOR BAT</small></span></div>
        <h1>Welcome back.</h1>
        <p>Sign in to access your NYFB membership account.</p>
        <form onSubmit={submit}>
          <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
          <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" /></div>
          <div className="form-foot" style={{ marginTop: 8 }}><Link href="/forgot-password">Forgot password?</Link></div>
          {message && <div role="alert" className="form-message form-error">{message}</div>}
          <button className="btn form-submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"} ↗</button>
        </form>
        <div className="form-foot">New to NYFB? <Link href="/join">Apply for membership</Link></div>
      </section>
    </main>
  );
}
