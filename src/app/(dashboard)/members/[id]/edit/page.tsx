import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { MemberForm } from "@/components/members/member-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMemberPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: authUser.id },
  });

  if (!dbUser) {
    redirect("/login");
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
