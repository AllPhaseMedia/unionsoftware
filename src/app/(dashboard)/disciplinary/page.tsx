import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { DisciplinaryList } from "@/components/disciplinary/disciplinary-list";

export default async function DisciplinaryPage() {
  const dbUser = await getAuthUser();

  if (!dbUser) {
    redirect("/sign-in");
  }

  // Fetch initial data in parallel
  const [cases, total, stepTemplates, departments] = await Promise.all([
    prisma.disciplinaryCase.findMany({
      where: { organizationId: dbUser.organizationId },
      select: {
        id: true,
        caseNumber: true,
        description: true,
        status: true,
        priority: true,
        type: true,
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
    prisma.disciplinaryCase.count({
      where: { organizationId: dbUser.organizationId },
    }),
    prisma.disciplinaryStepTemplate.findMany({
      where: { organizationId: dbUser.organizationId, isActive: true },
      orderBy: { stepNumber: "asc" },
    }),
    prisma.department.findMany({
      where: { organizationId: dbUser.organizationId, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <DisciplinaryList
      initialCases={cases}
      initialTotal={total}
      stepTemplates={stepTemplates}
      departments={departments}
    />
  );
}
