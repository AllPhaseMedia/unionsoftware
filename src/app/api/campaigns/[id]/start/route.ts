import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// POST /api/campaigns/[id]/start - Start campaign (generate recipients if needed)
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

    if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: "Campaign must be in DRAFT or SCHEDULED status to start" },
        { status: 400 }
      );
    }

    // Check if recipients exist
    let recipientCount = await prisma.campaignEmail.count({
      where: { campaignId: id },
    });

    // Generate recipients if none exist
    if (recipientCount === 0) {
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

      const members = await prisma.member.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      const validMembers = members.filter(m => m.email && m.email.includes("@"));

      if (validMembers.length === 0) {
        return NextResponse.json(
          { error: "No members with valid email addresses match the criteria" },
          { status: 400 }
        );
      }

      await prisma.campaignEmail.createMany({
        data: validMembers.map(member => ({
          campaignId: id,
          memberId: member.id,
          recipientEmail: member.email!,
          recipientName: `${member.firstName} ${member.lastName}`,
          status: "PENDING",
        })),
      });

      recipientCount = validMembers.length;
    }

    // Update campaign status
    const updatedCampaign = await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: "SENDING",
        startedAt: new Date(),
        totalRecipients: recipientCount,
        sentCount: 0,
        failedCount: 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedCampaign,
      message: `Campaign started with ${recipientCount} recipients`,
    });
  } catch (error) {
    console.error("Error starting campaign:", error);
    return NextResponse.json(
      { error: "Failed to start campaign" },
      { status: 500 }
    );
  }
}
