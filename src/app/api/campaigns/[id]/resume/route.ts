import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// POST /api/campaigns/[id]/resume - Resume paused campaign
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

    if (campaign.status !== "PAUSED") {
      return NextResponse.json(
        { error: "Only PAUSED campaigns can be resumed" },
        { status: 400 }
      );
    }

    // Check if there are pending emails
    const pendingCount = await prisma.campaignEmail.count({
      where: {
        campaignId: id,
        status: "PENDING",
      },
    });

    if (pendingCount === 0) {
      // No pending emails - complete the campaign
      const completedCampaign = await prisma.emailCampaign.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: completedCampaign,
        message: "Campaign completed - no pending emails remaining",
      });
    }

    // Update campaign status
    const updatedCampaign = await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: "SENDING",
        pausedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedCampaign,
      message: `Campaign resumed with ${pendingCount} pending emails`,
    });
  } catch (error) {
    console.error("Error resuming campaign:", error);
    return NextResponse.json(
      { error: "Failed to resume campaign" },
      { status: 500 }
    );
  }
}
