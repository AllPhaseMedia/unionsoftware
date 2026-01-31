import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/super-admin";
import prisma from "@/lib/prisma";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateSchema = z.object({
  plan: z.enum(["free", "starter", "pro", "enterprise"]).optional(),
  maxUsers: z.number().int().min(1).max(1000).optional(),
});

// Get organization details with users
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const isAdmin = await isSuperAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            clerkUserId: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { name: "asc" },
        },
        _count: {
          select: {
            users: true,
            members: true,
            grievances: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...organization,
        userCount: organization._count.users,
        memberCount: organization._count.members,
        grievanceCount: organization._count.grievances,
      },
    });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}

// Update organization plan/limits
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const isAdmin = await isSuperAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    const organization = await prisma.organization.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json({ success: true, data: organization });
  } catch (error) {
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}
