import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { pdfTemplateSchema } from "@/lib/validations";

export async function GET() {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.pdfTemplate.findMany({
      where: { organizationId: dbUser.organizationId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error("Error fetching PDF templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch PDF templates" },
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
    const validatedData = pdfTemplateSchema.parse(body);

    const template = await prisma.pdfTemplate.create({
      data: {
        ...validatedData,
        organizationId: dbUser.organizationId,
      },
    });

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error) {
    console.error("Error creating PDF template:", error);
    return NextResponse.json(
      { error: "Failed to create PDF template" },
      { status: 500 }
    );
  }
}
