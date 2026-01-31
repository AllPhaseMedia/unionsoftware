import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { noteSchema } from "@/lib/validations";

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

    // Verify grievance belongs to the organization
    const grievance = await prisma.grievance.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!grievance) {
      return NextResponse.json({ error: "Grievance not found" }, { status: 404 });
    }

    const notes = await prisma.grievanceNote.findMany({
      where: { grievanceId: id },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    console.error("Error fetching grievance notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify grievance belongs to the organization
    const grievance = await prisma.grievance.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!grievance) {
      return NextResponse.json({ error: "Grievance not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = noteSchema.parse(body);

    const note = await prisma.grievanceNote.create({
      data: {
        grievanceId: id,
        userId: dbUser.id,
        content: validatedData.content,
        isInternal: validatedData.isInternal || false,
      },
      include: { user: true },
    });

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error) {
    console.error("Error creating grievance note:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}
