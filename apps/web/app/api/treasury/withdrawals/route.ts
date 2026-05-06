import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type PostBody = {
  asset: string;
  amount: string;
  txSignature?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const merchantId = searchParams.get("merchantId");

  if (!merchantId) {
    return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { privyDid: merchantId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json([]);
    }

    const rows = await prisma.treasuryWithdrawal.findMany({
      where: { merchantId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to fetch treasury withdrawals:", error);
    return NextResponse.json({ error: "Failed to fetch treasury withdrawals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const secret = process.env.PRIVY_APP_SECRET;
  if (!appId || !secret) {
    return NextResponse.json({ error: "Privy not configured on server" }, { status: 500 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { asset, amount, txSignature } = body;
  if (!asset || !amount) {
    return NextResponse.json({ error: "asset and amount are required" }, { status: 400 });
  }

  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  const privy = new PrivyClient(appId, secret);
  let claims: { userId: string };
  try {
    claims = await privy.verifyAuthToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const privyDid = claims.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { privyDid },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const row = await prisma.treasuryWithdrawal.create({
      data: {
        merchantId: user.id,
        asset,
        amount,
        txSignature: txSignature ?? null,
      },
    });

    return NextResponse.json(row);
  } catch (error) {
    console.error("Failed to record treasury withdrawal:", error);
    return NextResponse.json({ error: "Failed to record withdrawal" }, { status: 500 });
  }
}
