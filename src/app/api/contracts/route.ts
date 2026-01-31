import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { contractApiSchema } from "@/lib/validations";

export async function GET() {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contracts = await prisma.contract.findMany({
      where: { organizationId: dbUser.organizationId },
      include: {
        articles: {
          orderBy: { articleNumber: "asc" },
        },
      },
      orderBy: { effectiveDate: "desc" },
    });

    return NextResponse.json({ success: true, data: contracts });
  } catch (error) {
    console.error("Error fetching contracts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contracts" },
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
    const validatedData = contractApiSchema.parse(body);

    const contract = await prisma.contract.create({
      data: {
        ...validatedData,
        organizationId: dbUser.organizationId,
      },
      include: { articles: true },
    });

    return NextResponse.json({ success: true, data: contract }, { status: 201 });
  } catch (error) {
    console.error("Error creating contract:", error);
    return NextResponse.json(
      { error: "Failed to create contract" },
      { status: 500 }
    );
  }
}
