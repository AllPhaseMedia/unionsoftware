import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { stepTemplateSchema } from "@/lib/validations";

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

    const step = await prisma.stepTemplate.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!step) {
      return NextResponse.json({ error: "Step template not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: step });
  } catch (error) {
    console.error("Error fetching step template:", error);
    return NextResponse.json(
      { error: "Failed to fetch step template" },
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

    // Verify step belongs to the organization
    const existingStep = await prisma.stepTemplate.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!existingStep) {
      return NextResponse.json({ error: "Step template not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = stepTemplateSchema.parse(body);

    const step = await prisma.stepTemplate.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json({ success: true, data: step });
  } catch (error) {
    console.error("Error updating step template:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update step template" },
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

    // Verify step belongs to the organization
    const existingStep = await prisma.stepTemplate.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!existingStep) {
      return NextResponse.json({ error: "Step template not found" }, { status: 404 });
    }

    await prisma.stepTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting step template:", error);
    return NextResponse.json(
      { error: "Failed to delete step template" },
      { status: 500 }
    );
  }
}
