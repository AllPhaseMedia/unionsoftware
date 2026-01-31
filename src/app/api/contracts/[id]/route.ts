import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { contractApiSchema } from "@/lib/validations";

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

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
      include: {
        articles: {
          orderBy: { articleNumber: "asc" },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: contract });
  } catch (error) {
    console.error("Error fetching contract:", error);
    return NextResponse.json(
      { error: "Failed to fetch contract" },
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

    // Verify contract belongs to organization
    const existingContract = await prisma.contract.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!existingContract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = contractApiSchema.parse(body);

    const contract = await prisma.contract.update({
      where: { id },
      data: {
        name: validatedData.name,
        effectiveDate: validatedData.effectiveDate,
        expirationDate: validatedData.expirationDate,
        fileUrl: validatedData.fileUrl || null,
        isActive: validatedData.isActive,
      },
      include: {
        articles: {
          orderBy: { articleNumber: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: contract });
  } catch (error) {
    console.error("Error updating contract:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update contract" },
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

    // Verify contract belongs to organization
    const existingContract = await prisma.contract.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!existingContract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Check if contract articles are used in any grievances
    const violationsCount = await prisma.grievanceContractViolation.count({
      where: {
        contractArticle: {
          contractId: id,
        },
      },
    });

    if (violationsCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete contract with articles referenced in grievances" },
        { status: 400 }
      );
    }

    // Delete contract (cascades to articles)
    await prisma.contract.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contract:", error);
    return NextResponse.json(
      { error: "Failed to delete contract" },
      { status: 500 }
    );
  }
}
