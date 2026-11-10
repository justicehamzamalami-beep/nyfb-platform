import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return response({ error: "Authentication required" }, 401);

    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    const publishableKey = publishableKeys.default ?? Deno.env.get("SUPABASE_ANON_KEY");
    const secretKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!supabaseUrl || !publishableKey || !secretKey) {
      return response({ error: "Server authentication is not configured." }, 500);
    }
    if (!resendKey) return response({ error: "Email delivery is not configured yet. Ask the administrator to add RESEND_API_KEY to Supabase Edge Function secrets." }, 503);

    const token = authHeader.slice(7);
    const authClient = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    const user = authData.user;
    if (authError || !user) return response({ error: "Your session is invalid. Please sign in again." }, 401);

    const body = await req.json();
    const memberId = typeof body.member_id === "string" ? body.member_id : "";
    const requestedStatus = body.status;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!memberId || !["approved", "rejected", "suspended"].includes(requestedStatus)) {
      return response({ error: "Invalid notification request." }, 400);
    }

    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: profile, error: profileError } = await admin
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError) throw profileError;

    const { data: member, error: memberError } = await admin
      .from("members")
      .select("id,user_id,member_number,full_name,email,state,lga,ward,status,reviewed_by,rejection_reason")
      .eq("id", memberId).maybeSingle();
    if (memberError) throw memberError;
    if (!member || member.status !== requestedStatus || member.reviewed_by !== user.id) {
      return response({ error: "The membership decision could not be verified." }, 403);
    }

    let authorised = profile?.role === "national_admin";
    if (!authorised) {
      const { data: assignments, error: assignmentError } = await admin
        .from("coordinator_assignments")
        .select("role,state,lga,ward").eq("user_id", user.id);
      if (assignmentError) throw assignmentError;
      authorised = (assignments ?? []).some((a: { role: string; state: string | null; lga: string | null; ward: string | null }) => {
        if (a.role === "state_coordinator") return !!a.state && a.state === member.state;
        if (a.role === "lga_coordinator") return !!a.state && !!a.lga && a.state === member.state && a.lga === member.lga;
        if (a.role === "ward_coordinator") return !!a.state && !!a.lga && !!a.ward &&
          a.state === member.state && a.lga === member.lga && a.ward === member.ward;
        return false;
      });
    }
    if (!authorised) return response({ error: "You are not authorised to notify this member." }, 403);

    const { data: previous, error: previousError } = await admin
      .from("audit_logs").select("id")
      .eq("action", "member_status_email_sent")
      .eq("entity_type", "member").eq("entity_id", memberId)
      .contains("details", { status: requestedStatus }).limit(1);
    if (previousError) throw previousError;
    if (previous?.length) return response({ ok: true, already_sent: true });

    const recipient = member.email?.trim();
    if (!recipient) return response({ error: "This member has no email address on their membership record." }, 422);

    const displayName = escapeHtml(member.full_name);
    const memberNo = escapeHtml(member.member_number);
    const statusLabel = requestedStatus.charAt(0).toUpperCase() + requestedStatus.slice(1);
    const safeReason = escapeHtml(reason || member.rejection_reason || "");
    const statusMessage = requestedStatus === "approved"
      ? "Your NYFB membership application has been approved. Your digital membership card is now available in your member dashboard."
      : requestedStatus === "rejected"
        ? "We regret to inform you that your NYFB membership application was not approved."
        : "Your NYFB membership has been suspended. Please contact the NYFB administration if you need clarification.";
    const reasonHtml = requestedStatus === "rejected" && safeReason
      ? '<p><strong>Reason:</strong> ' + safeReason + '</p>' : "";
    const html = '<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#20372b;line-height:1.6">' +
      '<div style="background:#0b4b32;color:white;padding:22px"><h2 style="margin:0">Nigerian Youth for BAT</h2><small>MEMBERSHIP UPDATE</small></div>' +
      '<div style="padding:24px"><p>Dear ' + displayName + ',</p><p>' + statusMessage + '</p>' +
      '<p><strong>Membership number:</strong> ' + memberNo + '<br><strong>Decision:</strong> ' + statusLabel + '</p>' +
      reasonHtml + '<p>You can sign in to your member dashboard to view your latest membership information.</p>' +
      '<p><a href="https://nyfb-platform.justicehamzamalami.workers.dev/member" style="display:inline-block;background:#176b47;color:white;padding:12px 18px;text-decoration:none;border-radius:5px">Open member dashboard</a></p>' +
      '<p>Regards,<br><strong>NYFB Administration</strong></p></div></div>';
    const plainText = 'Dear ' + member.full_name + ',\n\n' + statusMessage + '\nMembership number: ' + member.member_number +
      (safeReason ? '\nReason: ' + (reason || member.rejection_reason || "") : "") +
      '\n\nSign in to your NYFB member dashboard: https://nyfb-platform.justicehamzamalami.workers.dev/member\n\nNYFB Administration';

    const mailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Nigerian Youth for BAT <noreply@auth.nigerianyouthforbat.org>",
        to: [recipient],
        subject: "NYFB membership update: " + statusLabel,
        html,
        text: plainText,
      }),
    });
    const mailResult = await mailResponse.json().catch(() => ({}));
    if (!mailResponse.ok) {
      console.error("Resend delivery failed", mailResponse.status, mailResult);
      return response({ error: "The membership decision was saved, but the email could not be sent. Please try again later." }, 502);
    }

    const { error: logError } = await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: "member_status_email_sent",
      entity_type: "member",
      entity_id: memberId,
      details: { status: requestedStatus, recipient, resend_id: mailResult.id ?? null },
    });
    if (logError) {
      console.error("Email sent but audit logging failed", logError);
    }

    return response({ ok: true, sent: true });
  } catch (error) {
    console.error("send-member-status-email error", error);
    return response({ error: "Unable to process the membership notification." }, 500);
  }
});
