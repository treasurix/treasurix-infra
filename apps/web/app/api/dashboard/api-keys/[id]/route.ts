import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserFromBearer } from "@/lib/require-dashboard-user";

export const runtime = "nodejs";

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
