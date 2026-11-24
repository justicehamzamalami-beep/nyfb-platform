import { NextResponse } from "next/server";
import {
  forbiddenResponse,
  requireApprovedMember,
  withNyfbActor,
} from "@/lib/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BANKS = new Set([
  "Access Bank", "Citibank Nigeria", "Ecobank Nigeria", "Fidelity Bank",
  "First Bank of Nigeria", "FCMB", "Globus Bank", "GTBank", "Jaiz Bank",
  "Keystone Bank", "Kuda Microfinance Bank", "Lotus Bank",
  "Moniepoint Microfinance Bank", "Opay (Paycom)", "Optimus Bank", "Palmpay",
  "Parallex Bank", "Polaris Bank", "PremiumTrust Bank", "Providus Bank",
  "Signature Bank", "Sparkle Microfinance Bank", "Stanbic IBTC Bank",
  "Standard Chartered Bank", "Sterling Bank", "SunTrust Bank", "TAJBank",
  "Titan Trust Bank", "UBA", "Unity Bank", "VFD Microfinance Bank",
  "Wema Bank", "Zenith Bank", "Paga", "FairMoney Microfinance Bank",
  "Carbon Microfinance Bank",
]);

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
    if (!requireApprovedMember(actor)) return forbiddenResponse();
    const result = await pool.query(
      "SELECT verification_status FROM public.member_bank_accounts WHERE user_id = $1::uuid LIMIT 1",
      [actor.userId],
    );
    // Do not return bank name, account name, or account number to the member UI.
    return NextResponse.json({
      saved: result.rowCount === 1,
      verificationStatus: result.rows[0]?.verification_status ?? null,
    });
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  return withNyfbActor(request, async (actor, pool) => {
    if (!requireApprovedMember(actor)) return forbiddenResponse();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const bankName = typeof input.bankName === "string" ? input.bankName.trim() : "";
    const accountNumber = typeof input.accountNumber === "string" ? input.accountNumber.trim() : "";
    const accountName = typeof input.accountName === "string" ? input.accountName.trim() : "";

    if (!BANKS.has(bankName) || !/^[0-9]{10}$/.test(accountNumber) ||
        accountName.length < 2 || accountName.length > 120) {
      return NextResponse.json({ error: "Enter a valid bank, 10-digit account number and account name." }, { status: 400 });
    }

    await pool.query(
      `INSERT INTO public.member_bank_accounts
         (user_id, bank_name, account_number, account_name, verification_status, submitted_at, updated_at)
       VALUES ($1::uuid, $2, $3, $4, 'pending', now(), now())
       ON CONFLICT (user_id) DO UPDATE SET
         bank_name = EXCLUDED.bank_name,
         account_number = EXCLUDED.account_number,
         account_name = EXCLUDED.account_name,
         verification_status = 'pending',
         updated_at = now()`,
      [actor.userId, bankName, accountNumber, accountName],
    );

    return NextResponse.json({ saved: true, verificationStatus: "pending" });
  });
}
