import { NextResponse } from "next/server";
import { forbiddenResponse, requireNationalAdmin, withNyfbActor } from "@/lib/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withNyfbActor(request, async (actor, pool) => {
    if (!requireNationalAdmin(actor)) return forbiddenResponse();

    const url = new URL(request.url);
    const parsedLimit = Number(url.searchParams.get("limit") ?? "50");
    const limit = Number.isFinite(parsedLimit) ? Math.min(100, Math.max(1, Math.trunc(parsedLimit))) : 50;
    const parsedOffset = Number(url.searchParams.get("offset") ?? "0");
    const offset = Number.isFinite(parsedOffset) ? Math.max(0, Math.trunc(parsedOffset)) : 0;

    const result = await pool.query(
      `SELECT id, member_number, full_name, email, phone, state, lga, ward, status::text AS status, submitted_at
       FROM public.members
       WHERE status = 'pending'::public.member_status
       ORDER BY submitted_at ASC, id ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    const count = await pool.query(
      "SELECT count(*)::int AS total FROM public.members WHERE status = 'pending'::public.member_status",
    );

    return NextResponse.json({
      members: result.rows,
      pagination: { limit, offset, total: count.rows[0]?.total ?? 0 },
    });
  });
}
