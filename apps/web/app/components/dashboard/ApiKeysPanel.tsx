"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Toast } from "@/app/components/ui/Toast";

type Row = {
  id: string;
  name: string | null;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  checkoutBaseUrl: string | null;
};

function CheckoutUrlEditor({
  keyId,
  initialCheckoutBaseUrl,
  getAuthHeader,
  onToast,
  onSaved,
}: {
  keyId: string;
  initialCheckoutBaseUrl: string | null;
  getAuthHeader: () => Promise<Record<string, string> | null>;
  onToast: (msg: string) => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(initialCheckoutBaseUrl ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(initialCheckoutBaseUrl ?? "");
  }, [initialCheckoutBaseUrl, keyId]);

  const save = async () => {
    const h = await getAuthHeader();
    if (!h) return;
    setSaving(true);
    try {
      const trimmed = value.trim();
      const res = await fetch(`/api/dashboard/api-keys/${encodeURIComponent(keyId)}`, {
        method: "PATCH",
        headers: { ...h, "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutBaseUrl: trimmed === "" ? null : trimmed,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        onToast(data.error ?? "Failed to save checkout URL");
        return;
      }
      onToast("Public checkout URL saved.");
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 w-full max-w-lg border-t border-hairline pt-3 sm:max-w-xl">
      <span className="text-xs font-medium text-subtext">Public checkout URL</span>
      <p className="mt-0.5 text-[11px] leading-relaxed text-subtext">
        Origin payers open for <code className="font-mono">/pay/…</code> (e.g.{" "}
        <span className="font-mono">https://pay.example.com</span>). Leave empty to use Treasurix defaults 
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://checkout.example.com"
          className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface-soft px-3 py-2 font-mono text-xs text-ink"
        />
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="shrink-0 rounded-lg border border-hairline bg-surface-solid px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-soft disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

export function ApiKeysPanel() {
  const { getAccessToken, authenticated, ready } = usePrivy();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const authHeader = useCallback(async () => {
    const t = await getAccessToken();
    if (!t) return null;
    return { Authorization: `Bearer ${t}` } as Record<string, string>;
  }, [getAccessToken]);

  const load = useCallback(async () => {
    if (!authenticated) {
      setRows([]);
      setLoading(false);
      return;
    }
    const h = await authHeader();
    if (!h) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/api-keys", { headers: h });
      if (res.ok) {
        setRows(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [authenticated, authHeader]);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  const createKey = async () => {
    const h = await authHeader();
    if (!h) return;
    setCreating(true);
    try {
      const res = await fetch("/api/dashboard/api-keys", {
        method: "POST",
        headers: { ...h, "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined }),
      });
      const data = (await res.json()) as { secret?: string; error?: string };
      if (!res.ok) {
        setToast(data.error ?? "Failed to create key");
        return;
      }
      if (data.secret) setNewSecret(data.secret);
      setName("");
      setToast("API key created — copy the secret now; it will not be shown again.");
      await load();
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    const h = await authHeader();
    if (!h) return;
    const res = await fetch(`/api/dashboard/api-keys/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: h,
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setToast(data.error ?? "Revoke failed");
      return;
    }
    setToast("Key revoked.");
    await load();
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copied to clipboard.");
    } catch {
      setToast("Could not copy.");
    }
  };

  if (!ready) {
    return <p className="text-sm text-subtext">Loading…</p>;
  }

  if (!authenticated) {
    return <p className="text-sm text-subtext">Sign in to manage API keys.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-hairline bg-elevated p-6 shadow-sm">
        <h3 className="font-display text-lg font-medium text-ink">Create server key</h3>
        <p className="mt-1 text-sm text-subtext">
          Use <code className="rounded bg-surface-soft px-1 font-mono text-xs">Authorization: Bearer trx_live_…</code> from
          your backend with{" "}
          <code className="rounded bg-surface-soft px-1 font-mono text-xs">treasurix-checkout-sdk</code>. Funds settle to
          the same treasury as this dashboard account. Set an optional public checkout URL per key so pay links use your domain
          without changing integrator code.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-ink">
            Label (optional)
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Production billing"
              className="rounded-xl border border-hairline bg-surface-soft px-4 py-2.5 text-sm text-ink"
            />
          </label>
          <button
            type="button"
            disabled={creating}
            onClick={() => void createKey()}
            className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Generate key"}
          </button>
        </div>
      </div>

      {newSecret ? (
        <div className="rounded-2xl border-2 border-amber-500/30 bg-amber-600/5 p-6">
          <p className="text-sm font-semibold text-ink">New secret (copy now)</p>
          <p className="mt-1 text-xs text-subtext">This value is only shown once.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="break-all rounded-lg bg-transparent px-3 py-2 font-mono text-xs text-ink">
              {newSecret}
            </code>
            <button
              type="button"
              onClick={() => void copy(newSecret)}
              className="rounded-lg border border-hairline bg-surface-solid px-3 py-2 text-xs font-semibold text-ink"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => setNewSecret(null)}
              className="rounded-lg px-3 py-2 text-xs font-medium text-subtext hover:text-ink"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-hairline bg-elevated shadow-sm overflow-hidden">
        <div className="border-b border-hairline px-6 py-4">
          <h3 className="font-display text-lg font-medium text-ink">Active keys</h3>
        </div>
        {loading ? (
          <p className="px-6 py-10 text-sm text-subtext">Loading keys…</p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-10 text-sm text-subtext">No keys yet. Generate one to use the checkout SDK from your server.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm text-ink">{r.keyPrefix}</p>
                  <p className="text-xs text-subtext">
                    {r.name ?? "Unnamed"} · created {new Date(r.createdAt).toLocaleString()}
                    {r.lastUsedAt ? ` · last used ${new Date(r.lastUsedAt).toLocaleString()}` : " · never used"}
                  </p>
                  <CheckoutUrlEditor
                    keyId={r.id}
                    initialCheckoutBaseUrl={r.checkoutBaseUrl}
                    getAuthHeader={authHeader}
                    onToast={setToast}
                    onSaved={() => void load()}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void revoke(r.id)}
                  className="self-start rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 sm:shrink-0"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {toast ? <Toast message={toast} onBlur={() => setToast(null)} /> : null}
    </div>
  );
}
