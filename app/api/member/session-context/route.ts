import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { Pool } from "pg";
import { createNyfbAuth, type NyfbWorkerEnv } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { env } = getCloudflareContext();
  const workerEnv = env as unknown as NyfbWorkerEnv;
  const { auth, pool: authPool } = createNyfbAuth(workerEnv);

  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const db = new Pool({
      connectionString: workerEnv.HYPERDRIVE.connectionString,
      max: 1,
      maxUses: 1,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 10_000,
    });

    try {
      const userId = session.user.id;
      const [profile, member, assignments] = await Promise.all([
        db.query("SELECT role::text AS role FROM public.profiles WHERE id = $1::uuid LIMIT 1", [userId]),
        db.query("SELECT status::text AS status FROM public.members WHERE user_id = $1::uuid LIMIT 1", [userId]),
        db.query("SELECT role::text AS role FROM public.coordinator_assignments WHERE user_id = $1::uuid", [userId]),
      ]);

      const role = profile.rows[0]?.role || "member";
      const coordinatorRoles = new Set(["ward_coordinator", "lga_coordinator", "state_coordinator", "national_admin"]);
      const isCoordinator = assignments.rows.some((row: { role: string }) => coordinatorRoles.has(row.role));
      const destination = role === "national_admin"
        ? "/admin"
        : (isCoordinator || ["ward_coordinator", "lga_coordinator", "state_coordinator"].includes(role))
          ? "/coordinator"
          : "/member";

      return NextResponse.json({
        destination,
        role,
        membershipStatus: member.rows[0]?.status || null,
      });
    } finally {
      await db.end();
    }
  } catch {
    return NextResponse.json({ error: "Your account is signed in, but NYFB could not load your access profile. Please try again." }, { status: 503 });
  } finally {
    await authPool.end();
  }
}
