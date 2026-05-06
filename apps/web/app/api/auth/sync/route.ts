import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type SyncBody = {
  transaction?: { signature: string; kind?: string };
};

function slugFromDid(did: string) {
  const safe = did.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return `org-${safe.slice(-16) || "default"}`;
}

async function fetchPrivyProfile(privy: PrivyClient, privyDid: string) {
  let email: string | null = null;
  let walletAddress: string | null = null;
  try {
    const pu = await privy.getUserById(privyDid);
    email = pu.email?.address ?? null;
    for (const acc of pu.linkedAccounts ?? []) {
      if (acc.type === "wallet" && "address" in acc && "chainType" in acc) {
        const ct = (acc as { chainType?: string }).chainType;
        if (ct === "solana") {
          walletAddress = (acc as { address: string }).address;
          break;
        }
      }
    }
  } catch {
    // Optional enrichment failed
  }
  return { email, walletAddress };
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  let body: SyncBody = {};
  const contentType = req.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    try {
      body = (await req.json()) as SyncBody;
    } catch {
      body = {};
    }
  }

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const secret = process.env.PRIVY_APP_SECRET;
  if (!appId || !secret) {
    return NextResponse.json({ error: "Privy not configured on server" }, { status: 500 });
  }

  const privy = new PrivyClient(appId, secret);

  let claims: { userId: string };
  try {
    claims = await privy.verifyAuthToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const privyDid = claims.userId;
  const profile = await fetchPrivyProfile(privy, privyDid);
  const now = new Date();

  const userWrite = {
    email: profile.email,
    walletAddress: profile.walletAddress,
    lastSyncedAt: now,
    ...(body.transaction
      ? {
          lastTxSignature: body.transaction.signature,
          lastTxKind: body.transaction.kind ?? null,
          lastTxAt: now,
        }
      : {}),
  };

  try {
    const existing = await prisma.user.findUnique({
      where: { privyDid },
      include: { memberships: { include: { organization: true } } },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: userWrite,
      });
      return NextResponse.json({
        ok: true,
        userId: existing.id,
        organizationId: existing.memberships[0]?.organizationId ?? null,
      });
    }

    const slug = slugFromDid(privyDid);

    const user = await prisma.user.create({
      data: {
        privyDid,
        ...userWrite,
        memberships: {
          create: {
            role: "owner",
            organization: {
              create: {
                name: "My organisation",
                slug,
              },
            },
          },
        },
      },
    });

    const member = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
    });

    return NextResponse.json({
      ok: true,
      userId: user.id,
      organizationId: member?.organizationId ?? null,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      return NextResponse.json(
        {
          error:
            "Database tables are missing. From apps/web run: bun run db:push (with DATABASE_URL set to your Neon database).",
        },
        { status: 503 },
      );
    }
    throw e;
  }
}
