import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserFromBearer } from "@/lib/require-dashboard-user";
import {
  generateMerchantApiKeyRaw,
  hashMerchantApiKey,
  merchantApiKeyDisplayPrefix,
} from "@/lib/merchant-api-key";

export const runtime = "nodejs";

/** List API keys (masked) for the logged-in merchant. */
export async function GET(request: Request) {
  const auth = await requireUserFromBearer(request);
  if ("error" in auth) return auth.error;

  try {
    const rows = await prisma.merchantApiKey.findMany({
      where: { userId: auth.userId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
    return NextResponse.json(rows);
  } catch (e) {
    console.error("dashboard/api-keys GET:", e);
    return NextResponse.json({ error: "Failed to list API keys" }, { status: 500 });
  }
}

type PostBody = { name?: string };

/** Create a key. The raw secret is returned once in `secret`; store it server-side only. */
export async function POST(request: Request) {
  const auth = await requireUserFromBearer(request);
  if ("error" in auth) return auth.error;

  let body: PostBody = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object") body = raw as PostBody;
  } catch {
    body = {};
  }

  const name =
    typeof body.name === "string" && body.name.trim().length > 0 ? body.name.trim().slice(0, 120) : null;

  try {
    const secret = generateMerchantApiKeyRaw();
    const keyHash = hashMerchantApiKey(secret);
    const keyPrefix = merchantApiKeyDisplayPrefix(secret);

    const row = await prisma.merchantApiKey.create({
      data: {
        userId: auth.userId,
        name,
        keyPrefix,
        keyHash,
      },
      select: { id: true, name: true, keyPrefix: true, createdAt: true },
    });

    return NextResponse.json({
      ...row,
      secret,
      hint: "Save this secret now; it cannot be shown again. Use Authorization: Bearer <secret> from your server.",
    });
  } catch (e) {
    console.error("dashboard/api-keys POST:", e);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}
