import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Keep authentication callbacks on the official NYFB domain.\n  if (request.nextUrl.hostname !== "nigerianyouthforbat.org") {\n    const canonicalUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, "https://nigerianyouthforbat.org");\n    return NextResponse.redirect(canonicalUrl, 308);\n  }\n\n  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") || "/login?verified=1";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
  }

  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/login?verified=1";
  return NextResponse.redirect(new URL(destination, request.url));
}
