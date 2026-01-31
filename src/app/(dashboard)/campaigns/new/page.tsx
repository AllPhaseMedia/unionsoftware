import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { CampaignForm } from "@/components/campaigns";

export default async function NewCampaignPage() {
  const dbUser = await getAuthUser();

  if (!dbUser) {
    redirect("/sign-in");
  }

  if (dbUser.role !== "ADMIN") {
    redirect("/campaigns");
  }

  const [departments, emailTemplates] = await Promise.all([
    prisma.department.findMany({
      where: { organizationId: dbUser.organizationId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.emailTemplate.findMany({
      where: { organizationId: dbUser.organizationId, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <CampaignForm
      departments={departments}
      emailTemplates={emailTemplates}
    />
  );
}
