"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserNotification = {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  read_at: string | null;
  created_at: string;
};

export default function NotificationCenter() {
  const [items, setItems] = useState<UserNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("user_notifications")
      .select("id,title,message,notification_type,read_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (!error) setItems((data || []) as UserNotification[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadNotifications();
    const supabase = createClient();
    let channel: any;
    let disposed = false;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || disposed) return;
      channel = supabase
        .channel("nyfb-user-notifications-" + user.id)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: "user_id=eq." + user.id,
        }, () => { void loadNotifications(); })
        .subscribe();
    })();
    const timer = window.setInterval(() => { void loadNotifications(); }, 45000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [loadNotifications]);

  async function markRead(id: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("user_notifications")
      .update({ read_at: now })
      .eq("id", id)
      .eq("user_id", user.id);
    if (!error) setItems(current => current.map(item => item.id === id ? { ...item, read_at: now } : item));
  }

  async function markAllRead() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("user_notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .is("read_at", null);
    if (!error) setItems(current => current.map(item => ({ ...item, read_at: item.read_at || now })));
  }

  const unread = items.filter(item => !item.read_at).length;

  return (
    <section className="nyfb-notification-center" aria-label="Your notifications">
      <button
        type="button"
        className="nyfb-notification-toggle"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        <span className="nyfb-notification-icon" aria-hidden="true">♢</span>
        <span className="nyfb-notification-label">Notifications</span>
        {unread > 0 && <span className="nyfb-notification-count">{unread > 99 ? "99+" : unread}</span>}
        <span className="nyfb-notification-chevron">{open ? "Close −" : "Open +"}</span>
      </button>
      {open && (
        <div className="nyfb-notification-panel">
          <div className="nyfb-notification-panel-head">
            <div><strong>Updates about you</strong><small>Membership decisions and important account updates.</small></div>
            {unread > 0 && <button type="button" onClick={markAllRead}>Mark all as read</button>}
          </div>
          {loading ? <p className="nyfb-notification-empty">Loading notifications…</p> :
            items.length === 0 ? <p className="nyfb-notification-empty">You have no personal notifications yet.</p> :
            <div className="nyfb-notification-list">
              {items.map(item => (
                <article key={item.id} className={"nyfb-notification-item" + (!item.read_at ? " is-unread" : "")}>
                  <div className="nyfb-notification-item-top">
                    <strong>{item.title}</strong>
                    {!item.read_at && <span>NEW</span>}
                  </div>
                  <p>{item.message}</p>
                  <div className="nyfb-notification-item-bottom">
                    <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</time>
                    {!item.read_at && <button type="button" onClick={() => void markRead(item.id)}>Mark as read</button>}
                  </div>
                </article>
              ))}
            </div>
          }
        </div>
      )}
      <style jsx>{`
        .nyfb-notification-center{position:relative;margin:0 0 18px;color:#f4fff6}
        .nyfb-notification-toggle{width:100%;display:flex;align-items:center;gap:11px;text-align:left;padding:12px 15px;border:1px solid #4d9b6a;border-radius:10px;background:#073b26;color:#effff3;cursor:pointer;min-height:48px}
        .nyfb-notification-icon{font-size:20px;color:#c5a34b}
        .nyfb-notification-label{font-size:13px;font-weight:800}
        .nyfb-notification-count{display:inline-flex;align-items:center;justify-content:center;min-width:21px;height:21px;padding:0 6px;border-radius:20px;background:#c83b43;color:#fff;font-size:10px;font-weight:900}
        .nyfb-notification-chevron{margin-left:auto;font-size:11px;color:#b8f5c9;font-weight:800}
        .nyfb-notification-panel{margin-top:8px;border:1px solid #39865a;border-radius:10px;background:#052d1d;overflow:hidden;box-shadow:0 12px 28px #00170d44}
        .nyfb-notification-panel-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid #286b45}
        .nyfb-notification-panel-head strong,.nyfb-notification-panel-head small{display:block}
        .nyfb-notification-panel-head strong{font-size:13px}
        .nyfb-notification-panel-head small{font-size:10px;color:#c5e8d0;margin-top:4px}
        .nyfb-notification-panel-head button,.nyfb-notification-item-bottom button{border:0;background:transparent;color:#b8f5c9;font-size:10px;font-weight:800;cursor:pointer}
        .nyfb-notification-empty{padding:18px 16px;margin:0;color:#c5e8d0;font-size:12px}
        .nyfb-notification-item{padding:13px 16px;border-bottom:1px solid #205b3a}
        .nyfb-notification-item:last-child{border-bottom:0}
        .nyfb-notification-item.is-unread{background:#0b4a2f}
        .nyfb-notification-item-top,.nyfb-notification-item-bottom{display:flex;justify-content:space-between;align-items:center;gap:10px}
        .nyfb-notification-item-top strong{font-size:12px}
        .nyfb-notification-item-top span{font-size:8px;letter-spacing:.8px;color:#062b1c;background:#b8f5c9;border-radius:12px;padding:4px 7px;font-weight:900}
        .nyfb-notification-item p{font-size:11px;line-height:1.6;color:#e0f4e6;margin:7px 0}
        .nyfb-notification-item-bottom time{font-size:9px;color:#a9d9b8}
        @media(max-width:520px){.nyfb-notification-panel-head{align-items:flex-start}.nyfb-notification-panel-head button{white-space:nowrap}}
      `}</style>
    </section>
  );
}
