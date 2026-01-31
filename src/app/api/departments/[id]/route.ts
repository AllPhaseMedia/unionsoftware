import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { departmentSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const department = await prisma.department.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: department });
  } catch (error) {
    console.error("Error fetching department:", error);
    return NextResponse.json(
      { error: "Failed to fetch department" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const dbUser = await getAuthUser();

    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify department belongs to organization
    const existingDept = await prisma.department.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!existingDept) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = departmentSchema.parse(body);

    const department = await prisma.department.update({
      where: { id },
      data: {
        name: validatedData.name,
        code: validatedData.code || null,
        commissionerName: validatedData.commissionerName || null,
        isActive: validatedData.isActive,
      },
    });

    return NextResponse.json({ success: true, data: department });
  } catch (error) {
    console.error("Error updating department:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update department" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const dbUser = await getAuthUser();

    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify department belongs to organization
    const existingDept = await prisma.department.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!existingDept) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    // Check if department has members or grievances
    const [membersCount, grievancesCount] = await Promise.all([
      prisma.member.count({ where: { departmentId: id } }),
      prisma.grievance.count({ where: { departmentId: id } }),
    ]);

    if (membersCount > 0 || grievancesCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete department with associated members or grievances" },
        { status: 400 }
      );
    }

    await prisma.department.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting department:", error);
    return NextResponse.json(
      { error: "Failed to delete department" },
      { status: 500 }
    );
  }
}
