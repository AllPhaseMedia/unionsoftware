import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberForm } from "@/components/members/member-form";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NewMemberPage() {
  const dbUser = await getAuthUser();

  if (!dbUser) {
    redirect("/sign-in");
  }

  const departments = await prisma.department.findMany({
    where: {
      organizationId: dbUser.organizationId,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Add New Member</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberForm departments={departments} />
        </CardContent>
      </Card>
    </div>
  );
}
