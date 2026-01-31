import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { format } from "date-fns";

// Template variable replacements
function replaceTemplateVariables(template: string, data: Record<string, unknown>): string {
  let result = template;

  result = result.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split(".");
    let value: unknown = data;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return match;
      }
    }

    if (value instanceof Date) {
      return format(value, "MMMM d, yyyy");
    }

    return String(value ?? "");
  });

  return result;
}

// POST /api/campaigns/[id]/preview - Preview email for a sample member
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { memberId } = body;

    // Get campaign
    const campaign = await prisma.emailCampaign.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get member for preview (use provided or first matching member)
    let member;
    if (memberId) {
      member = await prisma.member.findFirst({
        where: {
          id: memberId,
          organizationId: dbUser.organizationId,
        },
        include: { department: true },
      });
    } else {
      // Get a sample member based on target criteria
      const criteria = campaign.targetCriteria as {
        departments?: string[];
        statuses?: string[];
        employmentTypes?: string[];
      } | null;

      const where: Record<string, unknown> = {
        organizationId: dbUser.organizationId,
        email: { not: null },
      };

      if (criteria?.departments?.length) {
        where.departmentId = { in: criteria.departments };
      }
      if (criteria?.statuses?.length) {
        where.status = { in: criteria.statuses };
      }
      if (criteria?.employmentTypes?.length) {
        where.employmentType = { in: criteria.employmentTypes };
      }

      member = await prisma.member.findFirst({
        where,
        include: { department: true },
      });
    }

    if (!member) {
      return NextResponse.json(
        { error: "No matching member found for preview" },
        { status: 404 }
      );
    }

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { id: dbUser.organizationId },
    });

    // Build template data
    const templateData: Record<string, unknown> = {
      member: {
        name: `${member.firstName} ${member.lastName}`,
        first_name: member.firstName,
        last_name: member.lastName,
        email: member.email || "",
        job_title: member.jobTitle || "",
        department: member.department?.name || "",
        hire_date: member.hireDate,
        status: member.status,
      },
      organization: {
        name: organization?.name || "",
      },
      current_date: new Date(),
    };

    // Replace variables
    const previewSubject = replaceTemplateVariables(campaign.subject, templateData);
    const previewBody = replaceTemplateVariables(campaign.body, templateData);

    return NextResponse.json({
      success: true,
      data: {
        subject: previewSubject,
        body: previewBody,
        recipient: {
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
        },
        templateData,
      },
    });
  } catch (error) {
    console.error("Error previewing campaign:", error);
    return NextResponse.json(
      { error: "Failed to preview campaign" },
      { status: 500 }
    );
  }
}
