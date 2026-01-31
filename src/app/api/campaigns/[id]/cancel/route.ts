import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// POST /api/campaigns/[id]/cancel - Cancel campaign
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

    if (campaign.status === "COMPLETED" || campaign.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Campaign is already completed or cancelled" },
        { status: 400 }
      );
    }

    // Mark all pending emails as skipped
    await prisma.campaignEmail.updateMany({
      where: {
        campaignId: id,
        status: "PENDING",
      },
      data: {
        status: "SKIPPED",
      },
    });

    // Update campaign status
    const updatedCampaign = await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedCampaign,
      message: "Campaign cancelled",
    });
  } catch (error) {
    console.error("Error cancelling campaign:", error);
    return NextResponse.json(
      { error: "Failed to cancel campaign" },
      { status: 500 }
    );
  }
}
