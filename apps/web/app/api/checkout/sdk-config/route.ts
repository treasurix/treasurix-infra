import { NextResponse } from "next/server";
import { isMerchantApiKeyFormat, verifyMerchantApiKey } from "@/lib/merchant-api-key";

export const runtime = "nodejs";

function getBearer(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, "");
}

/**
 * SDK bootstrap: returns the public base URL used for hosted checkout (/pay/…).
 * Owners can override per API key in the dashboard; otherwise NEXT_PUBLIC_APP_URL or request origin is used.
 */
export async function GET(request: Request) {
  const token = getBearer(request);
  if (!token) {
    return NextResponse.json(
      { error: "Missing Authorization header — use: Authorization: Bearer <trx_live_…>" },
      { status: 401 },
    );
  }
  if (!isMerchantApiKeyFormat(token)) {
    return NextResponse.json(
      {
        error:
          "Invalid API key format — send the full trx_live_ secret from the dashboard (not a truncated or placeholder value).",
      },
      { status: 401 },
    );
  }

  const v = await verifyMerchantApiKey(token);
  if (!v) {
    return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
  }

  const fromKey = v.checkoutBaseUrl?.trim();
  if (fromKey) {
    try {
      const u = new URL(fromKey);
      if (u.protocol === "http:" || u.protocol === "https:") {
        return NextResponse.json({ baseUrl: normalizeOrigin(`${u.protocol}//${u.host}`) });
      }
    } catch {
      /* fall through */
    }
  }

  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    return NextResponse.json({ baseUrl: normalizeOrigin(envUrl) });
  }

  try {
    return NextResponse.json({ baseUrl: normalizeOrigin(new URL(request.url).origin) });
  } catch {
    return NextResponse.json({ baseUrl: "http://localhost:3000" });
  }
}
