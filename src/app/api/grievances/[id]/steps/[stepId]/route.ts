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

    // Update the current step
    const step = await prisma.grievanceStep.update({
      where: { id: stepId },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(completedAt !== undefined && { completedAt: completedAt ? new Date(completedAt) : null }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        // Track who completed/updated the step
        ...(status === "COMPLETED" || status === "IN_PROGRESS" || status === "SKIPPED"
          ? { completedById: dbUser.id }
          : {}),
        // Clear completedBy when resetting
        ...(status === "PENDING" && { completedById: null }),
      },
    });

    // Determine if we need to recalculate subsequent step deadlines
    const shouldRecalculate =
      // When completing a step
      (status === "COMPLETED" && completedAt) ||
      // When editing completion date of an already completed step
      (completedAt !== undefined && existingStep.status === "COMPLETED" && status === undefined) ||
      // When resetting a step (need to recalculate based on previous step)
      (status === "PENDING" && completedAt === null);

    if (shouldRecalculate) {
      // Get step templates for deadline calculation
      const stepTemplates = await prisma.stepTemplate.findMany({
        where: {
          organizationId: dbUser.organizationId,
          isActive: true,
        },
        orderBy: { stepNumber: "asc" },
      });

      // Create a map of step number to defaultDays
      const templateDaysMap = new Map<number, number>();
      stepTemplates.forEach((t) => {
        if (t.defaultDays) {
          templateDaysMap.set(t.stepNumber, t.defaultDays);
        }
      });

      if (status === "PENDING" && completedAt === null) {
        // When resetting a step, find the most recent completed step before this one
        // and recalculate deadlines from there (or from filing date if none)
        const previousCompletedStep = await prisma.grievanceStep.findFirst({
          where: {
            grievanceId: id,
            stepNumber: { lt: existingStep.stepNumber },
            status: "COMPLETED",
            completedAt: { not: null },
          },
          orderBy: { stepNumber: "desc" },
        });

        // Get the base date for recalculation
        let baseDate: Date;
        let startFromStepNumber: number;

        if (previousCompletedStep && previousCompletedStep.completedAt) {
          baseDate = new Date(previousCompletedStep.completedAt);
          startFromStepNumber = previousCompletedStep.stepNumber;
        } else {
          // No previous completed step, use filing date
          baseDate = new Date(grievance.filingDate);
          startFromStepNumber = 0;
        }

        // Get all steps that need recalculation (from the reset step onwards)
        const stepsToRecalculate = await prisma.grievanceStep.findMany({
          where: {
            grievanceId: id,
            stepNumber: { gt: startFromStepNumber },
            status: { notIn: ["COMPLETED", "SKIPPED"] },
          },
          orderBy: { stepNumber: "asc" },
        });

        // Recalculate deadlines
        let cumulativeDays = 0;
        for (const stepToUpdate of stepsToRecalculate) {
          const defaultDays = templateDaysMap.get(stepToUpdate.stepNumber);
          if (defaultDays) {
            cumulativeDays += defaultDays;
            const newDeadline = new Date(baseDate.getTime() + cumulativeDays * 24 * 60 * 60 * 1000);
            await prisma.grievanceStep.update({
              where: { id: stepToUpdate.id },
              data: { deadline: newDeadline },
            });
          }
        }
      } else {
        // Completing a step or editing completion date
        const completionDate = new Date(completedAt);

        // Get all subsequent steps (higher step numbers)
        const subsequentSteps = await prisma.grievanceStep.findMany({
          where: {
            grievanceId: id,
            stepNumber: { gt: existingStep.stepNumber },
          },
          orderBy: { stepNumber: "asc" },
        });

        // Calculate cumulative days from the completion date
        let cumulativeDays = 0;

        for (const subStep of subsequentSteps) {
          // Only update if step is not already completed
          if (subStep.status !== "COMPLETED" && subStep.status !== "SKIPPED") {
            const defaultDays = templateDaysMap.get(subStep.stepNumber);

            if (defaultDays) {
              cumulativeDays += defaultDays;
              const newDeadline = new Date(completionDate.getTime() + cumulativeDays * 24 * 60 * 60 * 1000);

              await prisma.grievanceStep.update({
                where: { id: subStep.id },
                data: { deadline: newDeadline },
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, data: step });
  } catch (error) {
    console.error("Error updating step:", error);
    return NextResponse.json(
      { error: "Failed to update step" },
      { status: 500 }
    );
  }
}
