import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { MemberDetail } from "@/components/members/member-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberDetailPage({ params }: PageProps) {
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
      department: {
        select: { id: true, name: true },
      },
      grievances: {
        select: {
          id: true,
          grievanceNumber: true,
          description: true,
          status: true,
          filingDate: true,
        },
        orderBy: { filingDate: "desc" },
      },
      disciplinaryCases: {
        select: {
          id: true,
          caseNumber: true,
          description: true,
          status: true,
          type: true,
          filingDate: true,
        },
        orderBy: { filingDate: "desc" },
      },
      notes: {
        include: {
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      documents: {
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  if (!member) {
    notFound();
  }

  return <MemberDetail initialMember={member as any} />;
}
