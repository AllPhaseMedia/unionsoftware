import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { stepTemplateSchema } from "@/lib/validations";

export async function GET() {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const steps = await prisma.stepTemplate.findMany({
      where: { organizationId: dbUser.organizationId },
      orderBy: { stepNumber: "asc" },
    });

    return NextResponse.json({ success: true, data: steps });
  } catch (error) {
    console.error("Error fetching step templates:", error);
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
    const validatedData = stepTemplateSchema.parse(body);

    const step = await prisma.stepTemplate.create({
      data: {
        ...validatedData,
        organizationId: dbUser.organizationId,
      },
    });

    return NextResponse.json({ success: true, data: step }, { status: 201 });
  } catch (error) {
    console.error("Error creating step template:", error);
    return NextResponse.json(
      { error: "Failed to create step template" },
      { status: 500 }
    );
  }
}
