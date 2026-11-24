import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { compare, hash } from "bcryptjs";

export interface NyfbWorkerEnv {
  HYPERDRIVE: { connectionString: string };
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
}

export function createNyfbAuth(env: NyfbWorkerEnv) {
  if (!env.HYPERDRIVE?.connectionString) {
    throw new Error("NYFB database connection is not configured.");
  }
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error("NYFB authentication secret is not configured correctly.");
  }

  // A request-scoped pool avoids reusing Node sockets across Worker requests.
  const pool = new Pool({
    connectionString: env.HYPERDRIVE.connectionString,
    max: 1,
    maxUses: 1,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
  });

  const auth = betterAuth({
    appName: "Nigerian Youth for BAT",
    database: pool,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [
      "https://nigerianyouthforbat.org",
      "https://www.nigerianyouthforbat.org",
      env.BETTER_AUTH_URL,
    ],
    user: {
      additionalFields: {
        phone: { type: "string", required: false, returned: false },
        gender: { type: "string", required: false, returned: false },
        dateOfBirth: { type: "string", required: false, returned: false },
        state: { type: "string", required: false, returned: false },
        lga: { type: "string", required: false, returned: false },
        ward: { type: "string", required: false, returned: false },
        occupation: { type: "string", required: false, returned: false },
        ninNumber: { type: "string", required: false, returned: false },
        referralCode: { type: "string", required: false, returned: false },
        browserRegistrationKey: { type: "string", required: false, returned: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      autoSignIn: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      password: {
        // Existing NYFB accounts use bcrypt hashes. Keep verifying those hashes
        // and continue storing new passwords in bcrypt format during migration.
        hash: (password) => hash(password, 12),
        verify: async ({ hash: storedHash, password }) =>
          compare(password, storedHash),
      },
    },
    advanced: {
      database: { generateId: "uuid" },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 10,
    },
  });

  return { auth, pool };
}
