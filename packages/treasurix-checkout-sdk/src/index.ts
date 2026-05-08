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
   * Origin where your Treasurix app serves `/api/checkout` (e.g. `https://pay.example.com`).
   * **Owner / DevOps** sets `TREASURIX_ORIGIN` (or legacy `TREASURIX_BASE_URL`) on the server once per deployment.
   * Application code can pass **only `apiKey`** when that env var is set. Defaults to `http://localhost:3000` for local Treasurix.
   */
  treasurixOrigin?: string;
  /**
   * @deprecated Use {@link TreasurixCheckoutClientOptions.treasurixOrigin} — same meaning.
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

function resolveTreasurixOrigin(options: TreasurixCheckoutClientOptions): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.TREASURIX_ORIGIN?.trim() ?? process.env.TREASURIX_BASE_URL?.trim()
      : undefined;
  const raw =
    options.treasurixOrigin?.trim() ??
    options.baseUrl?.trim() ??
    fromEnv ??
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
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
 *
 * **Public checkout URL** (where `/pay/:slug` lives) is chosen by the **owner** in the dashboard (per API key) or via
 * `NEXT_PUBLIC_APP_URL` on Treasurix; the SDK loads it from `GET /api/checkout/sdk-config` before calling checkout APIs.
 */
export class TreasurixCheckoutClient {
  private readonly apiKey: string;
  /** Origin used to reach Treasurix API routes (`/api/checkout`, `/api/checkout/sdk-config`). */
  private readonly treasurixOrigin: string;
  /** Resolved public origin for payment links; populated after {@link ensurePublicBase} runs. */
  private cachedPublicCheckoutBase: string | null = null;
  private configPromise: Promise<void> | null = null;

  constructor(options: TreasurixCheckoutClientOptions) {
    const key = options.apiKey?.trim();
    if (!key?.startsWith("trx_live_")) {
      throw new Error("TreasurixCheckoutClient: apiKey must be a trx_live_ secret from the dashboard");
    }
    this.apiKey = key;
    this.treasurixOrigin = resolveTreasurixOrigin(options);
  }

  /**
   * Construct a client and verify the key + load public checkout base URL (same as first API call).
   */
  static async create(options: TreasurixCheckoutClientOptions): Promise<TreasurixCheckoutClient> {
    const client = new TreasurixCheckoutClient(options);
    await client.ensurePublicBase();
    return client;
  }

  private endpoint(path: string): string {
    return `${this.treasurixOrigin}${path.startsWith("/") ? path : `/${path}`}`;
  }

  private authHeaders(contentTypeJson: boolean): HeadersInit {
    const h: Record<string, string> = { Authorization: `Bearer ${this.apiKey}` };
    if (contentTypeJson) h["Content-Type"] = "application/json";
    return h;
  }

  /** Fetches owner-configured public checkout origin from Treasurix (cached). */
  async ensurePublicBase(): Promise<void> {
    if (this.cachedPublicCheckoutBase) return;
    if (!this.configPromise) {
      this.configPromise = (async () => {
        const res = await fetch(this.endpoint("/api/checkout/sdk-config"), {
          headers: this.authHeaders(false),
        });
        const raw = await res.json().catch(() => null);
        const errMsg =
          raw && typeof raw === "object" && "error" in raw && typeof (raw as { error?: unknown }).error === "string"
            ? (raw as { error: string }).error
            : undefined;

        if (!res.ok) {
          throw new TreasurixCheckoutError(res.status, errMsg ?? `HTTP ${res.status}`);
        }

        if (!raw || typeof raw !== "object" || typeof (raw as { baseUrl?: unknown }).baseUrl !== "string") {
          throw new TreasurixCheckoutError(
            502,
            "Treasurix sdk-config returned invalid JSON — ensure Treasurix is up to date",
          );
        }

        this.cachedPublicCheckoutBase = (raw as { baseUrl: string }).baseUrl.replace(/\/$/, "");
      })().finally(() => {
        this.configPromise = null;
      });
    }
    await this.configPromise;
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
    await this.ensurePublicBase();

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

    const raw = await res.json().catch(() => null);
    const errMsg =
      raw && typeof raw === "object" && "error" in raw && typeof (raw as { error?: unknown }).error === "string"
        ? (raw as { error: string }).error
        : undefined;

    if (!res.ok) {
      throw new TreasurixCheckoutError(res.status, errMsg ?? `HTTP ${res.status}`);
    }

    if (!raw || typeof raw !== "object") {
      throw new TreasurixCheckoutError(
        502,
        "Treasurix returned an empty or non-JSON body for POST /api/checkout",
      );
    }

    const row = raw as Record<string, unknown>;
    let checkoutUrl: string | null =
      typeof row.checkoutUrl === "string" ? row.checkoutUrl : null;
    if (!checkoutUrl && typeof row.slug === "string") {
      checkoutUrl = await this.payUrl(row.slug);
    }

    if (!checkoutUrl) {
      throw new TreasurixCheckoutError(
        502,
        "Treasurix response missing checkoutUrl and slug — check Treasurix server version and NEXT_PUBLIC_APP_URL",
      );
    }

    return { ...(raw as CheckoutLinkRecord), checkoutUrl };
  }

  /** Lists checkout links for the API key’s merchant (newest first). */
  async listCheckoutSessions(): Promise<CheckoutLinkRecord[]> {
    await this.ensurePublicBase();

    const res = await fetch(this.endpoint("/api/checkout"), {
      headers: this.authHeaders(false),
    });
    const raw = await res.json().catch(() => null);
    const errMsg =
      raw && typeof raw === "object" && !Array.isArray(raw) && "error" in raw
        ? typeof (raw as { error?: unknown }).error === "string"
          ? (raw as { error: string }).error
          : undefined
        : undefined;

    if (!res.ok) {
      throw new TreasurixCheckoutError(res.status, errMsg ?? `HTTP ${res.status}`);
    }

    if (!Array.isArray(raw)) {
      throw new TreasurixCheckoutError(
        502,
        "Treasurix GET /api/checkout returned non-array JSON — check Authorization and Treasurix version",
      );
    }

    return raw as CheckoutLinkRecord[];
  }

  /**
   * Absolute hosted pay URL for a slug (uses owner-configured public base after {@link ensurePublicBase}).
   */
  async payUrl(slug: string): Promise<string> {
    await this.ensurePublicBase();
    const base = this.cachedPublicCheckoutBase ?? this.treasurixOrigin;
    return `${base}/pay/${encodeURIComponent(slug)}`;
  }
}
