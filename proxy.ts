import { NextRequest, NextResponse } from "next/server";

const CANONICAL_ORIGIN = "https://nigerianyouthforbat.org";
const LEGACY_HOSTNAMES = new Set([
  "nyfb-platform.justicehamzamalami.workers.dev",
  "www.nigerianyouthforbat.org",
]);

export function proxy(request: NextRequest) {
  if (!LEGACY_HOSTNAMES.has(request.nextUrl.hostname)) {
    return NextResponse.next();
  }

  const destination = new URL(
    request.nextUrl.pathname + request.nextUrl.search,
    CANONICAL_ORIGIN
  );

  return NextResponse.redirect(destination, 308);
}

export const config = {
  matcher: ["/:path*"],
};
