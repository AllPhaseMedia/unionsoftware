import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { MemberForm } from "@/components/members/member-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMemberPage({ params }: PageProps) {
  const { id } = await params;
  const dbUser = await getAuthUser();

  if (!dbUser) {
    redirect("/sign-in");
  }

  const member = await prisma.member.findFirst({
    where: {
      id,
      organizationId: dbUser.organizationId,
    },
    include: {
      department: true,
    },
  });

  if (!member) {
    notFound();
  }

  const departments = await prisma.department.findMany({
    where: {
      organizationId: dbUser.organizationId,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Edit Member</h1>
      <MemberForm
        departments={departments}
        member={member}
      />
    </div>
  );
}
