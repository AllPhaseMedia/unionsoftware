import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { memberSchema } from "@/lib/validations";

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

    const member = await prisma.member.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
      include: {
        department: true,
        grievances: {
          orderBy: { createdAt: "desc" },
        },
        notes: {
          include: { user: true },
          orderBy: { createdAt: "desc" },
        },
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: member });
  } catch (error) {
    console.error("Error fetching member:", error);
    return NextResponse.json(
      { error: "Failed to fetch member" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify member belongs to the organization
    const existingMember = await prisma.member.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!existingMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = memberSchema.parse(body);

    const member = await prisma.member.update({
      where: { id },
      data: {
        memberId: validatedData.memberId || null,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email || null,
        homePhone: validatedData.homePhone || null,
        cellPhone: validatedData.cellPhone || null,
        address: validatedData.address || null,
        city: validatedData.city || null,
        state: validatedData.state || null,
        zipCode: validatedData.zipCode || null,
        dateOfBirth: validatedData.dateOfBirth || null,
        hireDate: validatedData.hireDate || null,
        jobTitle: validatedData.jobTitle || null,
        workLocation: validatedData.workLocation || null,
        departmentId: validatedData.departmentId || null,
        status: validatedData.status,
        employmentType: validatedData.employmentType || null,
        customFields: validatedData.customFields as object | undefined,
      },
      include: { department: true },
    });

    return NextResponse.json({ success: true, data: member });
  } catch (error) {
    console.error("Error updating member:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update member" },
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

    // Verify member belongs to the organization
    const existingMember = await prisma.member.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!existingMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    await prisma.member.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting member:", error);
    return NextResponse.json(
      { error: "Failed to delete member" },
      { status: 500 }
    );
  }
}
