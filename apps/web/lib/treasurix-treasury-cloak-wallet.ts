/**
 * Treasury Cloak state is stored in Postgres via `/api/treasury/cloak-state` (Bearer = Privy).
 * Call {@link getTreasuryOwnerKeypair} before {@link loadTreasuryUtxoWallet} on write paths so the row exists.
 */

export type TreasuryAccessTokenGetter = () => Promise<string | null>;

function authHeader(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

/** Shape returned by GET `/api/treasury/cloak-state`. */
type CloakStateApiRow = {
  ownerPrivateKey: string;
  ownerPublicKey: string;
  utxoWalletJson?: string;
};

export async function getTreasuryOwnerKeypair(getAccessToken: TreasuryAccessTokenGetter) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sign in to load treasury Cloak keys.");
  }

  const get = await fetch("/api/treasury/cloak-state", { headers: authHeader(token) });
  if (get.ok) {
    const d = (await get.json()) as CloakStateApiRow;
    if (d.ownerPrivateKey != null && d.ownerPublicKey != null) {
      return { privateKey: BigInt(d.ownerPrivateKey), publicKey: BigInt(d.ownerPublicKey) };
    }
  }

  const { generateUtxoKeypair, UtxoWallet } = await import("@cloak.dev/sdk-devnet");
  const kp = await generateUtxoKeypair();
  const w = new UtxoWallet();

  const post = await fetch("/api/treasury/cloak-state", {
    method: "POST",
    headers: { ...authHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      ownerPrivateKey: kp.privateKey.toString(),
      ownerPublicKey: kp.publicKey.toString(),
      utxoWalletJson: w.serialize(),
    }),
  });

  if (post.status === 409) {
    const retry = await fetch("/api/treasury/cloak-state", { headers: authHeader(token) });
    if (!retry.ok) {
      throw new Error("Treasury Cloak state race; retry.");
    }
    const d = (await retry.json()) as CloakStateApiRow;
    return { privateKey: BigInt(d.ownerPrivateKey), publicKey: BigInt(d.ownerPublicKey) };
  }

  if (!post.ok) {
    const msg = await post.text();
    throw new Error(msg || `Failed to create treasury Cloak state (${post.status})`);
  }

  return kp;
}

export async function loadTreasuryUtxoWallet(getAccessToken: TreasuryAccessTokenGetter) {
  const { UtxoWallet } = await import("@cloak.dev/sdk-devnet");
  const token = await getAccessToken();
  if (!token) {
    return new UtxoWallet();
  }

  const res = await fetch("/api/treasury/cloak-state", { headers: authHeader(token) });
  if (res.status === 404) {
    return new UtxoWallet();
  }
  if (!res.ok) {
    throw new Error(await res.text());
  }

  const d = (await res.json()) as { utxoWalletJson?: string };
  if (!d.utxoWalletJson) {
    return new UtxoWallet();
  }
  try {
    return UtxoWallet.deserialize(d.utxoWalletJson);
  } catch {
    return new UtxoWallet();
  }
}

export async function saveTreasuryUtxoWallet(
  getAccessToken: TreasuryAccessTokenGetter,
  wallet: { serialize(): string },
) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sign in to save treasury Cloak wallet.");
  }

  const patch = await fetch("/api/treasury/cloak-state", {
    method: "PATCH",
    headers: { ...authHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ utxoWalletJson: wallet.serialize() }),
  });

  if (patch.status === 404) {
    await getTreasuryOwnerKeypair(getAccessToken);
    const retry = await fetch("/api/treasury/cloak-state", {
      method: "PATCH",
      headers: { ...authHeader(token), "Content-Type": "application/json" },
      body: JSON.stringify({ utxoWalletJson: wallet.serialize() }),
    });
    if (!retry.ok) {
      throw new Error(await retry.text());
    }
    return;
  }

  if (!patch.ok) {
    throw new Error(await patch.text());
  }
}
