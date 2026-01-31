import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can invite users
    if (dbUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can invite users" },
        { status: 403 }
      );
    }

    const { email, name, role } = await request.json();

    if (!email || !name || !role) {
      return NextResponse.json(
        { error: "Email, name, and role are required" },
        { status: 400 }
      );
    }

    // Check if user already exists in this organization
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        organizationId: dbUser.organizationId,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists in your organization" },
        { status: 400 }
      );
    }

    // Get the app URL for the redirect
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Send invitation email using Supabase
    const adminClient = createAdminClient();
    const { data: authData, error: authError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl}/auth/callback`,
      data: {
        name,
        role,
        organizationId: dbUser.organizationId,
      },
    });

    if (authError) {
      // If user already exists in Supabase, we can still add them to this org
      if (authError.message.includes("already been registered")) {
        // Check if there's an existing Supabase user
        const { data: existingAuthUsers } = await adminClient.auth.admin.listUsers();
        const existingAuthUser = existingAuthUsers?.users?.find(u => u.email === email);

        if (existingAuthUser) {
          // Create user in our database linked to existing Supabase user
          const newUser = await prisma.user.create({
            data: {
              supabaseUserId: existingAuthUser.id,
              email,
              name,
              role,
              organizationId: dbUser.organizationId,
              isActive: true,
            },
          });

          return NextResponse.json({
            success: true,
            data: newUser,
            message: "User added to organization. They can sign in with their existing password.",
          });
        }
      }

      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to send invitation" },
        { status: 500 }
      );
    }

    // Create user in our database (they'll be able to log in after accepting invitation)
    const newUser = await prisma.user.create({
      data: {
        supabaseUserId: authData.user.id,
        email,
        name,
        role,
        organizationId: dbUser.organizationId,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: newUser,
      message: "Invitation sent successfully",
    });
  } catch (error) {
    console.error("Error inviting user:", error);
    return NextResponse.json(
      { error: "Failed to invite user" },
      { status: 500 }
    );
  }
}
