import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { grievanceSchema } from "@/lib/validations";

function generateGrievanceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `GR-${year}-${random}`;
}

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
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const departmentId = searchParams.get("departmentId") || undefined;

    const search = searchParams.get("search") || undefined;

    const grievances = await prisma.grievance.findMany({
      where: {
        organizationId: dbUser.organizationId,
        ...(status && { status: status as "OPEN" | "IN_PROGRESS" | "PENDING_RESPONSE" | "RESOLVED" | "CLOSED" | "WITHDRAWN" }),
        ...(priority && { priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT" }),
        ...(departmentId && { departmentId }),
        ...(search && {
          OR: [
            { grievanceNumber: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      },
      include: {
        member: true,
        representative: true,
        department: true,
        steps: {
          orderBy: { stepNumber: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: grievances });
  } catch (error) {
    console.error("Error fetching grievances:", error);
    return NextResponse.json(
      { error: "Failed to fetch grievances" },
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

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = grievanceSchema.parse(body);

    // Generate unique grievance number
    let grievanceNumber = generateGrievanceNumber();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.grievance.findFirst({
        where: {
          grievanceNumber,
          organizationId: dbUser.organizationId,
        },
      });
      if (!existing) break;
      grievanceNumber = generateGrievanceNumber();
      attempts++;
    }

    // Get step templates for the organization
    const stepTemplates = await prisma.stepTemplate.findMany({
      where: {
        organizationId: dbUser.organizationId,
        isActive: true,
      },
      orderBy: { stepNumber: "asc" },
    });

    // Create grievance with steps and contract violations in a transaction
    const grievance = await prisma.$transaction(async (tx) => {
      const newGrievance = await tx.grievance.create({
        data: {
          grievanceNumber,
          organizationId: dbUser.organizationId,
          createdById: dbUser.id,
          memberId: validatedData.memberId || null,
          representativeId: validatedData.representativeId || null,
          departmentId: validatedData.departmentId || null,
          description: validatedData.description,
          reliefRequested: validatedData.reliefRequested || null,
          memberJobTitle: validatedData.memberJobTitle || null,
          commissionerName: validatedData.commissionerName || null,
          priority: validatedData.priority,
          filingDate: validatedData.filingDate,
          customFields: validatedData.customFields as object | undefined,
        },
        include: {
          member: true,
          representative: true,
          department: true,
        },
      });

      // Create steps from templates with cascading deadlines
      // Each step's deadline is calculated from the previous step's deadline
      if (stepTemplates.length > 0) {
        const filingDate = new Date(validatedData.filingDate);
        const stepsData = [];
        let previousDeadline = filingDate;

        for (const template of stepTemplates) {
          let deadline: Date | null = null;

          if (template.defaultDays) {
            // Calculate deadline from the previous step's deadline (or filing date for step 1)
            deadline = new Date(previousDeadline.getTime() + template.defaultDays * 24 * 60 * 60 * 1000);
            previousDeadline = deadline;
          }

          stepsData.push({
            grievanceId: newGrievance.id,
            stepNumber: template.stepNumber,
            name: template.name,
            description: template.description,
            deadline,
          });
        }

        await tx.grievanceStep.createMany({
          data: stepsData,
        });
      }

      // Create contract violations if article IDs provided
      if (validatedData.contractArticleIds && validatedData.contractArticleIds.length > 0) {
        await tx.grievanceContractViolation.createMany({
          data: validatedData.contractArticleIds.map((articleId) => ({
            grievanceId: newGrievance.id,
            contractArticleId: articleId,
          })),
        });
      }

      return newGrievance;
    });

    return NextResponse.json({ success: true, data: grievance }, { status: 201 });
  } catch (error) {
    console.error("Error creating grievance:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create grievance" },
      { status: 500 }
    );
  }
}
