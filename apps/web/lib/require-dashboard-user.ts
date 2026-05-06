import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { prisma } from "@/lib/prisma";

/** Privy JWT → internal Treasurix `users.id` (for dashboard session APIs). */
export async function requireUserFromBearer(request: Request) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return { error: NextResponse.json({ error: "Missing bearer token" }, { status: 401 }) };
  }

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const secret = process.env.PRIVY_APP_SECRET;
  if (!appId || !secret) {
    return { error: NextResponse.json({ error: "Privy not configured on server" }, { status: 500 }) };
  }

  const privy = new PrivyClient(appId, secret);
  let claims: { userId: string };
  try {
    claims = await privy.verifyAuthToken(token);
  } catch {
    return { error: NextResponse.json({ error: "Invalid or expired token" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { privyDid: claims.userId },
    select: { id: true },
  });

  if (!user) {
    return { error: NextResponse.json({ error: "User not found; sync auth first" }, { status: 404 }) };
  }

  return { userId: user.id };
}
