import { NextResponse } from "next/server";
import { createImpersonationToken } from "@/lib/super-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const token = await createImpersonationToken(userId);

    return NextResponse.json({
      success: true,
      token,
      // The frontend should redirect to Clerk's sign-in with this token
      signInUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sign-in#__clerk_ticket=${token}`,
    });
  } catch (error) {
    console.error("Error creating impersonation token:", error);

    if (error instanceof Error) {
      if (error.message === "Forbidden: Super admin access required") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    return NextResponse.json(
      { error: "Failed to create impersonation token" },
      { status: 500 }
    );
  }
}
