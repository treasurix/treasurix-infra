import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      return NextResponse.json({
        shieldedVolume: "0.00",
        openCheckouts: 0,
        treasuryBalance: "0.00",
        recentActivity: [],
      });
    }

    const settledLinks = await prisma.checkoutLink.findMany({
      where: { merchantId: user.id, status: "settled" },
    });

    const activeLinksCount = await prisma.checkoutLink.count({
      where: { merchantId: user.id, status: "active" },
    });

    const recentLinks = await prisma.checkoutLink.findMany({
      where: { merchantId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const solVolume = settledLinks
      .filter((l) => l.asset === "SOL")
      .reduce((acc, curr) => acc + parseFloat(curr.amount || "0"), 0);

    const usdcVolume = settledLinks
      .filter((l) => l.asset === "Mock USDC")
      .reduce((acc, curr) => acc + parseFloat(curr.amount || "0"), 0);

    return NextResponse.json({
      shieldedVolume: {
        SOL: solVolume.toFixed(4),
        USDC: usdcVolume.toFixed(2),
      },
      openCheckouts: activeLinksCount,
      treasuryBalance: {
        SOL: solVolume.toFixed(4),
        USDC: usdcVolume.toFixed(2),
      },
      recentActivity: recentLinks.map((l) => ({
        id: l.slug,
        title: l.label,
        status: l.status,
        ref: l.id.slice(0, 8),
        customer: l.asset,
        updated: l.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
