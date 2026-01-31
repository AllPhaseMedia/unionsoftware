import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { customFieldSchema } from "@/lib/validations";

export async function GET() {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fields = await prisma.customField.findMany({
      where: { organizationId: dbUser.organizationId },
      orderBy: [{ entityType: "asc" }, { displayOrder: "asc" }],
    });

    return NextResponse.json({ success: true, data: fields });
  } catch (error) {
    console.error("Error fetching custom fields:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom fields" },
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
    const validatedData = customFieldSchema.parse(body);

    const field = await prisma.customField.create({
      data: {
        entityType: validatedData.entityType,
        fieldName: validatedData.fieldName,
        fieldLabel: validatedData.fieldLabel,
        fieldType: validatedData.fieldType,
        options: validatedData.options as string[] | undefined,
        isRequired: validatedData.isRequired,
        displayOrder: validatedData.displayOrder,
        isActive: validatedData.isActive,
        organizationId: dbUser.organizationId,
      },
    });

    return NextResponse.json({ success: true, data: field }, { status: 201 });
  } catch (error) {
    console.error("Error creating custom field:", error);
    return NextResponse.json(
      { error: "Failed to create custom field" },
      { status: 500 }
    );
  }
}
