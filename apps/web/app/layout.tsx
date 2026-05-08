import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans, Source_Code_Pro } from "next/font/google";
import { CustomCursor } from "./components/CustomCursor";
import { Providers } from "./providers";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

const sourceCode = Source_Code_Pro({
  subsets: ["latin"],
  variable: "--font-code",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Treasurix — Private business payments on Solana",
  description:
    "Your money behaves the way you planned—allocated as intended, privately executed, and governed by your rules. Built on Cloak.",
  openGraph: {
    title: "Treasurix",
    description:
      "Private payment infrastructure on Solana — shielded checkout, treasury operations, and webhook-driven settlement.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className="bg-canvas dark" suppressHydrationWarning>
      <body
        className={`${sans.variable} ${display.variable} ${mono.variable} ${sourceCode.variable} min-h-screen antialiased transition-colors duration-300`}
      >
        <Providers key={process.env.NEXT_PUBLIC_PRIVY_APP_ID}>
          <CustomCursor />
          {children}
        </Providers>
      </body>
    </html>
  );
}
