import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { disciplinaryUpdateApiSchema } from "@/lib/validations";

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

    const disciplinaryCase = await prisma.disciplinaryCase.findFirst({
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
          include: { completedBy: true },
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

    if (!disciplinaryCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: disciplinaryCase });
  } catch (error) {
    console.error("Error fetching disciplinary case:", error);
    return NextResponse.json(
      { error: "Failed to fetch disciplinary case" },
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

    // Verify case belongs to the organization
    const existingCase = await prisma.disciplinaryCase.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!existingCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = disciplinaryUpdateApiSchema.parse(body);

    const disciplinaryCase = await prisma.disciplinaryCase.update({
      where: { id },
      data: {
        memberId: validatedData.memberId || null,
        representativeId: validatedData.representativeId || null,
        departmentId: validatedData.departmentId || null,
        type: validatedData.type,
        description: validatedData.description,
        incidentDate: validatedData.incidentDate || null,
        memberJobTitle: validatedData.memberJobTitle || null,
        supervisorName: validatedData.supervisorName || null,
        status: validatedData.status,
        priority: validatedData.priority,
        outcome: validatedData.outcome || null,
        outcomeNotes: validatedData.outcomeNotes || null,
        filingDate: validatedData.filingDate,
        customFields: validatedData.customFields as object | undefined,
      },
      include: {
        member: true,
        representative: true,
        department: true,
      },
    });

    return NextResponse.json({ success: true, data: disciplinaryCase });
  } catch (error) {
    console.error("Error updating disciplinary case:", error);
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as unknown as { issues: Array<{ path: string[]; message: string }> };
      const details = zodError.issues?.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      return NextResponse.json({ error: `Invalid data: ${details}` }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update disciplinary case" },
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

    // Verify case belongs to the organization
    const existingCase = await prisma.disciplinaryCase.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!existingCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    await prisma.disciplinaryCase.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting disciplinary case:", error);
    return NextResponse.json(
      { error: "Failed to delete disciplinary case" },
      { status: 500 }
    );
  }
}
