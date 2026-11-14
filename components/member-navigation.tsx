"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/member", label: "Overview", icon: "⌂", exact: true },
  { href: "/member/profile", label: "My profile & ID card", icon: "▣" },
  { href: "/member/rewards", label: "Referrals & rewards", icon: "◇" },
  { href: "/member/announcements", label: "Announcements", icon: "▤" },
  { href: "/member/bank-details", label: "Bank details", icon: "▥" },
  { href: "/member/settings", label: "Account settings", icon: "⚙" },
  { href: "/member/support", label: "Help & support", icon: "?" },
];

export default function MemberNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string, exact?: boolean) => exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <div className="ny-member-mobilebar">
        <button type="button" aria-expanded={open} aria-controls="ny-member-navigation" onClick={() => setOpen(v => !v)}>
          <span aria-hidden="true">☰</span> {open ? "Close menu" : "Member menu"}
        </button>
        <span>MEMBER SERVICES</span>
      </div>
      {open && <button className="ny-member-nav-backdrop" aria-label="Close navigation menu" onClick={() => setOpen(false)} />}
      <aside id="ny-member-navigation" className={"ny-member-sidebar" + (open ? " is-open" : "")}>
        <div className="ny-member-nav-heading">
          <div><small>YOUR ACCOUNT</small><strong>Member services</strong></div>
          <button type="button" className="ny-member-nav-close" aria-label="Close menu" onClick={() => setOpen(false)}>×</button>
        </div>
        <nav aria-label="Member dashboard navigation">
          {items.map(item => (
            <Link key={item.href} href={item.href} aria-current={active(item.href, item.exact) ? "page" : undefined}
              className={active(item.href, item.exact) ? "active" : ""}
              onClick={() => setOpen(false)}>
              <span className="ny-member-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {active(item.href, item.exact) && <i aria-hidden="true" />}
            </Link>
          ))}
        </nav>
        <div className="ny-member-nav-foot">
          <span className="ny-member-secure-dot" />
          <span><b>Secure member area</b><small>NYFB official portal</small></span>
        </div>
      </aside>
      <style jsx global>{`
        .member-dashboard-layout{display:grid!important;grid-template-columns:228px minmax(0,1fr);gap:26px;align-items:start;margin-top:24px!important}
        .member-dashboard-layout>.member-main-content{grid-column:2;min-width:0}
        .ny-member-sidebar{grid-column:1;grid-row:1;position:sticky;top:18px;align-self:start;min-width:0;padding:16px 12px;background:linear-gradient(165deg,#073b27,#052d20);border:1px solid #277449;border-radius:14px;box-shadow:0 12px 28px #00170d30;color:#effff3}
        .ny-member-nav-heading{display:flex;align-items:center;justify-content:space-between;padding:5px 7px 15px;border-bottom:1px solid #277449}
        .ny-member-nav-heading small,.ny-member-nav-heading strong{display:block}
        .ny-member-nav-heading small{font-size:8px;letter-spacing:1.5px;color:#a8edbb;font-weight:800}
        .ny-member-nav-heading strong{font:800 15px Manrope,Arial,sans-serif;color:#fff;margin-top:5px}
        .ny-member-nav-close{display:none;border:0;background:transparent;color:#fff;font-size:26px;cursor:pointer}
        .ny-member-sidebar nav{display:grid;gap:5px;padding:13px 0}
        .ny-member-sidebar nav a{display:flex;align-items:center;gap:11px;min-height:43px;padding:9px 10px;border:1px solid transparent;border-radius:9px;color:#d9f1e1;text-decoration:none;font-size:11px;font-weight:700;transition:background .16s ease,border-color .16s ease}
        .ny-member-sidebar nav a:hover{background:#0d5938;border-color:#347d51}
        .ny-member-sidebar nav a.active{background:linear-gradient(100deg,#b8f5c9,#d8f9df);border-color:#b8f5c9;color:#073b27;box-shadow:0 5px 14px #001b1026}
        .ny-member-nav-icon{width:23px;height:23px;display:grid;place-items:center;flex:0 0 23px;border-radius:7px;background:#ffffff12;font-size:15px}
        .ny-member-sidebar nav a.active .ny-member-nav-icon{background:#0b5935;color:#c9f8d5}
        .ny-member-sidebar nav a i{width:6px;height:6px;margin-left:auto;border-radius:50%;background:#0b5935}
        .ny-member-nav-foot{display:flex;align-items:center;gap:9px;padding:13px 7px 3px;border-top:1px solid #277449}
        .ny-member-secure-dot{width:8px;height:8px;border-radius:50%;background:#8fe5a9;box-shadow:0 0 0 4px #8fe5a91c}
        .ny-member-nav-foot b,.ny-member-nav-foot small{display:block}
        .ny-member-nav-foot b{font-size:9px;color:#effff3}
        .ny-member-nav-foot small{font-size:8px;color:#b9d9c4;margin-top:3px}
        .ny-member-mobilebar{display:none}
        .ny-member-nav-backdrop{display:none}
        @media(max-width:760px){
          .member-dashboard-layout{display:block!important;margin-top:15px!important}
          .member-dashboard-layout>.member-main-content{width:100%}
          .ny-member-mobilebar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0 16px;padding:9px 11px;border:1px solid #347d51;border-radius:10px;background:#073b27}
          .ny-member-mobilebar button{display:inline-flex;align-items:center;gap:9px;border:1px solid #4a9d69;border-radius:8px;padding:9px 12px;background:#b8f5c9;color:#063820;font-size:11px;font-weight:800;cursor:pointer}
          .ny-member-mobilebar>span{font-size:8px;letter-spacing:1px;color:#c9f1d4;font-weight:800}
          .ny-member-sidebar{display:none;position:fixed;z-index:1002;top:0;bottom:0;left:0;width:min(300px,86vw);height:100dvh;overflow-y:auto;border-radius:0 16px 16px 0;padding:20px 14px;box-sizing:border-box;box-shadow:18px 0 45px #00170d66}
          .ny-member-sidebar.is-open{display:block}
          .ny-member-nav-close{display:block}
          .ny-member-nav-backdrop{display:block;position:fixed;z-index:1001;inset:0;width:100%;height:100%;border:0;background:#00190f99;backdrop-filter:blur(2px)}
        }
        @media(min-width:761px){.ny-member-mobilebar{display:none!important}}
      `}</style>
    </>
  );
}
