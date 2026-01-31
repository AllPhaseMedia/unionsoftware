import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can update users
    if (dbUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can update users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, role, isActive } = body;

    // Verify the user belongs to the same organization
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent admin from demoting themselves if they're the last admin
    if (existingUser.id === dbUser.id && role !== "ADMIN") {
      const adminCount = await prisma.user.count({
        where: {
          organizationId: dbUser.organizationId,
          role: "ADMIN",
          isActive: true,
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot demote the only admin. Promote another user first." },
          { status: 400 }
        );
      }
    }

    // Prevent admin from deactivating themselves if they're the last admin
    if (existingUser.id === dbUser.id && isActive === false) {
      const adminCount = await prisma.user.count({
        where: {
          organizationId: dbUser.organizationId,
          role: "ADMIN",
          isActive: true,
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot deactivate the only admin. Promote another user first." },
          { status: 400 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        role,
        isActive,
      },
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can delete users
    if (dbUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can delete users" },
        { status: 403 }
      );
    }

    // Verify the user belongs to the same organization
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent admin from deleting themselves
    if (existingUser.id === dbUser.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
