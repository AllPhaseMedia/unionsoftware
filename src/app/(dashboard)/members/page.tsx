import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { MembersList } from "@/components/members/members-list";

export default async function MembersPage() {
  const dbUser = await getAuthUser();

  if (!dbUser) {
    redirect("/sign-in");
  }

  // Fetch initial data in parallel
  const [members, total, departments] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId: dbUser.organizationId },
      select: {
        id: true,
        memberId: true,
        firstName: true,
        lastName: true,
        email: true,
        cellPhone: true,
        homePhone: true,
        jobTitle: true,
        workLocation: true,
        status: true,
        employmentType: true,
        hireDate: true,
        dateOfBirth: true,
        city: true,
        state: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 50,
    }),
    prisma.member.count({
      where: { organizationId: dbUser.organizationId },
    }),
    prisma.department.findMany({
      where: { organizationId: dbUser.organizationId, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <MembersList
      initialMembers={members}
      initialTotal={total}
      departments={departments}
    />
  );
}
