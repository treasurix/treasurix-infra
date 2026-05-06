"use client";

export type AuthSyncTransactionPayload = {
  signature: string;
  kind?: string;
};

/**
 * POST `/api/auth/sync` — refresh Privy profile in Postgres and optionally record an on-chain tx.
 */
export async function syncUserWithServer(
  getAccessToken: () => Promise<string | null>,
  options?: { transaction?: AuthSyncTransactionPayload },
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  const res = await fetch("/api/auth/sync", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.transaction ? { "Content-Type": "application/json" } : {}),
    },
    body: options?.transaction ? JSON.stringify(options) : undefined,
  });

  return res.ok;
}
