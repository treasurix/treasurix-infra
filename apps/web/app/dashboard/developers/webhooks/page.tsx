"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { Skeleton } from "@/app/components/ui/Skeleton";

export default function WebhooksPage() {
  const { user } = usePrivy();
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [merchantEmail, setMerchantEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEmailSaved, setIsEmailSaved] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/user/settings?privyDid=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setEmailEnabled(data.emailNotifications);
          if (data.email) {
            setMerchantEmail(data.email);
            setIsEmailSaved(true);
          }
        }
      })
      .finally(() => setIsLoading(false));
  }, [user?.id]);

  const toggleEmailNotifications = async () => {
    if (!user?.id) return;
    const newState = !emailEnabled;

    // If enabling and no email provided, just toggle the UI so they can type one
    if (newState && !merchantEmail.trim()) {
      setEmailEnabled(newState);
      return;
    }

    setIsSaving(true);
    setEmailEnabled(newState);

    try {
      await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privyDid: user.id,
          emailNotifications: newState,
          ...(newState && { email: merchantEmail.trim() }),
        }),
      });
      if (newState && merchantEmail.trim()) {
        setIsEmailSaved(true);
      }
    } catch (err) {
      console.error("Failed to update email settings", err);
      setEmailEnabled(!newState); // revert on error
    } finally {
      setIsSaving(false);
    }
  };

  const saveEmailAddress = async () => {
    if (!user?.id || !merchantEmail.trim()) return;
    setIsSaving(true);
    try {
      await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privyDid: user.id,
          email: merchantEmail.trim(),
          emailNotifications: true,
        }),
      });
      setEmailEnabled(true);
      setIsEmailSaved(true);
    } catch (err) {
      console.error("Failed to save email", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <DashboardPageHeader
        title="Webhooks & Notifications"
        description="Receive payment.settled, batch.approved, and shield events. Configure signing secrets and retry policy."
      />

      {/* Email Webhook Notification Settings */}
      <div className="rounded-[2.5rem] border border-hairline bg-elevated p-8 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <h3 className="font-display text-2xl font-extreme tracking-tight text-ink">
              Email Notifications
            </h3>
            <p className="mt-1 text-sm font-medium text-subtext">
              Receive automated email receipts when checkout sessions are settled, failed, or expired.
            </p>

            {isLoading ? (
              <div className="mt-6 flex flex-col gap-3 max-w-md">
                <Skeleton className="h-4 w-32 rounded-lg" />
                <div className="flex gap-3">
                  <Skeleton className="h-11 w-full rounded-2xl" />
                  <Skeleton className="h-11 w-16 rounded-2xl shrink-0" />
                </div>
              </div>
            ) : (
              emailEnabled && (
                <div className="mt-6 flex flex-col gap-3 animate-fade-in max-w-md">
                  <label className="text-xs font-extreme text-ink uppercase tracking-widest">Merchant Email Address</label>
                  <div className="flex gap-3">
                    <input
                      type="email"
                      value={merchantEmail}
                      onChange={(e) => setMerchantEmail(e.target.value)}
                      placeholder="hello@yourcompany.com"
                      disabled={isEmailSaved}
                      className="w-full rounded-2xl border border-hairline bg-surface-soft px-5 py-3 text-sm font-bold text-ink shadow-sm focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {isEmailSaved ? (
                      <button
                        onClick={() => setIsEmailSaved(false)}
                        className="rounded-2xl bg-surface-soft border border-hairline px-5 py-3 text-sm font-extreme text-ink shadow-sm hover:opacity-90 transition-all shrink-0"
                      >
                        Edit
                      </button>
                    ) : (
                      <button
                        onClick={saveEmailAddress}
                        disabled={isSaving || !merchantEmail.trim()}
                        className="rounded-2xl bg-ink px-5 py-3 text-sm font-extreme text-white shadow-lift hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed dark:bg-accent shrink-0"
                      >
                        {isSaving ? "..." : "Save"}
                      </button>
                    )}
                  </div>
                  {!merchantEmail.trim() && !isEmailSaved && (
                    <p className="text-xs font-bold text-amber-500">Please provide an email to activate notifications.</p>
                  )}
                </div>
              )
            )}
          </div>

          {isLoading ? (
            <Skeleton className="h-7 w-12 rounded-full mt-2 sm:mt-0" />
          ) : (
            <button
              type="button"
              role="switch"
              aria-checked={emailEnabled}
              disabled={isLoading}
              onClick={toggleEmailNotifications}
              className={`relative mt-2 sm:mt-0 inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 ${emailEnabled ? "bg-accent" : "bg-stone-300 dark:bg-stone-700"
                } ${isLoading ? "opacity-50 cursor-wait" : ""}`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${emailEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
              />
            </button>
          )}
        </div>
      </div>


    </div>
  );
}
