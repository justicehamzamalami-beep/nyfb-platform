"use client";

import { FormEvent, useEffect, useState } from "react";

type MemberRecord = {
  membership_id: string;
  full_name: string;
  email: string;
  referral_code: string;
  referral_count: number;
};

const endpoint = () => {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? (base.endsWith("/") ? base.slice(0, -1) : base) + "/functions/v1/offline-membership-status" : "";
};

function openCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("nyfb-private-membership-lookups", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("records")) {
        request.result.createObjectStore("records", { keyPath: "membership_id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveLookup(record: MemberRecord): Promise<void> {
  const db = await openCache();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("records", "readwrite");
    tx.objectStore("records").put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function findCached(id: string, name: string, email: string): Promise<MemberRecord | null> {
  const db = await openCache();
  return await new Promise((resolve, reject) => {
    const request = db.transaction("records", "readonly").objectStore("records").getAll();
    request.onsuccess = () => {
      const rows = request.result as MemberRecord[];
      const match = id
        ? rows.find(row => row.membership_id.toLowerCase() === id)
        : rows.find(row => row.full_name.trim().toLowerCase() === name && row.email.trim().toLowerCase() === email);
      resolve(match ?? null);
    };
    request.onerror = () => reject(request.error);
  });
}

export default function OfflineStatusChecker() {
  const [membershipId, setMembershipId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<MemberRecord | null>(null);
  const [message, setMessage] = useState("Enter your details to check your membership.");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [cachedCount, setCachedCount] = useState(0);

  useEffect(() => {
    // Remove the previous version’s complete public snapshot from this browser.
    indexedDB.deleteDatabase("nyfb-public-membership-cache");
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    openCache().then(db => new Promise<number>((resolve, reject) => {
      const request = db.transaction("records", "readonly").objectStore("records").count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    })).then(setCachedCount).catch(() => {});
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    const id = membershipId.trim().toLowerCase();
    const name = fullName.trim().toLowerCase();
    const mail = email.trim().toLowerCase();

    if (!id && (!name || !mail)) {
      setMessage("Enter your membership ID, or enter both your full name and registered email address.");
      setBusy(false);
      return;
    }

    try {
      if (!navigator.onLine) {
        const cached = await findCached(id, name, mail);
        if (cached) {
          setResult(cached);
          setMessage("Found on this device. This is a previously saved lookup and may not reflect later changes.");
        } else {
          setMessage("This record has not been saved on this device. Connect to the internet once to check and save it for future offline access.");
        }
        return;
      }

      const url = endpoint();
      if (!url) throw new Error("The membership checker is not configured.");
      const params = new URLSearchParams(id ? { membership_id: membershipId.trim() } : {
        full_name: fullName.trim(),
        email: email.trim(),
      });
      const response = await fetch(url + "?" + params.toString(), {
        method: "GET",
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "" },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Membership lookup failed.");
      const record = data as MemberRecord;
      await saveLookup(record);
      setCachedCount(count => count + 1);
      setResult(record);
      setMessage("Membership record found and saved securely on this device for future offline access.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to check membership at this time.");
    } finally {
      setBusy(false);
    }
  }

  const label: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 800, letterSpacing: ".6px",
    color: "#506858", marginBottom: 6,
  };
  const input: React.CSSProperties = {
    width: "100%", padding: "12px 13px", border: "1px solid #d9e4dc",
    borderRadius: 7, fontSize: 13, background: "#fff", color: "#173b2a",
  };

  return (
    <section id="offline-membership-checker" aria-labelledby="offline-checker-title"
      style={{ padding: "64px 7%", background: "#fff", borderTop: "1px solid #e3e9e1", borderBottom: "1px solid #e3e9e1" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ fontSize: 9, letterSpacing: 2, fontWeight: 800, color: "#176b47" }}>MEMBERSHIP SUPPORT · OFFLINE ACCESS</div>
        <h2 id="offline-checker-title" style={{ font: "800 clamp(27px,3.5vw,40px)/1.15 Manrope,sans-serif", letterSpacing: "-1.3px", color: "#103d2b", margin: "13px 0" }}>
          MEMBERSHIP STATUS CHECKER
        </h2>
        <p style={{ maxWidth: 760, fontSize: 13, lineHeight: 1.8, color: "#6e7c73" }}>
          Check your membership using your membership ID, or your full name and registered email address.
          After a successful online lookup, that individual result is saved on this device and can be viewed
          again without internet access. Connect once to check a record that has not previously been saved here.
        </p>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", margin: "18px 0 24px" }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: online ? "#176b47" : "#9b5a20" }}>{online ? "● ONLINE" : "● OFFLINE"}</span>
          <span style={{ fontSize: 11, color: "#6e7c73" }}>{cachedCount} individual lookup(s) saved on this device</span>
        </div>

        <form onSubmit={search} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 13, padding: 20, background: "#f5f7f2", border: "1px solid #e3e9e1", borderRadius: 12 }}>
          <div>
            <label style={label} htmlFor="offline-member-id">MEMBERSHIP ID</label>
            <input id="offline-member-id" value={membershipId} onChange={e => { setMembershipId(e.target.value); if (e.target.value) { setFullName(""); setEmail(""); } }} placeholder="Enter membership ID" style={input} />
          </div>
          <div>
            <label style={label} htmlFor="offline-full-name">FULL NAME</label>
            <input id="offline-full-name" value={fullName} onChange={e => { setFullName(e.target.value); if (e.target.value) setMembershipId(""); }} placeholder="Enter registered full name" style={input} />
          </div>
          <div>
            <label style={label} htmlFor="offline-email">EMAIL ADDRESS</label>
            <input id="offline-email" type="email" value={email} onChange={e => { setEmail(e.target.value); if (e.target.value) setMembershipId(""); }} placeholder="Enter registered email" style={input} />
          </div>
          <div style={{ display: "flex", alignItems: "end" }}>
            <button type="submit" disabled={busy} style={{ width: "100%", padding: 12, border: 0, borderRadius: 7, background: "#176b47", color: "#fff", fontWeight: 800, fontSize: 12, cursor: busy ? "wait" : "pointer" }}>
              {busy ? "Checking…" : "Check membership"}
            </button>
          </div>
        </form>

        <div role="status" aria-live="polite" style={{ fontSize: 11, color: "#627168", marginTop: 13 }}>{message}</div>

        {result && (
          <article style={{ marginTop: 18, padding: 22, border: "1px solid #dce8dc", borderLeft: "4px solid #176b47", borderRadius: 10, background: "#fbfdf9" }}>
            <div style={{ fontSize: 9, letterSpacing: 1.4, fontWeight: 800, color: "#176b47" }}>MEMBERSHIP RECORD FOUND</div>
            <h3 style={{ font: "800 21px Manrope,sans-serif", color: "#103d2b", margin: "10px 0 16px" }}>{result.full_name}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
              <div><small style={label}>MEMBERSHIP ID</small><strong style={{ fontSize: 13, color: "#173b2a" }}>{result.membership_id}</strong></div>
              <div><small style={label}>EMAIL ADDRESS</small><strong style={{ fontSize: 13, color: "#173b2a", overflowWrap: "anywhere" }}>{result.email}</strong></div>
              <div><small style={label}>TOTAL REFERRALS</small><strong style={{ fontSize: 13, color: "#173b2a" }}>{Number(result.referral_count).toLocaleString()}</strong></div>
              <div>
                <small style={label}>REFERRAL LINK</small>
                {result.referral_code
                  ? <a href={"https://nigerianyouthforbat.org/join?ref=" + encodeURIComponent(result.referral_code)} style={{ fontSize: 12, fontWeight: 800, color: "#176b47", overflowWrap: "anywhere" }}>https://nigerianyouthforbat.org/join?ref={result.referral_code}</a>
                  : <span style={{ fontSize: 12, color: "#718078" }}>Not available</span>}
              </div>
            </div>
          </article>
        )}

        <p style={{ fontSize: 10, lineHeight: 1.7, color: "#89958d", marginTop: 18 }}>
          For privacy, this checker retrieves one matching record at a time. It does not publish or download the
          complete membership database. Only records previously checked on this device can be viewed offline.
          NIN, bank details, VIN and verification documents are never included.
        </p>
      </div>
    </section>
  );
}
