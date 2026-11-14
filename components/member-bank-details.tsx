"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const BANKS = [
  "Access Bank", "Citibank Nigeria", "Ecobank Nigeria", "Fidelity Bank",
  "First Bank of Nigeria", "FCMB", "Globus Bank", "GTBank", "Jaiz Bank",
  "Keystone Bank", "Kuda Microfinance Bank", "Lotus Bank",
  "Moniepoint Microfinance Bank", "Opay (Paycom)", "Optimus Bank", "Palmpay",
  "Parallex Bank", "Polaris Bank", "PremiumTrust Bank", "Providus Bank",
  "Signature Bank", "Sparkle Microfinance Bank", "Stanbic IBTC Bank",
  "Standard Chartered Bank", "Sterling Bank", "SunTrust Bank", "TAJBank",
  "Titan Trust Bank", "UBA", "Unity Bank", "VFD Microfinance Bank",
  "Wema Bank", "Zenith Bank", "Paga", "FairMoney Microfinance Bank",
  "Carbon Microfinance Bank",
].sort();

type BankInfo = {
  bank_name: string;
  account_number: string;
  account_name: string;
};

export default function BankDetailsPage() {
  const [status, setStatus] = useState("");
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [verification, setVerification] = useState("");
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const db = createClient();
        const { data: { session }, error: authError } = await db.auth.getSession();
        const user = session?.user;
        if (authError || !user) {
          window.location.replace("/login");
          return;
        }

        const [memberResult, detailsResult] = await Promise.all([
          db.from("members").select("status").eq("user_id", user.id).maybeSingle(),
          db.from("member_bank_accounts")
            .select("bank_name,account_number,account_name,verification_status")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        if (!active) return;
        if (memberResult.error) setError(memberResult.error.message);
        else setStatus(memberResult.data?.status || "");

        if (detailsResult.error && detailsResult.error.code !== "PGRST116") {
          setError(detailsResult.error.message);
        } else if (detailsResult.data) {
          setVerification(detailsResult.data.verification_status || "");
          setBankInfo({
            bank_name: detailsResult.data.bank_name,
            account_number: detailsResult.data.account_number,
            account_name: detailsResult.data.account_name,
          });
          setSaved(true);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unable to load bank details.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!/^[0-9]{10}$/.test(accountNumber)) {
      setError("Enter a valid 10-digit account number.");
      return;
    }
    if (!bank || !accountName.trim()) {
      setError("Complete all bank details before submitting.");
      return;
    }

    setSaving(true);
    try {
      const db = createClient();
      const { data: { session }, error: authError } = await db.auth.getSession();
      const user = session?.user;
      if (authError || !user) throw new Error("Please sign in again.");

      const payload = {
        user_id: user.id,
        bank_name: bank,
        account_number: accountNumber,
        account_name: accountName.trim(),
        verification_status: "pending",
        updated_at: new Date().toISOString(),
      };

      const result = verification
        ? await db.from("member_bank_accounts").update(payload).eq("user_id", user.id)
        : await db.from("member_bank_accounts").insert(payload);

      if (result.error) throw result.error;

      setVerification("pending");
      setBankInfo({ bank_name: bank, account_number: accountNumber, account_name: accountName.trim() });
      setSaved(true);
      setEditing(false);
      setBank("");
      setAccountNumber("");
      setAccountName("");
      setMessage("Bank details saved successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save bank details. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: 12,
    borderRadius: 7,
    border: "1px solid #d4e5d9",
    background: "#fff",
    color: "#173a27",
    fontSize: 14,
  };

  if (loading) {
    return (
      <main className="member-dashboard-shell">
        <section className="member-space">Loading bank account details…</section>
      </main>
    );
  }

  return (
    <main className="member-dashboard-shell">
      <section className="member-space">
        <div className="member-actions">
          <Link className="back-home" href="/">← NYFB home</Link>
          <Link className="back-home" href="/member">Overview</Link>
        </div>

        <div className="brand member-brand">
          <img
            src="https://brpqtdqejvlxsyzlyrfv.supabase.co/storage/v1/object/public/nyfb-site-media/website/logo/15fe9ad9-01c7-4bb6-873e-bc8ba989018d.jpg"
            alt="NYFB official logo"
          />
          <span>NYFB<small>NIGERIAN YOUTH FOR BAT</small></span>
        </div>

        <div className="member-dashboard-layout">
          <div className="member-main-content">
            <header className="member-heading">
              <div>
                <small>MEMBER PORTAL</small>
                <h1>Bank Account Information</h1>
                <p>Securely manage your bank details for NYFB records.</p>
              </div>
              <span className="member-portal-tag">SECURE MEMBER AREA</span>
            </header>

            <div
              className="member-section-page"
              style={{ maxWidth: 720, margin: "30px auto", padding: 24, background: "#0b3827", borderRadius: 14, color: "#effff3" }}
            >
              <small style={{ letterSpacing: 2, color: "#b8f5c9" }}>SECURE MEMBER AREA</small>
              <h1 style={{ color: "#fff" }}>Bank Account Information</h1>
              <p style={{ color: "#d1e9d8", lineHeight: 1.6 }}>
                Submit your bank details for NYFB records. Your information is private and will not appear on your membership card or public profile.
              </p>

              {status !== "approved" ? (
                <p>Bank details can only be submitted after your membership application is approved. Current status: {status || "not found"}.</p>
              ) : saved && !editing ? (
                <div style={{ marginTop: 22, padding: 18, border: "1px solid #b8f5c9", borderRadius: 10, background: "#124832" }}>
                  <p role="status" style={{ margin: 0, color: "#b8f5c9", fontWeight: 800 }}>✓ Bank details saved successfully.</p>
                  <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                    <p style={{ margin: 0, color: "#d1e9d8" }}><b>Bank:</b> {bankInfo?.bank_name || "—"}</p>
                    <p style={{ margin: 0, color: "#d1e9d8" }}><b>Account name:</b> {bankInfo?.account_name || "—"}</p>
                    <p style={{ margin: 0, color: "#d1e9d8" }}><b>Account number:</b> {bankInfo?.account_number || "—"}</p>
                  </div>
                  <p style={{ margin: "12px 0 0", color: "#d1e9d8" }}>
                    Verification status: <b>{(verification || "pending").toUpperCase()}</b>
                  </p>
                  <button
                    type="button"
                    onClick={() => { setEditing(true); setMessage(""); }}
                    style={{ marginTop: 16, padding: "10px 14px", border: 0, borderRadius: 7, background: "#b8f5c9", color: "#063820", fontWeight: 800 }}
                  >
                    Update Bank Details
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} style={{ display: "grid", gap: 15, marginTop: 20 }}>
                  <label style={{ display: "grid", gap: 7 }}>
                    Bank Name
                    <select required value={bank} onChange={(e) => setBank(e.target.value)} style={inputStyle}>
                      <option value="">Select your bank</option>
                      {BANKS.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: 7 }}>
                    Account Number
                    <input
                      required inputMode="numeric" maxLength={10} minLength={10}
                      pattern="[0-9]{10}" value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                      placeholder="10-digit account number" style={inputStyle}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 7 }}>
                    Account Name
                    <input
                      required maxLength={120} value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Account name as registered with your bank" style={inputStyle}
                    />
                  </label>
                  <button
                    disabled={saving} type="submit"
                    style={{ padding: 13, border: 0, borderRadius: 7, background: "#b8f5c9", color: "#063820", fontWeight: 800 }}
                  >
                    {saving ? "Saving…" : saved ? "Save Updated Bank Details" : "Submit Bank Details"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setBank(""); setAccountNumber(""); setAccountName(""); }}
                    style={{ padding: 10, border: "1px solid #b8f5c9", borderRadius: 7, background: "transparent", color: "#effff3" }}
                  >
                    Cancel
                  </button>
                </form>
              )}

              {error && <p role="alert" style={{ color: "#ffd0c9" }}>{error}</p>}
              {message && <p role="status" style={{ color: "#b8f5c9" }}>{message}</p>}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
