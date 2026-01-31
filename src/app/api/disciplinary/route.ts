import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { disciplinaryApiSchema } from "@/lib/validations";

interface CaseNumberSettings {
  prefix: string;
  includeYear: boolean;
  separator: string;
  nextNumber: number;
  padding: number;
}

const DEFAULT_CASE_NUMBER_SETTINGS: CaseNumberSettings = {
  prefix: "DC",
  includeYear: true,
  separator: "-",
  nextNumber: 1,
  padding: 4,
};

async function getCaseNumberSettings(organizationId: string): Promise<CaseNumberSettings> {
  const settings = await prisma.systemSetting.findMany({
    where: {
      organizationId,
      key: { startsWith: "disciplinaryCaseNumber." },
    },
  });

  const caseNumberSettings: CaseNumberSettings = { ...DEFAULT_CASE_NUMBER_SETTINGS };

  for (const setting of settings) {
    const key = setting.key.replace("disciplinaryCaseNumber.", "");
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

async function generateCaseNumber(organizationId: string): Promise<string> {
  const settings = await getCaseNumberSettings(organizationId);
  const { prefix, includeYear, separator, nextNumber, padding } = settings;
  const year = String(new Date().getFullYear()).slice(-2); // 2-digit year
  const paddedNumber = String(nextNumber).padStart(padding, "0");

  // Increment the next number for future use
  await prisma.systemSetting.upsert({
    where: {
      key_organizationId: {
        key: "disciplinaryCaseNumber.nextNumber",
        organizationId,
      },
    },
    update: { value: String(nextNumber + 1) },
    create: {
      key: "disciplinaryCaseNumber.nextNumber",
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
    const type = searchParams.get("type") || undefined;
    const departmentId = searchParams.get("departmentId") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const skip = (page - 1) * limit;

    const where = {
      organizationId: dbUser.organizationId,
      ...(status && { status: status as "OPEN" | "IN_PROGRESS" | "PENDING_REVIEW" | "RESOLVED" | "CLOSED" }),
      ...(priority && { priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT" }),
      ...(type && { type: type as "ATTENDANCE" | "PERFORMANCE" | "CONDUCT" | "POLICY_VIOLATION" | "SAFETY" | "OTHER" }),
      ...(departmentId && { departmentId }),
      ...(search && {
        OR: [
          { caseNumber: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    // Run count and data queries in parallel
    const [cases, total] = await Promise.all([
      prisma.disciplinaryCase.findMany({
        where,
        select: {
          id: true,
          caseNumber: true,
          description: true,
          type: true,
          status: true,
          priority: true,
          filingDate: true,
          incidentDate: true,
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
      prisma.disciplinaryCase.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: cases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching disciplinary cases:", error);
    return NextResponse.json(
      { error: "Failed to fetch disciplinary cases" },
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
    const validatedData = disciplinaryApiSchema.parse(body);

    // Generate unique case number using organization settings
    let caseNumber = await generateCaseNumber(dbUser.organizationId);
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.disciplinaryCase.findFirst({
        where: {
          caseNumber,
          organizationId: dbUser.organizationId,
        },
      });
      if (!existing) break;
      caseNumber = await generateCaseNumber(dbUser.organizationId);
      attempts++;
    }

    // Get step templates for the organization
    const stepTemplates = await prisma.disciplinaryStepTemplate.findMany({
      where: {
        organizationId: dbUser.organizationId,
        isActive: true,
      },
      orderBy: { stepNumber: "asc" },
    });

    // Create case with steps and contract violations in a transaction
    const disciplinaryCase = await prisma.$transaction(async (tx) => {
      const newCase = await tx.disciplinaryCase.create({
        data: {
          caseNumber,
          organizationId: dbUser.organizationId,
          createdById: dbUser.id,
          memberId: validatedData.memberId || null,
          representativeId: validatedData.representativeId || null,
          departmentId: validatedData.departmentId || null,
          type: validatedData.type,
          description: validatedData.description,
          incidentDate: validatedData.incidentDate || null,
          memberJobTitle: validatedData.memberJobTitle || null,
          supervisorName: validatedData.supervisorName || null,
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
      if (stepTemplates.length > 0) {
        const filingDate = new Date(validatedData.filingDate);
        const stepsData = [];
        let previousDeadline = filingDate;

        for (const template of stepTemplates) {
          let deadline: Date | null = null;

          if (template.defaultDeadlineDays) {
            deadline = new Date(previousDeadline.getTime() + template.defaultDeadlineDays * 24 * 60 * 60 * 1000);
            previousDeadline = deadline;
          }

          stepsData.push({
            caseId: newCase.id,
            stepNumber: template.stepNumber,
            name: template.name,
            description: template.description,
            deadline,
          });
        }

        await tx.disciplinaryStep.createMany({
          data: stepsData,
        });
      }

      // Create contract violations if article IDs provided
      if (validatedData.contractArticleIds && validatedData.contractArticleIds.length > 0) {
        await tx.disciplinaryContractViolation.createMany({
          data: validatedData.contractArticleIds.map((articleId) => ({
            caseId: newCase.id,
            contractArticleId: articleId,
          })),
        });
      }

      return newCase;
    });

    return NextResponse.json({ success: true, data: disciplinaryCase }, { status: 201 });
  } catch (error) {
    console.error("Error creating disciplinary case:", error);
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as unknown as { issues: Array<{ path: string[]; message: string }> };
      const details = zodError.issues?.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      return NextResponse.json({ error: `Invalid data: ${details}` }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create disciplinary case" },
      { status: 500 }
    );
  }
}
