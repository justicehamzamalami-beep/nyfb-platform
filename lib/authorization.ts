import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import type { Pool } from "pg";
import { createNyfbAuth, type NyfbWorkerEnv } from "@/lib/auth";

export type NyfbCoordinatorAssignment = {
  role: string;
  state: string | null;
  lga: string | null;
  ward: string | null;
};

export type NyfbActor = {
  userId: string;
  role: string;
  membershipStatus: string | null;
  assignments: NyfbCoordinatorAssignment[];
  isNationalAdmin: boolean;
};

type AuthorizedHandler<T> = (
  actor: NyfbActor,
  pool: Pool,
) => Promise<T>;

const normalise = (value: string | null | undefined) =>
  (value ?? "").trim().toLocaleLowerCase("en-NG");

/**
 * Run a server-side database operation only after Better Auth has verified
 * the request cookie. The privileged database connection never reaches the
 * browser. Callers must still apply the resource-specific checks below.
 */
export async function withNyfbActor<T>(
  request: Request,
  handler: AuthorizedHandler<T>,
): Promise<T | NextResponse> {
  const { env } = getCloudflareContext();
  const { auth, pool } = createNyfbAuth(env as unknown as NyfbWorkerEnv);

  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const [profile, member, assignments] = await Promise.all([
      pool.query(
        "SELECT role::text AS role FROM public.profiles WHERE id = $1::uuid LIMIT 1",
        [userId],
      ),
      pool.query(
        "SELECT status::text AS status FROM public.members WHERE user_id = $1::uuid LIMIT 1",
        [userId],
      ),
      pool.query(
        `SELECT role::text AS role, state, lga, ward
         FROM public.coordinator_assignments
         WHERE user_id = $1::uuid`,
        [userId],
      ),
    ]);

    const role = String(profile.rows[0]?.role ?? "member");
    const actor: NyfbActor = {
      userId,
      role,
      membershipStatus: member.rows[0]?.status
        ? String(member.rows[0].status)
        : null,
      assignments: assignments.rows as NyfbCoordinatorAssignment[],
      isNationalAdmin: role === "national_admin",
    };

    return await handler(actor, pool);
  } catch {
    return NextResponse.json(
      { error: "NYFB could not verify your access. Please try again." },
      { status: 503 },
    );
  } finally {
    await pool.end();
  }
}

export function isCoordinator(actor: NyfbActor): boolean {
  return actor.assignments.some((assignment) =>
    ["state_coordinator", "lga_coordinator", "ward_coordinator"].includes(
      assignment.role,
    ),
  );
}

export function canReviewLocation(
  actor: NyfbActor,
  location: { state?: string | null; lga?: string | null; ward?: string | null },
): boolean {
  if (actor.isNationalAdmin) return true;

  const state = normalise(location.state);
  const lga = normalise(location.lga);
  const ward = normalise(location.ward);

  return actor.assignments.some((assignment) => {
    if (normalise(assignment.state) !== state || !state) return false;

    if (assignment.role === "state_coordinator") return true;

    if (
      assignment.role === "lga_coordinator" &&
      normalise(assignment.lga) === lga &&
      Boolean(lga)
    ) {
      return true;
    }

    return (
      assignment.role === "ward_coordinator" &&
      normalise(assignment.lga) === lga &&
      normalise(assignment.ward) === ward &&
      Boolean(lga && ward)
    );
  });
}

export function canAccessOwnRecord(
  actor: NyfbActor,
  recordUserId: string | null | undefined,
): boolean {
  return Boolean(recordUserId && actor.userId === recordUserId);
}

export function forbiddenResponse() {
  return NextResponse.json({ error: "You are not authorised to perform this action." }, {
    status: 403,
  });
}

export function requireNationalAdmin(actor: NyfbActor) {
  return actor.isNationalAdmin;
}

export function requireApprovedMember(actor: NyfbActor) {
  return actor.membershipStatus === "approved";
}
