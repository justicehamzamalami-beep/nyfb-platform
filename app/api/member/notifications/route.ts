import { NextResponse } from "next/server";
import { withNyfbActor } from "@/lib/authorization";

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

export async function GET(request: Request) {
  return withNyfbActor(request, async (actor, pool) => {
    const result = await pool.query(
      `SELECT id, title, message, notification_type, read_at, created_at
       FROM public.user_notifications
       WHERE user_id = $1::uuid
       ORDER BY created_at DESC
       LIMIT 30`,
      [actor.userId],
    );
    return NextResponse.json({ notifications: result.rows });
  });
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  return withNyfbActor(request, async (actor, pool) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    if (input.markAll === true) {
      await pool.query(
        "UPDATE public.user_notifications SET read_at = now() WHERE user_id = $1::uuid AND read_at IS NULL",
        [actor.userId],
      );
      return NextResponse.json({ updated: true });
    }
    const id = typeof input.id === "string" ? input.id : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: "A valid notification ID is required." }, { status: 400 });
    }
    const result = await pool.query(
      "UPDATE public.user_notifications SET read_at = now() WHERE id = $1::uuid AND user_id = $2::uuid",
      [id, actor.userId],
    );
    return NextResponse.json({ updated: (result.rowCount ?? 0) > 0 });
  });
}
