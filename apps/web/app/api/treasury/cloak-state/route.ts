import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserFromBearer } from "@/lib/require-dashboard-user";

export const runtime = "nodejs";

type CreateBody = {
  ownerPrivateKey: string;
  ownerPublicKey: string;
  utxoWalletJson: string;
};

type PatchBody = {
  utxoWalletJson: string;
};

/** Full treasury Cloak payload for the authenticated merchant (Privy DID → internal user). */
export async function GET(request: Request) {
  const auth = await requireUserFromBearer(request);
  if ("error" in auth) return auth.error;

  try {
    const row = await prisma.treasuryCloakState.findUnique({
      where: { userId: auth.userId },
    });

    if (!row) {
      return NextResponse.json({ error: "Not initialized" }, { status: 404 });
    }

    return NextResponse.json({
      ownerPrivateKey: row.ownerPrivateKey,
      ownerPublicKey: row.ownerPublicKey,
      utxoWalletJson: row.utxoWalletJson,
    });
  } catch (e) {
    console.error("treasury/cloak-state GET:", e);
    return NextResponse.json({ error: "Failed to load treasury Cloak state" }, { status: 500 });
  }
}

/** First-time create (owner keys + wallet JSON). Returns 409 if a row already exists. */
export async function POST(request: Request) {
  const auth = await requireUserFromBearer(request);
  if ("error" in auth) return auth.error;

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { ownerPrivateKey, ownerPublicKey, utxoWalletJson } = body;
  if (
    typeof ownerPrivateKey !== "string" ||
    typeof ownerPublicKey !== "string" ||
    typeof utxoWalletJson !== "string"
  ) {
    return NextResponse.json({ error: "ownerPrivateKey, ownerPublicKey, utxoWalletJson required" }, { status: 400 });
  }

  try {
    BigInt(ownerPrivateKey);
    BigInt(ownerPublicKey);
  } catch {
    return NextResponse.json({ error: "Invalid key encoding" }, { status: 400 });
  }

  try {
    const existing = await prisma.treasuryCloakState.findUnique({
      where: { userId: auth.userId },
    });
    if (existing) {
      return NextResponse.json({ error: "Treasury Cloak state already exists" }, { status: 409 });
    }

    await prisma.treasuryCloakState.create({
      data: {
        userId: auth.userId,
        ownerPrivateKey,
        ownerPublicKey,
        utxoWalletJson,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("treasury/cloak-state POST:", e);
    return NextResponse.json({ error: "Failed to create treasury Cloak state" }, { status: 500 });
  }
}

/** Update serialized UTXO wallet only (same owner keys). */
export async function PATCH(request: Request) {
  const auth = await requireUserFromBearer(request);
  if ("error" in auth) return auth.error;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.utxoWalletJson !== "string") {
    return NextResponse.json({ error: "utxoWalletJson required" }, { status: 400 });
  }

  try {
    const updated = await prisma.treasuryCloakState.updateMany({
      where: { userId: auth.userId },
      data: { utxoWalletJson: body.utxoWalletJson },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Treasury Cloak state not initialized" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("treasury/cloak-state PATCH:", e);
    return NextResponse.json({ error: "Failed to update treasury Cloak wallet" }, { status: 500 });
  }
}
