import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserFromBearer } from "@/lib/require-dashboard-user";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserFromBearer(request);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  let body: { checkoutBaseUrl?: string | null } = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object") body = raw as { checkoutBaseUrl?: string | null };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!("checkoutBaseUrl" in body)) {
    return NextResponse.json({ error: "checkoutBaseUrl is required (string or null)" }, { status: 400 });
  }

  let checkoutBaseUrl: string | null = null;
  if (body.checkoutBaseUrl === null || body.checkoutBaseUrl === "") {
    checkoutBaseUrl = null;
  } else if (typeof body.checkoutBaseUrl === "string") {
    try {
      const u = new URL(body.checkoutBaseUrl.trim());
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return NextResponse.json({ error: "checkoutBaseUrl must be http or https" }, { status: 400 });
      }
      checkoutBaseUrl = `${u.protocol}//${u.host}`;
    } catch {
      return NextResponse.json({ error: "Invalid checkoutBaseUrl" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "checkoutBaseUrl must be a string or null" }, { status: 400 });
  }

  try {
    const updated = await prisma.merchantApiKey.updateMany({
      where: { id, userId: auth.userId, revokedAt: null },
      data: { checkoutBaseUrl },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Key not found or revoked" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, checkoutBaseUrl });
  } catch (e) {
    console.error("dashboard/api-keys PATCH:", e);
    return NextResponse.json({ error: "Failed to update API key" }, { status: 500 });
  }
}

/** Revoke an API key (soft-delete). */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserFromBearer(request);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    const updated = await prisma.merchantApiKey.updateMany({
      where: { id, userId: auth.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Key not found or already revoked" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("dashboard/api-keys DELETE:", e);
    return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 });
  }
}
