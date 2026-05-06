import { config } from './config';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

type BaseEmailParams = {
  subject: string;
  preheader?: string;
  title: string;
  greeting?: string;
  paragraphs: string[];
  details?: { label: string; value: string; isCode?: boolean }[];
  cta?: { label: string; href: string };
  footerNote?: string;
};

export function renderEmail(params: BaseEmailParams) {
  const brand = 'Treasurix';
  const preheader = params.preheader ?? '';
  const greeting = params.greeting ?? 'Hi,';

  // Construct text fallback
  const textLines = [
    `${brand} - ${params.subject}`,
    '',
    greeting,
    '',
    ...params.paragraphs,
  ];

  if (params.details && params.details.length > 0) {
    textLines.push('');
    params.details.forEach((d) => {
      textLines.push(`${d.label}: ${d.value}`);
    });
  }

  if (params.cta) {
    textLines.push('');
    textLines.push(`${params.cta.label}: ${params.cta.href}`);
  }

  textLines.push('');
  textLines.push(params.footerNote ?? `Sent by ${brand}.`);

  const text = textLines.filter((line): line is string => typeof line === 'string').join('\n');

  // HTML Content Builder
  const htmlParagraphs = params.paragraphs
    .map((p) => `<p style="margin: 0 0 16px; color: #4b5563; font-size: 15px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${escapeHtml(p)}</p>`)
    .join('');

  // Structured Details Card HTML
  let detailsHtml = '';
  if (params.details && params.details.length > 0) {
    const rows = params.details
      .map(
        (d) => `
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 12px 0; color: #6b7280; font-size: 13px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase; letter-spacing: 0.05em; width: 35%;">${escapeHtml(
            d.label
          )}</td>
          <td style="padding: 12px 0; color: #111827; font-size: 14px; font-weight: 600; font-family: ${
            d.isCode
              ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
              : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          }; text-align: right; word-break: break-all; ${
          d.isCode ? 'background: #f9fafb; border-radius: 6px; padding: 4px 8px; border: 1px solid #f3f4f6; display: inline-block; max-width: 100%; box-sizing: border-box;' : ''
        }">${escapeHtml(d.value)}</td>
        </tr>
      `
      )
      .join('');

    detailsHtml = `
      <div style="margin: 24px 0; padding: 20px; background: #fafafa; border: 1px solid #f3f4f6; border-radius: 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  // CTA Button HTML
  const ctaHtml = params.cta
    ? `<div style="margin: 28px 0; text-align: center;">
        <a href="${escapeHtml(params.cta.href)}" style="display: inline-block; padding: 14px 28px; border-radius: 14px; background: #0f172a; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); letter-spacing: -0.01em; transition: all 0.2s ease;">
          ${escapeHtml(params.cta.label)}
        </a>
      </div>`
    : '';

  // Main Email Template
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(params.subject)}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
      ${escapeHtml(preheader)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 48px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; width: 100%;">
            <!-- Card Wrapper -->
            <tr>
              <td style="background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);">
                <!-- Brand Header Inside Card Box -->
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 28px; border-bottom: 1px solid #f3f4f6; width: 100%; padding-bottom: 20px;">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 12px; width: 28px;">
                      <!-- Treasurix Rotated Diamond Logo -->
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
                        <g transform="translate(14 14) rotate(45)">
                          <rect x="-12.5" y="-12.5" width="25" height="25" fill="none" stroke="#c9a84c" stroke-width="2" />
                          <rect x="-4.5" y="-4.5" width="9" height="9" fill="#c9a84c" />
                        </g>
                      </svg>
                    </td>
                    <td style="vertical-align: middle;">
                      <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 700; font-size: 20px; letter-spacing: -0.03em; color: #0f172a;">${escapeHtml(brand)}</span>
                    </td>
                  </tr>
                </table>

                <!-- Card Header -->
                <h1 style="margin: 0 0 6px; font-size: 24px; font-weight: 700; color: #0f172a; letter-spacing: -0.03em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${escapeHtml(params.title)}
                </h1>
                <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${escapeHtml(greeting)}
                </p>
                
                <!-- Main Body -->
                ${htmlParagraphs}
                
                <!-- Details Card -->
                ${detailsHtml}
                
                <!-- CTA -->
                ${ctaHtml}
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding: 24px 8px 0; text-align: center; color: #9ca3af; font-size: 12px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <p style="margin: 0 0 4px;">${escapeHtml(params.footerNote ?? `Sent securely via ${brand} Protocol.`)}</p>
                <p style="margin: 0;"><a href="${escapeHtml(config.webOrigin)}" style="color: #6b7280; text-decoration: none; font-weight: 500;">${escapeHtml(config.webOrigin.replace(/^https?:\/\//, ''))}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: params.subject, text, html };
}

export function verificationCodeEmail(params: {
  name: string;
  code: string;
}) {
  return renderEmail({
    subject: 'Verify your Treasurix account',
    preheader: `Your verification code is ${params.code}.`,
    title: 'Verify your email',
    greeting: `Hi ${params.name || 'there'},`,
    paragraphs: [
      'Welcome to Treasurix! Please use the secure verification code below to authorize your account.',
      'This code is private and will expire shortly for security. Never share your verification code with anyone.',
    ],
    details: [
      { label: 'Verification Code', value: params.code, isCode: true },
    ],
    footerNote: 'This is an automated security code. If you did not sign up, please delete this email.',
  });
}

export function passwordResetCodeEmail(params: {
  name: string;
  code: string;
}) {
  return renderEmail({
    subject: 'Reset your Treasurix password',
    preheader: `Your reset code is ${params.code}.`,
    title: 'Reset your password',
    greeting: `Hi ${params.name || 'there'},`,
    paragraphs: [
      'We received a request to reset your password. Use the security code below to proceed with setting a new password.',
      'For your protection, this code is only valid for 15 minutes. If you did not request this, please change your password immediately.',
    ],
    details: [
      { label: 'Reset Code', value: params.code, isCode: true },
    ],
    footerNote: 'Secured by Treasurix identity guard.',
  });
}

export function paymentCreatedCustomerEmail(params: {
  merchantName: string;
  amount: string;
  currency: string;
  orderId: string | null;
  paymentId: string;
  checkoutUrl: string;
}) {
  const reference = params.orderId ?? params.paymentId;
  const details = [
    { label: 'Merchant', value: params.merchantName },
    { label: 'Amount Due', value: `${params.amount} ${params.currency}` },
    { label: 'Payment ID', value: params.paymentId, isCode: true },
  ];

  if (params.orderId) {
    details.push({ label: 'Order ID', value: params.orderId, isCode: true });
  }

  return renderEmail({
    subject: `Payment request from ${params.merchantName}`,
    preheader: `Pay ${params.amount} ${params.currency} for ${reference}.`,
    title: 'Complete your payment',
    greeting: 'Hi,',
    paragraphs: [
      `${params.merchantName} has issued a payment request for your order.`,
      'Click the button below to review your invoice details and securely settle the transaction via Solana shielded pool.',
    ],
    details,
    cta: { label: 'Pay now', href: params.checkoutUrl },
    footerNote: 'This secure payment link is unique to you. Do not share this URL.',
  });
}

export function paymentReceiptCustomerEmail(params: {
  merchantName: string;
  status: 'succeeded' | 'failed' | 'expired';
  amount: string;
  currency: string;
  orderId: string | null;
  paymentId: string;
  txHash: string | null;
}) {
  const reference = params.orderId ?? params.paymentId;
  const statusLabel =
    params.status === 'succeeded'
      ? 'Payment successful'
      : params.status === 'expired'
        ? 'Payment expired'
        : 'Payment failed';

  const details = [
    { label: 'Merchant', value: params.merchantName },
    { label: 'Amount Paid', value: `${params.amount} ${params.currency}` },
    { label: 'Payment Status', value: statusLabel },
    { label: 'Payment ID', value: params.paymentId, isCode: true },
  ];

  if (params.orderId) {
    details.push({ label: 'Order ID', value: params.orderId, isCode: true });
  }

  if (params.txHash) {
    details.push({ label: 'Transaction Hash', value: params.txHash, isCode: true });
  }

  return renderEmail({
    subject: `${statusLabel} - ${params.merchantName}`,
    preheader: `${statusLabel} for ${reference}.`,
    title: statusLabel,
    greeting: 'Hi,',
    paragraphs: [
      'Thank you for your payment. Your transaction has been successfully processed and settled via Cloak Shield Protocol.',
      'An official receipt of this transaction has been generated for your record below.',
    ],
    details,
    footerNote: 'Please keep this email for your records. If you have questions, contact the merchant.',
  });
}

export function paymentSucceededMerchantEmail(params: {
  merchantName: string;
  amount: string;
  currency: string;
  orderId: string | null;
  paymentId: string;
  customerEmail: string | null;
  txHash: string | null;
  dashboardUrl: string;
}) {
  const reference = params.orderId ?? params.paymentId;

  const details = [
    { label: 'Amount Received', value: `${params.amount} ${params.currency}` },
    { label: 'Customer', value: params.customerEmail || 'Anonymous Checkout' },
    { label: 'Payment ID', value: params.paymentId, isCode: true },
  ];

  if (params.orderId) {
    details.push({ label: 'Order ID', value: params.orderId, isCode: true });
  }

  if (params.txHash) {
    details.push({ label: 'Transaction Hash', value: params.txHash, isCode: true });
  }

  return renderEmail({
    subject: `Payment received - ${params.amount} ${params.currency}`,
    preheader: `You received ${params.amount} ${params.currency} for ${reference}.`,
    title: 'Payment Received Successfully',
    greeting: `Hi ${params.merchantName},`,
    paragraphs: [
      'Great news! A new payment has been settled successfully on Solana devnet.',
      'The funds have been completely shielded through the Cloak privacy pool and are ready to manage in your workspace dashboard.',
    ],
    details,
    cta: { label: 'Go to dashboard', href: params.dashboardUrl },
    footerNote: 'Manage checkout links, analytics, and settlement logs directly from your merchant console.',
  });
}

export function paymentFailedMerchantEmail(params: {
  merchantName: string;
  amount: string;
  currency: string;
  orderId: string | null;
  paymentId: string;
  customerEmail: string | null;
}) {
  const reference = params.orderId ?? params.paymentId;

  return renderEmail({
    subject: `Payment failed - ${params.amount} ${params.currency}`,
    preheader: `A payment for ${reference} failed to process.`,
    title: 'Payment failed',
    greeting: `Hi ${params.merchantName},`,
    paragraphs: [
      'A customer attempted a payment, but the transaction dropped or the simulation failed.',
      `Amount: ${params.amount} ${params.currency}`,
      `Reference: ${reference}`,
      `Payment ID: ${params.paymentId}`,
      params.customerEmail
        ? `Customer email: ${params.customerEmail}`
        : 'Customer email: unavailable',
    ],
    footerNote: 'The checkout link remains active unless manually expired.',
  });
}

export function paymentExpiredMerchantEmail(params: {
  merchantName: string;
  amount: string;
  currency: string;
  orderId: string | null;
  paymentId: string;
}) {
  const reference = params.orderId ?? params.paymentId;

  return renderEmail({
    subject: `Checkout expired - ${params.amount} ${params.currency}`,
    preheader: `The checkout session for ${reference} has expired.`,
    title: 'Checkout expired',
    greeting: `Hi ${params.merchantName},`,
    paragraphs: [
      'A checkout session reached its time limit and is no longer payable.',
      `Amount: ${params.amount} ${params.currency}`,
      `Reference: ${reference}`,
      `Payment ID: ${params.paymentId}`,
    ],
    footerNote: 'You can generate a new link from your dashboard if needed.',
  });
}
