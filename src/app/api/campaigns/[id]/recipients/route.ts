import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// GET /api/campaigns/[id]/recipients - List recipients with status
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    // Verify campaign belongs to organization
    const campaign = await prisma.emailCampaign.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const where = {
      campaignId: id,
      ...(status && { status: status as "PENDING" | "SENDING" | "SENT" | "FAILED" | "SKIPPED" }),
    };

    const [emails, total] = await Promise.all([
      prisma.campaignEmail.findMany({
        where,
        select: {
          id: true,
          recipientEmail: true,
          recipientName: true,
          status: true,
          sentAt: true,
          errorMessage: true,
          retryCount: true,
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: [
          { status: "asc" },
          { recipientName: "asc" },
        ],
        skip,
        take: limit,
      }),
      prisma.campaignEmail.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching recipients:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipients" },
      { status: 500 }
    );
  }
}

// POST /api/campaigns/[id]/recipients - Generate recipient list from criteria
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

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

    if (campaign.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Can only generate recipients for draft campaigns" },
        { status: 400 }
      );
    }

    // Build member query from criteria
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

    // Get matching members
    const members = await prisma.member.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    // Filter out members without valid emails
    const validMembers = members.filter(m => m.email && m.email.includes("@"));

    if (validMembers.length === 0) {
      return NextResponse.json(
        { error: "No members with valid email addresses match the criteria" },
        { status: 400 }
      );
    }

    // Delete existing campaign emails (regenerating)
    await prisma.campaignEmail.deleteMany({
      where: { campaignId: id },
    });

    // Create campaign emails
    await prisma.campaignEmail.createMany({
      data: validMembers.map(member => ({
        campaignId: id,
        memberId: member.id,
        recipientEmail: member.email!,
        recipientName: `${member.firstName} ${member.lastName}`,
        status: "PENDING",
      })),
    });

    // Update campaign total recipients
    await prisma.emailCampaign.update({
      where: { id },
      data: {
        totalRecipients: validMembers.length,
        sentCount: 0,
        failedCount: 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalRecipients: validMembers.length,
        message: `Generated ${validMembers.length} recipients`,
      },
    });
  } catch (error) {
    console.error("Error generating recipients:", error);
    return NextResponse.json(
      { error: "Failed to generate recipients" },
      { status: 500 }
    );
  }
}
