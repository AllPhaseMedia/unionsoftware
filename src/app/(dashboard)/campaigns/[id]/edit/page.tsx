import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { CampaignForm } from "@/components/campaigns";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCampaignPage({ params }: Props) {
  const dbUser = await getAuthUser();

  if (!dbUser) {
    redirect("/sign-in");
  }

  if (dbUser.role !== "ADMIN") {
    redirect("/campaigns");
  }

  const { id } = await params;

  const [campaign, departments, emailTemplates] = await Promise.all([
    prisma.emailCampaign.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    }),
    prisma.department.findMany({
      where: { organizationId: dbUser.organizationId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.emailTemplate.findMany({
      where: { organizationId: dbUser.organizationId, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!campaign) {
    notFound();
  }

  if (campaign.status !== "DRAFT") {
    redirect(`/campaigns/${id}`);
  }

  return (
    <CampaignForm
      departments={departments}
      emailTemplates={emailTemplates}
      initialData={{
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        body: campaign.body,
        templateId: campaign.templateId,
        targetCriteria: campaign.targetCriteria as {
          departments?: string[];
          statuses?: string[];
          employmentTypes?: string[];
        } | null,
        emailsPerMinute: campaign.emailsPerMinute,
      }}
    />
  );
}
