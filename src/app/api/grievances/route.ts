import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { grievanceApiSchema } from "@/lib/validations";

interface CaseNumberSettings {
  prefix: string;
  includeYear: boolean;
  separator: string;
  nextNumber: number;
  padding: number;
}

const DEFAULT_CASE_NUMBER_SETTINGS: CaseNumberSettings = {
  prefix: "GR",
  includeYear: true,
  separator: "-",
  nextNumber: 1,
  padding: 4,
};

async function getCaseNumberSettings(organizationId: string): Promise<CaseNumberSettings> {
  const settings = await prisma.systemSetting.findMany({
    where: {
      organizationId,
      key: { startsWith: "caseNumber." },
    },
  });

  const caseNumberSettings: CaseNumberSettings = { ...DEFAULT_CASE_NUMBER_SETTINGS };

  for (const setting of settings) {
    const key = setting.key.replace("caseNumber.", "");
    if (key === "includeYear") {
      caseNumberSettings.includeYear = setting.value === "true";
    } else if (key === "nextNumber") {
      caseNumberSettings.nextNumber = parseInt(setting.value, 10);
    } else if (key === "padding") {
      caseNumberSettings.padding = parseInt(setting.value, 10);
    } else if (key === "prefix") {
      caseNumberSettings.prefix = setting.value;
    } else if (key === "separator") {
      caseNumberSettings.separator = setting.value;
    }
  }

  return caseNumberSettings;
}

async function generateGrievanceNumber(organizationId: string): Promise<string> {
  const settings = await getCaseNumberSettings(organizationId);
  const { prefix, includeYear, separator, nextNumber, padding } = settings;
  const year = new Date().getFullYear();
  const paddedNumber = String(nextNumber).padStart(padding, "0");

  // Increment the next number for future use
  await prisma.systemSetting.upsert({
    where: {
      key_organizationId: {
        key: "caseNumber.nextNumber",
        organizationId,
      },
    },
    update: { value: String(nextNumber + 1) },
    create: {
      key: "caseNumber.nextNumber",
      value: String(nextNumber + 1),
      organizationId,
    },
  });

  if (includeYear) {
    return `${prefix}${separator}${year}${separator}${paddedNumber}`;
  }
  return `${prefix}${separator}${paddedNumber}`;
}

export async function GET(request: Request) {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const departmentId = searchParams.get("departmentId") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const skip = (page - 1) * limit;

    const where = {
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
    };

    // Run count and data queries in parallel
    const [grievances, total] = await Promise.all([
      prisma.grievance.findMany({
        where,
        select: {
          id: true,
          grievanceNumber: true,
          description: true,
          status: true,
          priority: true,
          filingDate: true,
          createdAt: true,
          member: { select: { id: true, firstName: true, lastName: true } },
          representative: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          steps: {
            select: { id: true, stepNumber: true, status: true, deadline: true },
            orderBy: { stepNumber: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.grievance.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: grievances,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
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
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = grievanceApiSchema.parse(body);

    // Generate unique grievance number using organization settings
    let grievanceNumber = await generateGrievanceNumber(dbUser.organizationId);
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.grievance.findFirst({
        where: {
          grievanceNumber,
          organizationId: dbUser.organizationId,
        },
      });
      if (!existing) break;
      grievanceNumber = await generateGrievanceNumber(dbUser.organizationId);
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
      const zodError = error as unknown as { issues: Array<{ path: string[]; message: string }> };
      const details = zodError.issues?.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      return NextResponse.json({ error: `Invalid data: ${details}` }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create grievance" },
      { status: 500 }
    );
  }
}
