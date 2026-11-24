import { NextResponse } from "next/server";
import { forbiddenResponse, requireNationalAdmin, withNyfbActor } from "@/lib/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "A valid member ID is required." }, { status: 400 });
  }

  return withNyfbActor(request, async (actor, pool) => {
    if (!requireNationalAdmin(actor)) return forbiddenResponse();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const action = input.action;
    const reason = typeof input.reason === "string" ? input.reason.trim() : "";
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Action must be approve or reject." }, { status: 400 });
    }
    if (action === "reject" && (reason.length < 3 || reason.length > 500)) {
      return NextResponse.json({ error: "Provide a rejection reason of 3 to 500 characters." }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const member = await client.query(
        `SELECT user_id, status::text AS status
         FROM public.members
         WHERE id = $1::uuid
         FOR UPDATE`,
        [id],
      );
      if (!member.rowCount) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Member application not found." }, { status: 404 });
      }
      if (member.rows[0].status !== "pending") {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "This application has already been reviewed." }, { status: 409 });
      }

      const nextStatus = action === "approve" ? "approved" : "rejected";
      await client.query(
        `UPDATE public.members
         SET status = $2::public.member_status,
             reviewed_at = now(),
             reviewed_by = $3::uuid,
             rejection_reason = $4,
             updated_at = now()
         WHERE id = $1::uuid`,
        [id, nextStatus, actor.userId, action === "reject" ? reason : null],
      );

      await client.query(
        `INSERT INTO public.user_notifications
           (user_id, title, message, notification_type, created_at)
         VALUES ($1::uuid, $2, $3, 'membership', now())`,
        [
          member.rows[0].user_id,
          action === "approve" ? "Membership approved" : "Membership application update",
          action === "approve"
            ? "Your NYFB membership application has been approved."
            : "Your NYFB membership application was not approved. Please review the reason provided or contact the national office.",
        ],
      );

      await client.query("COMMIT");
      return NextResponse.json({ reviewed: true, status: nextStatus });
    } catch {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "The application could not be reviewed. Please try again." }, { status: 503 });
    } finally {
      client.release();
    }
  });
}
