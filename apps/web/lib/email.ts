import { config } from "./config";
import {
  passwordResetCodeEmail,
  paymentCreatedCustomerEmail,
  paymentSucceededMerchantEmail,
  paymentReceiptCustomerEmail,
  verificationCodeEmail,
  paymentFailedMerchantEmail,
  paymentExpiredMerchantEmail,
} from "./email-templates";

export function isEmailDeliveryEnabled() {
  return config.smtpEnabled;
}

/**
 * Resolve the Brevo REST API key.
 * Priority: BREVO_API_KEY env → SMTP_PASS (only if it looks like an API key).
 */
function getBrevoApiKey(): string | null {
  const explicit = process.env.BREVO_API_KEY;
  if (explicit) return explicit;
  // The SMTP relay key (xsmtpsib-...) does NOT work with the REST API.
  // Only use SMTP_PASS if it starts with "xkeysib-".
  if (config.smtpPass && config.smtpPass.startsWith("xkeysib-")) return config.smtpPass;
  return null;
}

async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const apiKey = getBrevoApiKey();

  if (!config.smtpEnabled || !apiKey) {
    console.warn(
      "Email dispatch skipped:",
      !config.smtpEnabled
        ? "Delivery disabled (SMTP_ENABLED=false)."
        : "Missing Brevo API key. Set BREVO_API_KEY=xkeysib-... in your .env file.",
    );
    return false;
  }

  try {
    // Parse the sender name and email from "Name <email@example.com>" format
    const fromMatch = config.smtpFrom.match(/^(.*)\s*<(.*)>$/);
    const senderName = fromMatch ? fromMatch[1].trim() : "Treasurix";
    const senderEmail = fromMatch ? fromMatch[2].trim() : config.smtpFrom;

    const payload = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [
        {
          email: params.to,
        },
      ],
      subject: params.subject,
      htmlContent: params.html,
      textContent: params.text,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.smtpSendTimeoutMs);

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.text();
      throw new Error(`Brevo API Error (${res.status}): ${errData}`);
    }

    const data = await res.json();
    console.log(`Email dispatched via Brevo: ${data.messageId} to ${params.to}`);
    return true;
  } catch (error) {
    console.error("Email delivery failed", error);
    return false;
  }
}

export function sendVerificationCodeEmail(params: {
  to: string;
  name: string;
  code: string;
}) {
  const email = verificationCodeEmail({ name: params.name, code: params.code });
  return sendEmail({ to: params.to, ...email });
}

export function sendPasswordResetCodeEmail(params: {
  to: string;
  name: string;
  code: string;
}) {
  const email = passwordResetCodeEmail({ name: params.name, code: params.code });
  return sendEmail({ to: params.to, ...email });
}

export function sendCustomerPaymentCreatedEmail(params: {
  to: string;
  merchantName: string;
  amount: string;
  currency: string;
  orderId: string | null;
  paymentId: string;
  checkoutUrl: string;
}) {
  const email = paymentCreatedCustomerEmail({
    merchantName: params.merchantName,
    amount: params.amount,
    currency: params.currency,
    orderId: params.orderId,
    paymentId: params.paymentId,
    checkoutUrl: params.checkoutUrl,
  });
  return sendEmail({ to: params.to, ...email });
}

export function sendCustomerPaymentReceiptEmail(params: {
  to: string;
  merchantName: string;
  status: "succeeded" | "failed" | "expired";
  amount: string;
  currency: string;
  orderId: string | null;
  paymentId: string;
  txHash: string | null;
}) {
  const email = paymentReceiptCustomerEmail({
    merchantName: params.merchantName,
    status: params.status,
    amount: params.amount,
    currency: params.currency,
    orderId: params.orderId,
    paymentId: params.paymentId,
    txHash: params.txHash,
  });
  return sendEmail({ to: params.to, ...email });
}

export function sendMerchantPaymentSucceededEmail(params: {
  to: string;
  merchantName: string;
  amount: string;
  currency: string;
  orderId: string | null;
  paymentId: string;
  customerEmail: string | null;
  txHash: string | null;
  dashboardUrl: string;
}) {
  const email = paymentSucceededMerchantEmail({
    merchantName: params.merchantName,
    amount: params.amount,
    currency: params.currency,
    orderId: params.orderId,
    paymentId: params.paymentId,
    customerEmail: params.customerEmail,
    txHash: params.txHash,
    dashboardUrl: params.dashboardUrl,
  });
  return sendEmail({ to: params.to, ...email });
}

export function sendMerchantPaymentFailedEmail(params: {
  to: string;
  merchantName: string;
  amount: string;
  currency: string;
  orderId: string | null;
  paymentId: string;
  customerEmail: string | null;
}) {
  const email = paymentFailedMerchantEmail({
    merchantName: params.merchantName,
    amount: params.amount,
    currency: params.currency,
    orderId: params.orderId,
    paymentId: params.paymentId,
    customerEmail: params.customerEmail,
  });
  return sendEmail({ to: params.to, ...email });
}

export function sendMerchantPaymentExpiredEmail(params: {
  to: string;
  merchantName: string;
  amount: string;
  currency: string;
  orderId: string | null;
  paymentId: string;
}) {
  const email = paymentExpiredMerchantEmail({
    merchantName: params.merchantName,
    amount: params.amount,
    currency: params.currency,
    orderId: params.orderId,
    paymentId: params.paymentId,
  });
  return sendEmail({ to: params.to, ...email });
}
