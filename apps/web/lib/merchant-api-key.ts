import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/** Public prefix for merchant server-side keys (`Authorization: Bearer …`). */
export const MERCHANT_API_KEY_PREFIX = "trx_live_" as const;

export function generateMerchantApiKeyRaw(): string {
  return `${MERCHANT_API_KEY_PREFIX}${randomBytes(32).toString("hex")}`;
}

export function hashMerchantApiKey(rawKey: string): string {
  const pepper = process.env.TREASURIX_API_KEY_PEPPER ?? "";
  return createHash("sha256").update(pepper + rawKey, "utf8").digest("hex");
}

/** First segment shown in dashboard (no secret leakage beyond prefix). */
export function merchantApiKeyDisplayPrefix(rawKey: string): string {
  const secret = rawKey.slice(MERCHANT_API_KEY_PREFIX.length);
  const head = secret.slice(0, 8);
  const tail = secret.slice(-4);
  return `${MERCHANT_API_KEY_PREFIX}${head}…${tail}`;
}

export function isMerchantApiKeyFormat(token: string): boolean {
  return token.startsWith(MERCHANT_API_KEY_PREFIX) && token.length > MERCHANT_API_KEY_PREFIX.length + 16;
}

export async function verifyMerchantApiKey(rawKey: string): Promise<{ userId: string; keyId: string } | null> {
  if (!isMerchantApiKeyFormat(rawKey)) return null;
  const digest = hashMerchantApiKey(rawKey);
  const row = await prisma.merchantApiKey.findFirst({
    where: { keyHash: digest, revokedAt: null },
    select: { id: true, userId: true },
  });
  if (!row) return null;

  await prisma.merchantApiKey.update({
    where: { id: row.id },
    data: { lastUsedAt: new Date() },
  });

  return { userId: row.userId, keyId: row.id };
}
