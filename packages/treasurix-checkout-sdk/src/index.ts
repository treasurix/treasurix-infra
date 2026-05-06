/** Assets supported by hosted checkout on Treasurix devnet. */
export type CheckoutAsset = "SOL" | "Mock USDC";

export type CheckoutLinkRecord = {
  id: string;
  slug: string;
  label: string;
  amount: string;
  asset: string;
  status: string;
  txSignature: string | null;
  customerEmail: string | null;
  createdAt: string;
  updatedAt: string;
  merchantId: string;
};

export type CreateCheckoutResult = CheckoutLinkRecord & {
  checkoutUrl: string;
};

export type TreasurixCheckoutClientOptions = {
  /**
   * Secret key from the Treasurix dashboard (starts with `trx_live_`).
   * Use only on your server — never in browsers or mobile clients.
   */
  apiKey: string;
  /**
   * Treasurix app origin, e.g. `https://your-deployment.vercel.app`.
   * Defaults to `process.env.TREASURIX_BASE_URL` or `http://localhost:3000`.
   */
  baseUrl?: string;
};

export class TreasurixCheckoutError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "TreasurixCheckoutError";
  }
}

function resolveBaseUrl(explicit?: string): string {
  const fromEnv =
    typeof process !== "undefined" && process.env.TREASURIX_BASE_URL
      ? process.env.TREASURIX_BASE_URL
      : undefined;
  return (explicit ?? fromEnv ?? "http://localhost:3000").replace(/\/$/, "");
}

function randomSlug(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return `co_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Server-side client for Treasurix hosted checkout.
 * Creating a session attaches the link to the merchant account that owns the API key (same treasury as the dashboard).
 */
export class TreasurixCheckoutClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: TreasurixCheckoutClientOptions) {
    if (!options.apiKey?.startsWith("trx_live_")) {
      throw new Error("TreasurixCheckoutClient: apiKey must be a trx_live_ secret from the dashboard");
    }
    this.apiKey = options.apiKey;
    this.baseUrl = resolveBaseUrl(options.baseUrl);
  }

  private endpoint(path: string): string {
    return `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  }

  private authHeaders(contentTypeJson: boolean): HeadersInit {
    const h: Record<string, string> = { Authorization: `Bearer ${this.apiKey}` };
    if (contentTypeJson) h["Content-Type"] = "application/json";
    return h;
  }

  /**
   * Opens a hosted checkout page (`/pay/:slug`) for the payer.
   * Amount is a decimal string (e.g. `"1.5"` SOL or `"10.00"` mock USDC), matching the dashboard.
   */
  async createCheckoutSession(params: {
    label: string;
    amount: string;
    asset: CheckoutAsset;
    /** Omit to auto-generate a unique slug */
    slug?: string;
    customerEmail?: string;
  }): Promise<CreateCheckoutResult> {
    const slug = params.slug ?? randomSlug();
    const res = await fetch(this.endpoint("/api/checkout"), {
      method: "POST",
      headers: this.authHeaders(true),
      body: JSON.stringify({
        label: params.label,
        amount: params.amount,
        asset: params.asset,
        slug,
        customerEmail: params.customerEmail,
      }),
    });

    const body = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      throw new TreasurixCheckoutError(res.status, body.error ?? `HTTP ${res.status}`);
    }

    return body as CreateCheckoutResult;
  }

  /** Lists checkout links for the API key’s merchant (newest first). */
  async listCheckoutSessions(): Promise<CheckoutLinkRecord[]> {
    const res = await fetch(this.endpoint("/api/checkout"), {
      headers: this.authHeaders(false),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      throw new TreasurixCheckoutError(res.status, body.error ?? `HTTP ${res.status}`);
    }

    return body as CheckoutLinkRecord[];
  }

  /** Absolute hosted pay URL for a slug returned from {@link createCheckoutSession}. */
  payUrl(slug: string): string {
    return `${this.baseUrl}/pay/${encodeURIComponent(slug)}`;
  }
}
