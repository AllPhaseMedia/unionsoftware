import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { CampaignsList } from "@/components/campaigns";

export default async function CampaignsPage() {
  const dbUser = await getAuthUser();

  if (!dbUser) {
    redirect("/login");
  }

  const [campaigns, total] = await Promise.all([
    prisma.emailCampaign.findMany({
      where: { organizationId: dbUser.organizationId },
      select: {
        id: true,
        name: true,
        subject: true,
        status: true,
        totalRecipients: true,
        sentCount: true,
        failedCount: true,
        scheduledAt: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.emailCampaign.count({
      where: { organizationId: dbUser.organizationId },
    }),
  ]);

  // Serialize dates for client component
  const serializedCampaigns = campaigns.map(c => ({
    ...c,
    scheduledAt: c.scheduledAt?.toISOString() || null,
    startedAt: c.startedAt?.toISOString() || null,
    completedAt: c.completedAt?.toISOString() || null,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <CampaignsList
      initialCampaigns={serializedCampaigns}
      initialTotal={total}
    />
  );
}
