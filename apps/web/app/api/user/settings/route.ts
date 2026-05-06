import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const privyDid = searchParams.get("privyDid");

  if (!privyDid) {
    return NextResponse.json({ error: "privyDid is required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { privyDid },
      select: { email: true, emailNotifications: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to fetch user settings:", error);
    return NextResponse.json({ error: "Failed to fetch user settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { privyDid, email, emailNotifications } = body;

    if (!privyDid) {
      return NextResponse.json({ error: "privyDid is required" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { privyDid },
      data: {
        ...(email !== undefined && { email }),
        ...(emailNotifications !== undefined && { emailNotifications }),
      },
    });

    return NextResponse.json({ email: user.email, emailNotifications: user.emailNotifications });
  } catch (error) {
    console.error("Failed to update user settings:", error);
    return NextResponse.json({ error: "Failed to update user settings" }, { status: 500 });
  }
}
