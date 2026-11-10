"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Member = {
  member_number: string;
  full_name: string;
  status: string;
  state: string;
  lga: string;
  ward: string | null;
  reviewed_at: string | null;
};

export default function MemberHome() {
  const [member, setMember] = useState<Member | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          window.location.replace("/login");
          return;
        }
        const { data, error: queryError } = await supabase
          .from("members")
          .select("member_number,full_name,status,state,lga,ward,reviewed_at")
          .eq("user_id", user.id)
          .maybeSingle();
        if (queryError) throw queryError;
        if (active) setMember(data as Member | null);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unable to load your membership.");
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  return (
    <main className="form-shell">
      <section className="form-card member-space">
        <div className="member-actions">
          <Link className="back-home" href="/">← NYFB home</Link>
          <button onClick={signOut} className="back-home sign-out">Sign out</button>
        </div>
        <div className="brand" style={{ marginTop: 28 }}>
          <b>NY</b><span>NYFB<small>NIGERIAN YOUTH FOR BAT</small></span>
        </div>
        <h1>Member space.</h1>
        {busy ? <p>Loading your membership details…</p> : error ? (
          <div className="form-message form-error">{error}</div>
        ) : !member ? (
          <p>No membership record was found for this account.</p>
        ) : (
          <>
            <p>Welcome, {member.full_name}. Here is your current membership record.</p>
            <div className="member-summary">
              <small>MEMBERSHIP NUMBER</small>
              <h2>{member.member_number}</h2>
              <p><strong>Status:</strong> <span className={"status status-" + member.status}>{member.status.toUpperCase()}</span></p>
              <p><strong>Location:</strong> {member.lga}, {member.state}</p>
              {member.ward && <p><strong>Ward:</strong> {member.ward}</p>}
            </div>

            {member.status === "approved" ? (
              <section className="membership-card-section">
                <div className="membership-card" id="nyfb-membership-card">
                  <div className="card-top">
                    <div className="card-emblem">NY</div>
                    <div><strong>NIGERIAN YOUTH FOR BAT</strong><small>OFFICIAL MEMBERSHIP CARD</small></div>
                    <span className="card-approved">APPROVED</span>
                  </div>
                  <div className="card-main">
                    <div className="card-avatar">NYFB</div>
                    <div className="card-details">
                      <small>MEMBER NAME</small>
                      <h2>{member.full_name}</h2>
                      <small>MEMBERSHIP ID</small>
                      <strong>{member.member_number}</strong>
                      <div className="card-location">{member.ward ? member.ward + ", " : ""}{member.lga}, {member.state}</div>
                    </div>
                  </div>
                  <div className="card-bottom">
                    <span>VALID NYFB MEMBER</span>
                    <span>{member.reviewed_at ? "ISSUED " + new Date(member.reviewed_at).toLocaleDateString("en-NG") : "OFFICIAL RECORD"}</span>
                  </div>
                </div>
                <button className="btn print-card" onClick={() => window.print()}>Print / Save membership card</button>
                <p className="card-note">You can print this card or choose “Save as PDF” in your browser’s print options.</p>
              </section>
            ) : (
              <p className="membership-note">
                {member.status === "pending"
                  ? "Your application is awaiting review. Your official membership card will become available here once it is approved."
                  : member.status === "rejected"
                    ? "Your application was not approved. Please contact your NYFB coordinator for further guidance."
                    : "Your membership is currently suspended. Please contact the NYFB administration for assistance."}
              </p>
            )}
          </>
        )}
      </section>
      <style jsx>{`
        .member-space { max-width: 760px; }
        .member-actions { display:flex; justify-content:space-between; align-items:center; }
        .sign-out { border:0; background:none; cursor:pointer; }
        .member-summary { background:#f2f6ef; padding:22px; margin-top:22px; border-radius:10px; }
        .member-summary small { color:#607269; letter-spacing:1px; }
        .member-summary h2 { font-size:29px; margin:8px 0 18px; color:#176b47; }
        .status { font-weight:700; }
        .status-approved { color:#176b47; }
        .status-pending { color:#9a6b13; }
        .status-rejected,.status-suspended { color:#a33; }
        .membership-note { margin-top:20px; padding:16px; background:#fff8e8; border-left:4px solid #c18a22; line-height:1.7; }
        .membership-card-section { margin-top:28px; }
        .membership-card { color:#fff; background:linear-gradient(125deg,#073c2a,#116443 58%,#d0a84c); border-radius:16px; padding:22px; min-height:250px; box-shadow:0 12px 30px #102d1a24; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; }
        .card-top { display:flex; align-items:center; gap:12px; }
        .card-emblem { width:44px; height:44px; border:2px solid #e6c66f; border-radius:50%; display:grid; place-items:center; font-weight:900; color:#f2d78a; }
        .card-top strong,.card-top small { display:block; }
        .card-top strong { font-size:13px; letter-spacing:1px; }
        .card-top small { font-size:9px; opacity:.8; margin-top:4px; letter-spacing:1px; }
        .card-approved { margin-left:auto; font-size:9px; letter-spacing:1px; border:1px solid #e6c66f; color:#ffe7a3; padding:6px 8px; border-radius:20px; }
        .card-main { display:flex; gap:18px; align-items:center; margin:26px 0; }
        .card-avatar { width:78px; height:94px; border:1px solid #ffffff88; border-radius:8px; display:grid; place-items:center; font-weight:800; color:#f2d78a; background:#ffffff12; }
        .card-details small { display:block; font-size:8px; letter-spacing:1.5px; opacity:.8; }
        .card-details h2 { font-size:20px; margin:5px 0 12px; }
        .card-details strong { display:block; font-size:14px; letter-spacing:1px; margin-top:4px; }
        .card-location { font-size:11px; margin-top:9px; opacity:.9; }
        .card-bottom { border-top:1px solid #ffffff55; padding-top:12px; display:flex; justify-content:space-between; gap:8px; font-size:8px; letter-spacing:1px; }
        .print-card { margin-top:16px; width:100%; }
        .card-note { font-size:12px; color:#607269; }
        @media print {
          @page { size: landscape; margin: 10mm; }
          body * { visibility:hidden !important; }
          #nyfb-membership-card,#nyfb-membership-card * { visibility:visible !important; }
          #nyfb-membership-card { position:absolute; left:0; top:0; width:90mm; min-height:57mm; box-shadow:none; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
        }
      `}</style>
    </main>
  );
}
