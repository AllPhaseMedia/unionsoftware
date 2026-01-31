import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { disciplinarySnippetSchema } from "@/lib/validations";

export async function GET() {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snippets = await prisma.disciplinarySnippet.findMany({
      where: { organizationId: dbUser.organizationId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: snippets });
  } catch (error) {
    console.error("Error fetching disciplinary snippets:", error);
    return NextResponse.json(
      { error: "Failed to fetch snippets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = disciplinarySnippetSchema.parse(body);

    const snippet = await prisma.disciplinarySnippet.create({
      data: {
        organizationId: dbUser.organizationId,
        name: validatedData.name,
        content: validatedData.content,
        category: validatedData.category,
        isActive: validatedData.isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, data: snippet }, { status: 201 });
  } catch (error) {
    console.error("Error creating disciplinary snippet:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create snippet" },
      { status: 500 }
    );
  }
}
