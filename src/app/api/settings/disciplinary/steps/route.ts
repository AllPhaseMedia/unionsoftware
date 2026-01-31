import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { disciplinaryStepTemplateSchema } from "@/lib/validations";

export async function GET() {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const steps = await prisma.disciplinaryStepTemplate.findMany({
      where: { organizationId: dbUser.organizationId },
      orderBy: { stepNumber: "asc" },
    });

    return NextResponse.json({ success: true, data: steps });
  } catch (error) {
    console.error("Error fetching disciplinary step templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch step templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = disciplinaryStepTemplateSchema.parse(body);

    const step = await prisma.disciplinaryStepTemplate.create({
      data: {
        organizationId: dbUser.organizationId,
        stepNumber: validatedData.stepNumber,
        name: validatedData.name,
        description: validatedData.description || null,
        defaultDeadlineDays: validatedData.defaultDeadlineDays || null,
        isActive: validatedData.isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, data: step }, { status: 201 });
  } catch (error) {
    console.error("Error creating disciplinary step template:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create step template" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Step ID required" }, { status: 400 });
    }

    // Verify step belongs to the organization
    const existingStep = await prisma.disciplinaryStepTemplate.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!existingStep) {
      return NextResponse.json({ error: "Step template not found" }, { status: 404 });
    }

    const validatedData = disciplinaryStepTemplateSchema.parse(data);

    const step = await prisma.disciplinaryStepTemplate.update({
      where: { id },
      data: {
        stepNumber: validatedData.stepNumber,
        name: validatedData.name,
        description: validatedData.description || null,
        defaultDeadlineDays: validatedData.defaultDeadlineDays || null,
        isActive: validatedData.isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, data: step });
  } catch (error) {
    console.error("Error updating disciplinary step template:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update step template" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Step ID required" }, { status: 400 });
    }

    // Verify step belongs to the organization
    const existingStep = await prisma.disciplinaryStepTemplate.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!existingStep) {
      return NextResponse.json({ error: "Step template not found" }, { status: 404 });
    }

    await prisma.disciplinaryStepTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting disciplinary step template:", error);
    return NextResponse.json(
      { error: "Failed to delete step template" },
      { status: 500 }
    );
  }
}
