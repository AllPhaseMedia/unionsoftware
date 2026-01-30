import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const snippetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  content: z.string().min(1, "Content is required"),
  category: z.enum(["DESCRIPTION", "RELIEF_REQUESTED"]),
  isActive: z.boolean().default(true),
});

export async function GET(request: Request) {
  try {
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const snippets = await prisma.textSnippet.findMany({
      where: {
        organizationId: dbUser.organizationId,
        ...(category && { category: category as "DESCRIPTION" | "RELIEF_REQUESTED" }),
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: snippets });
  } catch (error) {
    console.error("Error fetching snippets:", error);
    return NextResponse.json(
      { error: "Failed to fetch snippets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const validatedData = snippetSchema.parse(body);

    const snippet = await prisma.textSnippet.create({
      data: {
        ...validatedData,
        organizationId: dbUser.organizationId,
      },
    });

    return NextResponse.json({ success: true, data: snippet }, { status: 201 });
  } catch (error) {
    console.error("Error creating snippet:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create snippet" },
      { status: 500 }
    );
  }
}
