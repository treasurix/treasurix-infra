import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  try {
    const link = await prisma.checkoutLink.findUnique({
      where: { slug },
      include: {
        merchant: {
          select: { walletAddress: true },
        },
      },
    });

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // Flatten the merchant wallet address into the response
    const { merchant, ...linkData } = link;
    return NextResponse.json({
      ...linkData,
      merchantWalletAddress: merchant?.walletAddress ?? null,
    });
  } catch (error) {
    console.error("Failed to fetch checkout link:", error);
    return NextResponse.json({ error: "Failed to fetch checkout link" }, { status: 500 });
  }
}
