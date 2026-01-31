import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { emailCampaignUpdateSchema } from "@/lib/validations";
import { ZodError } from "zod";

// GET /api/campaigns/[id] - Get campaign details
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

    const campaign = await prisma.emailCampaign.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
      include: {
        template: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { emails: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get email stats by status
    const emailStats = await prisma.campaignEmail.groupBy({
      by: ["status"],
      where: { campaignId: id },
      _count: { status: true },
    });

    const stats = {
      pending: 0,
      sending: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };

    for (const stat of emailStats) {
      stats[stat.status.toLowerCase() as keyof typeof stats] = stat._count.status;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...campaign,
        stats,
      },
    });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

// PUT /api/campaigns/[id] - Update campaign (draft only)
export async function PUT(
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

    // Check if campaign exists and is in DRAFT status
    const existingCampaign = await prisma.emailCampaign.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (existingCampaign.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft campaigns can be edited" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = emailCampaignUpdateSchema.parse(body);

    // Build update data object
    const updateData: Record<string, unknown> = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.subject !== undefined) updateData.subject = validatedData.subject;
    if (validatedData.body !== undefined) updateData.body = validatedData.body;
    if (validatedData.templateId !== undefined) updateData.templateId = validatedData.templateId || null;
    if (validatedData.targetCriteria !== undefined) updateData.targetCriteria = validatedData.targetCriteria;
    if (validatedData.emailsPerMinute !== undefined) updateData.emailsPerMinute = validatedData.emailsPerMinute;
    if (validatedData.scheduledAt !== undefined) updateData.scheduledAt = validatedData.scheduledAt || null;

    const campaign = await prisma.emailCampaign.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error("Error updating campaign:", error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id] - Delete campaign
export async function DELETE(
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

    const campaign = await prisma.emailCampaign.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Don't allow deleting campaigns that are actively sending
    if (campaign.status === "SENDING") {
      return NextResponse.json(
        { error: "Cannot delete a campaign that is currently sending. Please pause it first." },
        { status: 400 }
      );
    }

    // Delete campaign (cascade will delete campaign emails)
    await prisma.emailCampaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
