import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { GrievancesList } from "@/components/grievances/grievances-list";

export default async function GrievancesPage() {
  const dbUser = await getAuthUser();

  if (!dbUser) {
    redirect("/sign-in");
  }

  // Fetch initial data in parallel
  const [grievances, total, stepTemplates, departments] = await Promise.all([
    prisma.grievance.findMany({
      where: { organizationId: dbUser.organizationId },
      select: {
        id: true,
        grievanceNumber: true,
        description: true,
        status: true,
        priority: true,
        filingDate: true,
        createdAt: true,
        member: { select: { id: true, firstName: true, lastName: true } },
        representative: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        steps: {
          select: { id: true, stepNumber: true, status: true, deadline: true },
          orderBy: { stepNumber: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.grievance.count({
      where: { organizationId: dbUser.organizationId },
    }),
    prisma.stepTemplate.findMany({
      where: { organizationId: dbUser.organizationId, isActive: true },
      orderBy: { stepNumber: "asc" },
    }),
    prisma.department.findMany({
      where: { organizationId: dbUser.organizationId, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <GrievancesList
      initialGrievances={grievances}
      initialTotal={total}
      stepTemplates={stepTemplates}
      departments={departments}
    />
  );
}
