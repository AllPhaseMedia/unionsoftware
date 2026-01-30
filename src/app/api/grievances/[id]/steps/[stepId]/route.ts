import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string; stepId: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id, stepId } = await params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify grievance belongs to the organization
    const grievance = await prisma.grievance.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!grievance) {
      return NextResponse.json({ error: "Grievance not found" }, { status: 404 });
    }

    // Verify step belongs to the grievance
    const existingStep = await prisma.grievanceStep.findFirst({
      where: {
        id: stepId,
        grievanceId: id,
      },
    });

    if (!existingStep) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    const body = await request.json();
    const { status, notes, completedAt, deadline } = body;

    const step = await prisma.grievanceStep.update({
      where: { id: stepId },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(completedAt !== undefined && { completedAt: completedAt ? new Date(completedAt) : null }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
      },
    });

    return NextResponse.json({ success: true, data: step });
  } catch (error) {
    console.error("Error updating step:", error);
    return NextResponse.json(
      { error: "Failed to update step" },
      { status: 500 }
    );
  }
}
