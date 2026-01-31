import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { emailCampaignSchema } from "@/lib/validations";
import { ZodError } from "zod";

// GET /api/campaigns - List campaigns
export async function GET(request: Request) {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const where = {
      organizationId: dbUser.organizationId,
      ...(status && { status: status as "DRAFT" | "SCHEDULED" | "SENDING" | "PAUSED" | "COMPLETED" | "CANCELLED" }),
    };

    const [campaigns, total] = await Promise.all([
      prisma.emailCampaign.findMany({
        where,
        select: {
          id: true,
          name: true,
          subject: true,
          status: true,
          targetCriteria: true,
          totalRecipients: true,
          sentCount: true,
          failedCount: true,
          scheduledAt: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          createdBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.emailCampaign.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

// POST /api/campaigns - Create campaign
export async function POST(request: Request) {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = emailCampaignSchema.parse(body);

    const campaign = await prisma.emailCampaign.create({
      data: {
        name: validatedData.name,
        subject: validatedData.subject,
        body: validatedData.body,
        templateId: validatedData.templateId || null,
        targetCriteria: validatedData.targetCriteria as object | undefined,
        emailsPerMinute: validatedData.emailsPerMinute,
        scheduledAt: validatedData.scheduledAt || null,
        organizationId: dbUser.organizationId,
        createdById: dbUser.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: campaign }, { status: 201 });
  } catch (error) {
    console.error("Error creating campaign:", error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
