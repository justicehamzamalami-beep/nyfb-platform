import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { createNyfbAuth } from "@/lib/auth";

type NyfbAuth = ReturnType<typeof createNyfbAuth>["auth"];

export const authClient = createAuthClient({
  baseURL: typeof window === "undefined" ? undefined : window.location.origin,
  plugins: [inferAdditionalFields<NyfbAuth>()],
});
