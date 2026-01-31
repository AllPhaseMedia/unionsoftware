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

    // Only admins can create users directly
    if (dbUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can create users" },
        { status: 403 }
      );
    }

    const { email, name, password, role } = await request.json();

    if (!email || !name || !password || !role) {
      return NextResponse.json(
        { error: "Email, name, password, and role are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
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

    // Create user in Supabase using admin client
    const adminClient = createAdminClient();
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation
    });

    if (authError) {
      // Check if user exists in Supabase but not in this org
      if (authError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "This email is already registered. Use the invite option instead." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create authentication account" },
        { status: 500 }
      );
    }

    // Create user in our database
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
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
