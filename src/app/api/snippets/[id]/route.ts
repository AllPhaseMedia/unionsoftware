import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const snippetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  content: z.string().min(1, "Content is required"),
  category: z.enum(["DESCRIPTION", "RELIEF_REQUESTED"]),
  isActive: z.boolean().default(true),
});

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snippet = await prisma.textSnippet.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!snippet) {
      return NextResponse.json({ error: "Snippet not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: snippet });
  } catch (error) {
    console.error("Error fetching snippet:", error);
    return NextResponse.json(
      { error: "Failed to fetch snippet" },
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

    // Verify snippet belongs to organization
    const existingSnippet = await prisma.textSnippet.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!existingSnippet) {
      return NextResponse.json({ error: "Snippet not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = snippetSchema.parse(body);

    const snippet = await prisma.textSnippet.update({
      where: { id },
      data: {
        name: validatedData.name,
        content: validatedData.content,
        category: validatedData.category,
        isActive: validatedData.isActive,
      },
    });

    return NextResponse.json({ success: true, data: snippet });
  } catch (error) {
    console.error("Error updating snippet:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update snippet" },
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

    // Verify snippet belongs to organization
    const existingSnippet = await prisma.textSnippet.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!existingSnippet) {
      return NextResponse.json({ error: "Snippet not found" }, { status: 404 });
    }

    await prisma.textSnippet.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting snippet:", error);
    return NextResponse.json(
      { error: "Failed to delete snippet" },
      { status: 500 }
    );
  }
}
