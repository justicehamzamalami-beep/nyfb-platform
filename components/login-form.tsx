"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      const supabase = createClient();
      const { data: authData, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: String(data.get("email")).trim().toLowerCase(),
          password: String(data.get("password"))
        }),
        15000,
        "The sign-in service is taking too long. Please check your connection and try again."
      );
      if (error) throw error;
      if (!authData.user) throw new Error("Sign-in could not be completed. Please try again.");

      // A failed optional permissions lookup must never lock out an authenticated member.
      let role = "member";
      try {
        const profile = await withTimeout(
          supabase.from("profiles").select("role").eq("id", authData.user.id).maybeSingle(),
          7000,
          "Profile lookup timed out"
        );
        if (!profile.error && profile.data?.role) role = profile.data.role;
      } catch {
        // Keep the signed-in session usable and use the member dashboard as a safe fallback.
      }
      if (role === "national_admin") {
        router.replace("/admin");
        return;
      }

      let coordinator = false;
      try {
        const assignments = await withTimeout(
          supabase.from("coordinator_assignments").select("role").eq("user_id", authData.user.id),
          5000,
          "Coordinator lookup timed out"
        );
        coordinator = !assignments.error && (assignments.data || []).some((item: { role: string }) =>
          ["ward_coordinator", "lga_coordinator", "state_coordinator", "national_admin"].includes(item.role)
        );
      } catch {
        // Coordinator access lookup is optional for normal member sign-in.
      }

      if (coordinator || ["ward_coordinator", "lga_coordinator", "state_coordinator"].includes(role)) {
        router.replace("/coordinator");
      } else {
        router.replace("/member");
      }
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
