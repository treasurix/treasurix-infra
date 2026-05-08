import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isMerchantApiKeyFormat, verifyMerchantApiKey } from "@/lib/merchant-api-key";

export const runtime = "nodejs";

const CHECKOUT_ASSETS = new Set(["SOL", "Mock USDC"]);

function getBearer(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

function normalizeCheckoutBase(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function resolveCheckoutLinkBase(
  request: Request,
  checkoutBaseUrlFromKey: string | null | undefined,
): string {
  const fromKey = checkoutBaseUrlFromKey?.trim();
  if (fromKey) {
    try {
      const u = new URL(fromKey);
      if (u.protocol === "http:" || u.protocol === "https:") {
        return normalizeCheckoutBase(`${u.protocol}//${u.host}`);
      }
    } catch {
      /* fall through */
    }
  }
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return normalizeCheckoutBase(envUrl);
  try {
    return normalizeCheckoutBase(new URL(request.url).origin);
  } catch {
    return "http://localhost:3000";
  }
}

/** Resolve merchant internal UUID: Bearer `trx_live_…` API key, or legacy body `merchantId` (Privy DID). */
async function resolveMerchantInternalId(
  request: Request,
  bodyMerchantId: string | undefined,
): Promise<{ userId: string; checkoutBaseUrl?: string | null } | { error: NextResponse }> {
  const token = getBearer(request);
  if (token && isMerchantApiKeyFormat(token)) {
    const v = await verifyMerchantApiKey(token);
    if (!v) {
      return { error: NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 }) };
    }
    return { userId: v.userId, checkoutBaseUrl: v.checkoutBaseUrl };
  }

  if (!bodyMerchantId) {
    return {
      error: NextResponse.json(
        { error: "merchantId is required unless using Authorization: Bearer trx_live_…" },
        { status: 400 },
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { privyDid: bodyMerchantId },
    select: { id: true },
  });

  if (!user) {
    return {
      error: NextResponse.json(
        { error: `User with Privy DID ${bodyMerchantId} not found in database. Ensure sync is complete.` },
        { status: 404 },
      ),
    };
  }

  return { userId: user.id };
}

export async function GET(request: Request) {
  const token = getBearer(request);
  if (token && isMerchantApiKeyFormat(token)) {
    const v = await verifyMerchantApiKey(token);
    if (!v) {
      return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
    }
    try {
      const links = await prisma.checkoutLink.findMany({
        where: { merchantId: v.userId },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(links);
    } catch (error) {
      console.error("Failed to fetch checkout links (API key):", error);
      return NextResponse.json({ error: "Failed to fetch checkout links" }, { status: 500 });
    }
  }

  const { searchParams } = new URL(request.url);
  const merchantId = searchParams.get("merchantId");

  if (!merchantId) {
    return NextResponse.json(
      { error: "merchantId is required, or use Authorization: Bearer trx_live_…" },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { privyDid: merchantId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json([]);
    }

    const links = await prisma.checkoutLink.findMany({
      where: { merchantId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error("Failed to fetch checkout links:", error);
    return NextResponse.json({ error: "Failed to fetch checkout links" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { label, amount, asset, merchantId, slug, customerEmail } = body;

    if (!label || !amount || !asset || !slug) {
      return NextResponse.json({ error: "Missing required fields (label, amount, asset, slug)" }, { status: 400 });
    }

    if (!CHECKOUT_ASSETS.has(asset)) {
      return NextResponse.json({ error: 'asset must be "SOL" or "Mock USDC"' }, { status: 400 });
    }

    const resolved = await resolveMerchantInternalId(request, merchantId);
    if ("error" in resolved) return resolved.error;

    const link = await prisma.checkoutLink.create({
      data: {
        label,
        amount,
        asset,
        merchantId: resolved.userId,
        slug,
        customerEmail: customerEmail || null,
        status: "active",
      },
    });

    const linkBase = resolveCheckoutLinkBase(
      request,
      "checkoutBaseUrl" in resolved ? resolved.checkoutBaseUrl : undefined,
    );
    const checkoutUrl = `${linkBase}/pay/${slug}`;

    if (customerEmail) {
      try {
        const { sendCustomerPaymentCreatedEmail, isEmailDeliveryEnabled } = await import("@/lib/email");
        if (isEmailDeliveryEnabled()) {
          const merchantName = "Treasurix Merchant";
          await sendCustomerPaymentCreatedEmail({
            to: customerEmail,
            merchantName,
            amount,
            currency: asset,
            orderId: slug,
            paymentId: link.id,
            checkoutUrl,
          });
        }
      } catch (err) {
        console.error("Email dispatch on link creation failed:", err);
      }
    }

    return NextResponse.json({ ...link, checkoutUrl });
  } catch (error) {
    console.error("Failed to create checkout link:", error);
    return NextResponse.json({ error: "Failed to create checkout link" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, txSignature } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const link = await prisma.checkoutLink.update({
      where: { id },
      data: {
        status,
        txSignature,
      },
      include: { merchant: true },
    });

    if (status === "settled") {
      try {
        const { sendMerchantPaymentSucceededEmail, sendCustomerPaymentReceiptEmail, isEmailDeliveryEnabled } =
          await import("@/lib/email");
        if (isEmailDeliveryEnabled()) {
          const merchantName = "Treasurix Merchant";
          const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`;
          const merchantEmail = link.merchant.notificationEmail ?? link.merchant.email;

          if (merchantEmail) {
            await sendMerchantPaymentSucceededEmail({
              to: merchantEmail,
              merchantName,
              amount: link.amount,
              currency: link.asset,
              orderId: link.slug,
              paymentId: link.id,
              customerEmail: link.customerEmail,
              txHash: link.txSignature,
              dashboardUrl,
            });
          }

          if (link.customerEmail) {
            await sendCustomerPaymentReceiptEmail({
              to: link.customerEmail,
              merchantName,
              status: "succeeded",
              amount: link.amount,
              currency: link.asset,
              orderId: link.slug,
              paymentId: link.id,
              txHash: link.txSignature,
            });
          }
        }
      } catch (err) {
        console.error("Email module dispatch in PATCH failed:", err);
      }
    }

    return NextResponse.json(link);
  } catch (error) {
    console.error("Failed to update checkout link:", error);
    return NextResponse.json({ error: "Failed to update checkout link" }, { status: 500 });
  }
}
