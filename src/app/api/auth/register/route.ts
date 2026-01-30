import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { supabaseUserId, email, name, organizationName } = body;

    if (!supabaseUserId || !email || !name || !organizationName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create slug from organization name
    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    });

    const finalSlug = existingOrg
      ? `${slug}-${Date.now().toString(36)}`
      : slug;

    // Create organization and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug: finalSlug,
        },
      });

      const user = await tx.user.create({
        data: {
          supabaseUserId,
          email,
          name,
          role: "ADMIN",
          organizationId: organization.id,
        },
      });

      // Create default step templates
      const defaultSteps = [
        { stepNumber: 1, name: "Step 1 - Verbal", description: "Initial verbal grievance with supervisor", defaultDays: 5 },
        { stepNumber: 2, name: "Step 2 - Written", description: "Written grievance to department head", defaultDays: 10 },
        { stepNumber: 3, name: "Step 3 - Formal", description: "Formal grievance meeting", defaultDays: 15 },
        { stepNumber: 4, name: "Step 4 - Arbitration", description: "Binding arbitration", defaultDays: 30 },
      ];

      await tx.stepTemplate.createMany({
        data: defaultSteps.map((step) => ({
          ...step,
          organizationId: organization.id,
        })),
      });

      return { organization, user };
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to complete registration" },
      { status: 500 }
    );
  }
}
