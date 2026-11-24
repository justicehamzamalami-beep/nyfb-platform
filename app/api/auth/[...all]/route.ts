import { getCloudflareContext } from "@opennextjs/cloudflare";
import { toNextJsHandler } from "better-auth/next-js";
import { createNyfbAuth, type NyfbWorkerEnv } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const { env } = getCloudflareContext();
  const { auth, pool } = createNyfbAuth(env as unknown as NyfbWorkerEnv);
  try {
    const handlers = toNextJsHandler(auth);
    return request.method === "GET"
      ? await handlers.GET(request)
      : await handlers.POST(request);
  } finally {
    await pool.end();
  }
}

export const GET = handle;
export const POST = handle;
