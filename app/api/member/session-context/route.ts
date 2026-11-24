import { NextResponse } from "next/server";
import { isCoordinator, withNyfbActor } from "@/lib/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withNyfbActor(request, async (actor) => {
    const destination = actor.isNationalAdmin
      ? "/admin"
      : isCoordinator(actor) ||
          ["ward_coordinator", "lga_coordinator", "state_coordinator"].includes(actor.role)
        ? "/coordinator"
        : "/member";

    return NextResponse.json({
      destination,
      role: actor.role,
      membershipStatus: actor.membershipStatus,
    });
  });
}
