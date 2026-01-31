import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { messageSchema } from "@/lib/validations";

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

    // Verify case belongs to the organization
    const disciplinaryCase = await prisma.disciplinaryCase.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!disciplinaryCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const messages = await prisma.disciplinaryMessage.findMany({
      where: {
        caseId: id,
        parentId: null,
      },
      include: {
        user: true,
        replies: {
          include: { user: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
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

    // Verify case belongs to the organization
    const disciplinaryCase = await prisma.disciplinaryCase.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!disciplinaryCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = messageSchema.parse(body);

    // If replying, verify parent message exists
    if (validatedData.parentId) {
      const parentMessage = await prisma.disciplinaryMessage.findFirst({
        where: {
          id: validatedData.parentId,
          caseId: id,
        },
      });

      if (!parentMessage) {
        return NextResponse.json({ error: "Parent message not found" }, { status: 404 });
      }
    }

    const message = await prisma.disciplinaryMessage.create({
      data: {
        caseId: id,
        userId: dbUser.id,
        content: validatedData.content,
        parentId: validatedData.parentId || null,
      },
      include: { user: true },
    });

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    console.error("Error creating message:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
