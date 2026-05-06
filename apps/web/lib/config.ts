export const config = {
  smtpEnabled: process.env.SMTP_ENABLED !== "false", // enabled by default
  smtpHost: process.env.SMTP_HOST || "smtp.example.com",
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || `Treasurix <${process.env.EMAIL_ADDRESS}>`,
  smtpSendTimeoutMs: 5000,
  webOrigin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
};
