"use client";
import Link from "next/link";

export default function ForgotPasswordForm() {
  return (
    <main className="form-shell">
      <section className="form-card">
        <Link className="back-home" href="/login">← Back to sign in</Link>
        <div className="brand" style={{ marginTop: 28 }}>
          <b>NY</b><span>NYFB<small>NIGERIAN YOUTH FOR BAT</small></span>
        </div>
        <h1>Password assistance.</h1>
        <p>Email delivery has been removed from the NYFB platform. Password reset links are therefore unavailable.</p>
        <div role="status" className="form-message">Please contact an authorised NYFB administrator for assistance with your account password.</div>
        <div className="form-foot"><Link href="/login">Return to sign in</Link></div>
      </section>
    </main>
  );
}
