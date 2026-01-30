import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { grievanceUpdateSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const grievance = await prisma.grievance.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
      include: {
        member: true,
        representative: true,
        createdBy: true,
        department: true,
        steps: {
          orderBy: { stepNumber: "asc" },
        },
        notes: {
          include: { user: true },
          orderBy: { createdAt: "desc" },
        },
        messages: {
          include: {
            user: true,
            replies: {
              include: { user: true },
            },
          },
          where: { parentId: null },
          orderBy: { createdAt: "asc" },
        },
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
        contractViolations: {
          include: {
            contractArticle: {
              include: { contract: true },
            },
          },
        },
      },
    });

    if (!grievance) {
      return NextResponse.json({ error: "Grievance not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: grievance });
  } catch (error) {
    console.error("Error fetching grievance:", error);
    return NextResponse.json(
      { error: "Failed to fetch grievance" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify grievance belongs to the organization
    const existingGrievance = await prisma.grievance.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!existingGrievance) {
      return NextResponse.json({ error: "Grievance not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = grievanceUpdateSchema.parse(body);

    const grievance = await prisma.grievance.update({
      where: { id },
      data: {
        memberId: validatedData.memberId || null,
        representativeId: validatedData.representativeId || null,
        departmentId: validatedData.departmentId || null,
        description: validatedData.description,
        reliefRequested: validatedData.reliefRequested || null,
        memberJobTitle: validatedData.memberJobTitle || null,
        commissionerName: validatedData.commissionerName || null,
        status: validatedData.status,
        priority: validatedData.priority,
        outcome: validatedData.outcome || null,
        outcomeNotes: validatedData.outcomeNotes || null,
        settlementAmount: validatedData.settlementAmount || null,
        filingDate: validatedData.filingDate,
        customFields: validatedData.customFields as object | undefined,
      },
      include: {
        member: true,
        representative: true,
        department: true,
      },
    });

    return NextResponse.json({ success: true, data: grievance });
  } catch (error) {
    console.error("Error updating grievance:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update grievance" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    });

    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify grievance belongs to the organization
    const existingGrievance = await prisma.grievance.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!existingGrievance) {
      return NextResponse.json({ error: "Grievance not found" }, { status: 404 });
    }

    await prisma.grievance.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting grievance:", error);
    return NextResponse.json(
      { error: "Failed to delete grievance" },
      { status: 500 }
    );
  }
}
