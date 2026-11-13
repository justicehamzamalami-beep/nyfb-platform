"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminPasswordReset() {
  const [email, setEmail] = useState("hurairamuazu2025@gmail.com");
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (active) setAllowed(data?.role === "national_admin");
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => { active = false; };
  }, [supabase]);

  async function sendReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(""); setError(false);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error("Your administrator session has expired. Sign in again.");
      const response = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + "/functions/v1/admin-send-password-reset", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + session.access_token,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The reset email could not be sent.");
      setMessage("The password reset email has been requested. Ask the member to check their inbox and spam folder.");
    } catch (e) {
      setError(true);
      setMessage(e instanceof Error ? e.message : "The password reset request failed.");
    } finally {
      setBusy(false);
    }
  }

  if (checking || !allowed) return null;

  return (
    <section style={{ maxWidth: 1500, margin: "18px auto", padding: "0 38px 24px", fontFamily: "Arial,sans-serif" }}>
      <div style={{ background: "#fff", border: "1px solid #e5ebe5", borderRadius: 10, padding: 20, color: "#1b3026" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Member password assistance</div>
        <p style={{ fontSize: 11, color: "#78877d", margin: "0 0 14px" }}>Send a secure password reset email to an approved member. The member chooses their own new password.</p>
        <form onSubmit={sendReset} style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <input aria-label="Approved member email" type="email" required value={email} onChange={e => setEmail(e.target.value)} style={{ flex: "1 1 260px", minWidth: 0, border: "1px solid #dfe7df", borderRadius: 6, padding: "11px 12px", fontSize: 12 }} />
          <button type="submit" disabled={busy} style={{ border: 0, borderRadius: 6, padding: "11px 16px", background: "#126342", color: "#fff", fontSize: 11, fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy ? .6 : 1 }}>{busy ? "Sending…" : "Send reset email"}</button>
        </form>
        {message && <div role={error ? "alert" : "status"} style={{ marginTop: 12, padding: 11, borderRadius: 6, background: error ? "#fff0ed" : "#edf7ee", color: error ? "#9b493e" : "#2f7047", fontSize: 11 }}>{message}</div>}
      </div>
    </section>
  );
}
