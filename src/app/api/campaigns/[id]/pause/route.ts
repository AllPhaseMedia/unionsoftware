import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// POST /api/campaigns/[id]/pause - Pause sending campaign
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

    if (campaign.status !== "SENDING") {
      return NextResponse.json(
        { error: "Only campaigns in SENDING status can be paused" },
        { status: 400 }
      );
    }

    // Update campaign status
    const updatedCampaign = await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: "PAUSED",
        pausedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedCampaign,
      message: "Campaign paused",
    });
  } catch (error) {
    console.error("Error pausing campaign:", error);
    return NextResponse.json(
      { error: "Failed to pause campaign" },
      { status: 500 }
    );
  }
}
