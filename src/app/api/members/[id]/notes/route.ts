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

    // Verify member belongs to the organization
    const member = await prisma.member.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const notes = await prisma.memberNote.findMany({
      where: { memberId: id },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    console.error("Error fetching member notes:", error);
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

    // Verify member belongs to the organization
    const member = await prisma.member.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = noteSchema.parse(body);

    const note = await prisma.memberNote.create({
      data: {
        memberId: id,
        userId: dbUser.id,
        content: validatedData.content,
      },
      include: { user: true },
    });

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error) {
    console.error("Error creating member note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}
